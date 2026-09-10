import { useMemo, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/utils";
import type { RegistroExecucao } from "@/lib/prestacaoExecucao";

export interface RegistrosSelecionaveisProps {
  /** Título da subseção (renderizado como legend do fieldset). */
  titulo: string;
  descricao?: string;
  itens: RegistroExecucao[];
  /** Ids selecionados. Ausente = subseção somente leitura. */
  selecionados?: string[];
  onChange?: (ids: string[]) => void;
  emptyMessage: string;
  /** Exibe campo de busca quando a lista é grande. */
  buscaAPartirDe?: number;
  /** Mensagem/ação exibida quando a lista está vazia. */
  acaoVazio?: React.ReactNode;
}

/**
 * Lista de registros do projeto — seleção múltipla acessível (checkbox + fieldset)
 * ou apresentação somente leitura, conforme o vínculo suportado.
 */
export function RegistrosSelecionaveis({
  titulo,
  descricao,
  itens,
  selecionados,
  onChange,
  emptyMessage,
  buscaAPartirDe = 6,
  acaoVazio,
}: RegistrosSelecionaveisProps) {
  const [busca, setBusca] = useState("");
  const selecionavel = !!selecionados && !!onChange;

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return itens;
    return itens.filter(
      (i) =>
        i.titulo.toLowerCase().includes(termo) ||
        i.campos.some((c) => c.value.toLowerCase().includes(termo)),
    );
  }, [busca, itens]);

  const toggle = (id: string) => {
    if (!selecionados || !onChange) return;
    onChange(
      selecionados.includes(id)
        ? selecionados.filter((s) => s !== id)
        : [...selecionados, id],
    );
  };

  const todosVisiveis =
    filtrados.length > 0 &&
    filtrados.every((i) => selecionados?.includes(i.id));

  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-1 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-foreground">
        {titulo}
        <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {itens.length}
          {selecionavel && itens.length > 0
            ? ` · ${selecionados?.length ?? 0} selecionados`
            : ""}
        </span>
      </legend>
      {descricao && (
        <p className="mb-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
          {descricao}
        </p>
      )}

      {itens.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-border/70 bg-muted/25 px-3.5 py-3">
          <p className="text-[12.5px] text-muted-foreground">{emptyMessage}</p>
          {acaoVazio && <div className="mt-2">{acaoVazio}</div>}
        </div>
      ) : (
        <>
          {(itens.length >= buscaAPartirDe || busca) && (
            <div className="relative mb-2.5">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={`Pesquisar em ${titulo.toLowerCase()}...`}
                aria-label={`Pesquisar em ${titulo}`}
                className="h-9 pl-9 text-[13px]"
              />
            </div>
          )}

          {selecionavel && filtrados.length > 1 && (
            <Button
              type="button"
              variant="glassSecondary"
              className="mb-2.5 h-8 px-3 text-[12.5px]"
              onClick={() => {
                if (!onChange || !selecionados) return;
                const visiveis = filtrados.map((i) => i.id);
                onChange(
                  todosVisiveis
                    ? selecionados.filter((id) => !visiveis.includes(id))
                    : Array.from(new Set([...selecionados, ...visiveis])),
                );
              }}
            >
              {todosVisiveis ? "Limpar seleção" : "Selecionar todos"}
            </Button>
          )}

          <ul className="space-y-2">
            {filtrados.map((item) => {
              const checked = selecionados?.includes(item.id) ?? false;
              const inputId = `reg-${titulo.replace(/\s+/g, "-").toLowerCase()}-${item.id}`;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-[12px] border px-3 py-2.5 transition-colors",
                    checked
                      ? "border-primary/30 bg-primary/[0.06]"
                      : "border-border/60 bg-card/60 supports-[backdrop-filter]:bg-card/50",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {selecionavel && (
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        onCheckedChange={() => toggle(item.id)}
                        className="mt-0.5"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {selecionavel ? (
                          <label
                            htmlFor={inputId}
                            className="cursor-pointer text-[13px] font-medium leading-snug text-foreground"
                          >
                            {item.titulo}
                          </label>
                        ) : (
                          <span className="text-[13px] font-medium leading-snug text-foreground">
                            {item.titulo}
                          </span>
                        )}
                        {item.status && (
                          <StatusPill
                            status={item.status}
                            context={item.statusContext}
                            wrap
                          />
                        )}
                        {item.foraDoPeriodo && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-100/60 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            <AlertTriangle className="h-3 w-3" aria-hidden />
                            Fora do período informado
                          </span>
                        )}
                      </div>
                      <dl className="mt-1.5 grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                        {item.campos.map((c) => (
                          <div key={c.label} className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              {c.label}
                            </dt>
                            <dd className="break-words text-[12.5px] text-foreground">
                              {c.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {filtrados.length === 0 && (
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              Nenhum registro corresponde à pesquisa informada.
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
