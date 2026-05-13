import auritLogo from "@/assets/logo-aurit.png";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

interface AuritLogoProps {
  size?: Size;
  showText?: boolean;
  className?: string;
  withBackground?: boolean;
  /** Tailwind classes for the background chip (when withBackground). */
  backgroundClassName?: string;
  /** Decorative use only (alt=""). */
  decorative?: boolean;
}

const logoSize: Record<Size, string> = {
  sm: "h-8 w-auto",
  md: "h-10 w-auto",
  lg: "h-16 w-auto",
};

const textSize: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function AuritLogo({
  size = "md",
  showText = false,
  className,
  withBackground = false,
  backgroundClassName = "bg-primary",
  decorative = false,
}: AuritLogoProps) {
  const alt = decorative ? "" : "Aurit";

  const image = (
    <img
      src={auritLogo}
      alt={alt}
      loading="lazy"
      width={512}
      height={512}
      className={cn("object-contain flex-shrink-0", logoSize[size])}
    />
  );

  const mark = withBackground ? (
    <div
      className={cn(
        "flex items-center justify-center flex-shrink-0 rounded",
        logoSize[size],
        backgroundClassName,
      )}
    >
      {image}
    </div>
  ) : (
    image
  );

  if (!showText) {
    return <span className={cn("inline-flex", className)}>{mark}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark}
      <span className={cn("font-semibold tracking-tight text-foreground", textSize[size])}>
        Aurit
      </span>
    </span>
  );
}

export default AuritLogo;