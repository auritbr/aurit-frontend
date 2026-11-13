import type { ComponentProps } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ReportTabsList(props: ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      {...props}
      className="mb-4 grid h-auto w-full grid-cols-2 items-stretch gap-1 rounded-xl border border-border/60 bg-card/60 p-1 backdrop-blur-md sm:inline-flex sm:w-auto sm:max-w-full sm:flex-wrap sm:justify-start"
    />
  );
}

export function ReportTab(props: ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      {...props}
      className="min-h-11 min-w-0 whitespace-normal break-words rounded-[9px] px-2 py-1.5 text-center text-[12.5px] leading-tight md:px-3 md:[@media(pointer:fine)]:min-h-0"
    />
  );
}
