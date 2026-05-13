import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  User2,
  Wallet,
  Tags,
  Link2,
  AlertTriangle,
  Upload,
  Building2,
  CalendarClock,
  X,
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
import {
  formasPagamento,
  aplicacoesFinanceiro,
  statusFinanceiro,
  tiposOperacao,
  getFinanceiroById,
  createFinanceiro,
  updateFinanceiro,
  getFinanceiroComprovanteDownloadUrl,
  type FinanceiroPayloadDTO,
} from "@/data/financeiro";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const NONE_VALUE = "__NONE__";
const MAX_FILE_MB = 10;

const FINANCEIRO_NEXT_STEP_KEY = "aurit:financeiro:next-step-card";

interface FinanceiroNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoFinanceiro() {
  const card: FinanceiroNextStepCardData = {
    titulo: "Após registrar as movimentações no controle financeiro, acompanhe os editais",
    descricao:
      "O módulo de editais ajuda a organizar oportunidades, inscrições, órgãos responsáveis, valores, status e observações importantes para manter o histórico institucional e apoiar futuras propostas.",
    acaoLabel: "Cadastrar editais",
    acaoUrl: "/editais",
    acaoSecundariaLabel: "Ver controle financeiro",
    acaoSecundariaUrl: "/financeiro",
    variante: "pendente",
  };

  sessionStorage.setItem(FINANCEIRO_NEXT_STEP_KEY, JSON.stringify(card));
}

interface OrganizacaoOption {
  id: string;
  nome: string;
}

interface PlanejamentoOption {
  id: string;
  nome: string;
  projetoId?: string;
}

interface ProjetoOption {
  id: string;
  nome: string;
}

interface ColaboradorOption {
  id: string;
  nome: string;
  cpf?: string;
}

interface AtividadeOption {
  id: string;
  nome: string;
}

interface EventoOption {
  id: string;
  nome: string;
}

interface AcaoOption {
  id: string;
  nome: string;
}

interface FormState {
  numeroDocumento: string;
  descricao: string;

  dataPagamento: string;
  dataVencimento: string;

  urlComprovante: string;

  colaboradorId: string;
  nomePessoa: string;
  cpfCnpj: string;

  valor: string;
  observacao: string;

  formaPagamento: string;
  aplicacaoFinanceiro: string;
  statusFinanceiro: string;
  tipoOperacaoFinanceira: string;

  organizacaoId: string;
  planejamentoFinanceiroId: string;

  projetoId: string;
  atividadeId: string;
  eventoCulturalId: string;
  acaoDivulgacaoId: string;
}

const initial: FormState = {
  numeroDocumento: "",
  descricao: "",

  dataPagamento: "",
  dataVencimento: "",

  urlComprovante: "",

  colaboradorId: "",
  nomePessoa: "",
  cpfCnpj: "",

  valor: "",
  observacao: "",

  formaPagamento: "",
  aplicacaoFinanceiro: "",
  statusFinanceiro: "",
  tipoOperacaoFinanceira: "",

  organizacaoId: "",
  planejamentoFinanceiroId: "",

  projetoId: "",
  atividadeId: "",
  eventoCulturalId: "",
  acaoDivulgacaoId: "",
};

const onlyDigits = (value: string, max = 14) =>
  value.replace(/\D/g, "").slice(0, max);

const maskCpfCnpj = (value: string) => {
  const digits = onlyDigits(value, 14);

  if (!digits) return "";

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(
      /^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/,
      "$1.$2.$3/$4-$5",
    );
};

const moneyToInput = (value?: number) => {
  if (value == null || Number.isNaN(value)) return "";

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const moneyToNumber = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".");

  return Number(normalized);
};

const maskMoney = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  const number = parseInt(digits, 10) / 100;

  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

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
    return text || `Erro ${response.status} ao processar requisição.`;
  } catch {
    return `Erro ${response.status} ao processar requisição.`;
  }
}

function isAllowedComprovante(file: File) {
  const allowed = ["pdf", "png", "jpg", "jpeg", "webp"];
  const extension = file.name.split(".").pop()?.toLowerCase();

  return !!extension && allowed.includes(extension);
}

function getNomeComprovante(urlComprovante?: string) {
  if (!urlComprovante?.trim()) return "";

  const ultimoTrecho = urlComprovante.split("?")[0].split("/").pop() ?? "";

  return ultimoTrecho
    .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "")
    .trim() || "Comprovante anexado";
}

function optionName(item: any, fallback: string) {
  return (
    item.nomePlanejamento?.trim() ||
    item.nomeProjeto?.trim() ||
    item.nomeAtividade?.trim() ||
    item.nomeEvento?.trim() ||
    item.nomeAcao?.trim() ||
    item.nomeCompleto?.trim() ||
    item.razaoSocial?.trim() ||
    item.nomeFantasia?.trim() ||
    item.nomeOrganizacao?.trim() ||
    item.titulo?.trim() ||
    fallback
  );
}

export default function FinanceiroForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);

  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [planejamentos, setPlanejamentos] = useState<PlanejamentoOption[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [atividades, setAtividades] = useState<AtividadeOption[]>([]);
  const [eventos, setEventos] = useState<EventoOption[]>([]);
  const [acoes, setAcoes] = useState<AcaoOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [removerComprovanteAtual, setRemoverComprovanteAtual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bloqueado = loading || saving || visualizando;
  const comprovanteLabel = comprovanteFile?.name || getNomeComprovante(form.urlComprovante);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    void carregar();
  }, [id]);

  useEffect(() => {
    if (!form.colaboradorId) return;

    const colaborador = colaboradores.find(
      (item) => item.id === form.colaboradorId,
    );

    setForm((prev) => ({
      ...prev,
      cpfCnpj: colaborador?.cpf ? maskCpfCnpj(colaborador.cpf) : "",
      nomePessoa: "",
    }));
  }, [form.colaboradorId, colaboradores]);

  const colaboradorSelected = !!form.colaboradorId;
  const pessoaSelected = !!form.nomePessoa.trim();

  const vinculosComplementares = useMemo(
    () =>
      [
        form.atividadeId,
        form.eventoCulturalId,
        form.acaoDivulgacaoId,
      ].filter(Boolean).length,
    [form.atividadeId, form.eventoCulturalId, form.acaoDivulgacaoId],
  );

  async function carregar() {
    try {
      setLoading(true);

      const [
        organizacoesRes,
        planejamentosRes,
        projetosRes,
        colaboradoresRes,
        atividadesRes,
        eventosRes,
        acoesRes,
      ] = await Promise.all([
        fetch(`${API_URL}/organizacoes`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/planejamentos-financeiros`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/projetos`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/colaboradores`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/atividades`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/eventos-culturais`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/acoes-divulgacao`, { headers: getAuthHeaders() }),
      ]);

      if (!organizacoesRes.ok) {
        throw new Error(await parseError(organizacoesRes));
      }

      if (!planejamentosRes.ok) {
        throw new Error(await parseError(planejamentosRes));
      }

      if (!projetosRes.ok) {
        throw new Error(await parseError(projetosRes));
      }

      if (!colaboradoresRes.ok) {
        throw new Error(await parseError(colaboradoresRes));
      }

      if (!atividadesRes.ok) {
        throw new Error(await parseError(atividadesRes));
      }

      if (!eventosRes.ok) {
        throw new Error(await parseError(eventosRes));
      }

      if (!acoesRes.ok) {
        throw new Error(await parseError(acoesRes));
      }

      const organizacoesData = await organizacoesRes.json();
      const planejamentosData = await planejamentosRes.json();
      const projetosData = await projetosRes.json();
      const colaboradoresData = await colaboradoresRes.json();
      const atividadesData = await atividadesRes.json();
      const eventosData = await eventosRes.json();
      const acoesData = await acoesRes.json();

      setOrganizacoes(
        (organizacoesData ?? []).map((item: any) => ({
          id: String(item.id),
          nome: optionName(item, `Organização ${item.id}`),
        })),
      );

      setPlanejamentos(
        (planejamentosData ?? []).map((item: any) => ({
          id: String(item.id),
          nome: optionName(item, `Orçamento ${item.id}`),
          projetoId: item.projetoId != null ? String(item.projetoId) : undefined,
        })),
      );

      setProjetos(
        (projetosData ?? []).map((item: any) => ({
          id: String(item.id),
          nome: optionName(item, `Projeto ${item.id}`),
        })),
      );

      setColaboradores(
        (colaboradoresData ?? []).map((item: any) => ({
          id: String(item.id),
          nome: optionName(item, `Colaborador ${item.id}`),
          cpf: item.cpf,
        })),
      );

      setAtividades(
        (atividadesData ?? []).map((item: any) => ({
          id: String(item.id),
          nome: optionName(item, `Atividade ${item.id}`),
        })),
      );

      setEventos(
        (eventosData ?? []).map((item: any) => ({
          id: String(item.id),
          nome: optionName(item, `Evento ${item.id}`),
        })),
      );

      setAcoes(
        (acoesData ?? []).map((item: any) => ({
          id: String(item.id),
          nome: optionName(item, `Ação ${item.id}`),
        })),
      );

      if (id) {
        const item = await getFinanceiroById(Number(id));

        setRemoverComprovanteAtual(false);

        setForm({
          numeroDocumento: item.numeroDocumento ?? "",
          descricao: item.descricao ?? "",

          dataPagamento: item.dataPagamento ?? "",
          dataVencimento: item.dataVencimento ?? "",

          urlComprovante: item.urlComprovante ?? "",

          colaboradorId: item.colaboradorId ?? "",
          nomePessoa: item.nomePessoa ?? "",
          cpfCnpj: item.cpfCnpj ? maskCpfCnpj(item.cpfCnpj) : "",

          valor: moneyToInput(Number(item.valor ?? 0)),
          observacao: item.observacao ?? "",

          formaPagamento: item.formaPagamento ?? "",
          aplicacaoFinanceiro: item.aplicacaoFinanceiro ?? "",
          statusFinanceiro: item.statusFinanceiro ?? "",
          tipoOperacaoFinanceira: item.tipoOperacaoFinanceira ?? "",

          organizacaoId: item.organizacaoId ?? "",
          planejamentoFinanceiroId: item.planejamentoFinanceiroId ?? "",

          projetoId: item.projetoId ?? "",
          atividadeId: item.atividadeId ?? "",
          eventoCulturalId: item.eventoCulturalId ?? "",
          acaoDivulgacaoId: item.acaoDivulgacaoId ?? "",
        });
      }
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar formulário de lançamento do controle financeiro.",
      );

      if (id) {
        navigate("/financeiro");
      }
    } finally {
      setLoading(false);
    }
  }

  function handlePessoaChange(value: string) {
    setForm((prev) => ({
      ...prev,
      nomePessoa: value,
      ...(value.trim() ? { colaboradorId: "" } : {}),
    }));
  }

  function limparColaborador() {
    if (bloqueado) return;

    setForm((prev) => ({
      ...prev,
      colaboradorId: "",
      cpfCnpj: "",
    }));
  }

  function limparPessoa() {
    if (bloqueado) return;

    setForm((prev) => ({
      ...prev,
      nomePessoa: "",
      cpfCnpj: "",
    }));
  }

  function handlePlanejamentoChange(value: string) {
    const finalValue = value === NONE_VALUE ? "" : value;

    const planejamento = planejamentos.find((item) => item.id === finalValue);

    setForm((prev) => ({
      ...prev,
      planejamentoFinanceiroId: finalValue,
      projetoId: planejamento?.projetoId ?? prev.projetoId,
    }));
  }

  function handleProjetoChange(value: string) {
    const finalValue = value === NONE_VALUE ? "" : value;

    setForm((prev) => ({
      ...prev,
      projetoId: finalValue,
    }));
  }

  function handleVinculoComplementarChange(
    campo: "atividadeId" | "eventoCulturalId" | "acaoDivulgacaoId",
    value: string,
  ) {
    const finalValue = value === NONE_VALUE ? "" : value;

    setForm((prev) => ({
      ...prev,
      atividadeId: campo === "atividadeId" ? finalValue : "",
      eventoCulturalId: campo === "eventoCulturalId" ? finalValue : "",
      acaoDivulgacaoId: campo === "acaoDivulgacaoId" ? finalValue : "",
    }));
  }

  function abrirSeletorComprovante() {
    if (bloqueado) return;

    fileInputRef.current?.click();
  }

  function handleComprovanteChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (bloqueado) return;

    const file = e.target.files?.[0];

    if (!file) return;

    if (!isAllowedComprovante(file)) {
      toast.error("Formato não permitido. Envie PDF, PNG, JPG, JPEG ou WEBP.");
      e.target.value = "";
      return;
    }

    const sizeMB = file.size / (1024 * 1024);

    if (sizeMB > MAX_FILE_MB) {
      toast.error("O arquivo deve ter no máximo 10 MB.");
      e.target.value = "";
      return;
    }

    setRemoverComprovanteAtual(false);
    setComprovanteFile(file);
    set("urlComprovante", file.name);
  }

  function removerComprovante() {
    if (bloqueado) return;

    setRemoverComprovanteAtual(!!form.urlComprovante && !comprovanteFile);
    setComprovanteFile(null);
    set("urlComprovante", "");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function abrirComprovante() {
    if (!id || !form.urlComprovante || comprovanteFile) {
      return;
    }

    try {
      const urlTemporaria = await getFinanceiroComprovanteDownloadUrl(id);
      window.open(urlTemporaria, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao abrir comprovante do controle financeiro.",
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (visualizando) return;

    if (colaboradorSelected && pessoaSelected) {
      toast.error("Preencha apenas Colaborador OU Nome da Pessoa, nunca os dois.");
      return;
    }

    if (!colaboradorSelected && !pessoaSelected) {
      toast.error("Informe um colaborador ou o nome da pessoa.");
      return;
    }

    if (!form.dataPagamento) {
      toast.error("Informe a data de pagamento.");
      return;
    }

    if (!form.valor) {
      toast.error("Informe o valor.");
      return;
    }

    const valorNumber = moneyToNumber(form.valor);

    if (!valorNumber || valorNumber <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    if (!form.formaPagamento) {
      toast.error("Selecione a forma de pagamento.");
      return;
    }

    if (!form.aplicacaoFinanceiro) {
      toast.error("Selecione a aplicação financeira.");
      return;
    }

    if (!form.statusFinanceiro) {
      toast.error("Selecione o status financeiro.");
      return;
    }

    if (!form.tipoOperacaoFinanceira) {
      toast.error("Selecione o tipo de operação.");
      return;
    }

    if (form.statusFinanceiro === "VENCIDO" && !form.dataVencimento) {
      toast.error("Informe a data de vencimento para movimentações vencidas.");
      return;
    }

    if (vinculosComplementares > 1) {
      toast.error(
        "Informe apenas um vínculo complementar entre atividade, evento cultural ou ação de divulgação.",
      );
      return;
    }

    const payload: FinanceiroPayloadDTO = {
      numeroDocumento: form.numeroDocumento.trim() || null,
      descricao: form.descricao.trim() || null,
      dataPagamento: form.dataPagamento,
      dataVencimento: form.dataVencimento || null,
      nomePessoa: form.nomePessoa.trim() || null,
      cpfCnpj: onlyDigits(form.cpfCnpj).trim() || null,
      urlComprovante:
        comprovanteFile == null && !removerComprovanteAtual
          ? form.urlComprovante.trim() || null
          : null,
      removerComprovante: removerComprovanteAtual,
      formaPagamento: form.formaPagamento,
      aplicacaoFinanceiro: form.aplicacaoFinanceiro,
      statusFinanceiro: form.statusFinanceiro,
      tipoOperacaoFinanceira: form.tipoOperacaoFinanceira as
        | "ENTRADA"
        | "SAIDA",
      valor: valorNumber,
      observacao: form.observacao.trim() || null,

      organizacaoId: form.organizacaoId ? Number(form.organizacaoId) : null,
      projetoId: form.projetoId ? Number(form.projetoId) : null,
      atividadeId: form.atividadeId ? Number(form.atividadeId) : null,
      colaboradorId: form.colaboradorId ? Number(form.colaboradorId) : null,
      eventoCulturalId: form.eventoCulturalId
        ? Number(form.eventoCulturalId)
        : null,
      acaoDivulgacaoId: form.acaoDivulgacaoId
        ? Number(form.acaoDivulgacaoId)
        : null,
      planejamentoFinanceiroId: form.planejamentoFinanceiroId
        ? Number(form.planejamentoFinanceiroId)
        : null,
    };

    try {
      setSaving(true);

      if (editando && id) {
        await updateFinanceiro(Number(id), payload, comprovanteFile);
        toast.success("Lançamento do controle financeiro atualizado com sucesso.");
      } else {
        await createFinanceiro(payload, comprovanteFile);
        salvarProximaAcaoFinanceiro();
        toast.success("Lançamento do controle financeiro salvo com sucesso.");
      }

      navigate("/financeiro");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar lançamento do controle financeiro.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          onClick={() => navigate("/financeiro")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageTitle
          title="Controle Financeiro"
          tooltip="Registre entradas e saídas financeiras da organização no controle financeiro. Use os vínculos apenas quando a movimentação estiver diretamente relacionada a projeto, planejamento, atividade, evento cultural ou ação de divulgação. Para despesas administrativas, como luz, internet, aluguel e taxas, deixe os vínculos de execução em branco e detalhe a finalidade na descrição ou observação."
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
          <Section icon={Building2} title="Vínculo institucional">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field full>
                <FieldLabel
                  htmlFor="organizacaoId"
                  tooltip="Selecione a organização apenas se o sistema exigir esse vínculo visualmente. O backend deve vincular a movimentação pela empresa logada."
                >
                  Organização
                </FieldLabel>

                <Select
                  value={form.organizacaoId}
                  onValueChange={(value) => set("organizacaoId", value)}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="organizacaoId">
                    <SelectValue placeholder="Selecione uma organização" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {organizacoes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={FileText} title="Identificação do lançamento do controle financeiro">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="numeroDocumento"
                  tooltip="Informe o número da nota fiscal, recibo, contrato, comprovante ou documento relacionado à movimentação, quando houver."
                >
                  Número do Documento
                </FieldLabel>

                <Input
                  id="numeroDocumento"
                  value={form.numeroDocumento}
                  onChange={(e) => set("numeroDocumento", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="descricao"
                  tooltip="Informe uma descrição clara e objetiva sobre o motivo da entrada ou saída financeira. Ex.: pagamento da conta de luz, compra de material pedagógico, recebimento de recurso do edital ou pagamento de oficina."
                >
                  Descrição
                </FieldLabel>

                <Input
                  id="descricao"
                  value={form.descricao}
                  onChange={(e) => set("descricao", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="urlComprovante"
                  tooltip="Anexe o comprovante relacionado à movimentação, como nota fiscal, recibo, comprovante de pagamento, contrato, extrato, declaração ou outro documento de apoio."
                >
                  Comprovante
                </FieldLabel>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleComprovanteChange}
                  disabled={bloqueado}
                />

                <div className="flex gap-2">
                  <Input
                    id="urlComprovante"
                    value={comprovanteLabel}
                    readOnly
                    disabled
                    className="flex-1 cursor-not-allowed bg-muted/40"
                    placeholder="Nenhum arquivo anexado"
                  />

                  {visualizando && form.urlComprovante && !comprovanteFile && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 gap-2"
                      onClick={() => void abrirComprovante()}
                    >
                      Abrir
                    </Button>
                  )}

                  {!visualizando && form.urlComprovante && !comprovanteFile && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10"
                      onClick={() => void abrirComprovante()}
                      disabled={saving}
                    >
                      Abrir
                    </Button>
                  )}

                  {!visualizando && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 gap-2"
                      onClick={abrirSeletorComprovante}
                      disabled={saving}
                    >
                      <Upload className="h-4 w-4" />
                      Anexar
                    </Button>
                  )}
                </div>

                {!visualizando && comprovanteLabel && (
                  <div className="mt-2 flex items-center gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      Arquivo selecionado: {comprovanteLabel}
                    </p>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removerComprovante}
                      disabled={saving}
                    >
                      Remover
                    </Button>
                  </div>
                )}

                <p className="mt-1 text-[11px] text-muted-foreground">
                  Formatos aceitos: PDF, PNG, JPG, JPEG ou WEBP. Tamanho máximo:
                  10 MB.
                </p>
              </Field>
            </div>
          </Section>

          <Section icon={CalendarClock} title="Datas">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="dataPagamento"
                  required
                  tooltip="Informe a data em que a movimentação foi paga, recebida ou registrada financeiramente."
                >
                  Data do Pagamento
                </FieldLabel>

                <Input
                  id="dataPagamento"
                  type="date"
                  value={form.dataPagamento}
                  onChange={(e) => set("dataPagamento", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="dataVencimento"
                  tooltip="Informe a data de vencimento quando houver prazo de pagamento, boleto, conta, parcela ou despesa programada."
                >
                  Data de Vencimento
                </FieldLabel>

                <Input
                  id="dataVencimento"
                  type="date"
                  value={form.dataVencimento}
                  onChange={(e) => set("dataVencimento", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={User2} title="Pessoa / colaborador envolvido">
            <div className="mb-4 flex items-start gap-2.5 rounded border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50/60 p-3.5">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600"
                strokeWidth={2.2}
              />

              <div className="text-[13px] leading-relaxed">
                <p className="text-amber-800/90">
                  Informe quem está relacionado à movimentação. Se for alguém já
                  cadastrado na equipe, selecione o colaborador. Se for uma
                  pessoa externa, empresa ou fornecedor, preencha o nome no campo
                  “Nome da Pessoa”. Use apenas uma dessas opções.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="colaborador"
                  tooltip="Selecione o colaborador quando a movimentação estiver relacionada a alguém já cadastrado na equipe da organização. Ex.: pagamento de produtor, coordenador, monitor, oficineiro ou prestador cadastrado."
                >
                  Colaborador
                </FieldLabel>

                <div className="flex gap-2">
                  <Select
                    value={form.colaboradorId}
                    onValueChange={(value) => set("colaboradorId", value)}
                    disabled={bloqueado || pessoaSelected}
                  >
                    <SelectTrigger id="colaborador">
                      <SelectValue
                        placeholder={
                          pessoaSelected
                            ? "Nome da Pessoa preenchido"
                            : "Selecione"
                        }
                      />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {colaboradores.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!visualizando && colaboradorSelected && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={limparColaborador}
                      disabled={saving}
                      className="shrink-0"
                      title="Limpar colaborador"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="nomePessoa"
                  tooltip="Preencha este campo quando a movimentação estiver relacionada a uma pessoa externa, empresa, fornecedor, prestador de serviço ou instituição não cadastrada como colaborador. Ex.: companhia de energia, provedor de internet, gráfica, fornecedor de som ou empresa de transporte."
                >
                  Nome da Pessoa
                </FieldLabel>

                <div className="flex gap-2">
                  <Input
                    id="nomePessoa"
                    value={form.nomePessoa}
                    onChange={(e) => handlePessoaChange(e.target.value)}
                    disabled={bloqueado || colaboradorSelected}
                    readOnly={visualizando}
                    placeholder={
                      colaboradorSelected ? "Colaborador selecionado" : ""
                    }
                  />

                  {!visualizando && pessoaSelected && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={limparPessoa}
                      disabled={saving}
                      className="shrink-0"
                      title="Limpar pessoa"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="cpfCnpj"
                  tooltip="Informe o CPF ou CNPJ da pessoa, empresa ou fornecedor, quando houver necessidade de identificação fiscal."
                >
                  CPF/CNPJ
                </FieldLabel>

                <Input
                  id="cpfCnpj"
                  value={form.cpfCnpj}
                  onChange={(e) => set("cpfCnpj", maskCpfCnpj(e.target.value))}
                  inputMode="numeric"
                  disabled={bloqueado || colaboradorSelected}
                  readOnly={visualizando}
                />

                {colaboradorSelected && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Preenchido automaticamente a partir do colaborador selecionado.
                  </p>
                )}
              </Field>
            </div>
          </Section>

          <Section icon={Wallet} title="Valores e observações">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="valor"
                  required
                  tooltip="Informe o valor da entrada ou saída financeira. Ex.: 350,00 ou 1.200,00."
                >
                  Valor
                </FieldLabel>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>

                  <Input
                    id="valor"
                    value={form.valor}
                    onChange={(e) => set("valor", maskMoney(e.target.value))}
                    className="pl-9"
                    inputMode="numeric"
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </div>
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="observacao"
                  tooltip="Registre informações complementares sobre a movimentação, como justificativa, referência ao serviço, parcela, período, forma de contratação ou detalhes úteis para conferência. Ex.: Pagamento referente à conta de luz do mês de maio ou 1ª parcela da oficina realizada no projeto."
                >
                  Observação
                </FieldLabel>

                <Textarea
                  id="observacao"
                  value={form.observacao}
                  onChange={(e) => set("observacao", e.target.value)}
                  rows={3}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={Tags} title="Classificação financeira">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="tipoOperacao"
                  required
                  tooltip="Selecione se a movimentação é uma entrada ou uma saída financeira. Entradas representam valores recebidos; saídas representam pagamentos, compras ou despesas."
                >
                  Tipo de Operação
                </FieldLabel>

                <Select
                  value={form.tipoOperacaoFinanceira}
                  onValueChange={(value) =>
                    set("tipoOperacaoFinanceira", value)
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="tipoOperacao">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent>
                    {tiposOperacao.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="formaPagamento"
                  required
                  tooltip="Selecione como o valor foi pago ou recebido. Ex.: Pix, dinheiro, transferência bancária, cartão, boleto ou depósito."
                >
                  Forma de Pagamento
                </FieldLabel>

                <Select
                  value={form.formaPagamento}
                  onValueChange={(value) => set("formaPagamento", value)}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="formaPagamento">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {formasPagamento.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="aplicacao"
                  required
                  tooltip="Selecione a finalidade ou categoria de aplicação do recurso, indicando em que tipo de gasto, receita ou uso financeiro a movimentação se encaixa. Ex.: recursos humanos, serviço, material de consumo, transporte, alimentação, comunicação, locação ou administrativo."
                >
                  Aplicação Financeira
                </FieldLabel>

                <Select
                  value={form.aplicacaoFinanceiro}
                  onValueChange={(value) => set("aplicacaoFinanceiro", value)}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="aplicacao">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {aplicacoesFinanceiro.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="statusFin"
                  required
                  tooltip="Indique a situação financeira da movimentação. Use “Pendente” para valores ainda não finalizados, “Liquidado” para valores pagos ou recebidos e “Vencido” para obrigações que passaram do prazo."
                >
                  Status Financeiro
                </FieldLabel>

                <Select
                  value={form.statusFinanceiro}
                  onValueChange={(value) => set("statusFinanceiro", value)}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="statusFin">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent>
                    {statusFinanceiro.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={Link2} title="Origem do lançamento do controle financeiro">
            <div className="mb-4 rounded border border-border border-l-4 border-l-primary/70 bg-primary-soft/40 p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-primary mb-2">
                Vínculos opcionais
              </p>

              <p className="text-[13px] leading-relaxed text-foreground/90">
                Vincule a movimentação apenas quando ela estiver diretamente
                relacionada a um projeto, planejamento, atividade, evento cultural
                ou ação de divulgação. Para despesas administrativas ou
                institucionais, deixe esses vínculos em branco e detalhe a
                finalidade na observação.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="planejamentoFinanceiroId"
                  tooltip="Selecione o orçamento da proposta relacionado, quando a movimentação executar ou comprovar uma previsão planejada."
                >
                  Orçamento da Proposta
                </FieldLabel>

                <Select
                  value={form.planejamentoFinanceiroId || NONE_VALUE}
                  onValueChange={handlePlanejamentoChange}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="planejamentoFinanceiroId">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    <SelectItem value={NONE_VALUE}>Nenhum</SelectItem>

                    {planejamentos.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="projeto"
                  tooltip="Selecione o projeto quando a movimentação estiver diretamente relacionada a ele. Deixe em branco para despesas gerais da organização."
                >
                  Projeto
                </FieldLabel>

                <Select
                  value={form.projetoId || NONE_VALUE}
                  onValueChange={handleProjetoChange}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="projeto">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    <SelectItem value={NONE_VALUE}>Nenhum</SelectItem>

                    {projetos.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="atividade"
                  tooltip="Selecione a atividade somente quando a movimentação estiver ligada diretamente a uma atividade específica."
                >
                  Atividade
                </FieldLabel>

                <Select
                  value={form.atividadeId || NONE_VALUE}
                  onValueChange={(value) =>
                    handleVinculoComplementarChange("atividadeId", value)
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="atividade">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    <SelectItem value={NONE_VALUE}>Nenhuma</SelectItem>

                    {atividades.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="evento"
                  tooltip="Selecione o evento cultural somente quando a movimentação estiver ligada diretamente a um evento específico."
                >
                  Evento Cultural
                </FieldLabel>

                <Select
                  value={form.eventoCulturalId || NONE_VALUE}
                  onValueChange={(value) =>
                    handleVinculoComplementarChange("eventoCulturalId", value)
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="evento">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    <SelectItem value={NONE_VALUE}>Nenhum</SelectItem>

                    {eventos.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="divulgacao"
                  tooltip="Selecione a ação de divulgação somente quando a movimentação estiver ligada diretamente a uma ação específica de comunicação ou mobilização."
                >
                  Ação de Divulgação
                </FieldLabel>

                <Select
                  value={form.acaoDivulgacaoId || NONE_VALUE}
                  onValueChange={(value) =>
                    handleVinculoComplementarChange("acaoDivulgacaoId", value)
                  }
                  disabled={bloqueado}
                >
                  <SelectTrigger id="divulgacao">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    <SelectItem value={NONE_VALUE}>Nenhuma</SelectItem>

                    {acoes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/financeiro")}
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
  children: React.ReactNode;
  full?: boolean;
}) {
  return <div className={full ? "sm:col-span-2" : ""}>{children}</div>;
}