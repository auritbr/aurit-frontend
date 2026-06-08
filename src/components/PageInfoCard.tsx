import React from "react";
import { Info, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageInfoCardProps {
    title?: string;
    description: string;
    icon?: LucideIcon;
    className?: string;
    variant?: "info" | "success" | "warning" | "default";
}

export function PageInfoCard({
    title = "Objetivo da página",
    description,
    icon: Icon = Info,
    className,
    variant = "info",
}: PageInfoCardProps) {
    const variantStyles = {
        info: "border-border/70 bg-muted/30 text-muted-foreground",
        success: "border-emerald-500/20 bg-emerald-500/5 text-muted-foreground",
        warning: "border-amber-500/20 bg-amber-500/5 text-muted-foreground",
        default: "border-border/70 bg-muted/30 text-muted-foreground",
    };

    const iconColors = {
        info: "text-primary",
        success: "text-emerald-500",
        warning: "text-amber-500",
        default: "text-primary",
    };

    return (
        <div
            className={cn(
                "mb-5 flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-[13px] leading-relaxed transition-all",
                variantStyles[variant],
                className
            )}
        >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColors[variant])} />

            <p>
                <span className="font-medium text-foreground">{title}: </span>
                {description}
            </p>
        </div>
    );
}