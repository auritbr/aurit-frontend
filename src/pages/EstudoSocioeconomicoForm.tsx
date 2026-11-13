import { ROTA_PERFIL_SOCIOECONOMICO } from "@/config/rotas";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrganizacaoSelecionadaId } from "@/lib/configuracaoEmpresaStore";
import { createContext, useContext, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  User,
  IdCard,
  Home,
  MapPin,
  Zap,
  Bus,
  Users,
  HandCoins,
  Wallet,
  MessageSquareText,
  Plus,
  Trash2,
  History,
  Calculator,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FieldTooltip } from "@/components/FieldTooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { FormMultiSelect } from "@/components/FormMultiSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { FormSectionCard } from "@/components/FormSectionCard";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { maskDate, maskPhone } from "@/lib/masks";
import {
  getParticipanteById,
  getParticipantes,
  racaCorOptions,
  type Participante,
} from "@/data/participantes";
import { toast } from "sonner";
import {
  DESPESAS_FIXAS,
  estudoVazio,
  salvarEstudo,
  formatBRL,
  dataEstudoISO,
  dataBR,
  generoLabel,
  idadeDe,
  maskMoeda,
  obterEstudo,
  listarEstudos,
  type DadosEstudo,
  type RetratoParticipante,
  type SimNao,
  type EstudoSocioeconomico,
} from "@/lib/estudosSocioeconomicos";

const SIM_NAO = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
];
const DIAS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
];
const MORA_COM = ["Família", "Sozinho", "Parentes", "Instituição", "Outro"];
const CONDICAO = [
  "Alugada",
  "Própria",
  "Financiada",
  "Cedida",
  "Invadida / Ocupada",
  "Caseiro",
  "Outra",
];
const COMODOS = [
  ["quartos", "Quartos"],
  ["salas", "Salas"],
  ["cozinhas", "Cozinhas"],
  ["banheiros", "Banheiros"],
  ["garagens", "Garagens"],
  ["lavanderias", "Lavanderias"],
] as const;
const MEIOS_INTERNET = [
  "Celular próprio",
  "Celular do pai, mãe ou responsável",
  "Computador próprio",
];
const UTENSILIOS = [
  "Geladeira",
  "Freezer",
  "Micro-ondas",
  "Televisor",
  "Máquina de lavar roupas / tanquinho",
];
const TRANSPORTES = ["Bicicleta", "A pé", "Ônibus", "Veículo próprio"];
const DESPESA_AJUDA: Record<string, string> = {
  agua: "Informe o valor pago por mês na conta de água, quando houver cobrança.",
  luz: "Informe o valor mensal da conta de energia elétrica.",
  energia: "Informe o valor mensal da conta de energia elétrica.",
  alimentacao:
    "Informe aproximadamente quanto a família gasta por mês com alimentação e compras de mercado.",
  emprestimos:
    "Informe o valor mensal pago em empréstimos ou outras contas não registradas nos demais campos, sem duplicar despesas.",
  emprestimosContas:
    "Informe o valor pago por mês em empréstimos e outras contas ainda não incluídas no formulário.",
  aluguel: "Informe o valor mensal do aluguel da residência, quando houver.",
  internet: "Informe o gasto mensal da família com internet.",
  medicacao:
    "Informe quanto a família costuma gastar por mês com medicamentos.",
  impostos:
    "Informe os impostos pagos pela família. Se o gasto não for mensal, utilize uma média mensal quando possível.",
  educacao:
    "Informe despesas mensais de educação, como materiais escolares, mensalidades e cursos.",
  transporte:
    "Informe os gastos por mês com passagens, combustível ou outros custos de transporte.",
};

const SITUACAO_TRABALHO = [
  "Autônomo",
  "CTPS / Concursado",
  "Aposentado / Pensionista",
  "Mercado Informal",
  "Desempregado",
];

const uid = () => "novo-" + crypto.randomUUID();

function retratoDe(p?: Participante): RetratoParticipante {
  const endereco = p
    ? [
        p.logradouro,
        p.numero,
        p.complemento,
        p.cidade && `${p.cidade}${p.estado ? `/${p.estado}` : ""}`,
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  const genero = generoLabel(p?.genero);
  return {
    nomeCompleto: p?.nomeCompleto ?? "",
    dataNascimento: p?.dataNascimento ?? "",
    cpf: p?.cpf ?? "",
    rg: p?.rg ?? "",
    genero,
    endereco,
    bairro: p?.bairro ?? "",
    cep: p?.cep ?? "",
    telefone: p?.telefone ?? "",
    email: p?.email ?? "",
  };
}

/**
 * O cadastro atual possui endereço estruturado; estudos históricos podem
 * guardar somente retrato.endereco como texto. A extração de um retrato antigo
 * é conservadora: valores ambíguos continuam disponíveis no endereço original.
 * Não altera o estudo nem o cadastro do participante.
 */
function enderecoParaConsulta(
  participante: Participante | undefined,
  retrato: RetratoParticipante,
  historico: boolean,
) {
  if (!historico && participante) {
    return {
      cep: participante.cep ?? "",
      logradouro: participante.logradouro ?? "",
      numero: participante.numero ?? "",
      complemento: participante.complemento ?? "",
      bairro: participante.bairro ?? "",
      cidade: participante.cidade ?? "",
      estado: participante.estado ?? "",
      enderecoOriginal: "",
    };
  }

  const partes = (retrato.endereco || "")
    .split(",")
    .map((parte) => parte.trim())
    .filter(Boolean);
  const resultado = {
    cep: retrato.cep || "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: retrato.bairro || "",
    cidade: "",
    estado: "",
    enderecoOriginal: "",
  };
  if (partes.length >= 2) {
    resultado.logradouro = partes[0];
    if (/^(?:s\/?n|sem número|\d+[a-zA-Z]?)$/i.test(partes[1])) {
      resultado.numero = partes[1];
    } else {
      resultado.enderecoOriginal = retrato.endereco || "";
      return resultado;
    }
    const ultima = partes[partes.length - 1];
    const municipioEstado = ultima.match(/^(.+?)\s*\/\s*([^/]+)$/);
    if (municipioEstado) {
      resultado.cidade = municipioEstado[1].trim();
      resultado.estado = municipioEstado[2].trim();
      if (partes.length > 3)
        resultado.complemento = partes.slice(2, -1).join(", ");
    } else {
      resultado.enderecoOriginal = retrato.endereco || "";
      // Não adivinhar município ou complemento de texto não estruturado.
    }
  } else if (retrato.endereco) {
    resultado.enderecoOriginal = retrato.endereco;
  }
  return resultado;
}

const mascararCPF = (cpf: string) => {
  const d = cpf.replace(/\D/g, "");
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : cpf;
};

type Ctx = {
  form: DadosEstudo;
  set: <K extends keyof DadosEstudo>(k: K, v: DadosEstudo[K]) => void;
  isView: boolean;
};
const FormCtx = createContext<Ctx | null>(null);
const useCtx = () => useContext(FormCtx)!;

const Money = ({
  value,
  onChange,
  id: fid,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
  label?: string;
}) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
      R$
    </span>
    <Input
      id={fid}
      aria-label={label}
      className="pl-9"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(maskMoeda(e.target.value))}
    />
  </div>
);
const ReadOnly = ({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip?: string;
}) => (
  <div>
    <FieldLabel tooltip={tooltip}>{label}</FieldLabel>
    <Input
      value={value || "Não informado no cadastro"}
      readOnly
      disabled
      className="text-muted-foreground"
    />
  </div>
);
const Indicador = ({
  label,
  value,
  hint,
  tooltip,
}: {
  label: string;
  value: string;
  hint?: string;
  tooltip?: string;
}) => (
  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
    <FieldLabel tooltip={tooltip}>{label}</FieldLabel>
    <p className="text-sm font-semibold text-foreground">{value}</p>
    {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);
const NONE = "__nao_informado__";
const SelecaoResposta = ({
  k,
  label,
  options,
  tooltip,
}: {
  k: keyof DadosEstudo;
  label: string;
  options: readonly { value: string; label: string }[];
  tooltip?: string;
}) => {
  const { form, set, isView } = useCtx();
  const valor = form[k] as string;
  const selecionada = options.find(
    (o) =>
      o.value === valor ||
      o.label.toLocaleLowerCase("pt-BR") === valor.toLocaleLowerCase("pt-BR"),
  );
  return (
    <div>
      <FieldLabel
        htmlFor={String(k)}
        tooltip={
          tooltip ?? "Deixe em branco quando a informação não for conhecida."
        }
      >
        {label}
      </FieldLabel>
      <Select
        disabled={isView}
        value={selecionada?.value ?? (valor || NONE)}
        onValueChange={(v) => set(k, (v === NONE ? "" : v) as never)}
      >
        <SelectTrigger id={String(k)} aria-label={label}>
          <SelectValue placeholder="Não informado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Não informado</SelectItem>
          {valor && !selecionada && (
            <SelectItem value={valor}>{valor}</SelectItem>
          )}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
type CampoSimNao = {
  [K in keyof DadosEstudo]: DadosEstudo[K] extends SimNao ? K : never;
}[keyof DadosEstudo];

function InterruptorResposta({
  k,
  label,
  tooltip,
  valorConsulta,
}: {
  k: CampoSimNao;
  label: string;
  tooltip?: string;
  valorConsulta?: SimNao;
}) {
  const { form, set, isView } = useCtx();
  const bloqueado = isView || valorConsulta !== undefined;
  const valor = valorConsulta ?? form[k];
  const resposta =
    valor === "sim" ? "Sim" : valor === "nao" ? "Não" : "Não informado";
  return (
    <div className="space-y-1">
      <div className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor={k} className="cursor-pointer text-sm text-foreground">
            {label}
          </label>
          {tooltip && <FieldTooltip text={tooltip} fieldLabel={label} />}
        </div>
        <Switch
          id={k}
          checked={valor === "sim"}
          disabled={bloqueado}
          aria-describedby={k + "-resposta"}
          onCheckedChange={(marcado) => {
            if (!bloqueado) set(k, marcado ? "sim" : "nao");
          }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
        <span id={k + "-resposta"}>{resposta}</span>
        {!bloqueado && valor !== "" && (
          <button
            type="button"
            className="text-primary underline-offset-2 hover:underline"
            aria-label={`Limpar resposta de ${label}`}
            onClick={() => set(k, "")}
          >
            Limpar resposta
          </button>
        )}
      </div>
    </div>
  );
}

const Checks = ({
  k,
  label,
  options,
  tooltip,
}: {
  k: keyof DadosEstudo;
  label: string;
  options: string[];
  tooltip?: string;
}) => {
  const { form, set, isView } = useCtx();
  const val = (form[k] as string[]) ?? [];
  const opts = [...options, ...val.filter((v) => !options.includes(v))].map(
    (o) => ({ value: o, label: o }),
  );
  return (
    <div>
      <FieldLabel
        htmlFor={String(k)}
        tooltip={
          tooltip ??
          "Selecione todas as opções que correspondem à situação informada. É possível escolher mais de uma."
        }
      >
        {label}
      </FieldLabel>
      <FormMultiSelect
        id={String(k)}
        options={opts}
        value={val}
        onChange={(v) => set(k, v as never)}
        disabled={isView}
        placeholder="Não informado"
      />
    </div>
  );
};
const Text = ({
  k,
  label,
  tooltip,
  phone,
}: {
  k: keyof DadosEstudo;
  label: string;
  tooltip: string;
  phone?: boolean;
}) => {
  const { form, set, isView } = useCtx();
  return (
    <div>
      <FieldLabel htmlFor={String(k)} tooltip={tooltip}>
        {label}
      </FieldLabel>
      <Input
        id={String(k)}
        value={form[k] as string}
        onChange={(e) =>
          set(k, (phone ? maskPhone(e.target.value) : e.target.value) as never)
        }
        inputMode={phone ? "tel" : undefined}
        readOnly={isView}
      />
    </div>
  );
};
const Long = ({
  k,
  label,
  tooltip,
}: {
  k: keyof DadosEstudo;
  label: string;
  tooltip: string;
}) => {
  const { form, set, isView } = useCtx();
  return (
    <div className="sm:col-span-2">
      <FieldLabel htmlFor={String(k)} tooltip={tooltip}>
        {label}
      </FieldLabel>
      <Textarea
        id={String(k)}
        rows={3}
        readOnly={isView}
        value={form[k] as string}
        onChange={(e) => set(k, e.target.value as never)}
      />
    </div>
  );
};
const Selecao = ({
  k,
  label,
  options,
  tooltip,
}: {
  k: keyof DadosEstudo;
  label: string;
  options: string[];
  tooltip?: string;
}) => {
  const { form, set, isView } = useCtx();
  return (
    <div>
      <FieldLabel
        htmlFor={String(k)}
        tooltip={
          tooltip ??
          "Selecione a opção que melhor corresponde à situação informada. Se não souber, mantenha Não informado."
        }
      >
        {label}
      </FieldLabel>
      <Select
        disabled={isView}
        value={(form[k] as string) || NONE}
        onValueChange={(v) => set(k, (v === NONE ? "" : v) as never)}
      >
        <SelectTrigger id={String(k)}>
          <SelectValue placeholder="Não informado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Não informado</SelectItem>
          {[
            ...options,
            ...(form[k] && !options.includes(form[k] as string)
              ? [form[k] as string]
              : []),
          ].map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default function EstudoSocioeconomicoForm() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const org = getOrganizacaoSelecionadaId();
  const detalhe = useQuery({
    queryKey: ["estudos-socioeconomicos", org, "detalhe", id],
    queryFn: ({ signal }) => obterEstudo(id!, signal),
    enabled: !!id,
    gcTime: 0,
  });
  if (id && !detalhe.data) {
    return (
      <AppLayout>
        <div
          data-mobile-data-page="people"
          className="container max-w-4xl py-6 sm:py-8"
        >
          <BackButton to={ROTA_PERFIL_SOCIOECONOMICO} />
          {detalhe.isError ? (
            <>
              <p role="alert">Não foi possível consultar o estudo.</p>
              <Button onClick={() => void detalhe.refetch()}>
                Tentar novamente
              </Button>
            </>
          ) : (
            <p role="status">Carregando estudo…</p>
          )}
        </div>
      </AppLayout>
    );
  }
  return (
    <Formulario
      key={
        org +
        ":" +
        (id ?? params.get("participante") ?? "novo") +
        ":" +
        pathname
      }
      existente={detalhe.data}
      participanteInicial={params.get("participante") ?? ""}
    />
  );
}

function Formulario({
  existente,
  participanteInicial,
}: {
  existente?: EstudoSocioeconomico;
  participanteInicial: string;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const id = existente?.id;
  const isView =
    !!existente && (!existente.ativo || !pathname.endsWith("/editar"));
  const org = getOrganizacaoSelecionadaId();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DadosEstudo>(
    () =>
      existente ?? { ...estudoVazio(), participanteId: participanteInicial },
  );
  const [salvando, setSalvando] = useState(false);
  const participantes = useQuery({
    queryKey: ["participantes-opcoes-estudo", org],
    queryFn: getParticipantes,
    enabled: !id,
    gcTime: 0,
  });
  const participanteCadastrado = useQuery({
    queryKey: ["participante-vinculado-estudo", org, existente?.participanteId],
    queryFn: () => getParticipanteById(Number(existente?.participanteId)),
    enabled: !!existente?.participanteId,
    gcTime: 0,
    retry: false,
  });
  const historicoEstudos = useQuery({
    queryKey: [
      "estudos-socioeconomicos",
      org,
      "participante",
      existente?.participanteId,
    ],
    queryFn: ({ signal }) =>
      listarEstudos({
        participanteId: existente!.participanteId,
        incluirInativos: true,
        signal,
      }),
    enabled: isView && !!existente?.participanteId,
  });

  const set = <K extends keyof DadosEstudo>(k: K, v: DadosEstudo[K]) =>
    setForm((p) => ({ ...p, [k]: v }));
  const participante =
    participanteCadastrado.data ??
    participantes.data?.find((p) => p.id === form.participanteId);
  const racaCor = participante?.racaCor ?? existente?.etnia ?? "";
  const racaCorLabel =
    racaCorOptions.find((opcao) => opcao.value === racaCor)?.label ?? racaCor;
  const bolsaFamilia: SimNao =
    participante?.possuiBolsaFamilia == null
      ? (existente?.bolsaFamilia ?? "")
      : participante.possuiBolsaFamilia
        ? "sim"
        : "nao";
  const retrato = existente?.retrato ?? retratoDe(participante);
  const enderecoConsulta = enderecoParaConsulta(
    participante,
    retrato,
    !!existente,
  );
  const referencia = dataEstudoISO(form.dataEstudo);
  const ind = existente?.indicadores;

  const salvar = async () => {
    if (isView || salvando) return;
    if (!form.participanteId || (!id && !participante)) {
      toast.error("Selecione o participante.");
      return;
    }
    if (
      (form.dataEstudo && !referencia) ||
      form.integrantes.some(
        (m) => m.dataNascimento && !dataEstudoISO(m.dataNascimento),
      )
    ) {
      toast.error("Informe datas válidas no formato dd/mm/aaaa.");
      return;
    }
    setSalvando(true);
    try {
      const dados = existente
        ? form
        : {
            ...form,
            sexo: participante?.genero ?? "",
            etnia: racaCor,
            bolsaFamilia,
          };
      const salvo = await salvarEstudo(dados, id);
      queryClient.setQueryData(
        ["estudos-socioeconomicos", org, "detalhe", salvo.id],
        salvo,
      );
      await queryClient.invalidateQueries({
        queryKey: ["estudos-socioeconomicos", org],
      });
      toast.success("Estudo socioeconômico salvo com sucesso.");
      navigate(ROTA_PERFIL_SOCIOECONOMICO);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o estudo.",
      );
    } finally {
      setSalvando(false);
    }
  };

  const listaValores = (
    k: "outrosBeneficios" | "outrasDespesas" | "receitas",
    rotulo: string,
    botao: string,
    placeholder?: string,
  ) => (
    <div className="sm:col-span-2 space-y-2">
      <FieldLabel tooltip="Informe cada item separadamente, com sua descrição e valor mensal, quando conhecido. Em receitas, evite repetir rendimentos já informados; em despesas, evite contabilizar o mesmo gasto duas vezes.">
        {rotulo}
      </FieldLabel>
      {form[k].length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum item informado.</p>
      )}
      {form[k].map((it, i) => (
        <div
          key={it.id}
          className="grid grid-cols-[1fr_9rem_auto] items-center gap-2"
        >
          <Input
            aria-label={`Descrição ${i + 1}`}
            placeholder={placeholder ?? "Descrição"}
            value={it.descricao}
            onChange={(e) =>
              set(
                k,
                form[k].map((x) =>
                  x.id === it.id ? { ...x, descricao: e.target.value } : x,
                ),
              )
            }
          />
          <Money
            id={`${k}-${it.id}`}
            label={`Valor mensal ${i + 1}`}
            value={it.valor}
            onChange={(v) =>
              set(
                k,
                form[k].map((x) => (x.id === it.id ? { ...x, valor: v } : x)),
              )
            }
          />
          {!isView && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remover"
              onClick={() =>
                set(
                  k,
                  form[k].filter((x) => x.id !== it.id),
                )
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {!isView && (
        <Button
          type="button"
          variant="glassSecondary"
          className="h-9 gap-2 px-4"
          onClick={() =>
            set(k, [...form[k], { id: uid(), descricao: "", valor: "" }])
          }
        >
          <Plus className="h-4 w-4" />
          {botao}
        </Button>
      )}
    </div>
  );
  const g2 = "grid gap-4 sm:grid-cols-2";

  return (
    <AppLayout>
      <div
        data-mobile-data-page="people"
        className="container max-w-4xl py-6 sm:py-8"
      >
        <BackButton to={ROTA_PERFIL_SOCIOECONOMICO} />
        <PageTitle
          title="Estudos Socioeconômicos"
          tooltip="Nesta página, você registra informações sobre o participante e sua família, como composição familiar, moradia, transporte, benefícios sociais, renda e despesas. Selecione primeiro o participante. Os demais campos são opcionais e podem ser preenchidos conforme as informações disponíveis. Cada estudo fica associado à data em que as informações foram coletadas, permitindo consultar avaliações anteriores sem substituí-las."
          showImport={false}
        />
        <FormLegend />

        <FormCtx.Provider value={{ form, set, isView }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void salvar();
            }}
            className="space-y-5"
          >
            <fieldset
              disabled={isView || salvando}
              className="space-y-5 border-0 p-0 disabled:opacity-100"
            >
              <FormSectionCard
                icon={User}
                title="Identificação do Participante"
                description="Selecione a pessoa para quem o estudo será realizado e informe a data da avaliação. Os dados pessoais já cadastrados são mostrados abaixo apenas para consulta, evitando que você precise digitá-los novamente."
              >
                <div className={g2}>
                  <div>
                    <FieldLabel
                      htmlFor="participante"
                      required
                      tooltip="Escolha a pessoa para quem você está registrando este estudo. Ela precisa estar cadastrada em Participantes. O estudo ficará vinculado ao seu cadastro para ser consultado posteriormente."
                    >
                      Participante
                    </FieldLabel>
                    <Select
                      value={form.participanteId || undefined}
                      onValueChange={(v) => set("participanteId", v)}
                      disabled={!!id || salvando}
                    >
                      <SelectTrigger id="participante">
                        <SelectValue
                          placeholder={
                            participantes.isLoading
                              ? "Carregando participantes…"
                              : "Selecione o participante"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {(existente
                          ? [
                              {
                                id: existente.participanteId,
                                nomeCompleto: retrato.nomeCompleto,
                              },
                            ]
                          : (participantes.data ?? [])
                        ).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nomeCompleto}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel
                      htmlFor="dataEstudo"
                      tooltip="Informe a data em que as informações foram coletadas com o participante ou responsável. Essa data identifica a situação da família naquele momento, mesmo que suas condições mudem no futuro."
                    >
                      Data do Estudo
                    </FieldLabel>
                    <Input
                      id="dataEstudo"
                      readOnly={isView}
                      value={form.dataEstudo}
                      onChange={(e) =>
                        set("dataEstudo", maskDate(e.target.value))
                      }
                      inputMode="numeric"
                      placeholder="dd/mm/aaaa"
                    />
                  </div>
                  {existente && (
                    <ReadOnly
                      label="Situação"
                      value={
                        existente.situacao === "CONCLUIDO"
                          ? "Concluído"
                          : "Rascunho"
                      }
                    />
                  )}
                  {form.participanteId && (
                    <>
                      <p className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        {existente
                          ? "Dados pessoais registrados quando este estudo foi criado."
                          : "Dados pessoais disponíveis no cadastro atual de Participantes."}{" "}
                        Esses campos são apenas para consulta. Para corrigir
                        informações pessoais, acesse o cadastro de
                        Participantes. Alterações neste estudo não modificam
                        esse cadastro.
                      </p>
                      <ReadOnly
                        label="Nome Completo"
                        value={retrato.nomeCompleto}
                      />
                      <ReadOnly
                        label="Data de Nascimento"
                        value={retrato.dataNascimento}
                      />
                      <ReadOnly label="Gênero" value={retrato.genero} />
                      <ReadOnly label="RG" value={retrato.rg} />
                      <div>
                        <FieldLabel>CPF</FieldLabel>
                        <Input
                          value={
                            retrato.cpf
                              ? mascararCPF(retrato.cpf)
                              : "Não informado no cadastro"
                          }
                          readOnly
                          disabled
                          className="text-muted-foreground"
                        />
                      </div>

                      <ReadOnly label="Telefone" value={retrato.telefone} />
                      <ReadOnly label="E-mail" value={retrato.email} />
                    </>
                  )}
                </div>
                {form.participanteId && (
                  <div className="mt-4 border-t border-border/60 pt-3">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Estudos anteriores deste participante
                    </p>
                    {historicoEstudos.isLoading ? (
                      <p className="text-xs text-muted-foreground">
                        Carregando estudos anteriores…
                      </p>
                    ) : historicoEstudos.isError ? (
                      <p role="alert" className="text-sm text-destructive">
                        Não foi possível carregar o histórico de estudos.
                      </p>
                    ) : (historicoEstudos.data ?? []).filter(
                        (estudo) =>
                          estudo.id !== existente?.id &&
                          !!estudo.dataEstudo &&
                          !!dataEstudoISO(existente?.dataEstudo ?? "") &&
                          estudo.dataEstudo <
                            dataEstudoISO(existente!.dataEstudo),
                      ).length ? (
                      <ul className="space-y-1 text-xs">
                        {(historicoEstudos.data ?? [])
                          .filter(
                            (estudo) =>
                              estudo.id !== existente?.id &&
                              !!estudo.dataEstudo &&
                              !!dataEstudoISO(existente?.dataEstudo ?? "") &&
                              estudo.dataEstudo <
                                dataEstudoISO(existente!.dataEstudo),
                          )
                          .map((estudo) => (
                            <li key={estudo.id}>
                              <a
                                className="text-primary hover:underline"
                                href={`${ROTA_PERFIL_SOCIOECONOMICO}/${estudo.id}`}
                              >
                                Estudo de {dataBR(estudo.dataEstudo)}
                              </a>{" "}
                              <span className="text-muted-foreground">
                                ·{" "}
                                {estudo.situacao === "CONCLUIDO"
                                  ? "Concluído"
                                  : "Rascunho"}
                              </span>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nenhum outro estudo registrado.
                      </p>
                    )}
                  </div>
                )}
                {participantes.isError && (
                  <p role="alert">
                    Não foi possível carregar os participantes.
                  </p>
                )}
              </FormSectionCard>

              {form.participanteId && (
                <FormSectionCard
                  icon={MapPin}
                  title="Endereço"
                  description="O endereço principal do participante é preenchido automaticamente com os dados disponíveis no cadastro."
                >
                  <div className="grid gap-4 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      <ReadOnly label="CEP" value={enderecoConsulta.cep} />
                    </div>
                    <div className="sm:col-span-4">
                      <ReadOnly
                        label="Logradouro"
                        value={enderecoConsulta.logradouro}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <ReadOnly
                        label="Número"
                        value={enderecoConsulta.numero}
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <ReadOnly
                        label="Complemento"
                        value={enderecoConsulta.complemento}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <ReadOnly
                        label="Bairro"
                        value={enderecoConsulta.bairro}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <ReadOnly
                        label="Cidade"
                        value={enderecoConsulta.cidade}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <ReadOnly
                        label="Estado"
                        value={enderecoConsulta.estado}
                      />
                    </div>
                    {enderecoConsulta.enderecoOriginal && (
                      <div className="sm:col-span-6">
                        <ReadOnly
                          label="Endereço Original do Estudo"
                          value={enderecoConsulta.enderecoOriginal}
                        />
                      </div>
                    )}
                  </div>
                </FormSectionCard>
              )}

              <FormSectionCard
                icon={IdCard}
                title="Informações Complementares do Participante"
                description="Informe dados adicionais sobre o participante, como contato para recados, informações escolares e dias em que costuma frequentar a organização. Preencha apenas o que for aplicável."
              >
                <div className={g2}>
                  <InterruptorResposta
                    k="possuiNomeSocial"
                    label="Utiliza Nome Social?"
                    tooltip="Informe se o participante utiliza um nome social, diferente daquele registrado em seus documentos. Esta resposta não altera o cadastro principal."
                  />
                  {form.possuiNomeSocial === "sim" && (
                    <Text
                      k="nomeSocial"
                      label="Nome Social"
                      tooltip="Informe o nome pelo qual o participante deseja ser chamado, quando for diferente do nome registrado em seus documentos."
                    />
                  )}
                  <Text
                    k="contatoRecados"
                    label="Contato para Recados"
                    tooltip="Informe um telefone de familiar ou responsável que possa receber recados para o participante, quando necessário."
                    phone
                  />
                  <Text
                    k="nis"
                    label="NIS"
                    tooltip="Informe o Número de Identificação Social (NIS), caso o participante ou responsável saiba esse número. Ele é utilizado em programas sociais."
                  />
                  <Text
                    k="whatsapp"
                    label="WhatsApp"
                    tooltip="Informe o número de WhatsApp utilizado para contato com o participante ou responsável, quando disponível."
                    phone
                  />
                  <ReadOnly label="Raça/cor" value={racaCorLabel} />
                  <div className="sm:col-span-2">
                    <Checks
                      k="diasFrequencia"
                      label="Dias de Frequência"
                      tooltip="Selecione os dias da semana em que o participante costuma frequentar as atividades da organização. Pode marcar vários dias. Isso não substitui os registros de presença."
                      options={DIAS}
                    />
                  </div>
                  <Text
                    k="escola"
                    label="Escola"
                    tooltip="Informe o nome da escola ou instituição de ensino que o participante frequenta atualmente, quando aplicável."
                  />
                  <Text
                    k="anoEscolar"
                    label="Ano Escolar"
                    tooltip="Informe a série ou etapa de ensino que o participante está cursando, como 7º ano do Ensino Fundamental ou 2º ano do Ensino Médio."
                  />
                </div>
              </FormSectionCard>

              <FormSectionCard
                icon={Users}
                title="Grupo Familiar"
                description="Informe as pessoas que moram com o participante, o parentesco, a ocupação e a renda de cada uma, quando conhecidos. Essas informações ajudam a conhecer a composição familiar e calcular a renda por pessoa."
              >
                <div className="space-y-4">
                  {form.integrantes.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum familiar adicionado. Se o participante morar com
                      outras pessoas, utilize Adicionar Integrante.
                    </p>
                  )}
                  {form.integrantes.map((m, i) => {
                    const up = (patch: Partial<typeof m>) =>
                      set(
                        "integrantes",
                        form.integrantes.map((x) =>
                          x.id === m.id ? { ...x, ...patch } : x,
                        ),
                      );
                    const id_ = isView
                      ? (m.idadeNoEstudo ?? null)
                      : (idadeDe(m.dataNascimento, referencia) ??
                        (m.idadeDeclarada ? Number(m.idadeDeclarada) : null));
                    return (
                      <div
                        key={m.id}
                        className="rounded-lg border border-border/60 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">
                            Integrante {i + 1}
                          </p>
                          {!isView && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-destructive"
                              onClick={() =>
                                set(
                                  "integrantes",
                                  form.integrantes.filter((x) => x.id !== m.id),
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                              Remover
                            </Button>
                          )}
                        </div>
                        <div className={g2}>
                          <div className="sm:col-span-2">
                            <FieldLabel
                              htmlFor={`in-${m.id}`}
                              tooltip="Informe o nome completo da pessoa que mora com o participante. Cada integrante deve ser cadastrado apenas uma vez."
                            >
                              Nome Completo
                            </FieldLabel>
                            <Input
                              id={`in-${m.id}`}
                              value={m.nome}
                              onChange={(e) => up({ nome: e.target.value })}
                            />
                          </div>
                          <div>
                            <FieldLabel
                              htmlFor={`ip-${m.id}`}
                              tooltip="Informe a relação desta pessoa com o participante, como mãe, pai, irmão, avó ou outro familiar."
                            >
                              Parentesco
                            </FieldLabel>
                            <Input
                              id={`ip-${m.id}`}
                              value={m.parentesco}
                              onChange={(e) =>
                                up({ parentesco: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor={`id-${m.id}`}>
                              Data de Nascimento
                            </FieldLabel>
                            <Input
                              id={`id-${m.id}`}
                              placeholder="dd/mm/aaaa"
                              inputMode="numeric"
                              value={m.dataNascimento}
                              onChange={(e) =>
                                up({ dataNascimento: maskDate(e.target.value) })
                              }
                            />
                          </div>
                          <div>
                            <FieldLabel tooltip="Idade calculada automaticamente com base na data de nascimento e na data do estudo. Se você não souber a data de nascimento, poderá preencher a Idade Declarada.">
                              Idade
                            </FieldLabel>
                            <Input
                              readOnly
                              disabled
                              value={
                                id_ !== null ? `${id_} anos` : "Não calculada"
                              }
                              className="text-muted-foreground"
                            />
                          </div>
                          <div>
                            <FieldLabel
                              htmlFor={`idade-${m.id}`}
                              tooltip="Se não souber a data de nascimento, informe a idade aproximada declarada pelo familiar. Quando houver data de nascimento, o sistema dará preferência à idade calculada."
                            >
                              Idade Declarada
                            </FieldLabel>
                            <Input
                              id={`idade-${m.id}`}
                              inputMode="numeric"
                              value={m.idadeDeclarada}
                              onChange={(e) =>
                                up({
                                  idadeDeclarada: e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 3),
                                })
                              }
                            />
                          </div>
                          <div>
                            <FieldLabel
                              htmlFor={`io-${m.id}`}
                              tooltip="Informe a profissão ou principal ocupação atual dessa pessoa, como estudante, diarista, comerciante ou aposentado."
                            >
                              Ocupação
                            </FieldLabel>
                            <Input
                              id={`io-${m.id}`}
                              value={m.ocupacao}
                              onChange={(e) => up({ ocupacao: e.target.value })}
                            />
                          </div>
                          <div>
                            <FieldLabel
                              htmlFor={`ie-${m.id}`}
                              tooltip="Informe o nível de escolaridade desta pessoa, como Ensino Fundamental incompleto ou Ensino Médio completo."
                            >
                              Escolaridade
                            </FieldLabel>
                            <Input
                              id={`ie-${m.id}`}
                              value={m.escolaridade}
                              onChange={(e) =>
                                up({ escolaridade: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <FieldLabel
                              htmlFor={`ir-${m.id}`}
                              tooltip="Informe o valor que esta pessoa recebe por mês, quando conhecido. Use R$ 0,00 somente se não tiver renda e deixe em branco se não souber informar."
                            >
                              Renda Mensal
                            </FieldLabel>
                            <Money
                              id={`ir-${m.id}`}
                              value={m.renda}
                              onChange={(v) => up({ renda: v })}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <FieldLabel
                              htmlFor={`is-${m.id}`}
                              tooltip="Selecione a opção que melhor descreve o trabalho ou a principal fonte de renda desta pessoa, como autônomo, emprego formal ou aposentadoria."
                            >
                              Situação de Trabalho ou Fonte de Renda
                            </FieldLabel>
                            <Select
                              value={m.situacaoTrabalho || NONE}
                              onValueChange={(v) =>
                                up({ situacaoTrabalho: v === NONE ? "" : v })
                              }
                            >
                              <SelectTrigger id={`is-${m.id}`}>
                                <SelectValue placeholder="Não informado" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE}>
                                  Não informado
                                </SelectItem>
                                {SITUACAO_TRABALHO.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!isView && (
                    <Button
                      type="button"
                      variant="glassSecondary"
                      className="h-9 gap-2 px-4"
                      onClick={() =>
                        set("integrantes", [
                          ...form.integrantes,
                          {
                            id: uid(),
                            nome: "",
                            parentesco: "",
                            dataNascimento: "",
                            idadeDeclarada: "",
                            ocupacao: "",
                            escolaridade: "",
                            renda: "",
                            situacaoTrabalho: "",
                          },
                        ])
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Integrante
                    </Button>
                  )}
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox
                      checked={form.composicaoCompleta}
                      onCheckedChange={(c) => set("composicaoCompleta", !!c)}
                      className="mt-0.5"
                    />
                    <span>
                      Confirmei os integrantes da família que moram com o
                      participante.{" "}
                      <span className="block text-xs text-muted-foreground">
                        Marque após informar todas as pessoas que moram com o
                        participante. Isso ajuda a calcular corretamente a renda
                        por pessoa.
                      </span>
                    </span>
                  </label>
                </div>
              </FormSectionCard>

              <FormSectionCard
                icon={Home}
                title="Situação Habitacional"
                description="Informe com quem o participante mora, como é a residência e quais recursos a família possui em casa. Essas informações ajudam a compreender as condições de moradia."
              >
                <div className={g2}>
                  <Selecao
                    k="moraCom"
                    label="Mora com"
                    tooltip="Selecione com quem o participante mora atualmente, como família, parentes, sozinho ou instituição. Se nenhuma opção corresponder à situação, escolha Outro."
                    options={MORA_COM}
                  />
                  {form.moraCom === "Outro" ? (
                    <Text
                      k="moraComOutro"
                      label="Especifique com Quem Mora"
                      tooltip="Informe com quem o participante reside quando nenhuma das opções anteriores representar a situação, como amigos ou outra pessoa responsável."
                    />
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                  <Selecao
                    k="condicaoResidencia"
                    label="Condição da Residência"
                    tooltip="Informe a condição da moradia, como própria, alugada, financiada ou cedida. Escolha a opção que melhor representa a situação atual da família."
                    options={CONDICAO}
                  />
                  <div className="sm:col-span-2">
                    <FieldLabel tooltip="Informe quantos cômodos de cada tipo existem na residência. Utilize zero quando não houver aquele cômodo e deixe em branco se não souber informar.">
                      Cômodos da residência
                    </FieldLabel>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                      {COMODOS.map(([k, l]) => (
                        <div key={k}>
                          <label
                            htmlFor={`com-${k}`}
                            className="mb-1 block text-xs text-muted-foreground"
                          >
                            {l}
                          </label>
                          <Input
                            id={`com-${k}`}
                            inputMode="numeric"
                            value={form.comodos[k]}
                            onChange={(e) =>
                              set("comodos", {
                                ...form.comodos,
                                [k]: e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 2),
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <InterruptorResposta
                    k="acessoInternet"
                    label="Acesso à Internet"
                    tooltip="Informe se a família consegue acessar a internet na residência, seja pelo celular, computador ou outro aparelho."
                  />
                  <div />
                  <div className="sm:col-span-2">
                    <Checks
                      k="meiosInternet"
                      label="Meio de Acesso à Internet"
                      tooltip="Selecione os aparelhos que a família utiliza para acessar a internet, como celular próprio, celular do responsável ou computador. Pode marcar mais de uma opção."
                      options={MEIOS_INTERNET}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Checks
                      k="utensilios"
                      label="Utensílios Domésticos"
                      tooltip="Selecione os equipamentos que a família possui ou utiliza em casa, como geladeira, televisão, micro-ondas ou máquina de lavar. Pode marcar várias opções."
                      options={UTENSILIOS}
                    />
                  </div>
                </div>
              </FormSectionCard>

              <FormSectionCard
                icon={Zap}
                title="Infraestrutura da Residência e do Bairro"
                description="Informe as condições de acesso à água, energia elétrica, coleta de lixo, esgoto e outros serviços essenciais na residência e no bairro."
              >
                <div className={g2}>
                  <SelecaoResposta
                    k="energia"
                    label="Energia Elétrica"
                    options={[
                      { value: "regularizada", label: "Ligação regularizada" },
                      {
                        value: "nao_regularizada",
                        label: "Ligação não regularizada",
                      },
                    ]}
                    tooltip="Informe se a residência possui ligação de energia elétrica regularizada ou não regularizada. Se não souber, mantenha Não informado."
                  />
                  <SelecaoResposta
                    k="agua"
                    label="Abastecimento de Água"
                    options={[
                      { value: "regularizado", label: "Regularizado" },
                      { value: "nao_regularizado", label: "Não regularizado" },
                      {
                        value: "fonte_natural",
                        label: "Fonte natural / cachoeira",
                      },
                    ]}
                    tooltip="Selecione como a residência recebe água para uso diário. Informe se o abastecimento é regularizado, não regularizado ou proveniente de fonte natural."
                  />
                  <InterruptorResposta
                    k="fossa"
                    label="Possui Fossa Séptica"
                    tooltip="Informe se a residência utiliza fossa séptica para receber e tratar o esgoto doméstico."
                  />
                  <InterruptorResposta
                    k="esgoto"
                    label="Possui Rede de Esgoto"
                    tooltip="Informe se o esgoto da residência é encaminhado para uma rede pública de coleta de esgoto."
                  />
                  <InterruptorResposta
                    k="coletaLixo"
                    label="Possui Coleta de Lixo"
                    tooltip="Informe se o lixo da residência é recolhido regularmente por serviço de coleta."
                  />
                  <SelecaoResposta
                    k="pavimentacao"
                    label="Pavimentação da Rua"
                    options={[
                      { value: "pavimentada", label: "Pavimentada" },
                      { value: "nao_pavimentada", label: "Não pavimentada" },
                    ]}
                    tooltip="Informe se a rua onde o participante mora tem asfalto, concreto, calçamento ou outro tipo de pavimentação."
                  />
                  <InterruptorResposta
                    k="enchentes"
                    label="Ocorrência de Enchentes ou Alagamentos"
                    tooltip="Informe se a rua ou a residência costuma sofrer enchentes ou alagamentos, mesmo que aconteçam somente em épocas de chuva."
                  />
                  <div />
                  <Long
                    k="obsInfraestrutura"
                    label="Observações Sobre A Infraestrutura"
                    tooltip="Registre outras informações importantes sobre a residência ou o bairro, como falta de água, problemas com esgoto, coleta de lixo ou enchentes frequentes."
                  />
                </div>
              </FormSectionCard>

              <FormSectionCard
                icon={Bus}
                title="Meios de Transporte"
                description="Informe como o participante costuma chegar à organização e quais meios de transporte são utilizados pela família no dia a dia."
              >
                <div className={g2}>
                  <div className="sm:col-span-2">
                    <Checks
                      k="transporteParticipante"
                      label="Transporte do Participante até A Organização"
                      tooltip="Selecione como o participante costuma chegar às atividades da organização, por exemplo, a pé, de bicicleta ou ônibus. É possível escolher mais de um meio de transporte."
                      options={TRANSPORTES}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Checks
                      k="transporteFamilia"
                      label="Transporte Utilizado Pela Família"
                      tooltip="Selecione os meios de transporte que os familiares utilizam no dia a dia. É possível escolher mais de uma opção."
                      options={TRANSPORTES}
                    />
                  </div>
                  <InterruptorResposta
                    k="possuiVeiculo"
                    label="Possui Veículo"
                    tooltip="Informe se alguém da família possui veículo próprio, como carro ou motocicleta."
                  />
                  <Text
                    k="veiculoMarcaAno"
                    label="Marca e Ano do Veículo"
                    tooltip="Informe a marca e o ano do veículo da família, se souber. Se houver mais de um, descreva cada um, por exemplo: Fiat 2018; Honda 2020."
                  />
                  <InterruptorResposta
                    k="maisDeUmVeiculo"
                    label="Possui Mais de um Veículo"
                    tooltip="Informe se a família possui dois ou mais veículos próprios."
                  />
                </div>
              </FormSectionCard>

              <FormSectionCard
                icon={HandCoins}
                title="Benefícios Sociais e Transferência de Renda"
                description="Informe se a família recebe benefícios sociais, auxílios ou pensões. Esses dados ajudam a compreender as fontes de renda e devem ser preenchidos somente quando conhecidos."
              >
                <div className={g2}>
                  <p className="sm:col-span-2 text-sm font-medium text-foreground">
                    Benefícios e Programas Sociais
                  </p>
                  <InterruptorResposta
                    k="bolsaFamilia"
                    label="Bolsa Família"
                    valorConsulta={bolsaFamilia}
                  />
                  <div />
                  <InterruptorResposta
                    k="bpc"
                    label="Benefício de Prestação Continuada — BPC"
                    tooltip="Informe se algum integrante da família recebe o Benefício de Prestação Continuada (BPC), destinado a pessoas idosas ou com deficiência que atendem aos critérios legais."
                  />
                  {form.bpc === "sim" ? (
                    <div>
                      <FieldLabel
                        htmlFor="bpcValor"
                        tooltip="Informe o valor recebido por mês do Benefício de Prestação Continuada (BPC), quando conhecido."
                      >
                        Valor Mensal do BPC
                      </FieldLabel>
                      <Money
                        id="bpcValor"
                        value={form.bpcValor}
                        onChange={(v) => set("bpcValor", v)}
                      />
                    </div>
                  ) : (
                    <div />
                  )}
                  {listaValores(
                    "outrosBeneficios",
                    "Outros Benefícios",
                    "Adicionar benefício",
                    "Nome do Benefício",
                  )}
                  <InterruptorResposta
                    k="peDeMeia"
                    label="Programa Pé-de-Meia"
                    tooltip="Informe se algum integrante da família participa do Programa Pé-de-Meia, que oferece incentivo financeiro a estudantes que atendem aos critérios do programa."
                  />
                  <InterruptorResposta
                    k="dignidadePessoal"
                    label="Programa Dignidade Pessoal"
                    tooltip="Informe se algum integrante da família recebe ou participa do programa identificado como Dignidade Pessoal. Se não tiver certeza, mantenha Não informado."
                  />
                  <p className="sm:col-span-2 border-t border-border/60 pt-4 text-sm font-medium text-foreground">
                    Outros Auxílios e Pensões
                  </p>
                  <div className="sm:col-span-2 space-y-2">
                    <FieldLabel tooltip="Adicione os auxílios financeiros recebidos pela família. Informe o nome e o valor mensal, quando conhecido. Não repita benefícios já cadastrados em outros campos.">
                      Recebe Auxílio
                    </FieldLabel>
                    {form.auxilios.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhum auxílio informado.
                      </p>
                    )}
                    {form.auxilios.map((a, i) => {
                      const up = (patch: Partial<typeof a>) =>
                        set(
                          "auxilios",
                          form.auxilios.map((x) =>
                            x.id === a.id ? { ...x, ...patch } : x,
                          ),
                        );
                      return (
                        <div
                          key={a.id}
                          className="grid items-center gap-2 sm:grid-cols-[1fr_auto_9rem_auto]"
                        >
                          <Input
                            aria-label={`Descrição do auxílio ${i + 1}`}
                            placeholder="Descrição do auxílio"
                            value={a.descricao}
                            onChange={(e) => up({ descricao: e.target.value })}
                          />
                          <Select
                            value={a.recebe || NONE}
                            onValueChange={(v) =>
                              up({ recebe: (v === NONE ? "" : v) as SimNao })
                            }
                          >
                            <SelectTrigger
                              className="sm:w-40"
                              aria-label={`Recebe auxílio ${i + 1}`}
                            >
                              <SelectValue placeholder="Recebe?" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>
                                Não informado
                              </SelectItem>
                              {SIM_NAO.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Money
                            id={`aux-${a.id}`}
                            label={`Valor do auxílio ${i + 1}`}
                            value={a.valor}
                            onChange={(v) => up({ valor: v })}
                          />
                          {!isView && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Remover"
                              onClick={() =>
                                set(
                                  "auxilios",
                                  form.auxilios.filter((x) => x.id !== a.id),
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {!isView && (
                      <Button
                        type="button"
                        variant="glassSecondary"
                        className="h-9 gap-2 px-4"
                        onClick={() =>
                          set("auxilios", [
                            ...form.auxilios,
                            { id: uid(), descricao: "", recebe: "", valor: "" },
                          ])
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar auxílio
                      </Button>
                    )}
                  </div>
                  <InterruptorResposta
                    k="pensao"
                    label="Pensão Alimentícia"
                    tooltip="Informe se o participante ou outra pessoa da família recebe pensão alimentícia. Quando a resposta for Sim, será possível informar quem recebe e o valor mensal."
                  />
                  <div />
                  {form.pensao === "sim" && (
                    <>
                      <Text
                        k="pensaoQuemRecebe"
                        label="Quem Recebe"
                        tooltip="Informe qual integrante da família recebe a pensão alimentícia, como o participante, a mãe ou outro responsável."
                      />
                      <div>
                        <FieldLabel
                          htmlFor="pensaoValor"
                          tooltip="Informe o valor mensal recebido de pensão alimentícia, quando conhecido."
                        >
                          Valor Mensal
                        </FieldLabel>
                        <Money
                          id="pensaoValor"
                          value={form.pensaoValor}
                          onChange={(v) => set("pensaoValor", v)}
                        />
                      </div>
                    </>
                  )}
                  <p className="sm:col-span-2 border-t border-border/60 pt-4 text-sm font-medium text-foreground">
                    Informações Familiares Complementares
                  </p>
                  <InterruptorResposta
                    k="reclusao"
                    label="Familiar em Regime de Reclusão"
                    tooltip="Informe se algum integrante da família está em situação de privação de liberdade. Registre somente quando a informação for necessária ao estudo."
                  />
                  {form.reclusao === "sim" ? (
                    <Text
                      k="reclusaoQuem"
                      label="Quem?"
                      tooltip="Informe qual integrante da família está em situação de reclusão, somente se a informação for necessária e tiver sido fornecida voluntariamente."
                    />
                  ) : (
                    <div />
                  )}
                  <InterruptorResposta
                    k="tratamentoSaude"
                    label="Familiar em Tratamento de Saúde"
                    tooltip="Informe se algum integrante da família realiza tratamento de saúde relevante para a avaliação socioeconômica. Não é necessário informar doenças ou diagnósticos."
                  />
                  {form.tratamentoSaude === "sim" ? (
                    <Text
                      k="tratamentoQuem"
                      label="Quem?"
                      tooltip="Informe qual integrante da família está em tratamento de saúde, somente quando necessário. Não registre diagnóstico ou detalhes médicos aqui."
                    />
                  ) : (
                    <div />
                  )}
                </div>
              </FormSectionCard>

              <FormSectionCard
                icon={Wallet}
                title="Receitas e Despesas Mensais"
                description="Informe quanto a família recebe e gasta mensalmente. Registre primeiro as fontes de renda e depois as despesas; os valores ajudam a calcular os totais e a compreender a situação financeira familiar."
              >
                <div className={g2}>
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-foreground">
                      Receitas Mensais
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Informe as fontes de renda da família, como trabalho,
                      aposentadoria, pensão ou benefícios sociais. Registre os
                      valores recebidos por mês e evite informar a mesma renda
                      duas vezes.
                    </p>
                  </div>
                  {listaValores(
                    "receitas",
                    "Receitas",
                    "Adicionar receita",
                    "Descrição da receita",
                  )}
                  <div className="sm:col-span-2 border-t border-border/60 pt-4">
                    <p className="text-sm font-medium text-foreground">
                      Despesas Mensais
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Informe os gastos mensais com moradia, alimentação,
                      serviços, saúde, educação e transporte. Se o valor variar,
                      utilize uma média aproximada quando possível.
                    </p>
                  </div>
                  {DESPESAS_FIXAS.map(([k, l]) => (
                    <div key={k}>
                      <FieldLabel
                        htmlFor={`d-${k}`}
                        tooltip={
                          DESPESA_AJUDA[String(k)] ??
                          "Informe o valor gasto por mês nesta categoria. Use R$ 0,00 somente se não houver essa despesa; se não souber o valor, deixe em branco."
                        }
                      >
                        {l}
                      </FieldLabel>
                      <Money
                        id={`d-${k}`}
                        value={form.despesas[k]}
                        onChange={(v) =>
                          set("despesas", { ...form.despesas, [k]: v })
                        }
                      />
                    </div>
                  ))}
                  {listaValores(
                    "outrasDespesas",
                    "Outras despesas",
                    "Adicionar despesa",
                  )}
                  <Long
                    k="obsFinanceiras"
                    label="Observações Sobre Receitas e Despesas"
                    tooltip="Registre informações que ajudem a compreender a renda e os gastos da família, como valores que mudam a cada mês ou despesas que não acontecem regularmente."
                  />
                </div>
                {isView && ind && (
                  <div className="mt-4 border-t border-border/60 pt-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                      <Calculator className="h-4 w-4 text-muted-foreground" />
                      Resumo Socioeconômico
                    </p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Os resultados são calculados a partir das informações
                      declaradas. Campos sem resposta não são considerados
                      valores iguais a zero.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Indicador
                        label="Total das Despesas"
                        tooltip="Soma dos gastos mensais informados. Se faltarem valores, o total apresentado poderá estar incompleto."
                        value={
                          ind.totalDespesas === null
                            ? "Não informado"
                            : formatBRL(ind.totalDespesas)
                        }
                        hint={
                          ind.totalDespesas !== null && !ind.despesasCompletas
                            ? "Soma apenas das despesas informadas."
                            : undefined
                        }
                      />
                      <Indicador
                        label="Total das Receitas"
                        tooltip="Soma dos valores informados como receitas mensais. Confira se um mesmo rendimento não foi cadastrado duas vezes."
                        value={
                          ind.totalReceitas === null
                            ? "Não informado"
                            : formatBRL(ind.totalReceitas)
                        }
                      />
                      <Indicador
                        label="Renda Familiar"
                        tooltip="Valor mensal da renda familiar calculado conforme as receitas declaradas e as regras do sistema. Não confunda este valor com dinheiro disponível após as despesas."
                        value={
                          ind.rendaFamiliar === null
                            ? "Não informada"
                            : formatBRL(ind.rendaFamiliar)
                        }
                        hint="Conforme receitas declaradas."
                      />
                      <Indicador
                        label="Pessoas na Família"
                        tooltip="Quantidade de pessoas consideradas, incluindo o participante e os familiares informados. Confira se todos foram cadastrados antes de confirmar a composição familiar."
                        value={String(ind.pessoasFamilia)}
                        hint={
                          form.composicaoCompleta
                            ? "Composição familiar confirmada."
                            : "Contagem provisória: confirme os integrantes da família."
                        }
                      />
                      <Indicador
                        label="Renda Per Capita"
                        tooltip="Renda familiar mensal dividida pelo número de pessoas da família. O cálculo depende de renda confiável e composição familiar confirmada."
                        value={
                          ind.rendaPerCapita === null
                            ? "Não calculada"
                            : formatBRL(ind.rendaPerCapita)
                        }
                        hint={
                          ind.rendaPerCapita === null
                            ? "Requer renda familiar e composição familiar completa."
                            : undefined
                        }
                      />
                      <Indicador
                        label="Saldo Mensal Estimado Declarado"
                        tooltip="Diferença entre as receitas e as despesas mensais informadas. Pode ser positiva ou negativa e não representa o saldo bancário real da família."
                        value={
                          ind.resultadoMensal === null
                            ? "Não calculado"
                            : formatBRL(ind.resultadoMensal)
                        }
                        hint={
                          ind.saldoMensalParcial
                            ? "Há valores mensais não informados."
                            : undefined
                        }
                      />
                    </div>
                  </div>
                )}
              </FormSectionCard>

              <FormSectionCard
                icon={MessageSquareText}
                title="Observações Gerais"
                description="Registre informações adicionais importantes para compreender a situação socioeconômica do participante e de sua família, quando não houver um campo específico para elas."
              >
                <div className={g2}>
                  <Long
                    k="observacoes"
                    label="Observações Sobre O Estudo"
                    tooltip="Registre informações importantes sobre as condições familiares, habitacionais ou financeiras que não foram contempladas nos campos anteriores. Evite julgamentos e detalhes sensíveis desnecessários."
                  />
                </div>
              </FormSectionCard>
            </fieldset>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="glassSecondary"
                className="h-9 px-4"
                onClick={() => navigate(ROTA_PERFIL_SOCIOECONOMICO)}
                disabled={salvando}
              >
                {isView ? "Voltar" : "Cancelar"}
              </Button>
              {!isView && (
                <Button
                  type="submit"
                  variant="glassPrimary"
                  className="h-9 px-5"
                  disabled={salvando || participantes.isLoading}
                >
                  {salvando ? "Salvando…" : "Salvar"}
                </Button>
              )}
            </div>
          </form>
        </FormCtx.Provider>
      </div>

      <WikiFloatingButton
        pageTitle="Estudos Socioeconômicos"
        href="/wiki/pessoas/estudos-socioeconomicos"
      />
    </AppLayout>
  );
}
