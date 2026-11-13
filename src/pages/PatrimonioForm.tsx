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
  Paperclip,
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
  getPatrimonioFotoDownloadUrl,
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
  urlFoto: string;

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
  urlFoto: "",

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
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoRemovida, setFotoRemovida] = useState(false);

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

  const confirmarImportacaoSalva = useImportFormFill(
    "patrimonios",
    form,
    setForm,
  );

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

        setNotaFiscalFile(null);
        setFotoFile(null);
        setFotoRemovida(false);
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
            urlFoto: duplicarId ? "" : (patrimonioData.urlFoto ?? ""),

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

  function selecionarNotaFiscal(file: File) {
    setNotaFiscalFile(file);
    set("urlNotaFiscal", file.name);
  }

  function removerNotaFiscal() {
    setNotaFiscalFile(null);
    set("urlNotaFiscal", "");
  }

  function selecionarFoto(file: File) {
    setFotoFile(file);
    setFotoRemovida(false);
  }

  function removerFoto() {
    setFotoFile(null);
    setFotoRemovida(true);
  }

  async function abrirFoto() {
    if (!id) return;
    try {
      const url = await getPatrimonioFotoDownloadUrl(Number(id));
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao abrir a foto.",
      );
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

    const dataAquisicao = formComVinculos.dataAquisicao.trim();
    if (dataAquisicao && !isValidDateBR(dataAquisicao)) {
      toast.error("Informe uma data de aquisição válida.");
      return;
    }

    if (dataAquisicao && brToDate(dataAquisicao) > new Date()) {
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
        dataAquisicao,
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

      const payload = {
        ...buildPatrimonioPayload(patrimonioForPayload),
        removerFoto: fotoRemovida,
      };

      if (editando && id) {
        await updatePatrimonio(Number(id), payload, notaFiscalFile, fotoFile);
      } else {
        await createPatrimonio(payload, notaFiscalFile, fotoFile);
        confirmarImportacaoSalva();
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
      <div
        data-mobile-data-page="account"
        className="container max-w-4xl py-6 sm:py-8"
      >
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
              description="Informe quando e por qual valor o bem foi adquirido ou recebido, se souber."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="dataAquisicao"
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
              </div>
            </Section>

            <Section icon={Paperclip} title="Anexos do bem">
              <div className="grid gap-4">
                <CampoAnexo
                  id="urlNotaFiscal"
                  label="Documento de Aquisição"
                  tooltip="Anexe um documento que comprove a compra, doação, recebimento ou origem do bem."
                  nome={
                    notaFiscalFile?.name ||
                    getNomeArquivoPatrimonio(form.urlNotaFiscal)
                  }
                  formatos="PDF, PNG, JPG, JPEG ou WEBP"
                  extensoes={["pdf", "png", "jpg", "jpeg", "webp"]}
                  bloqueado={bloqueado}
                  visualizando={visualizando}
                  onSelecionar={selecionarNotaFiscal}
                  onRemover={removerNotaFiscal}
                  onAbrir={abrirNotaFiscal}
                  labelRemover="Limpar seleção"
                />
                <CampoAnexo
                  id="urlFoto"
                  label="Foto do Bem"
                  tooltip="Anexe uma foto para facilitar a identificação do bem."
                  nome={
                    fotoFile?.name ||
                    (fotoRemovida ? "" : getNomeArquivoPatrimonio(form.urlFoto))
                  }
                  formatos="PNG, JPG, JPEG ou WEBP"
                  extensoes={["png", "jpg", "jpeg", "webp"]}
                  bloqueado={bloqueado}
                  visualizando={visualizando}
                  onSelecionar={selecionarFoto}
                  onRemover={removerFoto}
                  onAbrir={abrirFoto}
                  labelRemover="Remover foto"
                />
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

function CampoAnexo({
  id,
  label,
  tooltip,
  nome,
  formatos,
  extensoes,
  bloqueado,
  visualizando,
  onSelecionar,
  onRemover,
  onAbrir,
  labelRemover,
}: {
  id: string;
  label: string;
  tooltip: string;
  nome: string;
  formatos: string;
  extensoes: string[];
  bloqueado: boolean;
  visualizando: boolean;
  onSelecionar: (file: File) => void;
  onRemover: () => void;
  onAbrir: () => Promise<void>;
  labelRemover: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  function selecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!file || bloqueado) return;

    const extensao = file.name.split(".").pop()?.toLowerCase();
    if (!extensao || !extensoes.includes(extensao)) {
      toast.error(`Formato não permitido. Envie ${formatos}.`);
      return;
    }
    if (!file.size || file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error("Selecione um arquivo de até 10 MB.");
      return;
    }
    onSelecionar(file);
  }

  return (
    <Field>
      <FieldLabel htmlFor={id} tooltip={tooltip}>
        {label}
      </FieldLabel>
      <input
        ref={input}
        type="file"
        className="hidden"
        disabled={bloqueado}
        accept={extensoes.map((extensao) => `.${extensao}`).join(",")}
        onChange={selecionar}
      />
      <div className="flex flex-wrap gap-2">
        <Input
          id={id}
          value={nome}
          readOnly
          disabled
          className="attachment-file-glass min-w-0 flex-1 cursor-not-allowed"
          placeholder="Nenhum arquivo anexado"
        />
        {visualizando ? (
          nome && (
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2"
              aria-label={`Abrir ${label}`}
              onClick={() => void onAbrir()}
            >
              <FileText className="h-4 w-4" /> Abrir
            </Button>
          )
        ) : (
          <Button
            type="button"
            variant="glassSecondary"
            className="h-10 gap-2 px-4"
            aria-label={`${nome ? "Substituir" : "Selecionar arquivo para"} ${label}`}
            disabled={bloqueado}
            onClick={() => input.current?.click()}
          >
            <Upload className="h-4 w-4" />{" "}
            {nome ? "Substituir" : "Selecionar arquivo"}
          </Button>
        )}
      </div>
      {!visualizando && nome && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1"
          disabled={bloqueado}
          onClick={onRemover}
        >
          {labelRemover}
        </Button>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">
        Formatos aceitos: {formatos}. Tamanho máximo: 10 MB.
      </p>
    </Field>
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
