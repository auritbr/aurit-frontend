import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useMemo,
  type ReactNode,
  type ComponentProps,
  type ElementRef,
} from "react";
import { FilterMultiSelect } from "@/components/FilterMultiSelect";
import { SelectContent } from "@/components/ui/select";
import { sortOptionsByName, sortOptionsByLabel } from "@/lib/sortOptions";

function optionText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (isValidElement<{ children?: ReactNode }>(node))
    return optionText(node.props.children);
  return Children.toArray(node)
    .map((child) => optionText(child))
    .join("");
}
function orderedSelectItems(children: ReactNode): ReactNode[] {
  const items = Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? Children.toArray(child.props.children)
      : [child],
  );
  const label = (node: ReactNode) =>
    isValidElement<{ textValue?: string; children?: ReactNode }>(node)
      ? (node.props.textValue ?? optionText(node.props.children))
      : optionText(node);
  const placeholder = (node: ReactNode) =>
    isValidElement<{ value?: string }>(node) &&
    /^_*(?:todos|todas|all|selecione)_*$/i.test(String(node.props.value ?? ""));
  return [
    ...items.filter(placeholder),
    ...sortOptionsByName(
      items.filter((item) => !placeholder(item)),
      label,
    ),
  ];
}
/** Seletores dos relatórios mantêm os valores e ordenam somente a apresentação. */
export const ReportSelectContent = forwardRef<
  ElementRef<typeof SelectContent>,
  ComponentProps<typeof SelectContent>
>(({ children, ...props }, ref) => (
  <SelectContent {...props} ref={ref}>
    {orderedSelectItems(children)}
  </SelectContent>
));
ReportSelectContent.displayName = "ReportSelectContent";

export function ReportFilterMultiSelect(
  props: ComponentProps<typeof FilterMultiSelect>,
) {
  const options = useMemo(
    () => sortOptionsByLabel(props.options),
    [props.options],
  );
  return <FilterMultiSelect {...props} options={options} />;
}
