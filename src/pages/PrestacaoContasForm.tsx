import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Link2,
  CalendarRange,
  ClipboardCheck,
  MessageSquareText,
  Info,
  PackageCheck,
  UsersRound,
  Megaphone,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/MultiSelect";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { HelpTooltip } from "@/components/HelpTooltip";
import {
  getPrestacaoContasById,
  createPrestacaoContas,
  updatePrestacaoContas,
  buildPrestacaoPayload,
  getPropostasEditalOptions,
  getAgentesOptions,
  getPrestacaoMetasOptions,
  getEquipeProjetoOptions,
  getAcoesDivulgacaoOptions,
  createEmptyPrestacaoContas,
  produtoGeradoOptions,
  produtoGeradoLabel,
  type PrestacaoContas,
  type ProdutoGerado,
  type PropostaEditalOption,
  type AgenteOption,
  type PrestacaoMetaOption,
  type EquipeProjetoOption,
  type AcaoDivulgacaoOption,
} from "@/data/prestacaoContas";
import { toast } from "sonner";

const PRESTACAO_CONTAS_NEXT_STEP_KEY =
  "aurit:prestacao-contas:next-step-card";

interface PrestacaoContasNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoPrestacaoContas() {
  const card: PrestacaoContasNextStepCardData = {
    titulo:
      "Após registrar a prestação de contas, organize o patrimônio",
    descricao:
      "O patrimônio ajuda a registrar bens que precisam ser identificados, acompanhados e preservados pela organização, especialmente quando foram adquiridos com recursos de projetos, editais ou parcerias.",
    acaoLabel: "Cadastrar patrimônio",
    acaoUrl: "/patrimonio/novo",
    acaoSecundariaLabel: "Ver prestações de contas",
    acaoSecundariaUrl: "/prestacao-contas",
    variante: "pendente",
  };

  sessionStorage.setItem(
    PRESTACAO_CONTAS_NEXT_STEP_KEY,
    JSON.stringify(card),
  );
}

type FormState = PrestacaoContas;

const initial: FormState = createEmptyPrestacaoContas();

function normalizeId(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  return String(value).trim();
}

function getPropostaNome(propostas: PropostaEditalOption[], id: string) {
  return (
    propostas.find((item) => normalizeId(item.id) === id)?.nome ||
    `Proposta ${id}`
  );
}

function getAgenteNome(agentes: AgenteOption[], id: string) {
  return (
    agentes.find((item) => normalizeId(item.id) === id)?.nome ||
    `Agente ${id}`
  );
}

function getPrestacaoMetaNome(options: PrestacaoMetaOption[], id: string) {
  return (
    options.find((item) => normalizeId(item.id) === id)?.nome ||
    `Prestação de meta ${id}`
  );
}

function getEquipeNome(equipes: EquipeProjetoOption[], id: string) {
  const equipe = equipes.find((item) => normalizeId(item.id) === id);

  if (!equipe) return `Membro ${id}`;

  return equipe.funcao ? `${equipe.nome} — ${equipe.funcao}` : equipe.nome;
}

function getAcaoNome(acoes: AcaoDivulgacaoOption[], id: string) {
  return (
    acoes.find((item) => normalizeId(item.id) === id)?.nome ||
    `Ação de divulgação ${id}`
  );
}

export default function PrestacaoContasForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [saving, setSaving] = useState(false);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [agentes, setAgentes] = useState<AgenteOption[]>([]);
  const [prestacaoMetasOptions, setPrestacaoMetasOptions] = useState<
    PrestacaoMetaOption[]
  >([]);
  const [equipeProjeto, setEquipeProjeto] = useState<EquipeProjetoOption[]>([]);
  const [acoesDivulgacao, setAcoesDivulgacao] = useState<
    AcaoDivulgacaoOption[]
  >([]);

  const bloqueado = loading || saving || visualizando;

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [
          prestacaoData,
          propostasData,
          agentesData,
          prestacaoMetasData,
          equipeData,
          acoesData,
        ] = await Promise.all([
          id ? getPrestacaoContasById(Number(id)) : Promise.resolve(null),
          getPropostasEditalOptions(),
          getAgentesOptions(),
          getPrestacaoMetasOptions(),
          getEquipeProjetoOptions(),
          getAcoesDivulgacaoOptions(),
        ]);

        if (!active) return;

        const propostasNormalizadas = (propostasData ?? [])
          .filter((item) => normalizeId(item.id))
          .map((item) => ({
            id: normalizeId(item.id),
            nome: item.nome?.trim() || `Proposta ${item.id}`,
          }));

        const agentesNormalizados = (agentesData ?? [])
          .filter((item) => normalizeId(item.id))
          .map((item) => ({
            id: normalizeId(item.id),
            nome: item.nome?.trim() || `Agente ${item.id}`,
          }));

        const prestacaoMetasNormalizadas = (prestacaoMetasData ?? [])
          .filter((item) => normalizeId(item.id))
          .map((item) => ({
            id: normalizeId(item.id),
            nome: item.nome?.trim() || `Prestação de meta ${item.id}`,
            metaProjetoId: normalizeId(item.metaProjetoId),
            propostaEditalId: normalizeId(item.propostaEditalId),
          }));

        const equipeNormalizada = (equipeData ?? [])
          .filter((item) => normalizeId(item.id))
          .map((item) => ({
            id: normalizeId(item.id),
            nome: item.nome?.trim() || `Membro ${item.id}`,
            funcao: item.funcao?.trim() || "",
            propostaEditalId: normalizeId(item.propostaEditalId),
          }));

        const acoesNormalizadas = (acoesData ?? [])
          .filter((item) => normalizeId(item.id))
          .map((item) => ({
            id: normalizeId(item.id),
            nome: item.nome?.trim() || `Ação de divulgação ${item.id}`,
            propostaEditalId: normalizeId(item.propostaEditalId),
          }));

        setPropostas(propostasNormalizadas);
        setAgentes(agentesNormalizados);
        setPrestacaoMetasOptions(prestacaoMetasNormalizadas);
        setEquipeProjeto(equipeNormalizada);
        setAcoesDivulgacao(acoesNormalizadas);

        if (prestacaoData) {
          setForm({
            ...prestacaoData,
            id: normalizeId(prestacaoData.id),
            propostaEdital: normalizeId(prestacaoData.propostaEdital),
            agente: normalizeId(prestacaoData.agente),
            prestacaoMetas: (prestacaoData.prestacaoMetas ?? []).map(
              (meta) => ({
                id: normalizeId(meta.id),
                metaProjetoId: normalizeId(meta.metaProjetoId),
              }),
            ),
            produtosGerados: prestacaoData.produtosGerados ?? [],
            equipeProjeto: (prestacaoData.equipeProjeto ?? []).map(String),
            acoesDivulgacao: (prestacaoData.acoesDivulgacao ?? []).map(
              String,
            ),
          });
        } else {
          setForm(createEmptyPrestacaoContas());
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar prestação de contas.",
        );

        navigate("/prestacao-contas");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, location.pathname, navigate]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const propostasComSelecao = useMemo(() => {
    const options = [...propostas];

    if (
      form.propostaEdital &&
      !options.some((item) => normalizeId(item.id) === form.propostaEdital)
    ) {
      options.unshift({
        id: form.propostaEdital,
        nome: `Proposta vinculada #${form.propostaEdital}`,
      });
    }

    return options;
  }, [propostas, form.propostaEdital]);

  const agentesComSelecao = useMemo(() => {
    const options = [...agentes];

    if (
      form.agente &&
      !options.some((item) => normalizeId(item.id) === form.agente)
    ) {
      options.unshift({
        id: form.agente,
        nome: `Agente vinculado #${form.agente}`,
      });
    }

    return options;
  }, [agentes, form.agente]);

  const prestacoesMetasDaProposta = useMemo(() => {
    if (!form.propostaEdital) return prestacaoMetasOptions;

    return prestacaoMetasOptions.filter(
      (item) =>
        !item.propostaEditalId ||
        item.propostaEditalId === form.propostaEdital,
    );
  }, [prestacaoMetasOptions, form.propostaEdital]);

  const equipeDaProposta = useMemo(() => {
    if (!form.propostaEdital) return equipeProjeto;

    return equipeProjeto.filter(
      (equipe) =>
        !equipe.propostaEditalId ||
        equipe.propostaEditalId === form.propostaEdital,
    );
  }, [equipeProjeto, form.propostaEdital]);

  const acoesDaProposta = useMemo(() => {
    if (!form.propostaEdital) return acoesDivulgacao;

    return acoesDivulgacao.filter(
      (acao) =>
        !acao.propostaEditalId ||
        acao.propostaEditalId === form.propostaEdital,
    );
  }, [acoesDivulgacao, form.propostaEdital]);

  const prestacaoMetaOptions = useMemo(
    () => prestacoesMetasDaProposta.map((item) => normalizeId(item.id)),
    [prestacoesMetasDaProposta],
  );

  const produtoOptions = useMemo(
    () => produtoGeradoOptions.map((item) => item.value),
    [],
  );

  const equipeOptions = useMemo(
    () => equipeDaProposta.map((item) => normalizeId(item.id)),
    [equipeDaProposta],
  );

  const acoesOptions = useMemo(
    () => acoesDaProposta.map((item) => normalizeId(item.id)),
    [acoesDaProposta],
  );

  const prestacoesMetasSelecionadasIds = useMemo(
    () => form.prestacaoMetas.map((meta) => meta.id).filter(Boolean),
    [form.prestacaoMetas],
  );

  const propostaSelecionadaNome = useMemo(() => {
    if (!form.propostaEdital) return "";

    return getPropostaNome(propostasComSelecao, form.propostaEdital);
  }, [propostasComSelecao, form.propostaEdital]);

  const agenteSelecionadoNome = useMemo(() => {
    if (!form.agente) return "";

    return getAgenteNome(agentesComSelecao, form.agente);
  }, [agentesComSelecao, form.agente]);

  const handlePropostaChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      propostaEdital: value,
      prestacaoMetas: [],
      equipeProjeto: [],
      acoesDivulgacao: [],
    }));
  };

  const handlePrestacaoMetasChange = (values: string[]) => {
    if (visualizando) return;

    const ids = values.filter(Boolean).map(String);

    setForm((prev) => {
      const atuais = new Map(
        prev.prestacaoMetas.map((meta) => [meta.id, meta]),
      );

      return {
        ...prev,
        prestacaoMetas: ids.map((prestacaoMetaId) => {
          const existente = atuais.get(prestacaoMetaId);

          if (existente) return existente;

          const option = prestacaoMetasOptions.find(
            (item) => item.id === prestacaoMetaId,
          );

          return {
            id: prestacaoMetaId,
            metaProjetoId: option?.metaProjetoId ?? "",
          };
        }),
      };
    });
  };

  const possuiOutrosProdutos = form.produtosGerados.includes("OUTROS");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (visualizando) return;

    if (!form.propostaEdital) {
      toast.error("Selecione a proposta de edital.");
      return;
    }

    if (!form.agente) {
      toast.error("Selecione o agente.");
      return;
    }

    if (!form.dataEntrega) {
      toast.error("Informe a data de entrega.");
      return;
    }

    if (form.prestacaoMetas.length === 0) {
      toast.error("Informe ao menos uma prestação de meta.");
      return;
    }

    if (form.produtosGerados.length === 0) {
      toast.error("Informe ao menos um produto gerado.");
      return;
    }

    if (possuiOutrosProdutos && !form.outrosProdutosGerados.trim()) {
      toast.error("Descreva o produto gerado quando selecionar Outros.");
      return;
    }

    if (!form.disponibilizacaoProdutosPublico.trim()) {
      toast.error(
        "Informe como os produtos ficaram disponíveis para o público.",
      );
      return;
    }

    if (!form.resultadosGeradosProjeto.trim()) {
      toast.error("Informe quais foram os resultados gerados pelo projeto.");
      return;
    }

    if (!form.resumoResultados.trim()) {
      toast.error("Informe o resumo dos resultados.");
      return;
    }

    if (form.equipeProjeto.length === 0) {
      toast.error("Informe ao menos uma pessoa da equipe do projeto.");
      return;
    }

    if (form.acoesDivulgacao.length === 0) {
      toast.error("Informe ao menos uma ação de divulgação.");
      return;
    }

    try {
      setSaving(true);

      const payload = buildPrestacaoPayload({
        ...form,
        id: id ?? form.id,
      });

      if (editando && id) {
        await updatePrestacaoContas(Number(id), payload);
        toast.success("Prestação de contas atualizada com sucesso.");
      } else {
        await createPrestacaoContas(payload);
        salvarProximaAcaoPrestacaoContas();
        toast.success("Prestação de contas cadastrada com sucesso.");
      }

      navigate("/prestacao-contas", { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao salvar prestação de contas.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/prestacao-contas")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="mb-5 space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Prestação de Contas
            </h1>

            <HelpTooltip
              text="Registre o relatório de entrega da prestação de contas, vinculando proposta de edital, agente, prestações de metas já cadastradas, produtos gerados, equipe do projeto, ações de divulgação e resultados alcançados."
              label="Prestação de contas"
              size="md"
              side="bottom"
              align="start"
            />
          </div>
        </div>

        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
            strokeWidth={2.2}
          />

          <p className="text-[13px] leading-relaxed text-foreground">
            Use esta página para registrar a entrega da execução cultural:
            selecione a proposta, o agente, as prestações de metas já
            cadastradas, os produtos gerados, a equipe do projeto, as ações de
            divulgação e descreva os resultados alcançados.
          </p>
        </div>

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Você está visualizando estas informações. Para fazer alterações,
            clique em <span className="font-semibold">Editar</span> no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={Link2} title="Vínculos da prestação">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="propostaEdital"
                  required
                  tooltip="Selecione a proposta de edital relacionada a esta prestação de contas."
                >
                  Proposta de Edital
                </FieldLabel>

                {visualizando ? (
                  <Input
                    id="propostaEdital"
                    value={propostaSelecionadaNome || "—"}
                    disabled
                    readOnly
                    className="cursor-not-allowed bg-muted/40"
                  />
                ) : (
                  <Select
                    key={`proposta-${form.propostaEdital}-${propostasComSelecao.length}`}
                    value={String(form.propostaEdital || "")}
                    onValueChange={handlePropostaChange}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="propostaEdital">
                      <SelectValue placeholder="Selecione a proposta" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {propostasComSelecao.length === 0 ? (
                        <SelectItem value="sem-proposta" disabled>
                          Nenhuma proposta cadastrada
                        </SelectItem>
                      ) : (
                        propostasComSelecao.map((item) => (
                          <SelectItem
                            key={String(item.id)}
                            value={String(item.id)}
                          >
                            {item.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="agente"
                  required
                  tooltip="Selecione o agente cultural responsável pela prestação de contas."
                >
                  Agente
                </FieldLabel>

                {visualizando ? (
                  <Input
                    id="agente"
                    value={agenteSelecionadoNome || "—"}
                    disabled
                    readOnly
                    className="cursor-not-allowed bg-muted/40"
                  />
                ) : (
                  <Select
                    key={`agente-${form.agente}-${agentesComSelecao.length}`}
                    value={String(form.agente || "")}
                    onValueChange={(value) => set("agente", String(value))}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="agente">
                      <SelectValue placeholder="Selecione o agente" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {agentesComSelecao.length === 0 ? (
                        <SelectItem value="sem-agente" disabled>
                          Nenhum agente cadastrado
                        </SelectItem>
                      ) : (
                        agentesComSelecao.map((item) => (
                          <SelectItem
                            key={String(item.id)}
                            value={String(item.id)}
                          >
                            {item.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </div>
          </Section>

          <Section icon={CalendarRange} title="Data de entrega">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="dataEntrega"
                  required
                  tooltip="Informe a data de entrega ou envio do relatório de prestação de contas."
                >
                  Data de Entrega
                </FieldLabel>

                <Input
                  id="dataEntrega"
                  type="date"
                  value={form.dataEntrega}
                  onChange={(e) => set("dataEntrega", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={MessageSquareText} title="Resumo dos resultados">
            <Field>
              <FieldLabel
                htmlFor="resumoResultados"
                required
                tooltip="Registre um resumo geral dos resultados obtidos com a execução do projeto."
              >
                Resumo dos Resultados
              </FieldLabel>

              <Textarea
                id="resumoResultados"
                value={form.resumoResultados}
                onChange={(e) => set("resumoResultados", e.target.value)}
                rows={5}
                disabled={bloqueado}
                readOnly={visualizando}
              />
            </Field>
          </Section>

          <Section icon={ClipboardCheck} title="Prestações de metas vinculadas">
            <Field>
              <FieldLabel
                htmlFor="prestacaoMetas"
                required
                tooltip="Selecione as prestações de metas já cadastradas que fazem parte desta prestação de contas."
              >
                Prestações de Metas
              </FieldLabel>

              <div className={visualizando ? "pointer-events-none opacity-80" : ""}>
                <MultiSelect
                  id="prestacaoMetas"
                  options={prestacaoMetaOptions}
                  value={prestacoesMetasSelecionadasIds}
                  onChange={handlePrestacaoMetasChange}
                  getOptionLabel={(value) =>
                    getPrestacaoMetaNome(prestacaoMetasOptions, value)
                  }
                />
              </div>
            </Field>
          </Section>

          <Section icon={PackageCheck} title="Produtos gerados">
            <div className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="produtosGerados"
                  required
                  tooltip="Selecione os produtos culturais gerados pela execução do projeto."
                >
                  Produtos Gerados
                </FieldLabel>

                <div className={visualizando ? "pointer-events-none opacity-80" : ""}>
                  <MultiSelect
                    id="produtosGerados"
                    options={produtoOptions}
                    value={form.produtosGerados}
                    onChange={(value) =>
                      set(
                        "produtosGerados",
                        value.filter(Boolean) as ProdutoGerado[],
                      )
                    }
                    getOptionLabel={produtoGeradoLabel}
                  />
                </div>
              </Field>

              {possuiOutrosProdutos && (
                <Field>
                  <FieldLabel
                    htmlFor="outrosProdutosGerados"
                    required
                    tooltip="Descreva quais outros produtos foram gerados."
                  >
                    Outros Produtos Gerados
                  </FieldLabel>

                  <Textarea
                    id="outrosProdutosGerados"
                    value={form.outrosProdutosGerados}
                    onChange={(e) =>
                      set("outrosProdutosGerados", e.target.value)
                    }
                    rows={3}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              )}

              <Field>
                <FieldLabel
                  htmlFor="disponibilizacaoProdutosPublico"
                  required
                  tooltip="Explique como os produtos desenvolvidos ficaram disponíveis para o público após o fim do projeto."
                >
                  Como os produtos desenvolvidos ficaram disponíveis para o
                  público após o fim do projeto?
                </FieldLabel>

                <Textarea
                  id="disponibilizacaoProdutosPublico"
                  value={form.disponibilizacaoProdutosPublico}
                  onChange={(e) =>
                    set("disponibilizacaoProdutosPublico", e.target.value)
                  }
                  rows={4}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="resultadosGeradosProjeto"
                  required
                  tooltip="Descreva os resultados gerados pelo projeto."
                >
                  Resultados Gerados
                </FieldLabel>

                <Textarea
                  id="resultadosGeradosProjeto"
                  value={form.resultadosGeradosProjeto}
                  onChange={(e) =>
                    set("resultadosGeradosProjeto", e.target.value)
                  }
                  rows={4}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={UsersRound} title="Equipe do projeto">
            <Field>
              <FieldLabel
                htmlFor="equipeProjeto"
                required
                tooltip="Selecione as pessoas da equipe da proposta que participaram da execução do projeto."
              >
                Equipe do Projeto
              </FieldLabel>

              <div className={visualizando ? "pointer-events-none opacity-80" : ""}>
                <MultiSelect
                  id="equipeProjeto"
                  options={equipeOptions}
                  value={form.equipeProjeto}
                  onChange={(value) =>
                    set("equipeProjeto", value.filter(Boolean).map(String))
                  }
                  getOptionLabel={(value) =>
                    getEquipeNome(equipeProjeto, value)
                  }
                />
              </div>
            </Field>
          </Section>

          <Section icon={Megaphone} title="Ações de divulgação">
            <Field>
              <FieldLabel
                htmlFor="acoesDivulgacao"
                required
                tooltip="Selecione as ações de divulgação vinculadas à proposta."
              >
                Ações de Divulgação
              </FieldLabel>

              <div className={visualizando ? "pointer-events-none opacity-80" : ""}>
                <MultiSelect
                  id="acoesDivulgacao"
                  options={acoesOptions}
                  value={form.acoesDivulgacao}
                  onChange={(value) =>
                    set("acoesDivulgacao", value.filter(Boolean).map(String))
                  }
                  getOptionLabel={(value) =>
                    getAcaoNome(acoesDivulgacao, value)
                  }
                />
              </div>
            </Field>
          </Section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/prestacao-contas")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                className="sm:min-w-40"
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
        <WikiFloatingButton
          pageTitle="Prestação de Contas"
          href="https://www.aurit.com.br/wiki/prestacao-de-contas/prestacao-de-contas"
        />
      </div>
    </AppLayout>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded border border-border p-5 shadow-none sm:p-6">
      <div className="mb-5 flex items-center gap-2.5 border-b border-border pb-3">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />

        <h2 className="text-sm font-semibold uppercase leading-tight tracking-wide text-foreground">
          {title}
        </h2>
      </div>

      {children}
    </Card>
  );
}

function Field({
  children,
  full,
}: {
  children: ReactNode;
  full?: boolean;
}) {
  return <div className={full ? "sm:col-span-3" : ""}>{children}</div>;
}