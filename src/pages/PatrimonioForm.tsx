import { useEffect, useMemo, useRef, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Tag,
  ClipboardList,
  Layers,
  Building2,
  Upload,
  FileText,
  type LucideIcon,
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
import { maskDate } from "@/lib/masks";
import { getImportConfigForPath } from "@/config/importacoes";
import {
  buildPatrimonioPayload,
  createPatrimonio,
  updatePatrimonio,
  estadoConservacaoOptions,
  getOrganizacoesPatrimonio,
  getPatrimonioById,
  getNomeArquivoPatrimonio,
  getPatrimonioNotaFiscalDownloadUrl,
  getProjetosPatrimonio,
  statusPatrimonioOptions,
  tipoPatrimonioOptions,
  type EstadoConservacaoApi,
  type OrganizacaoOption,
  type Patrimonio,
  type ProjetoOption,
  type StatusPatrimonioApi,
  type TipoPatrimonioApi,
} from "@/data/patrimonio";
import { toast } from "sonner";
import { emitJourneyNextStep } from "@/lib/nextStepPopup";

const SEM_PROJETO_VALUE = "__SEM_PROJETO__";
const MAX_FILE_MB = 10;
function salvarProximaAcaoPatrimonio() {
  emitJourneyNextStep();
}

interface FormState {
  numeroPatrimonio: string;
  nomePatrimonio: string;
  dataAquisicao: string;
  descricaoPatrimonio: string;
  valorPatrimonio: string;

  marca: string;
  modelo: string;
  numeroSerie: string;
  urlNotaFiscal: string;

  tipoPatrimonio: TipoPatrimonioApi | "";
  estadoConservacao: EstadoConservacaoApi | "";
  statusPatrimonio: StatusPatrimonioApi | "";

  organizacaoId: string;
  projetoId: string;
}

const initial: FormState = {
  numeroPatrimonio: "",
  nomePatrimonio: "",
  dataAquisicao: "",
  descricaoPatrimonio: "",
  valorPatrimonio: "",

  marca: "",
  modelo: "",
  numeroSerie: "",
  urlNotaFiscal: "",

  tipoPatrimonio: "",
  estadoConservacao: "",
  statusPatrimonio: "",

  organizacaoId: "",
  projetoId: "",
};

const maskCurrency = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  const number = (parseInt(digits, 10) / 100).toFixed(2);

  return number.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseCurrencyToNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;

  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? undefined : parsed;
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

function brToDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);

  return new Date(year, month - 1, day);
}

function isAllowedNotaFiscal(file: File) {
  const allowed = ["pdf", "png", "jpg", "jpeg", "webp"];
  const extension = file.name.split(".").pop()?.toLowerCase();

  return !!extension && allowed.includes(extension);
}

function getOrganizacaoId(organizacao?: OrganizacaoOption | null) {
  return organizacao ? String(organizacao.id) : "";
}

function getProjetoId(projeto?: ProjetoOption | null) {
  return projeto ? String(projeto.id) : "";
}

export default function PatrimonioForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const duplicarId = !id ? searchParams.get("duplicar") : null;

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<FormState>(initial);
  const [existingPatrimonio, setExistingPatrimonio] =
    useState<Patrimonio | null>(null);
  const [organizacoes, setOrganizacoes] = useState<OrganizacaoOption[]>([]);
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [notaFiscalFile, setNotaFiscalFile] = useState<File | null>(null);
  const notaFiscalInputRef = useRef<HTMLInputElement | null>(null);

  const bloqueado = loading || saving || visualizando;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const organizacoesOptions = useMemo(() => {
    const options = [...organizacoes];

    const organizacaoId =
      form.organizacaoId ||
      String(existingPatrimonio?.organizacaoId ?? "") ||
      String(organizacoes[0]?.id ?? "");

    const organizacaoIdNumber = Number(organizacaoId);

    if (
      organizacaoId &&
      Number.isFinite(organizacaoIdNumber) &&
      !options.some((org) => String(org.id) === String(organizacaoId))
    ) {
      options.unshift({
        id: organizacaoIdNumber,
        nome: `Organização ${organizacaoId}`,
      });
    }

    return options;
  }, [organizacoes, form.organizacaoId, existingPatrimonio]);

  const projetosOptions = useMemo(() => {
    const options = [...projetos];

    const projetoId =
      form.projetoId || String(existingPatrimonio?.projetoId ?? "");

    const projetoIdNumber = Number(projetoId);

    if (
      projetoId &&
      Number.isFinite(projetoIdNumber) &&
      !options.some((projeto) => String(projeto.id) === String(projetoId))
    ) {
      options.unshift({
        id: projetoIdNumber,
        nome: `Projeto ${projetoId}`,
      });
    }

    return options;
  }, [projetos, form.projetoId, existingPatrimonio]);

  const organizacaoSelectValue =
    form.organizacaoId ||
    String(existingPatrimonio?.organizacaoId ?? "") ||
    String(organizacoes[0]?.id ?? "");

  const projetoSelectValue =
    form.projetoId ||
    String(existingPatrimonio?.projetoId ?? "") ||
    SEM_PROJETO_VALUE;

  useImportFormFill("patrimonios", setForm);

  useEffect(() => {
    let active = true;

    async function carregarDados() {
      try {
        setLoading(true);

        const [organizacoesData, projetosData, patrimonioData] =
          await Promise.all([
            getOrganizacoesPatrimonio(),
            getProjetosPatrimonio(),
            id || duplicarId
              ? getPatrimonioById(Number(id ?? duplicarId))
              : Promise.resolve(null),
          ]);

        if (!active) return;

        const organizacaoPadrao = organizacoesData[0] ?? null;

        setOrganizacoes(organizacoesData);
        setProjetos(projetosData);

        if (patrimonioData) {
          setExistingPatrimonio(duplicarId ? null : patrimonioData);

          setForm({
            numeroPatrimonio: duplicarId ? "" : patrimonioData.numeroPatrimonio,
            nomePatrimonio: duplicarId
              ? `${patrimonioData.nomePatrimonio} (cópia)`
              : patrimonioData.nomePatrimonio,
            dataAquisicao: patrimonioData.dataAquisicao,
            descricaoPatrimonio: patrimonioData.descricaoPatrimonio,
            valorPatrimonio:
              patrimonioData.valorPatrimonio == null
                ? ""
                : patrimonioData.valorPatrimonio.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),

            marca: patrimonioData.marca ?? "",
            modelo: patrimonioData.modelo ?? "",
            numeroSerie: patrimonioData.numeroSerie ?? "",
            urlNotaFiscal: duplicarId
              ? ""
              : (patrimonioData.urlNotaFiscal ?? ""),

            tipoPatrimonio: patrimonioData.tipoPatrimonio,
            estadoConservacao: patrimonioData.estadoConservacao,
            statusPatrimonio: patrimonioData.statusPatrimonio,

            organizacaoId:
              patrimonioData.organizacaoId != null
                ? String(patrimonioData.organizacaoId)
                : getOrganizacaoId(organizacaoPadrao),

            projetoId:
              patrimonioData.projetoId != null
                ? String(patrimonioData.projetoId)
                : "",
          });
        } else {
          setExistingPatrimonio(null);

          setForm({
            ...initial,
            organizacaoId: getOrganizacaoId(organizacaoPadrao),
            projetoId: "",
          });
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar patrimônio.",
        );

        navigate("/patrimonio");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregarDados();

    return () => {
      active = false;
    };
  }, [duplicarId, id, navigate]);

  function abrirSeletorNotaFiscal() {
    if (bloqueado) return;

    notaFiscalInputRef.current?.click();
  }

  function handleNotaFiscalChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (bloqueado) return;

    const file = e.target.files?.[0];

    if (!file) return;

    if (!isAllowedNotaFiscal(file)) {
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

    setNotaFiscalFile(file);
    set("urlNotaFiscal", file.name);
  }

  function removerNotaFiscal() {
    if (bloqueado) return;

    setNotaFiscalFile(null);
    set("urlNotaFiscal", "");

    if (notaFiscalInputRef.current) {
      notaFiscalInputRef.current.value = "";
    }
  }

  async function abrirNotaFiscal() {
    if (!id) {
      toast.error("Patrimônio não identificado.");
      return;
    }

    if (!form.urlNotaFiscal?.trim()) {
      toast.info("Nenhuma nota fiscal anexada.");
      return;
    }

    try {
      const urlTemporaria = await getPatrimonioNotaFiscalDownloadUrl(
        Number(id),
      );
      window.open(urlTemporaria, "_blank");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao abrir a nota fiscal.",
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (visualizando) return;

    const organizacaoId =
      form.organizacaoId ||
      String(existingPatrimonio?.organizacaoId ?? "") ||
      String(organizacoes[0]?.id ?? "");

    const projetoId =
      form.projetoId || String(existingPatrimonio?.projetoId ?? "");

    const formComVinculos: FormState = {
      ...form,
      organizacaoId,
      projetoId,
    };

    if (!formComVinculos.numeroPatrimonio.trim()) {
      toast.error("Informe o número do patrimônio.");
      return;
    }

    if (!formComVinculos.nomePatrimonio.trim()) {
      toast.error("Informe o nome do patrimônio.");
      return;
    }

    if (!formComVinculos.dataAquisicao.trim()) {
      toast.error("Informe a data de aquisição.");
      return;
    }

    if (!isValidDateBR(formComVinculos.dataAquisicao)) {
      toast.error("Informe uma data de aquisição válida.");
      return;
    }

    if (brToDate(formComVinculos.dataAquisicao) > new Date()) {
      toast.error("A data de aquisição não pode ser futura.");
      return;
    }

    if (!formComVinculos.descricaoPatrimonio.trim()) {
      toast.error("Informe a descrição do patrimônio.");
      return;
    }

    if (!formComVinculos.tipoPatrimonio) {
      toast.error("Selecione o tipo de patrimônio.");
      return;
    }

    if (!formComVinculos.estadoConservacao) {
      toast.error("Selecione o estado de conservação.");
      return;
    }

    if (!formComVinculos.statusPatrimonio) {
      toast.error("Selecione o status do patrimônio.");
      return;
    }

    try {
      setSaving(true);

      const patrimonioForPayload: Patrimonio = {
        id: editando && id ? Number(id) : 0,

        numeroPatrimonio: formComVinculos.numeroPatrimonio,
        nomePatrimonio: formComVinculos.nomePatrimonio,
        dataAquisicao: formComVinculos.dataAquisicao,
        descricaoPatrimonio: formComVinculos.descricaoPatrimonio,
        valorPatrimonio: parseCurrencyToNumber(formComVinculos.valorPatrimonio),

        marca: formComVinculos.marca,
        modelo: formComVinculos.modelo,
        numeroSerie: formComVinculos.numeroSerie,

        urlNotaFiscal:
          notaFiscalFile == null
            ? formComVinculos.urlNotaFiscal.trim() || undefined
            : undefined,

        tipoPatrimonio: formComVinculos.tipoPatrimonio,
        estadoConservacao: formComVinculos.estadoConservacao,
        statusPatrimonio: formComVinculos.statusPatrimonio,

        organizacaoId: formComVinculos.organizacaoId
          ? Number(formComVinculos.organizacaoId)
          : null,
        projetoId: formComVinculos.projetoId
          ? Number(formComVinculos.projetoId)
          : null,
      };

      const payload = buildPatrimonioPayload(patrimonioForPayload);

      if (editando && id) {
        await updatePatrimonio(Number(id), payload, notaFiscalFile);
      } else {
        await createPatrimonio(payload, notaFiscalFile);
        salvarProximaAcaoPatrimonio();
      }

      toast.success(
        editando
          ? "Patrimônio atualizado com sucesso."
          : "Patrimônio salvo com sucesso.",
      );

      navigate("/patrimonio");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar patrimônio.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <BackButton to="/patrimonio" />

        <PageTitle
          title="Patrimônios"
          tooltip="Nesta página são cadastrados e acompanhados os bens patrimoniais da organização, como equipamentos, instrumentos, mobiliário e outros materiais permanentes. Os registros reúnem informações de identificação, características, aquisição, vínculo institucional, estado de conservação e situação atual, apoiando o controle, os inventários, os relatórios e as prestações de contas."
          actions={
            visualizando ? undefined : (
              <ImportDataButton
                config={getImportConfigForPath("/patrimonio")!}
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
            <Section
              icon={Building2}
              title="Vinculação institucional"
              description="Informe a organização à qual o bem pertence e, quando houver, o projeto relacionado à sua aquisição, recebimento ou utilização."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="organizacaoId"
                    tooltip="Selecione a organização proprietária do bem ou responsável por sua guarda e controle patrimonial."
                  >
                    Organização
                  </FieldLabel>

                  <Select
                    value={organizacaoSelectValue}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      set("organizacaoId", String(value));
                    }}
                    disabled={bloqueado || organizacoesOptions.length === 0}
                  >
                    <SelectTrigger id="organizacaoId">
                      <SelectValue placeholder="Selecione a organização" />
                    </SelectTrigger>

                    <SelectContent>
                      {organizacoesOptions.length === 0 ? (
                        <SelectItem value="sem-organizacao" disabled>
                          Nenhuma organização cadastrada
                        </SelectItem>
                      ) : (
                        organizacoesOptions.map((org) => (
                          <SelectItem
                            key={String(org.id)}
                            value={String(org.id)}
                          >
                            {org.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="projetoId"
                    tooltip="Selecione o projeto relacionado à aquisição, recebimento ou utilização deste bem, quando houver."
                  >
                    Projeto Relacionado
                  </FieldLabel>

                  <Select
                    value={projetoSelectValue}
                    onValueChange={(value) => {
                      if (visualizando) return;

                      set(
                        "projetoId",
                        value === SEM_PROJETO_VALUE ? "" : String(value),
                      );
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="projetoId">
                      <SelectValue placeholder="Selecione, se houver" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value={SEM_PROJETO_VALUE}>
                        Sem projeto vinculado
                      </SelectItem>

                      {projetosOptions.map((projeto) => (
                        <SelectItem
                          key={String(projeto.id)}
                          value={String(projeto.id)}
                        >
                          {projeto.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            <Section
              icon={Tag}
              title="Identificação do bem"
              description="Registre os dados utilizados para identificar e classificar o bem no controle patrimonial da organização."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="numeroPatrimonio"
                    required={!visualizando}
                    tooltip="Informe o número ou código utilizado pela organização para identificar este bem de forma única no controle patrimonial."
                  >
                    Número do Patrimônio
                  </FieldLabel>

                  <Input
                    id="numeroPatrimonio"
                    value={form.numeroPatrimonio}
                    onChange={(e) => set("numeroPatrimonio", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="nomePatrimonio"
                    required={!visualizando}
                    tooltip="Informe um nome claro que permita reconhecer facilmente o patrimônio. Ex.: Notebook Dell, Caixa de som amplificada ou Mesa de escritório."
                  >
                    Nome do Patrimônio
                  </FieldLabel>

                  <Input
                    id="nomePatrimonio"
                    value={form.nomePatrimonio}
                    onChange={(e) => set("nomePatrimonio", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="tipoPatrimonio"
                    required={!visualizando}
                    tooltip="Selecione a categoria que melhor representa o bem cadastrado."
                  >
                    Tipo de Patrimônio
                  </FieldLabel>

                  <Select
                    value={form.tipoPatrimonio}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      set("tipoPatrimonio", value as TipoPatrimonioApi);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="tipoPatrimonio">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                      {tipoPatrimonioOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            <Section
              icon={ClipboardList}
              title="Características do bem"
              description="Informe as características físicas e de identificação que ajudam a reconhecer o bem e diferenciá-lo de outros patrimônios semelhantes."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="marca"
                    tooltip="Informe a marca ou o fabricante do bem, quando houver."
                  >
                    Marca
                  </FieldLabel>

                  <Input
                    id="marca"
                    value={form.marca}
                    onChange={(e) => set("marca", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="modelo"
                    tooltip="Informe o modelo ou a referência do bem, quando houver."
                  >
                    Modelo
                  </FieldLabel>

                  <Input
                    id="modelo"
                    value={form.modelo}
                    onChange={(e) => set("modelo", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="numeroSerie"
                    tooltip="Informe o número de série do bem, quando houver. Esse dado pode ajudar na identificação em garantias, manutenções, inventários ou outros documentos."
                  >
                    Número de Série
                  </FieldLabel>

                  <Input
                    id="numeroSerie"
                    value={form.numeroSerie}
                    onChange={(e) => set("numeroSerie", e.target.value)}
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="descricaoPatrimonio"
                    required={!visualizando}
                    tooltip="Descreva as principais características do bem e sua finalidade na organização. Podem ser informados detalhes que ajudem na identificação, no uso ou no controle patrimonial."
                  >
                    Descrição do Bem
                  </FieldLabel>

                  <Textarea
                    id="descricaoPatrimonio"
                    value={form.descricaoPatrimonio}
                    onChange={(e) => set("descricaoPatrimonio", e.target.value)}
                    className="min-h-[90px] resize-none"
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>
              </div>
            </Section>

            <Section
              icon={FileText}
              title="Aquisição do bem"
              description="Informe quando e por qual valor o bem foi adquirido ou recebido e anexe, quando disponível, o documento que comprova sua origem."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="dataAquisicao"
                    required={!visualizando}
                    tooltip="Informe a data em que o bem foi comprado, recebido por doação ou incorporado de outra forma ao patrimônio da organização."
                  >
                    Data de Aquisição
                  </FieldLabel>

                  <Input
                    id="dataAquisicao"
                    value={form.dataAquisicao}
                    onChange={(e) =>
                      set("dataAquisicao", maskDate(e.target.value))
                    }
                    inputMode="numeric"
                    disabled={bloqueado}
                    readOnly={visualizando}
                  />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="valorPatrimonio"
                    tooltip="Informe o valor pago pelo bem ou, quando não houver compra, o valor atribuído a ele para fins de controle patrimonial."
                  >
                    Valor do Bem
                  </FieldLabel>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>

                    <Input
                      id="valorPatrimonio"
                      value={form.valorPatrimonio}
                      onChange={(e) =>
                        set("valorPatrimonio", maskCurrency(e.target.value))
                      }
                      inputMode="decimal"
                      className="pl-9"
                      disabled={bloqueado}
                      readOnly={visualizando}
                    />
                  </div>
                </Field>

                <Field full>
                  <FieldLabel
                    htmlFor="urlNotaFiscal"
                    tooltip="Anexe a nota fiscal ou outro documento que comprove a compra, doação, recebimento ou origem do bem, quando disponível."
                  >
                    Documento de Aquisição
                  </FieldLabel>

                  <input
                    ref={notaFiscalInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleNotaFiscalChange}
                    disabled={bloqueado}
                  />

                  <div className="flex gap-2">
                    <Input
                      id="urlNotaFiscal"
                      value={
                        notaFiscalFile?.name ||
                        getNomeArquivoPatrimonio(form.urlNotaFiscal)
                      }
                      readOnly
                      disabled
                      className="attachment-file-glass flex-1 cursor-not-allowed"
                      placeholder="Nenhum arquivo anexado"
                    />

                    {visualizando && form.urlNotaFiscal && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 gap-2"
                        onClick={() => void abrirNotaFiscal()}
                      >
                        <FileText className="h-4 w-4" />
                        Abrir
                      </Button>
                    )}

                    {!visualizando && (
                      <Button
                        type="button"
                        variant="glassSecondary"
                        className="h-10 gap-2 px-4"
                        onClick={abrirSeletorNotaFiscal}
                        disabled={saving}
                      >
                        <Upload className="h-4 w-4" />
                        {notaFiscalFile?.name || form.urlNotaFiscal
                          ? "Substituir"
                          : "Selecionar arquivo"}
                      </Button>
                    )}
                  </div>

                  {!visualizando && form.urlNotaFiscal && (
                    <div className="mt-2 flex items-center gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        Arquivo selecionado:{" "}
                        {notaFiscalFile?.name ||
                          getNomeArquivoPatrimonio(form.urlNotaFiscal)}
                      </p>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removerNotaFiscal}
                        disabled={saving}
                      >
                        Limpar seleção
                      </Button>
                    </div>
                  )}

                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Formatos aceitos: PDF, PNG, JPG, JPEG ou WEBP. Tamanho
                    máximo: 10 MB.
                  </p>
                </Field>
              </div>
            </Section>

            <Section
              icon={Layers}
              title="Conservação e situação"
              description="Informe as condições atuais do bem para acompanhar seu estado de conservação e sua situação no patrimônio da organização."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="estadoConservacao"
                    required={!visualizando}
                    tooltip="Selecione a condição física atual do bem, considerando seu estado de conservação e eventual necessidade de reparo ou substituição."
                  >
                    Estado de Conservação
                  </FieldLabel>

                  <Select
                    value={form.estadoConservacao}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      set("estadoConservacao", value as EstadoConservacaoApi);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="estadoConservacao">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {estadoConservacaoOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="statusPatrimonio"
                    required={!visualizando}
                    tooltip="Selecione a situação atual do bem no controle patrimonial, como disponível, em uso, em manutenção, emprestado ou baixado, conforme as opções cadastradas."
                  >
                    Situação do Patrimônio
                  </FieldLabel>

                  <Select
                    value={form.statusPatrimonio}
                    onValueChange={(value) => {
                      if (visualizando) return;
                      set("statusPatrimonio", value as StatusPatrimonioApi);
                    }}
                    disabled={bloqueado}
                  >
                    <SelectTrigger id="statusPatrimonio">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {statusPatrimonioOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="glassSecondary"
              className="h-9 px-4"
              onClick={() => navigate("/patrimonio")}
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
      </div>

      <WikiFloatingButton
        pageTitle="Patrimônio"
        href="https://www.aurit.com.br/wiki/patrimonio/patrimonio"
      />
    </AppLayout>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <FormSectionCard icon={Icon} title={title} description={description}>
      {children}
    </FormSectionCard>
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
    <div
      className={`${full ? "sm:col-span-2 lg:col-span-3" : ""} ${
        className ?? ""
      }`}
    >
      {children}
    </div>
  );
}
