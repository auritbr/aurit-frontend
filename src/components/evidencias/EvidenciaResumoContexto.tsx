export function EvidenciaResumoContexto({
  title,
  items,
  hint,
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
  hint?: string;
}) {
  return (
    <div className="rounded-[14px] border border-primary/15 bg-primary/[0.04] p-4 backdrop-blur-sm">
      <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {item.label}
            </dt>
            <dd className="mt-0.5 whitespace-pre-line text-[13px] text-foreground">
              {item.value || "—"}
            </dd>
          </div>
        ))}
      </dl>
      {hint && (
        <p className="mt-3 border-t border-border/50 pt-2.5 text-[12px] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
