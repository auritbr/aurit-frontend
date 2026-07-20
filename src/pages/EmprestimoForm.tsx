import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  UserCheck,
  Layers,
  Info,
  Link2,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { useImportFormFill } from "@/hooks/useImportFormFill";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
        json?.message ||
        json?.error ||
        json?.detail ||
        json?.mensagem ||
        text
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

        const patrimoniosData: PatrimonioApiDTO[] =
          await patrimoniosRes.json();

        const colaboradoresData: ColaboradorApiDTO[] =
          await colaboradoresRes.json();

        const participantesData: ParticipanteApiDTO[] =
          await participantesRes.json();

        const integrantesData: IntegranteApiDTO[] =
          await integrantesRes.json();

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
            nome: atividade.nomeAtividade,
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
          setForm(initial);
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
  }, [id, navigate]);

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
        brToComparable(form.dataDevolucao) <
        brToComparable(form.dataEmprestimo)
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
        <button
          type="button"
          onClick={() => navigate("/emprestimos")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <PageTitle
          title="Empréstimo"
          tooltip="Registre e acompanhe o empréstimo de bens da organização, informando quem recebeu, datas, estado de conservação, contexto de uso, observações e situação da devolução."
        />

        {visualizando && (
          <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta tela está em modo de visualização. Para alterar os dados,
            utilize a opção Editar disponível no menu{" "}
            <span className="font-semibold">Ações</span>.
          </div>
        )}

        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info
            className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
            strokeWidth={2.2}
          />

          <p className="text-[13px] leading-relaxed text-foreground">
            Use esta página para controlar a saída temporária de bens
            patrimoniais, registrar responsáveis pelo uso e acompanhar a
            devolução em condições adequadas.
          </p>
        </div>

        {!visualizando && <FormLegend />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={Package} title="Dados do empréstimo">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field full>
                <FieldLabel
                  htmlFor="patrimonioId"
                  required
                  tooltip="Selecione o bem patrimonial que será emprestado. Ex.: Violão Tagima — PAT-2026-001."
                >
                  Patrimônio
                </FieldLabel>

                <Select
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
                  htmlFor="dataEmprestimo"
                  required
                  tooltip="Informe a data em que o bem foi entregue ao destinatário."
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
                  tooltip="Informe a data prevista para devolução do bem, quando houver prazo combinado."
                >
                  Data Prevista de Devolução
                </FieldLabel>

                <Input
                  id="dataPrevistaDevolucao"
                  value={form.dataPrevistaDevolucao}
                  onChange={(event) =>
                    set(
                      "dataPrevistaDevolucao",
                      maskDate(event.target.value),
                    )
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
                  tooltip="Registre finalidade, local de uso, cuidados combinados ou qualquer informação importante sobre o empréstimo."
                >
                  Observação do Empréstimo
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
          </Section>

          <Section icon={UserCheck} title="Destinatário">
            <div className="mb-4 flex items-start gap-2.5 rounded border border-border bg-muted/40 px-3.5 py-2.5">
              <Info
                className="h-4 w-4 text-primary mt-0.5 flex-shrink-0"
                strokeWidth={2.2}
              />

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Selecione apenas um destinatário para o empréstimo. Escolha o
                tipo correspondente e preencha somente o campo exibido para
                evitar duplicidade no registro.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="tipoDestinatario"
                  required
                  tooltip="Selecione quem receberá o bem emprestado."
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
                  <FieldLabel htmlFor="colaboradorId" required>
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
                        <SelectItem
                          key={colaborador.id}
                          value={colaborador.id}
                        >
                          {colaborador.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {form.tipoDestinatario === "PARTICIPANTE" && (
                <Field>
                  <FieldLabel htmlFor="participanteId" required>
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
                  <FieldLabel htmlFor="integranteId" required>
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
                    tooltip="Informe o nome da pessoa, instituição ou responsável externo que recebeu o bem."
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
          </Section>

          <Section icon={Link2} title="Vínculos do empréstimo">
            <div className="mb-4 rounded border border-border border-l-4 border-l-primary/70 bg-primary-soft/40 p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-primary mb-2">
                Contexto do empréstimo
              </p>

              <p className="text-[13px] leading-relaxed text-foreground/90">
                Estes campos são opcionais. Use para indicar o contexto de uso
                do bem. O sistema permite vincular projeto e/ou proposta, mas
                entre atividade e evento cultural escolha apenas um.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="projetoId"
                  tooltip="Selecione um projeto apenas se o bem estiver sendo emprestado para uso direto nele."
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
                  tooltip="Selecione uma proposta apenas se o bem estiver sendo emprestado para uso direto nela."
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
                  tooltip="Selecione uma atividade apenas se o bem estiver sendo emprestado para uso direto nela. Ao selecionar atividade, o evento cultural será limpo."
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
                  tooltip="Selecione um evento cultural apenas se o bem estiver sendo emprestado para uso direto nele. Ao selecionar evento, a atividade será limpa."
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
          </Section>

          <Section icon={Layers} title="Situação do bem e do empréstimo">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="estadoConservacao"
                  required
                  tooltip="Informe o estado do bem no momento da retirada."
                >
                  Estado de Conservação no Empréstimo
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
                  tooltip="Indique a situação atual do empréstimo."
                >
                  Status do Empréstimo
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
                    <FieldLabel htmlFor="dataDevolucao" required>
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
                    <FieldLabel htmlFor="estadoDevolucao" required>
                      Estado na Devolução
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
                      tooltip="Registre observações sobre a devolução, conservação, danos ou pendências."
                    >
                      Observação da Devolução
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
          </Section>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/emprestimos")}
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
        <WikiFloatingButton
          pageTitle="Empréstimos"
          href="https://www.aurit.com.br/wiki/patrimonio/emprestimos"
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
