import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Target,
  Users2,
  Plus,
  Trash2,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
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
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { MultiSelect } from "@/components/MultiSelect";
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

const PROJETO_NEXT_STEP_KEY = "aurit:projetos:next-step-card";

interface ObjetivoForm {
  id?: number;
  objetivoEspecifico: string;
}

interface ProjetoNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
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
  areaAtuacao: AreaAtuacao | "";
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
  areaAtuacao: "",
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
  const projetoRaw = projeto as any;
  const fallbackRaw = projetoFallback as any;

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
    areaAtuacao: projeto.areaAtuacao ?? "",
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
  const card: ProjetoNextStepCardData = {
    titulo: "Após cadastrar o projeto, defina as metas previstas",
    descricao:
      "As metas ajudam a demonstrar o que será entregue, em qual quantidade e como a organização poderá comprovar os resultados em editais, relatórios e prestações de contas.",
    acaoLabel: "Cadastrar metas",
    acaoUrl: "/metas-projeto/novo",
    acaoSecundariaLabel: "Ver projetos",
    acaoSecundariaUrl: "/projetos",
    variante: "pendente",
  };

  sessionStorage.setItem(PROJETO_NEXT_STEP_KEY, JSON.stringify(card));
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
        id: organizacaoId as any,
        nome: `Organização ${organizacaoId}`,
      });
    }

    return options;
  }, [organizacoes, form.organizacaoId, existingProjeto]);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [
          organizacoesData,
          colaboradoresData,
          projetoData,
          projetosData,
        ] = await Promise.all([
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
            projetosData.find(
              (projeto) => Number(projeto.id) === Number(id),
            ) ?? null;

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

    if (!formValidacao.areaAtuacao) {
      toast.error("Selecione a área de atuação.");
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
        areaAtuacao: formComOrganizacao.areaAtuacao as AreaAtuacao,
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
        <button
          type="button"
          onClick={() => navigate("/projetos")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageTitle
          title="Projeto"
          tooltip="Cadastre e acompanhe os projetos culturais da organização, reunindo proposta, objetivos, público atendido, acessibilidade, local de execução, equipe, origem e período. Esses dados ajudam a estruturar atividades, cronogramas, relatórios, evidências e prestações de contas."
        />

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={FileText} title="Dados principais">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field full>
                <FieldLabel
                  htmlFor="nomeProjeto"
                  required
                  tooltip="Informe o nome oficial ou principal do projeto, conforme será utilizado em documentos, relatórios e editais."
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

              <Field full>
                <FieldLabel
                  htmlFor="descricao"
                  required
                  tooltip="Apresente o projeto de forma geral, explicando o contexto, a proposta, as principais ações previstas e a importância da iniciativa para o público e o território atendido."
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

              <Field full>
                <FieldLabel
                  htmlFor="objetivoGeral"
                  required
                  tooltip="Descreva o principal resultado que o projeto pretende alcançar, indicando o que será realizado, para quem, onde e qual transformação ou contribuição se espera gerar."
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

              <Field full>
                <FieldLabel
                  htmlFor="publicoAlvo"
                  required
                  tooltip="Descreva quem será diretamente atendido pelo projeto, informando faixa etária, perfil social, território, comunidade, grupo prioritário ou público específico."
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

              <Field full>
                <FieldLabel
                  htmlFor="acoesAcessibilidade"
                  required
                  tooltip="Descreva as medidas previstas para ampliar o acesso e a participação de diferentes públicos, considerando acessibilidade física, comunicacional, social, territorial ou econômica."
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

              <Field full>
                <FieldLabel
                  htmlFor="localExecucao"
                  required
                  tooltip="Informe o local ou território onde o projeto será realizado. Pode ser uma cidade, bairro, comunidade, escola, praça, sede da organização, equipamento público ou espaço cultural."
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
                  tooltip="Informe a data prevista ou efetiva de início da execução do projeto."
                >
                  Data de Início do Projeto
                </FieldLabel>

                <Input
                  id="dataInicio"
                  value={form.dataInicio}
                  onChange={(e) => set("dataInicio", maskDate(e.target.value))}
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
                  tooltip="Informe a data prevista ou efetiva de encerramento da execução do projeto."
                >
                  Data de Término do Projeto
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
                  tooltip="Indique a situação atual do projeto no sistema. Use “Ativo” para projetos em execução ou acompanhamento, “Pendente” para projetos em organização ou conferência, “Concluído” para projetos finalizados conforme previsto e “Inativo” para projetos que não devem mais ser considerados ativos."
                >
                  Status do Projeto
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

              <Field>
                <FieldLabel
                  htmlFor="areaAtuacao"
                  required
                  tooltip="Selecione a principal área de atuação do projeto. Caso o projeto dialogue com mais de uma área, escolha aquela que melhor representa seu foco central."
                >
                  Área de Atuação
                </FieldLabel>

                <Select
                  value={form.areaAtuacao}
                  onValueChange={(value) => {
                    if (visualizando) return;
                    set("areaAtuacao", value as AreaAtuacao);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="areaAtuacao">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {areaAtuacaoOptions.map((area) => (
                      <SelectItem key={area.value} value={area.value}>
                        {area.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="origemProjeto"
                  required
                  tooltip="Indique como este projeto surgiu ou está sendo viabilizado. Ex.: edital público, recurso próprio, parceria, patrocínio, doação, ação voluntária ou iniciativa institucional."
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
          </Section>

          <Section icon={Target} title="Objetivos do projeto">
            <div className="space-y-3">
              {form.objetivos.map((objetivo, idx) => (
                <div
                  key={`${objetivo.id ?? "novo"}-${idx}`}
                  className="flex gap-2 items-start"
                >
                  <div className="flex-1">
                    <FieldLabel
                      htmlFor={`objetivo-${idx}`}
                      required
                      tooltip="Descreva uma ação, etapa ou resultado específico que contribui para alcançar o objetivo geral do projeto."
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
                  variant="outline"
                  size="sm"
                  onClick={addObjetivo}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar objetivo específico
                </Button>
              )}
            </div>
          </Section>

          <Section icon={Users2} title="Equipe e responsável">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field full>
                <FieldLabel
                  htmlFor="organizacao"
                  required
                  tooltip="Selecione a organização responsável pelo projeto."
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

              <Field full>
                <FieldLabel
                  htmlFor="colaboradores"
                  tooltip="Selecione os colaboradores que participam da elaboração, coordenação, execução, acompanhamento ou registro do projeto."
                >
                  Colaboradores
                </FieldLabel>

                <div
                  className={visualizando ? "pointer-events-none opacity-80" : ""}
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
          </Section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/projetos")}
              disabled={saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button type="submit" className="sm:min-w-32" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </form>
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
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6 border border-border rounded shadow-none">
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-border">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />

        <h2 className="text-sm font-semibold text-foreground leading-tight uppercase tracking-wide">
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