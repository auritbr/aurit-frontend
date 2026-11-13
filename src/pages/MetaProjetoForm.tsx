import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Target, ClipboardCheck, Link2 } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { ajudaMetasProjeto } from "@/components/metasProjeto/textosMetaProjeto";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { BackButton } from "@/components/BackButton";
import { ImportDataButton } from "@/components/ImportDataButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { PlanejamentoFinanceiroMeta } from "@/components/metasProjeto/PlanejamentoFinanceiroMeta";
import {
  carregarPlanejamento,
  dadosPlanejamento,
  planejamentoVazio,
  validarPlanejamento,
} from "@/components/metasProjeto/planejamentoMeta";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { FormLegend } from "@/components/FormLegend";
import { getImportConfigForPath } from "@/config/importacoes";
import {
  buildMetaProjetoPayload,
  createMetaProjeto,
  getMetaProjetoById,
  getMetasProjeto,
  getProjetosOptions,
  getPropostasEditalOptions,
  updateMetaProjeto,
  type MetaProjeto,
  type ProjetoOption,
  type PropostaEditalOption,
} from "@/data/metasProjeto";
import {
  getOrcamentoMeta,
  salvarItemOrcamentoMeta,
  type ItemOrcamentoMeta,
} from "@/data/orcamentoMeta";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

function salvarProximaAcaoMetaProjeto() {
  emitJourneyNextStep();
}

interface FormState {
  tituloMeta: string;
  descricaoMeta: string;
  quantidadePrevista: string;
  formaComprovacao: string;
  projeto: string;
  propostaEdital: string;
}

const initial: FormState = {
  tituloMeta: "",
  descricaoMeta: "",
  quantidadePrevista: "",
  formaComprovacao: "",
  projeto: "",
  propostaEdital: "",
};

function criacaoSemConfirmacao(error: unknown) {
  return (
    !(error instanceof ApiError) || error.status === 0 || error.status >= 500
  );
}

const sanitizeQuantidade = (raw: string) => {
  let value = raw.replace(/[^\d,.]/g, "");
  const firstSeparator = value.search(/[,.]/);

  if (firstSeparator >= 0) {
    const head = value.slice(0, firstSeparator + 1);
    const tail = value.slice(firstSeparator + 1).replace(/[,.]/g, "");
    value = head + tail;
  }

  return value;
};

const parseQuantidade = (value: string) => {
  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : NaN;
};

function toStringId(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function getProjetoNome(projetos: ProjetoOption[], projetoId: string) {
  return (
    projetos.find((projeto) => String(projeto.id) === String(projetoId))
      ?.nome || `Projeto ${projetoId}`
  );
}

function getPropostaNome(
  propostas: PropostaEditalOption[],
  propostaId: string,
) {
  return (
    propostas.find((proposta) => String(proposta.id) === String(propostaId))
      ?.nome || `Proposta ${propostaId}`
  );
}

export default function MetaProjetoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [existingMeta, setExistingMeta] = useState<MetaProjeto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [propostas, setPropostas] = useState<PropostaEditalOption[]>([]);
  const [ordemAtual, setOrdemAtual] = useState<number>(1);
  const [planejamento, setPlanejamento] = useState(planejamentoVazio);
  const [orcamento, setOrcamento] = useState<{
    dados: typeof planejamentoVazio;
    item?: ItemOrcamentoMeta;
    temItensMultiplos: boolean;
  }>({ dados: planejamentoVazio, temItensMultiplos: false });
  const [consultandoOrcamento, setConsultandoOrcamento] = useState(Boolean(id));
  const [erroOrcamento, setErroOrcamento] = useState("");
  const [tentativaOrcamento, setTentativaOrcamento] = useState(0);
  const [metaSalva, setMetaSalva] = useState<{ id: string; dados: string }>();
  const [criacaoIncerta, setCriacaoIncerta] = useState("");

  const bloqueado = visualizando || loading || saving;
  const valorLegado = Boolean(
    orcamento.item && orcamento.item.dados.quantidadePrevista !== 1,
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const projetoSelectValue =
    form.projeto || String(existingMeta?.projeto ?? "");

  const propostaSelectValue =
    form.propostaEdital || String(existingMeta?.propostaEdital ?? "");

  const projetosComFallback = useMemo(() => {
    const options = [...projetos];

    const projetoId = projetoSelectValue;

    if (
      projetoId &&
      !options.some((projeto) => String(projeto.id) === String(projetoId))
    ) {
      options.unshift({
        id: projetoId,
        nome: getProjetoNome(projetos, projetoId),
      });
    }

    return options;
  }, [projetos, projetoSelectValue]);

  const propostasFiltradas = useMemo(() => {
    const projetoId = projetoSelectValue;

    if (!projetoId) return propostas;

    return propostas.filter(
      (proposta) =>
        !proposta.projetoId || String(proposta.projetoId) === String(projetoId),
    );
  }, [propostas, projetoSelectValue]);

  const propostasComFallback = useMemo(() => {
    const options = [...propostasFiltradas];

    const propostaId = propostaSelectValue;

    if (
      propostaId &&
      !options.some((proposta) => String(proposta.id) === String(propostaId))
    ) {
      options.unshift({
        id: propostaId,
        nome: getPropostaNome(propostas, propostaId),
        projetoId: projetoSelectValue || undefined,
      });
    }

    return options;
  }, [propostasFiltradas, propostas, propostaSelectValue, projetoSelectValue]);

  const confirmarImportacaoSalva = useImportFormFill(
    "metas-projeto",
    form,
    setForm,
  );

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [projetosData, propostasData, metaData, metasData] =
          await Promise.all([
            getProjetosOptions(),
            getPropostasEditalOptions(),
            id ? getMetaProjetoById(Number(id)) : Promise.resolve(null),
            id ? Promise.resolve([]) : getMetasProjeto(),
          ]);

        if (!active) return;

        setProjetos(projetosData);
        setPropostas(propostasData);

        if (metaData) {
          const projetoId = toStringId(metaData.projeto);
          const propostaEditalId = toStringId(metaData.propostaEdital);

          setExistingMeta({
            ...metaData,
            projeto: projetoId,
            propostaEdital: propostaEditalId,
          });

          setForm({
            tituloMeta: metaData.tituloMeta ?? "",
            descricaoMeta: metaData.descricaoMeta ?? "",
            quantidadePrevista:
              metaData.quantidadePrevista != null
                ? String(metaData.quantidadePrevista).replace(".", ",")
                : "",
            formaComprovacao: metaData.formaComprovacao ?? "",
            projeto: projetoId,
            propostaEdital: propostaEditalId,
          });

          setOrdemAtual(metaData.ordem || 1);
        } else {
          const maiorOrdem = metasData.reduce(
            (acc, item) => Math.max(acc, Number(item.ordem || 0)),
            0,
          );

          setExistingMeta(null);
          setForm(initial);
          setOrdemAtual(maiorOrdem + 1);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar dados da meta.",
        );

        navigate("/metas-projeto");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  useEffect(() => {
    setPlanejamento(planejamentoVazio);
    setOrcamento({ dados: planejamentoVazio, temItensMultiplos: false });
    if (!id) {
      setErroOrcamento("");
      setConsultandoOrcamento(false);
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    setConsultandoOrcamento(true);
    setErroOrcamento("");
    void getOrcamentoMeta(id, signal)
      .then(({ itens, totais }) => {
        if (signal.aborted) return;
        const ativos = itens
          .map(({ item }) => item)
          .filter(({ ativo }) => ativo);
        const dados = carregarPlanejamento(ativos, totais.valorPrevisto);
        setPlanejamento(dados);
        setOrcamento({
          dados,
          item: ativos.length === 1 ? ativos[0] : undefined,
          temItensMultiplos: ativos.length > 1,
        });
      })
      .catch(() => {
        if (!signal.aborted)
          setErroOrcamento(
            "Não foi possível carregar o planejamento financeiro. Você pode tentar novamente ou salvar apenas os dados da meta.",
          );
      })
      .finally(() => {
        if (!signal.aborted) setConsultandoOrcamento(false);
      });
    return () => controller.abort();
  }, [id, tentativaOrcamento]);

  const handleProjetoChange = (value: string) => {
    if (visualizando) return;

    setForm((prev) => ({
      ...prev,
      projeto: String(value),
      propostaEdital: "",
    }));
  };

  const handlePropostaChange = (value: string) => {
    if (visualizando) return;

    set("propostaEdital", String(value));
  };

  function getFormComVinculos(): FormState {
    return {
      ...form,
      projeto: projetoSelectValue,
      propostaEdital: propostaSelectValue,
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (bloqueado || consultandoOrcamento || criacaoIncerta) return;

    const formComVinculos = getFormComVinculos();

    if (!formComVinculos.tituloMeta.trim()) {
      toast.error("Informe o título da meta.");
      return;
    }

    if (!formComVinculos.descricaoMeta.trim()) {
      toast.error("Informe a descrição da meta.");
      return;
    }

    const quantidade = parseQuantidade(formComVinculos.quantidadePrevista);

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      toast.error("Informe uma quantidade prevista válida e maior que zero.");
      return;
    }

    if (!formComVinculos.projeto) {
      toast.error("Selecione o projeto da meta.");
      return;
    }

    const planejamentoAlterado =
      !erroOrcamento &&
      !orcamento.temItensMultiplos &&
      (planejamento.valorEstimado !== orcamento.dados.valorEstimado ||
        planejamento.inicio !== orcamento.dados.inicio ||
        planejamento.termino !== orcamento.dados.termino);
    if (planejamentoAlterado) {
      const erro = validarPlanejamento(planejamento, valorLegado);
      if (erro) {
        toast.error(erro);
        return;
      }
    }

    let mensagemFalha =
      "Não foi possível salvar a meta. Verifique as informações e tente novamente.";
    try {
      setSaving(true);

      const meta: MetaProjeto = {
        id: id ?? metaSalva?.id ?? "",
        tituloMeta: formComVinculos.tituloMeta.trim(),
        descricaoMeta: formComVinculos.descricaoMeta.trim(),
        quantidadePrevista: quantidade,
        formaComprovacao: formComVinculos.formaComprovacao.trim(),
        ordem: ordemAtual,
        projeto: formComVinculos.projeto,
        propostaEdital: formComVinculos.propostaEdital,
      };

      const payload = buildMetaProjetoPayload(meta);

      let metaId = id ?? metaSalva?.id;
      if (!metaId) {
        try {
          const criada = await createMetaProjeto(payload);
          if (!criada.id)
            throw new Error("Não foi possível identificar a meta cadastrada.");
          metaId = criada.id;
          setMetaSalva({
            id: metaId,
            dados: JSON.stringify({ ...payload, id: Number(metaId) }),
          });
        } catch (error) {
          if (criacaoSemConfirmacao(error)) {
            setCriacaoIncerta(
              "Não foi possível confirmar a criação da meta. Confira a lista de metas antes de tentar cadastrá-la novamente.",
            );
          }
          throw error;
        }
      } else if (metaSalva?.dados !== JSON.stringify(payload)) {
        await updateMetaProjeto(Number(metaId), payload);
        setMetaSalva({ id: metaId, dados: JSON.stringify(payload) });
      }

      if (planejamentoAlterado) {
        mensagemFalha = "Não foi possível salvar o planejamento financeiro.";
        const itemId = orcamento.item?.id;
        if (itemId == null && id) {
          const atual = await getOrcamentoMeta(metaId);
          if (atual.itens.some(({ item }) => item.ativo)) {
            setCriacaoIncerta(
              "Já existe um planejamento para esta meta. Reabra o cadastro para conferir os dados salvos.",
            );
            return;
          }
        }
        try {
          const salvo = await salvarItemOrcamentoMeta(
            metaId,
            dadosPlanejamento(planejamento, orcamento.item),
            itemId,
          );
          if (!salvo?.id) throw new Error(mensagemFalha);
        } catch (error) {
          if (itemId == null && criacaoSemConfirmacao(error)) {
            setCriacaoIncerta(
              "Não foi possível confirmar o salvamento do planejamento. Reabra a meta para conferir os dados antes de tentar novamente.",
            );
          }
          throw error;
        }
      }

      confirmarImportacaoSalva();
      if (!editando) salvarProximaAcaoMetaProjeto();
      toast.success(
        editando
          ? "Meta atualizada com sucesso."
          : "Meta cadastrada com sucesso.",
      );
      navigate("/metas-projeto");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? `${mensagemFalha} ${error.message}`
          : mensagemFalha,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div
        data-mobile-data-page="execution"
        className="container max-w-4xl py-6 sm:py-8"
      >
        <BackButton to="/metas-projeto" />

        <PageTitle
          title={
            visualizando
              ? "Metas do Projeto"
              : editando
                ? "Metas do Projeto"
                : "Metas do Projeto"
          }
          tooltip={ajudaMetasProjeto}
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/metas-projeto")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
          showImport={false}
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={visualizando}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            <FormSectionCard
              icon={Link2}
              title="Vínculo da meta"
              description="Informe o projeto ao qual esta meta pertence. Se a meta também estiver vinculada a uma proposta de edital, informe a proposta correspondente."
            >
              <p className="mb-4 text-xs leading-5 text-muted-foreground">
                O vínculo com um projeto é obrigatório. A proposta de edital
                deve ser informada apenas quando esta meta também fizer parte de
                uma proposta.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="projeto"
                    required={!visualizando}
                    tooltip="Informe o projeto no qual esta meta será planejada e acompanhada."
                  >
                    Projeto
                  </FieldLabel>

                  <Select
                    value={projetoSelectValue}
                    onValueChange={handleProjetoChange}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="projeto">
                      <SelectValue placeholder="Selecione o projeto" />
                    </SelectTrigger>

                    <SelectContent>
                      {projetosComFallback.length === 0 ? (
                        <SelectItem value="sem-projeto" disabled>
                          Nenhum projeto disponível
                        </SelectItem>
                      ) : (
                        projetosComFallback.map((projeto) => (
                          <SelectItem
                            key={String(projeto.id)}
                            value={String(projeto.id)}
                          >
                            {projeto.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="propostaEdital"
                    tooltip="Informe a proposta de edital quando esta meta também fizer parte dos compromissos ou resultados previstos nessa proposta."
                  >
                    Proposta de Edital
                  </FieldLabel>

                  <Select
                    value={propostaSelectValue}
                    onValueChange={handlePropostaChange}
                    disabled={bloqueado || !projetoSelectValue}
                  >
                    <SelectTrigger id="propostaEdital">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>

                    <SelectContent>
                      {propostasComFallback.length === 0 ? (
                        <SelectItem value="sem-proposta" disabled>
                          Nenhuma proposta disponível
                        </SelectItem>
                      ) : (
                        propostasComFallback.map((proposta) => (
                          <SelectItem
                            key={String(proposta.id)}
                            value={String(proposta.id)}
                          >
                            {proposta.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Target}
              title="Definição da meta"
              description="Informe o resultado ou entrega que deverá ser alcançado e a quantidade prevista para o cumprimento desta meta."
            >
              <div className="space-y-4">
                <Field>
                  <FieldLabel
                    htmlFor="tituloMeta"
                    required={!visualizando}
                    tooltip="Informe um título curto que permita identificar facilmente o resultado ou entrega prevista nesta meta."
                  >
                    Título da Meta
                  </FieldLabel>

                  <Input
                    id="tituloMeta"
                    value={form.tituloMeta}
                    onChange={(e) => set("tituloMeta", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="descricaoMeta"
                    required={!visualizando}
                    tooltip="Descreva de forma objetiva o que deverá ser realizado ou alcançado, deixando claro o resultado esperado da meta."
                  >
                    Descrição da Meta
                  </FieldLabel>

                  <Textarea
                    id="descricaoMeta"
                    value={form.descricaoMeta}
                    onChange={(e) => set("descricaoMeta", e.target.value)}
                    rows={3}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="quantidadePrevista"
                    required={!visualizando}
                    tooltip="Informe a quantidade prevista para o resultado ou entrega descrita na meta, como número de participantes, oficinas, apresentações, produtos ou outras unidades previstas."
                  >
                    Quantidade Prevista
                  </FieldLabel>

                  <Input
                    id="quantidadePrevista"
                    inputMode="decimal"
                    value={form.quantidadePrevista}
                    onChange={(e) =>
                      set(
                        "quantidadePrevista",
                        sanitizeQuantidade(e.target.value),
                      )
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={ClipboardCheck}
              title="Comprovação da meta"
              description="Informe quais registros, documentos ou evidências poderão ser utilizados para demonstrar o cumprimento da meta."
            >
              <Field>
                <FieldLabel
                  htmlFor="formaComprovacao"
                  tooltip="Informe quais registros ou documentos poderão demonstrar que a meta foi cumprida, como listas de presença, fotografias, vídeos, relatórios, certificados ou materiais produzidos."
                >
                  Forma de Comprovação
                </FieldLabel>

                <Textarea
                  id="formaComprovacao"
                  value={form.formaComprovacao}
                  onChange={(e) => set("formaComprovacao", e.target.value)}
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </FormSectionCard>
            <PlanejamentoFinanceiroMeta
              dados={planejamento}
              alterar={setPlanejamento}
              bloqueado={bloqueado}
              temPlanejamento={Boolean(orcamento.item)}
              temItensMultiplos={orcamento.temItensMultiplos}
              valorLegado={valorLegado}
              consultando={consultandoOrcamento}
              erroConsulta={erroOrcamento}
              recarregar={() => setTentativaOrcamento((valor) => valor + 1)}
            />
          </fieldset>

          {criacaoIncerta && (
            <p role="alert" className="text-sm text-destructive">
              {criacaoIncerta}
            </p>
          )}
          {!visualizando && (
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/metas-projeto")}
                disabled={loading || saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={
                  loading ||
                  saving ||
                  consultandoOrcamento ||
                  Boolean(criacaoIncerta)
                }
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}

          {visualizando && (
            <div className="flex pt-2 sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/metas-projeto")}
              >
                Voltar
              </Button>
            </div>
          )}
        </form>
        <WikiFloatingButton
          pageTitle="Metas do Projeto"
          href="https://www.aurit.com.br/wiki/projetos/metas-do-projeto"
        />
      </div>
    </AppLayout>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
