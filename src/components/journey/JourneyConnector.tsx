/** Conector decorativo entre etapas da jornada (apenas desktop). */
export function JourneyConnector() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-[-24px] top-1/2 hidden h-[6px] w-[24px] -translate-y-1/2 items-center lg:flex"
    >
      <span className="h-[1px] w-full bg-[linear-gradient(to_right,hsl(var(--border)),hsl(var(--border)/0.45))]" />
      <span
        className="ml-[-1px] h-0 w-0 flex-shrink-0 border-y-[3px] border-l-[4px] border-y-transparent"
        style={{ borderLeftColor: "hsl(var(--border))" }}
      />
    </span>
  );
}
