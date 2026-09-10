import { StatusPill, type StatusContext } from "@/components/StatusPill";

export function DomainStatusPill({
  domain,
  status,
  ariaLabelPrefix,
}: {
  domain: StatusContext;
  status: string;
  ariaLabelPrefix?: string;
}) {
  return (
    <StatusPill
      context={domain}
      status={status}
      ariaLabelPrefix={ariaLabelPrefix}
    />
  );
}
