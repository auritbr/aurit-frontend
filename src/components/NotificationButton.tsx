import { forwardRef } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NotificationButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  count?: number;
  open?: boolean;
}

export const NotificationButton = forwardRef<
  HTMLButtonElement,
  NotificationButtonProps
>(({ count = 0, open = false, className, ...props }, ref) => {
  const badge = count > 99 ? "99+" : count > 9 ? "9+" : String(count);

  return (
    <button
      ref={ref}
      type="button"
      aria-label="Abrir notificações"
      aria-haspopup="dialog"
      aria-expanded={open}
      className={cn(
        "relative inline-flex h-[38px] w-[38px] items-center justify-center rounded-[13px]",
        "border border-border/70 bg-card/70 text-muted-foreground backdrop-blur-md",
        "shadow-[0_1px_2px_-1px_hsl(215_28%_17%_/_0.10),inset_0_1px_0_0_hsl(0_0%_100%_/_0.5)]",
        "transition-[background-color,color,transform,box-shadow] duration-150",
        "hover:bg-card hover:text-foreground active:scale-[0.96]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        open && "bg-card text-foreground ring-1 ring-primary/25",
        className,
      )}
      {...props}
    >
      <Bell className="h-[18px] w-[18px]" strokeWidth={1.9} />
      {count > 0 && (
        <>
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border border-card bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
          >
            {badge}
          </span>
          <span className="sr-only">{count} notificações não lidas</span>
        </>
      )}
    </button>
  );
});

NotificationButton.displayName = "NotificationButton";
