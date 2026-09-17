import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Package, CalendarRange, Layers, Info, Link2 } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { FormSectionCard } from "@/components/FormSectionCard";
import { ImportDataButton } from "@/components/ImportDataButton";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { getImportConfigForPath } from "@/config/importacoes";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
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
import { maskDate } from "@/lib/masks";
import { nameWithYear } from "@/lib/entityYear";
import {
  tipoDestinatarioOptions,
  estadoConservacaoEmprestimoOptions,
  statusEmprestimoOptions,
  estadoDevolucaoOptions,
  buildEmprestimoPayload,
  createEmprestimo,
  getEmprestimoById,
  updateEmprestimo,
  type Emprestimo,
} from "@/data/emprestimos";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const text = await response.text();

    if (!text) {
      if (response.status === 401) {
        return "Sessão expirada ou token inválido. Faça login novamente.";
      }

      if (response.status === 403) {
        return "Acesso negado.";
      }

      return `Erro ${response.status} ao processar requisição.`;
    }

    try {
      const json = JSON.parse(text);

      return (
        json?.message || json?.error || json?.detail || json?.mensagem || text
      );
    } catch {
      return text;
    }
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

interface PatrimonioApiDTO {
  id: number;
  numeroPatrimonio: string;
  nomePatrimonio: string;
  estadoConservacao?: string;
}

interface ColaboradorApiDTO {
  id: number;
  nomeCompleto: string;
}

interface ParticipanteApiDTO {
  id: number;
  nomeCompleto: string;
}

interface IntegranteApiDTO {
  id: number;
  nomeCompleto: string;
}

interface ProjetoApiDTO {
  id: number;
  nomeProjeto: string;
}

interface PropostaEditalApiDTO {
  id: number;
  tituloProjeto?: string;
  nomeProposta?: string;
  tituloProposta?: string;
  nomeProjeto?: string;
}

interface AtividadeApiDTO {
  id: number;
  nomeAtividade: string;
  ano?: number | string | null;
  dataInicio?: string | null;
}

interface EventoCulturalApiDTO {
  id: number;
  nomeEvento: string;
}

interface OptionItem {
  id: string;
  nome: string;
  extra?: string;
}

interface FormState {
  patrimonioId: string;

  dataEmprestimo: string;
  dataPrevistaDevolucao: string;
  dataDevolucao: string;

  observacaoEmprestimo: string;
  observacaoDevolucao: string;

  tipoDestinatario: string;
  colaboradorId: string;
  participanteId: string;
  integranteId: string;
  destinatarioExterno: string;

  estadoConservacao: string;
  estadoDevolucao: string;
  statusEmprestimo: string;

  projetoId: string;
  propostaEditalId: string;
  atividadeId: string;
  eventoCulturalId: string;
}

const initial: FormState = {
  patrimonioId: "",

  dataEmprestimo: "",
  dataPrevistaDevolucao: "",
  dataDevolucao: "",

  observacaoEmprestimo: "",
  observacaoDevolucao: "",

  tipoDestinatario: "",
  colaboradorId: "",
  participanteId: "",
  integranteId: "",
  destinatarioExterno: "",

  estadoConservacao: "",
  estadoDevolucao: "",
  statusEmprestimo: "",

  projetoId: "",
  propostaEditalId: "",
  atividadeId: "",
  eventoCulturalId: "",
};

function isValidDateBR(value: string) {
  if (!value.trim()) return false;

  const parts = value.split("/");

  if (parts.length !== 3) return false;

  const [day, month, year] = parts.map(Number);

  if (!day || !month || !year) return false;
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function brToComparable(value: string) {
  const [day, month, year] = value.split("/");

  return `${year}-${month}-${day}`;
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export default function EmprestimoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");
  const returnToParam = new URLSearchParams(location.search).get("returnTo");
  const returnTo =
    returnToParam?.startsWith("/") && !returnToParam.startsWith("//")
      ? returnToParam
      : "/emprestimos";

  const [form, setForm] = useState<FormState>(initial);

  const [patrimonios, setPatrimonios] = useState<OptionItem[]>([]);
  const [colaboradores, setColaboradores] = useState<OptionItem[]>([]);
  const [participantes, setParticipantes] = useState<OptionItem[]>([]);
  const [integrantes, setIntegrantes] = useState<OptionItem[]>([]);

  const [projetos, setProjetos] = useState<OptionItem[]>([]);
  const [propostasEdital, setPropostasEdital] = useState<OptionItem[]>([]);
  const [atividades, setAtividades] = useState<OptionItem[]>([]);
  const [eventosCulturais, setEventosCulturais] = useState<OptionItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useImportFormFill("emprestimos", setForm);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        setLoading(true);

        const [
          patrimoniosRes,
          colaboradoresRes,
          participantesRes,
          integrantesRes,
          projetosRes,
          propostasEditalRes,
          atividadesRes,
          eventosCulturaisRes,
        ] = await Promise.all([
          fetch(`${API_URL}/patrimonios`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/colaboradores`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/participantes`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/integrantes`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/projetos`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/propostas-editais`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/atividades`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/eventos-culturais`, { headers: getAuthHeaders() }),
        ]);

        if (!patrimoniosRes.ok) {
          throw new Error(await parseError(patrimoniosRes));
        }

        if (!colaboradoresRes.ok) {
          throw new Error(await parseError(colaboradoresRes));
        }

        if (!participantesRes.ok) {
          throw new Error(await parseError(participantesRes));
        }

        if (!integrantesRes.ok) {
          throw new Error(await parseError(integrantesRes));
        }

        if (!projetosRes.ok) {
          throw new Error(await parseError(projetosRes));
        }

        if (!propostasEditalRes.ok) {
          throw new Error(await parseError(propostasEditalRes));
        }

        if (!atividadesRes.ok) {
          throw new Error(await parseError(atividadesRes));
        }

        if (!eventosCulturaisRes.ok) {
          throw new Error(await parseError(eventosCulturaisRes));
        }

        const patrimoniosData: PatrimonioApiDTO[] = await patrimoniosRes.json();

        const colaboradoresData: ColaboradorApiDTO[] =
          await colaboradoresRes.json();

        const participantesData: ParticipanteApiDTO[] =
          await participantesRes.json();

        const integrantesData: IntegranteApiDTO[] = await integrantesRes.json();

        const projetosData: ProjetoApiDTO[] = await projetosRes.json();

        const propostasEditalData: PropostaEditalApiDTO[] =
          await propostasEditalRes.json();

        const atividadesData: AtividadeApiDTO[] = await atividadesRes.json();

        const eventosCulturaisData: EventoCulturalApiDTO[] =
          await eventosCulturaisRes.json();

        if (!active) return;

        setPatrimonios(
          (patrimoniosData ?? []).map((patrimonio) => ({
            id: String(patrimonio.id),
            nome: patrimonio.nomePatrimonio,
            extra: patrimonio.numeroPatrimonio,
          })),
        );

        setColaboradores(
          (colaboradoresData ?? []).map((colaborador) => ({
            id: String(colaborador.id),
            nome: colaborador.nomeCompleto,
          })),
        );

        setParticipantes(
          (participantesData ?? []).map((participante) => ({
            id: String(participante.id),
            nome: participante.nomeCompleto,
          })),
        );

        setIntegrantes(
          (integrantesData ?? []).map((integrante) => ({
            id: String(integrante.id),
            nome: integrante.nomeCompleto,
          })),
        );

        setProjetos(
          (projetosData ?? []).map((projeto) => ({
            id: String(projeto.id),
            nome: projeto.nomeProjeto,
          })),
        );

        setPropostasEdital(
          (propostasEditalData ?? []).map((proposta) => ({
            id: String(proposta.id),
            nome:
              pickText(
                proposta.tituloProjeto,
                proposta.nomeProposta,
                proposta.tituloProposta,
                proposta.nomeProjeto,
              ) || `Proposta ${proposta.id}`,
          })),
        );

        setAtividades(
          (atividadesData ?? []).map((atividade) => ({
            id: String(atividade.id),
            nome: nameWithYear(
              atividade.nomeAtividade,
              atividade.ano,
              atividade.dataInicio,
            ),
          })),
        );

        setEventosCulturais(
          (eventosCulturaisData ?? []).map((evento) => ({
            id: String(evento.id),
            nome: evento.nomeEvento,
          })),
        );

        if (id) {
          const emprestimo = await getEmprestimoById(Number(id));

          if (!active) return;

          setForm({
            patrimonioId: emprestimo.patrimonioId ?? "",

            dataEmprestimo: emprestimo.dataEmprestimo ?? "",
            dataPrevistaDevolucao: emprestimo.dataPrevistaDevolucao ?? "",
            dataDevolucao: emprestimo.dataDevolucao ?? "",

            observacaoEmprestimo: emprestimo.observacaoEmprestimo ?? "",
            observacaoDevolucao: emprestimo.observacaoDevolucao ?? "",

            tipoDestinatario: emprestimo.tipoDestinatario ?? "",
            colaboradorId: emprestimo.colaboradorId ?? "",
            participanteId: emprestimo.participanteId ?? "",
            integranteId: emprestimo.integranteId ?? "",
            destinatarioExterno: emprestimo.destinatarioExterno ?? "",

            estadoConservacao: emprestimo.estadoConservacao ?? "",
            estadoDevolucao: emprestimo.estadoDevolucao ?? "",
            statusEmprestimo: emprestimo.statusEmprestimo ?? "",

            projetoId: emprestimo.projetoId ?? "",
            propostaEditalId: emprestimo.propostaEditalId ?? "",
            atividadeId: emprestimo.atividadeId ?? "",
            eventoCulturalId: emprestimo.eventoCulturalId ?? "",
          });
        } else {
          const params = new URLSearchParams(location.search);
          const patrimonioId = params.get("patrimonioId") ?? "";
          const participanteId = params.get("participanteId") ?? "";
          const tipoDestinatario = params.get("tipoDestinatario") ?? "";
          const patrimonioPreSelecionado = (patrimoniosData ?? []).find(
            (item) => String(item.id) === patrimonioId,
          );
          const participanteExiste = (participantesData ?? []).some(
            (item) => String(item.id) === participanteId,
          );

          setForm({
            ...initial,
            patrimonioId: patrimonioPreSelecionado
              ? String(patrimonioPreSelecionado.id)
              : "",
            tipoDestinatario:
              tipoDestinatario === "PARTICIPANTE" && participanteExiste
                ? "PARTICIPANTE"
                : "",
            participanteId: participanteExiste ? participanteId : "",
            dataEmprestimo: params.get("dataEmprestimo") ?? "",
            estadoConservacao:
              patrimonioPreSelecionado?.estadoConservacao ?? "",
            statusEmprestimo:
              patrimonioPreSelecionado && participanteExiste
                ? "EM_ANDAMENTO"
                : "",
          });
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o formulário.",
        );

        if (id) {
          navigate("/emprestimos");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregar();

    return () => {
      active = false;
    };
  }, [id, location.search, navigate]);

  const handleTipoChange = (value: string) => {
    if (visualizando) return;

    setForm((prev) => ({
      ...prev,
      tipoDestinatario: value,
      colaboradorId: "",
      participanteId: "",
      integranteId: "",
      destinatarioExterno: "",
    }));
  };

  const handleStatusChange = (value: string) => {
    if (visualizando) return;

    setForm((prev) => ({
      ...prev,
      statusEmprestimo: value,
      dataDevolucao: value === "DEVOLVIDO" ? prev.dataDevolucao : "",
      estadoDevolucao: value === "DEVOLVIDO" ? prev.estadoDevolucao : "",
      observacaoDevolucao:
        value === "DEVOLVIDO" ? prev.observacaoDevolucao : "",
    }));
  };

  const handleAtividadeChange = (value: string) => {
    if (visualizando) return;

    setForm((prev) => ({
      ...prev,
      atividadeId: value === "NONE" ? "" : value,
      eventoCulturalId: value === "NONE" ? prev.eventoCulturalId : "",
    }));
  };

  const handleEventoChange = (value: string) => {
    if (visualizando) return;

    setForm((prev) => ({
      ...prev,
      eventoCulturalId: value === "NONE" ? "" : value,
      atividadeId: value === "NONE" ? prev.atividadeId : "",
    }));
  };

  const validateDestinatario = (): boolean => {
    if (!form.tipoDestinatario) {
      toast.error("Selecione o tipo de destinatário.");
      return false;
    }

    const map: Record<string, string> = {
      COLABORADOR: form.colaboradorId,
      PARTICIPANTE: form.participanteId,
      INTEGRANTE: form.integranteId,
      DESTINATARIO_EXTERNO: form.destinatarioExterno.trim(),
    };

    if (!map[form.tipoDestinatario]) {
      toast.error("Informe o destinatário do empréstimo.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (visualizando) return;

    if (!form.patrimonioId) {
      toast.error("Selecione o patrimônio.");
      return;
    }

    if (!form.dataEmprestimo.trim()) {
      toast.error("Informe a data do empréstimo.");
      return;
    }

    if (!isValidDateBR(form.dataEmprestimo)) {
      toast.error("Informe uma data de empréstimo válida.");
      return;
    }

    if (
      form.dataPrevistaDevolucao.trim() &&
      !isValidDateBR(form.dataPrevistaDevolucao)
    ) {
      toast.error("Informe uma data prevista de devolução válida.");
      return;
    }

    if (
      form.dataPrevistaDevolucao.trim() &&
      brToComparable(form.dataPrevistaDevolucao) <
        brToComparable(form.dataEmprestimo)
    ) {
      toast.error(
        "A data prevista de devolução não pode ser anterior à data do empréstimo.",
      );
      return;
    }

    if (!validateDestinatario()) {
      return;
    }

    if (!form.estadoConservacao) {
      toast.error("Selecione o estado de conservação.");
      return;
    }

    if (!form.statusEmprestimo) {
      toast.error("Selecione o status do empréstimo.");
      return;
    }

    if (form.statusEmprestimo === "DEVOLVIDO") {
      if (!form.dataDevolucao.trim()) {
        toast.error("Informe a data de devolução.");
        return;
      }

      if (!isValidDateBR(form.dataDevolucao)) {
        toast.error("Informe uma data de devolução válida.");
        return;
      }

      if (
        brToComparable(form.dataDevolucao) < brToComparable(form.dataEmprestimo)
      ) {
        toast.error(
          "A data de devolução não pode ser anterior à data do empréstimo.",
        );
        return;
      }

      if (!form.estadoDevolucao) {
        toast.error("Informe o estado do item no momento da devolução.");
        return;
      }
    }

    if (form.atividadeId && form.eventoCulturalId) {
      toast.error("Informe apenas atividade ou evento cultural, não os dois.");
      return;
    }

    const payload = buildEmprestimoPayload({
      id: editando && id ? id : "",

      patrimonioId: form.patrimonioId,

      dataEmprestimo: form.dataEmprestimo,
      dataPrevistaDevolucao: form.dataPrevistaDevolucao,
      dataDevolucao: form.dataDevolucao,

      observacaoEmprestimo: form.observacaoEmprestimo,
      observacaoDevolucao: form.observacaoDevolucao,

      tipoDestinatario: form.tipoDestinatario,

      colaboradorId: form.colaboradorId,
      participanteId: form.participanteId,
      integranteId: form.integranteId,
      destinatarioExterno: form.destinatarioExterno,

      estadoConservacao: form.estadoConservacao,
      estadoDevolucao: form.estadoDevolucao,
      statusEmprestimo: form.statusEmprestimo,

      projetoId: form.projetoId,
      propostaEditalId: form.propostaEditalId,
      atividadeId: form.atividadeId,
      eventoCulturalId: form.eventoCulturalId,
    } as Emprestimo);

    try {
      setSaving(true);

      if (editando && id) {
        await updateEmprestimo(Number(id), payload);
        toast.success("Empréstimo atualizado com sucesso.");
      } else {
        await createEmprestimo(payload);
        toast.success("Empréstimo registrado com sucesso.");
      }

      navigate("/emprestimos");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o empréstimo.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to={returnTo} />

        <PageTitle
          title="Empréstimos"
          tooltip="Nesta página são registrados e acompanhados os empréstimos de bens patrimoniais da organização, permitindo identificar quem recebeu o bem, em qual contexto ele será utilizado, o período do empréstimo, sua condição na saída e, quando devolvido, as informações do retorno. Esses registros ajudam a controlar a movimentação dos bens, acompanhar sua conservação e manter o histórico dos empréstimos realizados."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/emprestimos")!}
                canFillForm
                variant="glassSecondary"
              />
            )
          }
          showImport={false}
        />

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSectionCard
            icon={Package}
            title="Identificação do empréstimo"
            description="Defina qual bem será emprestado e identifique quem ficará responsável por sua guarda e utilização durante o período do empréstimo."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="patrimonioId"
                  required
                  tooltip="Selecione o bem patrimonial que será entregue ao destinatário neste empréstimo."
                >
                  Patrimônio
                </FieldLabel>

                <Select
                  key={`patrimonio-${form.patrimonioId || "vazio"}`}
                  value={form.patrimonioId}
                  onValueChange={(value) => set("patrimonioId", value)}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="patrimonioId">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {patrimonios.map((patrimonio) => (
                      <SelectItem key={patrimonio.id} value={patrimonio.id}>
                        {patrimonio.extra} — {patrimonio.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="tipoDestinatario"
                  required
                  tooltip="Selecione a categoria que representa quem receberá o bem emprestado."
                >
                  Tipo de Destinatário
                </FieldLabel>

                <Select
                  value={form.tipoDestinatario}
                  onValueChange={handleTipoChange}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="tipoDestinatario">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent>
                    {tipoDestinatarioOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {form.tipoDestinatario === "COLABORADOR" && (
                <Field>
                  <FieldLabel
                    htmlFor="colaboradorId"
                    required
                    tooltip="Selecione o colaborador que ficará responsável pelo bem durante o empréstimo."
                  >
                    Colaborador
                  </FieldLabel>

                  <Select
                    value={form.colaboradorId}
                    onValueChange={(value) => set("colaboradorId", value)}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="colaboradorId">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {colaboradores.map((colaborador) => (
                        <SelectItem key={colaborador.id} value={colaborador.id}>
                          {colaborador.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {form.tipoDestinatario === "PARTICIPANTE" && (
                <Field>
                  <FieldLabel
                    htmlFor="participanteId"
                    required
                    tooltip="Selecione o participante que ficará responsável pelo bem durante o empréstimo."
                  >
                    Participante
                  </FieldLabel>

                  <Select
                    value={form.participanteId}
                    onValueChange={(value) => set("participanteId", value)}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="participanteId">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {participantes.map((participante) => (
                        <SelectItem
                          key={participante.id}
                          value={participante.id}
                        >
                          {participante.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {form.tipoDestinatario === "INTEGRANTE" && (
                <Field>
                  <FieldLabel
                    htmlFor="integranteId"
                    required
                    tooltip="Selecione o integrante que ficará responsável pelo bem durante o empréstimo."
                  >
                    Integrante
                  </FieldLabel>

                  <Select
                    value={form.integranteId}
                    onValueChange={(value) => set("integranteId", value)}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="integranteId">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {integrantes.map((integrante) => (
                        <SelectItem key={integrante.id} value={integrante.id}>
                          {integrante.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {form.tipoDestinatario === "DESTINATARIO_EXTERNO" && (
                <Field>
                  <FieldLabel
                    htmlFor="destinatarioExterno"
                    required
                    tooltip="Informe o nome da pessoa, instituição ou outro destinatário externo que ficará responsável pelo bem durante o empréstimo."
                  >
                    Destinatário Externo
                  </FieldLabel>

                  <Input
                    id="destinatarioExterno"
                    value={form.destinatarioExterno}
                    onChange={(event) =>
                      set("destinatarioExterno", event.target.value)
                    }
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              )}
            </div>
          </FormSectionCard>

          <FormSectionCard
            icon={Link2}
            title="Vínculos do empréstimo"
            description="Relacione o empréstimo às ações da organização quando o bem estiver sendo utilizado em um projeto, proposta de edital, atividade ou evento cultural específico."
          >
            <div className="mb-4 flex items-start gap-2.5 rounded-[12px] border border-primary/15 bg-primary-soft/50 px-3.5 py-2.5 shadow-[0_2px_10px_-8px_hsl(215_28%_17%_/_0.16)] backdrop-blur-md supports-[backdrop-filter]:bg-primary-soft/40">
              <Info
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                strokeWidth={2.2}
              />

              <p className="text-xs leading-relaxed text-muted-foreground sm:text-[12.5px]">
                Estes vínculos são opcionais. O empréstimo pode ser relacionado
                a um projeto e a uma proposta de edital. Entre atividade e
                evento cultural, selecione somente o registro diretamente
                relacionado ao uso do bem.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="projetoId"
                  tooltip="Selecione o projeto em cuja execução o bem será utilizado, quando houver."
                >
                  Projeto
                </FieldLabel>

                <Select
                  value={form.projetoId || "NONE"}
                  onValueChange={(value) =>
                    set("projetoId", value === "NONE" ? "" : value)
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="projetoId">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    <SelectItem value="NONE">Nenhum</SelectItem>

                    {projetos.map((projeto) => (
                      <SelectItem key={projeto.id} value={projeto.id}>
                        {projeto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="propostaEditalId"
                  tooltip="Selecione a proposta de edital relacionada à utilização do bem, quando houver."
                >
                  Proposta de Edital
                </FieldLabel>

                <Select
                  value={form.propostaEditalId || "NONE"}
                  onValueChange={(value) =>
                    set("propostaEditalId", value === "NONE" ? "" : value)
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="propostaEditalId">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    <SelectItem value="NONE">Nenhuma</SelectItem>

                    {propostasEdital.map((proposta) => (
                      <SelectItem key={proposta.id} value={proposta.id}>
                        {proposta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="atividadeId"
                  tooltip="Selecione a atividade específica em que o bem será utilizado, quando houver. Não vincule uma atividade e um evento cultural ao mesmo empréstimo."
                >
                  Atividade
                </FieldLabel>

                <Select
                  value={form.atividadeId || "NONE"}
                  onValueChange={handleAtividadeChange}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="atividadeId">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    <SelectItem value="NONE">Nenhuma</SelectItem>

                    {atividades.map((atividade) => (
                      <SelectItem key={atividade.id} value={atividade.id}>
                        {atividade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="eventoCulturalId"
                  tooltip="Selecione o evento cultural em que o bem será utilizado, quando houver. Não vincule um evento cultural e uma atividade ao mesmo empréstimo."
                >
                  Evento Cultural
                </FieldLabel>

                <Select
                  value={form.eventoCulturalId || "NONE"}
                  onValueChange={handleEventoChange}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="eventoCulturalId">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    <SelectItem value="NONE">Nenhum</SelectItem>

                    {eventosCulturais.map((evento) => (
                      <SelectItem key={evento.id} value={evento.id}>
                        {evento.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FormSectionCard>

          <FormSectionCard
            icon={CalendarRange}
            title="Período e utilização"
            description="Registre o período em que o bem ficará emprestado e as informações necessárias para compreender como e em quais condições ele será utilizado."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="dataEmprestimo"
                  required
                  tooltip="Informe a data em que o bem foi efetivamente entregue ao destinatário."
                >
                  Data do Empréstimo
                </FieldLabel>

                <Input
                  id="dataEmprestimo"
                  value={form.dataEmprestimo}
                  onChange={(event) =>
                    set("dataEmprestimo", maskDate(event.target.value))
                  }
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="dataPrevistaDevolucao"
                  required
                  tooltip="Informe a data combinada ou prevista para a devolução do bem à organização."
                >
                  Data Prevista de Devolução
                </FieldLabel>

                <Input
                  id="dataPrevistaDevolucao"
                  value={form.dataPrevistaDevolucao}
                  onChange={(event) =>
                    set("dataPrevistaDevolucao", maskDate(event.target.value))
                  }
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="observacaoEmprestimo"
                  tooltip="Registre informações importantes sobre o empréstimo, como a finalidade do uso, o local onde o bem será utilizado, cuidados combinados ou outras orientações."
                >
                  Observações sobre o Empréstimo
                </FieldLabel>

                <Textarea
                  id="observacaoEmprestimo"
                  value={form.observacaoEmprestimo}
                  onChange={(event) =>
                    set("observacaoEmprestimo", event.target.value)
                  }
                  className="min-h-[90px] resize-none"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </FormSectionCard>

          <FormSectionCard
            icon={Layers}
            title="Condição e situação"
            description="Acompanhe o bem desde sua entrega até a devolução, registrando sua condição física e a situação atual do empréstimo."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="estadoConservacao"
                  required
                  tooltip="Selecione o estado de conservação do bem no momento em que ele foi entregue ao destinatário. Essa informação permite comparar sua condição na saída e na devolução."
                >
                  Estado de Conservação na Saída
                </FieldLabel>

                <Select
                  value={form.estadoConservacao}
                  onValueChange={(value) => set("estadoConservacao", value)}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="estadoConservacao">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent>
                    {estadoConservacaoEmprestimoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="statusEmprestimo"
                  required
                  tooltip="Selecione a situação que representa o momento atual do empréstimo, conforme o bem esteja emprestado, devolvido ou em outra condição prevista no sistema."
                >
                  Situação do Empréstimo
                </FieldLabel>

                <Select
                  value={form.statusEmprestimo}
                  onValueChange={handleStatusChange}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="statusEmprestimo">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent>
                    {statusEmprestimoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {form.statusEmprestimo === "DEVOLVIDO" && (
                <>
                  <Field>
                    <FieldLabel
                      htmlFor="dataDevolucao"
                      required
                      tooltip="Informe a data em que o bem foi efetivamente devolvido à organização."
                    >
                      Data da Devolução
                    </FieldLabel>

                    <Input
                      id="dataDevolucao"
                      value={form.dataDevolucao}
                      onChange={(event) =>
                        set("dataDevolucao", maskDate(event.target.value))
                      }
                      placeholder="dd/mm/aaaa"
                      inputMode="numeric"
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="estadoDevolucao"
                      required
                      tooltip="Selecione o estado em que o bem foi recebido pela organização após a devolução, considerando sua conservação e eventuais danos."
                    >
                      Estado de Conservação na Devolução
                    </FieldLabel>

                    <Select
                      value={form.estadoDevolucao}
                      onValueChange={(value) => set("estadoDevolucao", value)}
                      disabled={bloqueado}
                    >
                      <SelectTrigger id="estadoDevolucao">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>

                      <SelectContent>
                        {estadoDevolucaoOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field full>
                    <FieldLabel
                      htmlFor="observacaoDevolucao"
                      tooltip="Registre informações importantes sobre a devolução, como danos identificados, mudanças no estado de conservação, itens faltantes ou outras ocorrências verificadas no recebimento do bem."
                    >
                      Observações da Devolução
                    </FieldLabel>

                    <Textarea
                      id="observacaoDevolucao"
                      value={form.observacaoDevolucao}
                      onChange={(event) =>
                        set("observacaoDevolucao", event.target.value)
                      }
                      className="min-h-[90px] resize-none"
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </Field>
                </>
              )}
            </div>
          </FormSectionCard>

          {!visualizando && (
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate(returnTo)}
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
                onClick={() => navigate("/emprestimos")}
              >
                Voltar
              </Button>
            </div>
          )}
        </form>
      </div>

      <WikiFloatingButton
        pageTitle="Empréstimos"
        href="https://www.aurit.com.br/wiki/patrimonio/emprestimos"
      />
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
