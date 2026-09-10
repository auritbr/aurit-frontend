import { Link2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EvidenciaLink } from "@/data/evidencias";

function criarLinkEvidencia(): EvidenciaLink {
  return { titulo: "", url: "" };
}
export function EvidenciaLinksEditor({
  links,
  onChange,
  disabled,
}: {
  links: EvidenciaLink[];
  onChange: (links: EvidenciaLink[]) => void;
  disabled?: boolean;
}) {
  const update = (index: number, key: "titulo" | "url", value: string) =>
    onChange(
      links.map((link, i) => (i === index ? { ...link, [key]: value } : link)),
    );
  return (
    <div className="space-y-3">
      {links.map((link, index) => (
        <div
          key={link.id ?? `novo-${index}`}
          className="rounded-[13px] border border-border/60 bg-background/60 p-3 backdrop-blur-sm"
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
            <Input
              value={link.titulo ?? ""}
              onChange={(e) => update(index, "titulo", e.target.value)}
              placeholder="Título do link (opcional)"
              disabled={disabled}
              aria-label={`Título do link ${index + 1}`}
            />
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={link.url}
                onChange={(e) => update(index, "url", e.target.value)}
                placeholder="https://..."
                className="pl-9"
                disabled={disabled}
                aria-label={`URL do link ${index + 1}`}
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="glassSecondary"
              onClick={() => onChange(links.filter((_, i) => i !== index))}
              disabled={disabled}
              aria-label={`Remover link ${index + 1}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="glassSecondary"
        className="h-9 gap-2 px-4"
        onClick={() => onChange([...links, criarLinkEvidencia()])}
        disabled={disabled || links.length >= 20}
      >
        <Plus className="h-4 w-4" />
        Adicionar link
      </Button>
    </div>
  );
}
