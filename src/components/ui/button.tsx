import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        glassPrimary:
          "rounded-[10px] border border-primary/40 bg-primary text-primary-foreground shadow-[0_1px_2px_hsl(215_28%_17%_/_0.12),inset_0_1px_0_hsl(0_0%_100%/0.10)] transition-colors hover:bg-primary/90 active:scale-[0.99] motion-reduce:transition-none",
        glassSecondary:
          "rounded-[13px] border border-border/60 bg-background/70 text-foreground shadow-[0_1px_3px_-2px_hsl(215_28%_17%_/_0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-background/55 transition-all hover:border-border hover:bg-muted/60 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        glassSecondarySuccess:
          "rounded-[13px] border border-primary/35 bg-primary/10 text-primary shadow-[0_1px_3px_-2px_hsl(var(--primary)/0.3),inset_0_1px_0_hsl(0_0%_100%/0.28)] backdrop-blur-md supports-[backdrop-filter]:bg-primary/[0.08] transition-all hover:border-primary/50 hover:bg-primary/[0.16] active:scale-[0.985] motion-reduce:transition-none",
        glassSecondaryStrong:
          "rounded-[13px] border border-primary/45 bg-primary/90 text-primary-foreground shadow-[0_2px_6px_-3px_hsl(var(--primary)/0.45),inset_0_1px_0_hsl(0_0%_100%/0.22)] backdrop-blur-md supports-[backdrop-filter]:bg-primary/85 transition-all hover:bg-primary hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.985] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        glassCompact:
          "glass-compact rounded-[11px] border text-primary-foreground transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.985] focus-visible:ring-primary/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        glassGhost:
          "rounded-[10px] border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary active:scale-[0.99] motion-reduce:transition-none",
        glassDanger:
          "rounded-[11px] border border-destructive/35 bg-destructive/[0.10] font-semibold text-destructive shadow-[0_1px_3px_-2px_hsl(var(--destructive)/0.28),inset_0_1px_0_hsl(0_0%_100%/0.4)] backdrop-blur-md supports-[backdrop-filter]:bg-destructive/[0.08] transition-all hover:border-destructive/50 hover:bg-destructive/[0.16] active:scale-[0.985] motion-reduce:transition-none",
        glassDocumentAction:
          "rounded-[11px] border border-primary/30 bg-primary/[0.07] font-semibold text-primary shadow-[0_1px_3px_-2px_hsl(var(--primary)/0.28),inset_0_1px_0_hsl(0_0%_100%/0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-primary/[0.06] transition-all hover:border-primary/45 hover:bg-primary/[0.13] active:scale-[0.985] motion-reduce:transition-none",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        compact:
          "h-9 min-h-9 rounded-[11px] px-3.5 text-[13px] font-semibold [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
