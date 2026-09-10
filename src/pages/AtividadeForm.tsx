import { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ClipboardList, Users2, Tags, Link2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { BackButton } from "@/components/BackButton";
import { ImportDataButton } from "@/components/ImportDataButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { ListPageHeader } from "@/components/list/ListPageHeader";
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
import { FormLegend } from "@/components/FormLegend";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { MultiSelect } from "@/components/MultiSelect";
import { getImportConfigForPath } from "@/config/importacoes";
import {
  buildAtividadePayload,
  createAtividade,
  getAtividadeById,
  getColaboradoresOptions,
  getProjetosOptions,
  statusAtividade,
  tiposAtividade,
  updateAtividade,
  type Atividade,
  type ColaboradorOption,
  type ProjetoOption,
} from "@/data/atividades";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

function salvarProximaAcaoAtividade() {
  emitJourneyNextStep();
}

interface FormState {
  id: string;
  nomeAtividade: string;
  descricaoAtividade: string;
  publicoBeneficiadoAtividade: string;
  localAtividade: string;
  dataInicio: string;
  dataFim: string;
  quantidadeVagas: string;
  tipoAtividade: string;
  status: string;
  projeto: string;
  projetoNome: string;
  colaboradores: string[];
}

const initial: FormState = {
  id: "",
  nomeAtividade: "",
  descricaoAtividade: "",
  publicoBeneficiadoAtividade: "",
  localAtividade: "",
  dataInicio: "",
  dataFim: "",
  quantidadeVagas: "",
  tipoAtividade: "",
  status: "",
  projeto: "",
  projetoNome: "",
  colaboradores: [],
};

const onlyDigits = (v: string, max = 6) => v.replace(/\D/g, "").slice(0, max);

function hojeIso() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function dataFimPassada(dataFim: string) {
  if (!dataFim) return false;

  return dataFim < hojeIso();
}

function statusPermiteDataFimPassada(status: string) {
  return status === "INATIVO" || status === "CONCLUIDO";
}

function mapAtividadeToForm(atividade: Atividade): FormState {
  return {
    id: atividade.id ?? "",
    nomeAtividade: atividade.nomeAtividade ?? "",
    descricaoAtividade: atividade.descricaoAtividade ?? "",
    publicoBeneficiadoAtividade: atividade.publicoBeneficiadoAtividade ?? "",
    localAtividade: atividade.localAtividade ?? "",
    dataInicio: atividade.dataInicio ?? "",
    dataFim: atividade.dataFim ?? "",
    quantidadeVagas: atividade.quantidadeVagas ?? "",
    tipoAtividade: atividade.tipoAtividade ?? "",
    status: atividade.status ?? "",
    projeto: atividade.projetoId ?? "",
    projetoNome: atividade.projetoNome ?? "",
    colaboradores: atividade.colaboradoresIds ?? [],
  };
}

function getProjetoNome(projetos: ProjetoOption[], projetoId: string) {
  return (
    projetos.find((projeto) => String(projeto.id) === String(projetoId))
      ?.nome || `Projeto ${projetoId}`
  );
}

export default function AtividadeForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const duplicarId = !id ? searchParams.get("duplicar") : null;

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const isEdit = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [existingAtividade, setExistingAtividade] = useState<Atividade | null>(
    null,
  );
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const projetoSelectValue =
    form.projeto || String(existingAtividade?.projetoId ?? "");

  const projetosOptions = useMemo(() => {
    const options = [...projetos];

    const projetoId =
      form.projeto || String(existingAtividade?.projetoId ?? "");

    const projetoNome =
      form.projetoNome ||
      existingAtividade?.projetoNome ||
      getProjetoNome(projetos, projetoId);

    if (
      projetoId &&
      !options.some((projeto) => String(projeto.id) === String(projetoId))
    ) {
      options.unshift({
        id: projetoId,
        nome: projetoNome,
      });
    }

    return options;
  }, [projetos, form.projeto, form.projetoNome, existingAtividade]);

  useImportFormFill("atividades", setForm);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [projetosData, colaboradoresData, atividadeData] =
          await Promise.all([
            getProjetosOptions(),
            getColaboradoresOptions(),
            id || duplicarId
              ? getAtividadeById(Number(id ?? duplicarId))
              : Promise.resolve(null),
          ]);

        if (!active) return;

        setProjetos(projetosData);
        setColaboradores(colaboradoresData);

        if (atividadeData) {
          const mapped = mapAtividadeToForm(atividadeData);

          const projetoId =
            mapped.projeto || String(atividadeData.projetoId ?? "");

          const projetoSelecionado = projetosData.find(
            (projeto) => String(projeto.id) === String(projetoId),
          );

          const projetoNome =
            mapped.projetoNome ||
            atividadeData.projetoNome ||
            projetoSelecionado?.nome ||
            (projetoId ? `Projeto ${projetoId}` : "");

          setExistingAtividade({
            ...atividadeData,
            projetoId,
            projetoNome,
          });

          setForm({
            ...mapped,
            id: duplicarId ? "" : mapped.id,
            nomeAtividade: duplicarId
              ? `Cópia de ${mapped.nomeAtividade}`
              : mapped.nomeAtividade,
            dataInicio: duplicarId ? "" : mapped.dataInicio,
            dataFim: duplicarId ? "" : mapped.dataFim,
            status: duplicarId ? "PENDENTE" : mapped.status,
            projeto: projetoId,
            projetoNome,
          });
        } else {
          setExistingAtividade(null);
          setForm(initial);
        }
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o formulário.",
        );
        navigate("/atividades");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, duplicarId, navigate]);

  const colaboradoresOptions = colaboradores.map((c) => c.id);

  const colaboradorLabel = (colaboradorId: string) =>
    colaboradores.find((c) => String(c.id) === String(colaboradorId))?.nome ??
    colaboradorId;

  function getFormComProjeto(): FormState {
    const projetoId =
      form.projeto || String(existingAtividade?.projetoId ?? "");

    const projetoSelecionado = projetosOptions.find(
      (projeto) => String(projeto.id) === String(projetoId),
    );

    return {
      ...form,
      projeto: projetoId,
      projetoNome:
        form.projetoNome ||
        projetoSelecionado?.nome ||
        existingAtividade?.projetoNome ||
        "",
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (visualizando) return;

    const formComProjeto = getFormComProjeto();

    if (!formComProjeto.nomeAtividade.trim()) {
      toast.error("Informe o nome da atividade.");
      return;
    }

    if (!formComProjeto.descricaoAtividade.trim()) {
      toast.error("Informe a descrição da atividade.");
      return;
    }

    if (!formComProjeto.publicoBeneficiadoAtividade.trim()) {
      toast.error("Informe o público beneficiado.");
      return;
    }

    if (!formComProjeto.dataInicio) {
      toast.error("Informe a data de início da atividade.");
      return;
    }

    if (
      formComProjeto.dataInicio &&
      formComProjeto.dataFim &&
      formComProjeto.dataFim < formComProjeto.dataInicio
    ) {
      toast.error("A data de término deve ser posterior à data de início.");
      return;
    }

    if (formComProjeto.status === "CONCLUIDO" && !formComProjeto.dataFim) {
      toast.error(
        "Informe a data de término quando a atividade estiver concluída.",
      );
      return;
    }

    if (
      formComProjeto.dataFim &&
      dataFimPassada(formComProjeto.dataFim) &&
      !statusPermiteDataFimPassada(formComProjeto.status)
    ) {
      toast.error(
        "Atividade com data de término passada deve estar com status Inativo ou Concluído.",
      );
      return;
    }

    if (
      formComProjeto.quantidadeVagas.trim() &&
      Number(formComProjeto.quantidadeVagas) < 0
    ) {
      toast.error("A quantidade de vagas não pode ser negativa.");
      return;
    }

    if (!formComProjeto.tipoAtividade) {
      toast.error("Selecione o tipo de atividade.");
      return;
    }

    if (!formComProjeto.status) {
      toast.error("Selecione o status da atividade.");
      return;
    }

    if (!formComProjeto.projeto) {
      toast.error("Selecione o projeto.");
      return;
    }

    const atividade: Atividade = {
      id: id ?? "",
      nomeAtividade: formComProjeto.nomeAtividade.trim(),
      descricaoAtividade: formComProjeto.descricaoAtividade.trim(),
      publicoBeneficiadoAtividade:
        formComProjeto.publicoBeneficiadoAtividade.trim(),
      localAtividade: formComProjeto.localAtividade.trim(),
      quantidadeVagas: formComProjeto.quantidadeVagas.trim(),
      dataInicio: formComProjeto.dataInicio,
      dataFim: formComProjeto.dataFim,
      tipoAtividade: formComProjeto.tipoAtividade,
      status: formComProjeto.status,
      projetoId: formComProjeto.projeto,
      projetoNome: formComProjeto.projetoNome,
      colaboradoresIds: formComProjeto.colaboradores,
      colaboradoresNomes: [],
    };

    try {
      setSaving(true);

      const payload = buildAtividadePayload(atividade);

      if (isEdit && id) {
        await updateAtividade(Number(id), payload);
        toast.success("Atividade atualizada com sucesso.");
      } else {
        await createAtividade(payload);
        salvarProximaAcaoAtividade();
        toast.success("Atividade salva com sucesso.");
      }

      navigate("/atividades");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a atividade.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/atividades" />

        <ListPageHeader
          title="Atividades"
          tooltip="Nesta página são cadastradas e acompanhadas as atividades vinculadas aos projetos da organização, com informações sobre identificação, tipo, descrição, público atendido, local, período de realização, quantidade de vagas, situação atual e equipe envolvida. Esses dados ajudam a organizar a execução das atividades e apoiam o registro de participantes, presenças, evidências, relatórios e prestações de contas."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/atividades")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={visualizando}
            className="space-y-5 border-0 p-0 disabled:opacity-100"
          >
            <FormSectionCard
              icon={Link2}
              title="Vínculo da atividade"
              description="Defina a qual projeto esta atividade pertence. Esse vínculo permite organizar a atividade dentro do planejamento e do acompanhamento do projeto."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="projeto"
                    required
                    tooltip="Informe o projeto ao qual esta atividade pertence."
                  >
                    Projeto
                  </FieldLabel>

                  <Select
                    value={projetoSelectValue}
                    onValueChange={(v) => {
                      if (visualizando) return;

                      const projetoSelecionado = projetosOptions.find(
                        (projeto) => String(projeto.id) === String(v),
                      );

                      setForm((prev) => ({
                        ...prev,
                        projeto: String(v),
                        projetoNome:
                          projetoSelecionado?.nome ?? prev.projetoNome,
                      }));
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="projeto">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {projetosOptions.map((p) => (
                        <SelectItem key={String(p.id)} value={String(p.id)}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={ClipboardList}
              title="Identificação da atividade"
              description="Identifique a atividade e explique de forma clara o que será realizado, para que ela possa ser compreendida e diferenciada das demais ações do projeto."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="nomeAtividade"
                    required
                    tooltip="Informe um nome curto e claro que permita identificar facilmente a atividade dentro do projeto."
                  >
                    Nome da Atividade
                  </FieldLabel>

                  <Input
                    id="nomeAtividade"
                    value={form.nomeAtividade}
                    onChange={(e) => set("nomeAtividade", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="tipoAtividade"
                    required
                    tooltip="Informe a opção que melhor representa o formato ou natureza da atividade, como oficina, curso, palestra, seminário ou atividade educativa."
                  >
                    Tipo de Atividade
                  </FieldLabel>

                  <Select
                    value={form.tipoAtividade}
                    onValueChange={(v) => {
                      if (visualizando) return;
                      set("tipoAtividade", v);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="tipoAtividade">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {tiposAtividade.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="descricaoAtividade"
                    required
                    tooltip="Descreva o que será realizado na atividade, explicando seu objetivo, como será desenvolvida e quais ações, conteúdos ou etapas estão previstas."
                  >
                    Descrição da Atividade
                  </FieldLabel>

                  <Textarea
                    id="descricaoAtividade"
                    value={form.descricaoAtividade}
                    onChange={(e) => set("descricaoAtividade", e.target.value)}
                    rows={4}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Users2}
              title="Público e realização"
              description="Defina quem participará da atividade e organize as principais condições para sua realização, incluindo local, período e disponibilidade de vagas."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field full>
                  <FieldLabel
                    htmlFor="publico"
                    required
                    tooltip="Informe quem será diretamente atendido pela atividade, considerando características como faixa etária, território, comunidade ou grupo específico."
                  >
                    Público Beneficiado
                  </FieldLabel>

                  <Textarea
                    id="publico"
                    value={form.publicoBeneficiadoAtividade}
                    onChange={(e) =>
                      set("publicoBeneficiadoAtividade", e.target.value)
                    }
                    rows={3}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="localAtividade"
                    tooltip="Informe o local, espaço ou território onde a atividade será realizada. Pode ser um espaço físico ou ambiente virtual."
                  >
                    Local da Atividade
                  </FieldLabel>

                  <Textarea
                    id="localAtividade"
                    value={form.localAtividade}
                    onChange={(e) => set("localAtividade", e.target.value)}
                    rows={2}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataInicio"
                    required
                    tooltip="Informe a data prevista ou efetiva de início da atividade."
                  >
                    Data de Início
                  </FieldLabel>

                  <Input
                    id="dataInicio"
                    type="date"
                    value={form.dataInicio}
                    onChange={(e) => set("dataInicio", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataFim"
                    tooltip="Informe a data prevista ou efetiva de término da atividade, quando houver."
                  >
                    Data de Término
                  </FieldLabel>

                  <Input
                    id="dataFim"
                    type="date"
                    value={form.dataFim}
                    onChange={(e) => set("dataFim", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="vagas"
                    tooltip="Informe a quantidade máxima de participantes que poderão ser atendidos, quando houver limite de vagas."
                  >
                    Quantidade de Vagas
                  </FieldLabel>

                  <Input
                    id="vagas"
                    value={form.quantidadeVagas}
                    onChange={(e) =>
                      set("quantidadeVagas", onlyDigits(e.target.value, 5))
                    }
                    inputMode="numeric"
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Tags}
              title="Situação da atividade"
              description="Indique em que momento do seu ciclo de realização a atividade se encontra, considerando se ainda está sendo preparada, está em andamento, foi concluída ou deixou de ser executada."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="status"
                    required
                    tooltip="Informe a situação atual da atividade. Ativo indica atividade em andamento; Pendente, atividade ainda em preparação ou aguardando início; Concluído, atividade finalizada; e Inativo, atividade que não está mais em execução ou acompanhamento."
                  >
                    Situação da Atividade
                  </FieldLabel>

                  <Select
                    value={form.status}
                    onValueChange={(v) => {
                      if (visualizando) return;
                      set("status", v);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {statusAtividade.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Users2}
              title="Equipe"
              description="Identifique os colaboradores que estarão envolvidos na realização da atividade e que poderão atuar em sua coordenação, execução, apoio, registro ou acompanhamento."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="colaboradores"
                    tooltip="Informe os colaboradores que participam da coordenação, execução, apoio, registro ou acompanhamento da atividade."
                  >
                    Colaboradores
                  </FieldLabel>

                  <div
                    className={
                      visualizando ? "pointer-events-none opacity-80" : ""
                    }
                  >
                    <MultiSelect
                      id="colaboradores"
                      options={colaboradoresOptions}
                      value={form.colaboradores}
                      onChange={(v) => {
                        if (visualizando) return;
                        set("colaboradores", v);
                      }}
                      getOptionLabel={colaboradorLabel}
                    />
                  </div>
                </Field>
              </div>
            </FormSectionCard>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/atividades")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
        <WikiFloatingButton
          pageTitle="Atividades"
          href="https://www.aurit.com.br/wiki/execucao/atividades"
        />
      </div>
    </AppLayout>
  );
}

function Field({
  children,
  full,
  className,
}: {
  children: React.ReactNode;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={`${full ? "sm:col-span-2" : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}
