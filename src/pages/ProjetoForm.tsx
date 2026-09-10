import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FileText,
  Target,
  Users2,
  Plus,
  CalendarClock,
  Trash2,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { PageTitle } from "@/components/PageTitle";
import { BackButton } from "@/components/BackButton";
import { ImportDataButton } from "@/components/ImportDataButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
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
import { MultiSelect } from "@/components/MultiSelect";
import { getImportConfigForPath } from "@/config/importacoes";
import { maskDate } from "@/lib/masks";
import { getColaboradores, type Colaborador } from "@/data/colaboradores";
import {
  areaAtuacaoOptions,
  buildProjetoPayload,
  createProjeto,
  getOrganizacoes,
  getProjetoById,
  getProjetos,
  origemProjetoOptions,
  statusProjetoOptions,
  updateProjeto,
  type OrganizacaoOption,
  type AreaAtuacao,
  type ObjetivoDTO,
  type OrigemProjeto,
  type Projeto,
  type StatusProjeto,
} from "@/data/projetos";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

interface ObjetivoForm {
  id?: number;
  objetivoEspecifico: string;
}

interface FormState {
  nomeProjeto: string;
  descricao: string;
  objetivoGeral: string;
  publicoAlvo: string;
  acoesAcessibilidade: string;
  localExecucao: string;
  dataInicio: string;
  dataFim: string;
  status: StatusProjeto | "";
  areasAtuacao: AreaAtuacao[];
  origemProjeto: OrigemProjeto | "";
  organizacaoId: string;
  colaboradoresIds: string[];
  objetivos: ObjetivoForm[];
}

const initial: FormState = {
  nomeProjeto: "",
  descricao: "",
  objetivoGeral: "",
  publicoAlvo: "",
  acoesAcessibilidade: "",
  localExecucao: "",
  dataInicio: "",
  dataFim: "",
  status: "",
  areasAtuacao: [],
  origemProjeto: "",
  organizacaoId: "",
  colaboradoresIds: [],
  objetivos: [{ objetivoEspecifico: "" }],
};

function toStringId(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function getOrganizacaoNome(organizacao?: OrganizacaoOption | null) {
  return organizacao?.nome ?? "";
}

function resolverOrganizacaoId(
  projeto: Projeto | null | undefined,
  organizacoes: OrganizacaoOption[],
  projetoFallback?: Projeto | null,
): string {
  type ProjetoCompat = Projeto & {
    organizacao?: {
      id?: unknown;
      organizacaoId?: unknown;
      codigo?: unknown;
    };
    idOrganizacao?: unknown;
    organizacao_id?: unknown;
    organizacaoID?: unknown;
    empresaId?: unknown;
    configuracaoEmpresaId?: unknown;
  };

  const projetoRaw = projeto as ProjetoCompat | null | undefined;
  const fallbackRaw = projetoFallback as ProjetoCompat | null | undefined;

  const idDireto = toStringId(projetoRaw?.organizacaoId);

  if (idDireto) {
    return idDireto;
  }

  const idDiretoFallback = toStringId(fallbackRaw?.organizacaoId);

  if (idDiretoFallback) {
    return idDiretoFallback;
  }

  const idPorObjeto = toStringId(
    projetoRaw?.organizacao?.id ??
      projetoRaw?.organizacao?.organizacaoId ??
      projetoRaw?.organizacao?.codigo,
  );

  if (idPorObjeto) {
    return idPorObjeto;
  }

  const idPorObjetoFallback = toStringId(
    fallbackRaw?.organizacao?.id ??
      fallbackRaw?.organizacao?.organizacaoId ??
      fallbackRaw?.organizacao?.codigo,
  );

  if (idPorObjetoFallback) {
    return idPorObjetoFallback;
  }

  const idAlternativo = toStringId(
    projetoRaw?.idOrganizacao ??
      projetoRaw?.organizacao_id ??
      projetoRaw?.organizacaoID ??
      projetoRaw?.empresaId ??
      projetoRaw?.configuracaoEmpresaId,
  );

  if (idAlternativo) {
    return idAlternativo;
  }

  const idAlternativoFallback = toStringId(
    fallbackRaw?.idOrganizacao ??
      fallbackRaw?.organizacao_id ??
      fallbackRaw?.organizacaoID ??
      fallbackRaw?.empresaId ??
      fallbackRaw?.configuracaoEmpresaId,
  );

  if (idAlternativoFallback) {
    return idAlternativoFallback;
  }

  if (organizacoes.length === 1) {
    return String(organizacoes[0].id);
  }

  return "";
}

function projetoToForm(
  projeto: Projeto,
  organizacoes: OrganizacaoOption[],
  projetoFallback?: Projeto | null,
): FormState {
  return {
    nomeProjeto: projeto.nomeProjeto ?? "",
    descricao: projeto.descricao ?? "",
    objetivoGeral: projeto.objetivoGeral ?? "",
    publicoAlvo: projeto.publicoAlvo ?? "",
    acoesAcessibilidade: projeto.acoesAcessibilidade ?? "",
    localExecucao: projeto.localExecucao ?? "",
    dataInicio: projeto.dataInicio ?? "",
    dataFim: projeto.dataFim ?? "",
    status: projeto.status ?? "",
    areasAtuacao:
      projeto.areasAtuacao && projeto.areasAtuacao.length > 0
        ? projeto.areasAtuacao
        : projeto.areaAtuacao
          ? [projeto.areaAtuacao]
          : [],
    origemProjeto: projeto.origemProjeto ?? "",
    organizacaoId: resolverOrganizacaoId(
      projeto,
      organizacoes,
      projetoFallback,
    ),
    colaboradoresIds: (projeto.colaboradoresIds ?? []).map(String),
    objetivos:
      projeto.objetivos && projeto.objetivos.length > 0
        ? projeto.objetivos.map((objetivo) => ({
            id: objetivo.id,
            objetivoEspecifico: objetivo.objetivoEspecifico ?? "",
          }))
        : [{ objetivoEspecifico: "" }],
  };
}

function salvarProximaAcaoProjeto() {
  emitJourneyNextStep();
}

function parseBrDate(date: string) {
  const [day, month, year] = date.split("/");

  if (!day || !month || !year) return null;

  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    12,
    0,
    0,
  );

  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

function isDataFimAnterior(dataInicio: string, dataFim: string) {
  const inicio = parseBrDate(dataInicio);
  const fim = parseBrDate(dataFim);

  if (!inicio || !fim) return false;

  return fim.getTime() < inicio.getTime();
}

const areasAtuacaoOptionsValues = areaAtuacaoOptions.map((area) => area.value);

const getAreaAtuacaoLabel = (areaValue: string) =>
  areaAtuacaoOptions.find((area) => area.value === areaValue)?.label ??
  areaValue;

export default function ProjetoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [existingProjeto, setExistingProjeto] = useState<Projeto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const organizacaoSelectValue =
    form.organizacaoId ||
    String(existingProjeto?.organizacaoId ?? "") ||
    String(organizacoes[0]?.id ?? "");

  const organizacoesComFallback = useMemo(() => {
    const options = [...organizacoes];

    const organizacaoId =
      form.organizacaoId ||
      String(existingProjeto?.organizacaoId ?? "") ||
      String(organizacoes[0]?.id ?? "");

    if (!organizacaoId) {
      return options;
    }

    const existe = options.some(
      (organizacao) => String(organizacao.id) === String(organizacaoId),
    );

    if (!existe) {
      options.unshift({
        id: Number(organizacaoId),
        nome: `Organização ${organizacaoId}`,
      });
    }

    return options;
  }, [organizacoes, form.organizacaoId, existingProjeto]);

  useImportFormFill("projetos", setForm);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [organizacoesData, colaboradoresData, projetoData, projetosData] =
          await Promise.all([
            getOrganizacoes(),
            getColaboradores(),
            id ? getProjetoById(Number(id)) : Promise.resolve(null),
            id ? getProjetos() : Promise.resolve([]),
          ]);

        if (!active) return;

        setOrganizacoes(organizacoesData);
        setColaboradores(colaboradoresData);

        if (projetoData) {
          const projetoFallback =
            projetosData.find((projeto) => Number(projeto.id) === Number(id)) ??
            null;

          const formData = projetoToForm(
            projetoData,
            organizacoesData,
            projetoFallback,
          );

          const organizacaoId =
            formData.organizacaoId ||
            String(projetoData.organizacaoId ?? "") ||
            String(projetoFallback?.organizacaoId ?? "") ||
            (organizacoesData.length === 1
              ? String(organizacoesData[0].id)
              : "");

          setExistingProjeto({
            ...projetoData,
            organizacaoId: organizacaoId ? Number(organizacaoId) : null,
          });

          setForm({
            ...formData,
            organizacaoId,
          });
        } else {
          setExistingProjeto(null);

          setForm({
            ...initial,
            organizacaoId:
              organizacoesData.length === 1
                ? String(organizacoesData[0].id)
                : "",
          });
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar dados do projeto.",
        );

        navigate("/projetos");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const colaboradoresOptions = useMemo(
    () => colaboradores.map((c) => String(c.id)),
    [colaboradores],
  );

  const colaboradorLabel = (colaboradorId: string) =>
    colaboradores.find((c) => String(c.id) === String(colaboradorId))
      ?.nomeCompleto ?? colaboradorId;

  const updateObjetivo = (idx: number, value: string) => {
    if (visualizando) return;

    setForm((prev) => ({
      ...prev,
      objetivos: prev.objetivos.map((objetivo, index) =>
        index === idx
          ? {
              ...objetivo,
              objetivoEspecifico: value,
            }
          : objetivo,
      ),
    }));
  };

  const addObjetivo = () => {
    if (visualizando) return;

    setForm((prev) => ({
      ...prev,
      objetivos: [...prev.objetivos, { objetivoEspecifico: "" }],
    }));
  };

  const removeObjetivo = (idx: number) => {
    if (visualizando) return;

    setForm((prev) => {
      const novosObjetivos = prev.objetivos.filter((_, index) => index !== idx);

      return {
        ...prev,
        objetivos:
          novosObjetivos.length > 0
            ? novosObjetivos
            : [{ objetivoEspecifico: "" }],
      };
    });
  };

  function getFormComOrganizacao(): FormState {
    return {
      ...form,
      organizacaoId:
        form.organizacaoId ||
        String(existingProjeto?.organizacaoId ?? "") ||
        String(organizacoes[0]?.id ?? ""),
    };
  }

  function validar(formValidacao: FormState) {
    if (!formValidacao.nomeProjeto.trim()) {
      toast.error("Informe o nome do projeto.");
      return false;
    }

    if (!formValidacao.descricao.trim()) {
      toast.error("Informe a descrição do projeto.");
      return false;
    }

    if (!formValidacao.objetivoGeral.trim()) {
      toast.error("Informe o objetivo geral.");
      return false;
    }

    if (!formValidacao.publicoAlvo.trim()) {
      toast.error("Informe o público-alvo.");
      return false;
    }

    if (!formValidacao.acoesAcessibilidade.trim()) {
      toast.error("Informe as ações de acessibilidade.");
      return false;
    }

    if (!formValidacao.localExecucao.trim()) {
      toast.error("Informe o local de execução.");
      return false;
    }

    if (!formValidacao.dataInicio.trim()) {
      toast.error("Informe a data de início.");
      return false;
    }

    if (!formValidacao.dataFim.trim()) {
      toast.error("Informe a data de término.");
      return false;
    }

    if (isDataFimAnterior(formValidacao.dataInicio, formValidacao.dataFim)) {
      toast.error("A data de término não pode ser anterior à data de início.");
      return false;
    }

    if (!formValidacao.status) {
      toast.error("Selecione o status.");
      return false;
    }

    if (
      !formValidacao.areasAtuacao ||
      formValidacao.areasAtuacao.length === 0
    ) {
      toast.error("Selecione ao menos uma área de atuação.");
      return false;
    }

    if (!formValidacao.origemProjeto) {
      toast.error("Selecione a origem do projeto.");
      return false;
    }

    if (!formValidacao.organizacaoId) {
      toast.error("Selecione a organização.");
      return false;
    }

    const objetivosPreenchidos = formValidacao.objetivos
      .map((objetivo) => objetivo.objetivoEspecifico.trim())
      .filter(Boolean);

    if (objetivosPreenchidos.length === 0) {
      toast.error("Adicione ao menos um objetivo específico.");
      return false;
    }

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (visualizando) return;

    const formComOrganizacao = getFormComOrganizacao();

    if (!validar(formComOrganizacao)) return;

    try {
      setSaving(true);

      const objetivos: ObjetivoDTO[] = formComOrganizacao.objetivos
        .map((objetivo) => ({
          id: objetivo.id,
          objetivoEspecifico: objetivo.objetivoEspecifico.trim(),
          projetoId: id ? Number(id) : undefined,
        }))
        .filter((objetivo) => objetivo.objetivoEspecifico);

      const projetoPayload: Projeto = {
        id: id ? Number(id) : 0,
        nomeProjeto: formComOrganizacao.nomeProjeto.trim(),
        descricao: formComOrganizacao.descricao.trim(),
        objetivoGeral: formComOrganizacao.objetivoGeral.trim(),
        publicoAlvo: formComOrganizacao.publicoAlvo.trim(),
        acoesAcessibilidade: formComOrganizacao.acoesAcessibilidade.trim(),
        localExecucao: formComOrganizacao.localExecucao.trim(),
        dataInicio: formComOrganizacao.dataInicio,
        dataFim: formComOrganizacao.dataFim,
        status: formComOrganizacao.status as StatusProjeto,
        areasAtuacao: formComOrganizacao.areasAtuacao as AreaAtuacao[],
        origemProjeto: formComOrganizacao.origemProjeto as OrigemProjeto,
        organizacaoId: Number(formComOrganizacao.organizacaoId),
        colaboradoresIds: formComOrganizacao.colaboradoresIds
          .map(Number)
          .filter((colaboradorId) => Number.isFinite(colaboradorId)),
        objetivos,
      };

      const payload = buildProjetoPayload(projetoPayload);

      if (editando && id) {
        await updateProjeto(Number(id), payload);
        toast.success("Projeto atualizado com sucesso.");
      } else {
        await createProjeto(payload);
        salvarProximaAcaoProjeto();
        toast.success("Projeto cadastrado com sucesso.");
      }

      navigate("/projetos");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar projeto.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/projetos" />

        <PageTitle
          title={visualizando ? "Projetos" : editando ? "Projetos" : "Projetos"}
          tooltip="Nesta página são cadastrados e acompanhados os projetos da organização, com informações sobre identificação, proposta, objetivos, público-alvo, acessibilidade, local e período de execução, situação atual, organização responsável e equipe envolvida. Esses dados apoiam o planejamento, a execução, o acompanhamento e a prestação de contas dos projetos."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/projetos")!}
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
              icon={FileText}
              title="Identificação do projeto"
              description="Informe os principais dados utilizados para identificar e classificar o projeto."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field full>
                  <FieldLabel
                    htmlFor="nomeProjeto"
                    required
                    tooltip="Informe o nome pelo qual o projeto será identificado em cadastros, documentos, relatórios e editais."
                  >
                    Nome do Projeto
                  </FieldLabel>

                  <Input
                    id="nomeProjeto"
                    value={form.nomeProjeto}
                    onChange={(e) => set("nomeProjeto", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="organizacao"
                    required
                    tooltip="Informe a organização responsável pela realização e pelo acompanhamento do projeto."
                  >
                    Organização
                  </FieldLabel>

                  <Select
                    value={organizacaoSelectValue}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      set("organizacaoId", String(value));
                    }}
                    disabled={bloqueado || organizacoesComFallback.length === 0}
                  >
                    <SelectTrigger id="organizacao">
                      <SelectValue placeholder="Selecione uma organização" />
                    </SelectTrigger>

                    <SelectContent>
                      {organizacoesComFallback.length === 0 ? (
                        <SelectItem value="sem-organizacao" disabled>
                          Nenhuma organização cadastrada
                        </SelectItem>
                      ) : (
                        organizacoesComFallback.map((organizacao) => (
                          <SelectItem
                            key={String(organizacao.id)}
                            value={String(organizacao.id)}
                          >
                            {organizacao.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="areasAtuacao"
                    required
                    tooltip="Informe as áreas relacionadas às atividades e aos objetivos do projeto. É possível selecionar mais de uma opção."
                  >
                    Áreas de Atuação
                  </FieldLabel>

                  <div
                    className={
                      bloqueado ? "pointer-events-none opacity-80" : ""
                    }
                  >
                    <MultiSelect
                      id="areasAtuacao"
                      options={areasAtuacaoOptionsValues}
                      value={form.areasAtuacao}
                      onChange={(value) => {
                        if (visualizando) return;
                        set("areasAtuacao", value as AreaAtuacao[]);
                      }}
                      getOptionLabel={getAreaAtuacaoLabel}
                      placeholder="Selecione as áreas de atuação"
                    />
                  </div>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="origemProjeto"
                    required
                    tooltip="Informe como o projeto surgiu ou será viabilizado, considerando sua principal forma de origem ou financiamento."
                  >
                    Origem do Projeto
                  </FieldLabel>

                  <Select
                    value={form.origemProjeto}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      set("origemProjeto", value as OrigemProjeto);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="origemProjeto">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {origemProjetoOptions.map((origem) => (
                        <SelectItem key={origem.value} value={origem.value}>
                          {origem.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Target}
              title="Proposta do projeto"
              description="Descreva o que o projeto pretende realizar, qual é seu objetivo geral, quem será atendido diretamente e quais medidas de acessibilidade serão previstas para ampliar a participação do público."
            >
              <div className="grid gap-4">
                <Field>
                  <FieldLabel
                    htmlFor="descricao"
                    required
                    tooltip="Apresente o projeto de forma geral, explicando o contexto, a proposta, as principais ações previstas e sua importância para o público ou território atendido."
                  >
                    Descrição
                  </FieldLabel>

                  <Textarea
                    id="descricao"
                    value={form.descricao}
                    onChange={(e) => set("descricao", e.target.value)}
                    rows={4}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="objetivoGeral"
                    required
                    tooltip="Informe o principal resultado que o projeto pretende alcançar, deixando claro o que será realizado e qual mudança ou contribuição se pretende gerar."
                  >
                    Objetivo Geral
                  </FieldLabel>

                  <Textarea
                    id="objetivoGeral"
                    value={form.objetivoGeral}
                    onChange={(e) => set("objetivoGeral", e.target.value)}
                    rows={4}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="publicoAlvo"
                    required
                    tooltip="Informe quem será atendido diretamente pelo projeto, considerando características como faixa etária, território, comunidade ou grupo específico."
                  >
                    Público-alvo
                  </FieldLabel>

                  <Textarea
                    id="publicoAlvo"
                    value={form.publicoAlvo}
                    onChange={(e) => set("publicoAlvo", e.target.value)}
                    rows={3}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="acoesAcessibilidade"
                    required
                    tooltip="Informe as medidas previstas para garantir ou ampliar a participação de pessoas com diferentes necessidades de acessibilidade."
                  >
                    Ações de Acessibilidade
                  </FieldLabel>

                  <Textarea
                    id="acoesAcessibilidade"
                    value={form.acoesAcessibilidade}
                    onChange={(e) => set("acoesAcessibilidade", e.target.value)}
                    rows={3}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Target}
              title="Objetivos específicos"
              description="Registre separadamente os objetivos específicos que detalham o que o projeto pretende alcançar para contribuir com o objetivo geral. Adicione quantos objetivos forem necessários."
            >
              <div className="space-y-3">
                {form.objetivos.map((objetivo, idx) => (
                  <div
                    key={`${objetivo.id ?? "novo"}-${idx}`}
                    className="flex items-start gap-2"
                  >
                    <div className="flex-1">
                      <FieldLabel
                        htmlFor={`objetivo-${idx}`}
                        required
                        tooltip="Informe um resultado ou finalidade específica que o projeto pretende alcançar e que contribui diretamente para o objetivo geral."
                      >
                        {idx + 1}º Objetivo Específico
                      </FieldLabel>

                      <Textarea
                        id={`objetivo-${idx}`}
                        value={objetivo.objetivoEspecifico}
                        onChange={(e) => updateObjetivo(idx, e.target.value)}
                        rows={2}
                        disabled={bloqueado}
                        readOnly={visualizando}
                      />
                    </div>

                    {!visualizando && form.objetivos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeObjetivo(idx)}
                        aria-label={`Remover objetivo ${idx + 1}`}
                        className="mt-7 rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}

                {!visualizando && (
                  <Button
                    type="button"
                    variant="glassSecondary"
                    onClick={addObjetivo}
                    className="h-9 gap-2 px-4"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar objetivo específico
                  </Button>
                )}
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={CalendarClock}
              title="Execução"
              description="Informe o local onde o projeto será realizado, as datas previstas ou efetivas de início e término e a situação atual de sua execução."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field full>
                  <FieldLabel
                    htmlFor="localExecucao"
                    required
                    tooltip="Informe o principal local, espaço ou território onde as atividades do projeto serão realizadas."
                  >
                    Local de Execução
                  </FieldLabel>

                  <Input
                    id="localExecucao"
                    value={form.localExecucao}
                    onChange={(e) => set("localExecucao", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataInicio"
                    required
                    tooltip="Informe a data prevista ou efetiva de início das atividades do projeto."
                  >
                    Data de Início
                  </FieldLabel>

                  <Input
                    id="dataInicio"
                    value={form.dataInicio}
                    onChange={(e) =>
                      set("dataInicio", maskDate(e.target.value))
                    }
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="dataFim"
                    required
                    tooltip="Informe a data prevista ou efetiva de encerramento das atividades do projeto."
                  >
                    Data de Término
                  </FieldLabel>

                  <Input
                    id="dataFim"
                    value={form.dataFim}
                    onChange={(e) => set("dataFim", maskDate(e.target.value))}
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="status"
                    required
                    tooltip="Informe a situação atual do projeto. Ativo indica projeto em andamento; Pendente, projeto em preparação ou conferência; Concluído, projeto finalizado; e Inativo, projeto que não está mais em execução ou acompanhamento."
                  >
                    Situação do Projeto
                  </FieldLabel>

                  <Select
                    value={form.status}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      set("status", value as StatusProjeto);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {statusProjetoOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSectionCard>

            <FormSectionCard
              icon={Users2}
              title="Organização e equipe"
              description="A organização responsável pelo projeto já foi definida na identificação. Informe aqui os colaboradores que participarão da elaboração, coordenação, execução, acompanhamento ou de outras atividades relacionadas ao projeto."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="colaboradores"
                    tooltip="Informe os colaboradores que participam da elaboração, coordenação, execução, acompanhamento ou outras atividades relacionadas ao projeto."
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
                      value={form.colaboradoresIds}
                      onChange={(value) => {
                        if (visualizando) return;

                        set("colaboradoresIds", value.map(String));
                      }}
                      getOptionLabel={colaboradorLabel}
                      placeholder="Selecione os colaboradores"
                    />
                  </div>
                </Field>
              </div>
            </FormSectionCard>
          </fieldset>

          {!visualizando && (
            <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate("/projetos")}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="glassPrimary"
                className="h-9 px-5"
                disabled={saving}
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
                onClick={() => navigate("/projetos")}
              >
                Voltar
              </Button>
            </div>
          )}
        </form>
        <WikiFloatingButton
          pageTitle="Projetos"
          href="https://www.aurit.com.br/wiki/projetos/projetos"
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
