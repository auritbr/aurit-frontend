import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  User,
  MapPin,
  Briefcase,
  CalendarClock,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { EmailInput } from "@/components/EmailInput";
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
import { maskCPF, maskPhone, maskCEP } from "@/lib/masks";
import {
  buildColaboradorPayload,
  createColaborador,
  createEmptyColaborador,
  estadosBrasil,
  getColaboradorById,
  statusColaboradorOptions,
  tipoVinculoOptions,
  updateColaborador,
  type Colaborador,
} from "@/data/colaboradores";
import { toast } from "sonner";

const COLABORADOR_NEXT_STEP_KEY = "aurit:colaboradores:next-step-card";

interface ColaboradorNextStepCardData {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  acaoUrl: string;
  acaoSecundariaLabel?: string;
  acaoSecundariaUrl?: string;
  variante?: "pendente" | "atencao" | "concluido" | "prioridade";
}

function salvarProximaAcaoColaborador() {
  const card: ColaboradorNextStepCardData = {
    titulo: "Após cadastrar os colaboradores, registre os integrantes vinculados à organização",
    descricao:
      "Os integrantes ajudam a representar pessoas, grupos, coletivos ou parceiros culturais que atuam junto à organização, mesmo quando não fazem parte da equipe fixa ou do cadastro de participantes.",
    acaoLabel: "Cadastrar integrantes",
    acaoUrl: "/integrantes/novo",
    acaoSecundariaLabel: "Ver colaboradores",
    acaoSecundariaUrl: "/colaboradores",
    variante: "pendente",
  };

  sessionStorage.setItem(COLABORADOR_NEXT_STEP_KEY, JSON.stringify(card));
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  estado?: string;
  erro?: boolean;
}

const estadosPorUf: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

function normalizarChave(value?: string | null) {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolverEstadoParaSelect(value?: string | null): string {
  const raw = (value ?? "").trim();

  if (!raw) return "";

  const direto = estadosBrasil.find((estado) => estado === raw);

  if (direto) return direto;

  const rawUpper = raw.toUpperCase();

  if (rawUpper.length === 2) {
    const opcaoUf = estadosBrasil.find(
      (estado) => estado.toUpperCase() === rawUpper,
    );

    if (opcaoUf) return opcaoUf;

    const nomeEstado = estadosPorUf[rawUpper];

    if (nomeEstado) {
      const opcaoNome = estadosBrasil.find(
        (estado) => normalizarChave(estado) === normalizarChave(nomeEstado),
      );

      if (opcaoNome) return opcaoNome;
    }
  }

  const ufPorNome = Object.entries(estadosPorUf).find(
    ([, nome]) => normalizarChave(nome) === normalizarChave(raw),
  )?.[0];

  if (ufPorNome) {
    const opcaoUf = estadosBrasil.find(
      (estado) => estado.toUpperCase() === ufPorNome,
    );

    if (opcaoUf) return opcaoUf;

    const opcaoNome = estadosBrasil.find(
      (estado) =>
        normalizarChave(estado) === normalizarChave(estadosPorUf[ufPorNome]),
    );

    if (opcaoNome) return opcaoNome;
  }

  const porNomeNormalizado = estadosBrasil.find(
    (estado) => normalizarChave(estado) === normalizarChave(raw),
  );

  return porNomeNormalizado ?? "";
}

function maskRGFlex(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (!digits) return "";

  if (digits.length <= 7) {
    if (digits.length <= 1) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
    return `${digits.slice(0, 1)}-${digits.slice(1, 4)}.${digits.slice(4)}`;
  }

  if (digits.length <= 8) {
    return digits.replace(/^(\d{2})(\d{3})(\d{0,3})$/, (_, a, b, c) =>
      c ? `${a}.${b}.${c}` : `${a}.${b}`,
    );
  }

  if (digits.length === 9) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d)$/, "$1.$2.$3-$4");
  }

  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})$/, (_, a, b, c, d) =>
    d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`,
  );
}

function isValidEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

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

export default function ColaboradorForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const visualizando = !!id && !location.pathname.endsWith("/editar");
  const editando = !!id && location.pathname.endsWith("/editar");

  const [form, setForm] = useState<Colaborador>(() => createEmptyColaborador());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const bloqueado = visualizando || loading || saving;

  const set = <K extends keyof Colaborador>(key: K, value: Colaborador[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    void carregarTudo();
  }, [id]);

  async function carregarTudo() {
    try {
      setLoading(true);

      if (id) {
        const data = await getColaboradorById(Number(id));

        setForm({
          ...data,
          cpf: data.cpf ? maskCPF(data.cpf) : "",
          telefone: data.telefone ? maskPhone(data.telefone) : "",
          cep: data.cep ? maskCEP(data.cep) : "",
          rg: data.rg ? maskRGFlex(data.rg) : "",
          estado: resolverEstadoParaSelect(data.estado),
        });
      } else {
        setForm(createEmptyColaborador());
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao carregar colaborador.",
      );
      navigate("/colaboradores");
    } finally {
      setLoading(false);
    }
  }

  const validar = () => {
    if (!form.nomeCompleto.trim()) {
      toast.error("Informe o nome completo.");
      return false;
    }

    if (!form.dataNascimento) {
      toast.error("Informe a data de nascimento.");
      return false;
    }

    if (onlyDigits(form.cpf).length !== 11) {
      toast.error("Informe um CPF válido com 11 dígitos.");
      return false;
    }

    if (!form.telefone.trim()) {
      toast.error("Informe o telefone.");
      return false;
    }

    if (form.email && !isValidEmail(form.email)) {
      toast.error("Informe um e-mail válido.");
      return false;
    }

    if (onlyDigits(form.cep).length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return false;
    }

    if (!form.logradouro.trim()) {
      toast.error("Informe o logradouro.");
      return false;
    }

    if (!form.numero.trim()) {
      toast.error("Informe o número do endereço.");
      return false;
    }

    if (!form.bairro.trim()) {
      toast.error("Informe o bairro.");
      return false;
    }

    if (!form.cidade.trim()) {
      toast.error("Informe a cidade.");
      return false;
    }

    if (!form.estado.trim()) {
      toast.error("Informe o estado.");
      return false;
    }

    if (!form.funcaoColaborador.trim()) {
      toast.error("Informe a função do colaborador.");
      return false;
    }

    if (!form.cargaHorariaSemanal.trim()) {
      toast.error("Informe a carga horária semanal.");
      return false;
    }

    const carga = Number(form.cargaHorariaSemanal);

    if (Number.isNaN(carga) || carga <= 0) {
      toast.error("Informe uma carga horária semanal válida.");
      return false;
    }

    if (!form.descricaoAtuacao.trim()) {
      toast.error("Informe a descrição da atuação.");
      return false;
    }

    if (!form.dataInicioVinculo) {
      toast.error("Informe a data de início do vínculo.");
      return false;
    }

    if (!form.status) {
      toast.error("Selecione o status.");
      return false;
    }

    if (!form.tipoVinculo) {
      toast.error("Selecione o tipo de vínculo.");
      return false;
    }

    if (
      form.dataInicioVinculo &&
      form.dataFimVinculo &&
      form.dataFimVinculo < form.dataInicioVinculo
    ) {
      toast.error("A data de término não pode ser anterior à data de início.");
      return false;
    }

    if (
      form.dataFimVinculo &&
      dataFimPassada(form.dataFimVinculo) &&
      !statusPermiteDataFimPassada(form.status)
    ) {
      toast.error(
        "Colaborador com data de término passada deve estar com status Inativo ou Concluído.",
      );
      return false;
    }

    return true;
  };

  async function buscarEnderecoPorCep(cepFormatado: string) {
    const cepLimpo = cepFormatado.replace(/\D/g, "");

    if (cepLimpo.length !== 8 || visualizando) return;

    try {
      setCepLoading(true);

      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

      if (!response.ok) {
        throw new Error("Não foi possível consultar o CEP.");
      }

      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        logradouro: data.logradouro ?? "",
        complemento: prev.complemento || data.complemento || "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        estado: resolverEstadoParaSelect(data.uf ?? data.estado),
      }));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (visualizando) return;
    if (!validar()) return;

    try {
      setSaving(true);

      const payload = buildColaboradorPayload(form);

      if (editando && id) {
        await updateColaborador(Number(id), payload);
        toast.success("Colaborador atualizado com sucesso.");
      } else {
        await createColaborador(payload);
        salvarProximaAcaoColaborador();
        toast.success("Colaborador salvo com sucesso.");
      }

      navigate("/colaboradores");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar colaborador.",
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
          onClick={() => navigate("/colaboradores")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageTitle
          title="Colaborador"
          tooltip="Cadastre e acompanhe os dados dos colaboradores da organização, incluindo informações pessoais, endereço, função exercida, vínculo institucional, carga horária e situação atual."
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
          <Section icon={User} title="Dados pessoais">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="nomeCompleto" required>
                  Nome Completo
                </FieldLabel>

                <Input
                  id="nomeCompleto"
                  value={form.nomeCompleto}
                  onChange={(e) => set("nomeCompleto", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="dataNascimento" required>
                  Data de Nascimento
                </FieldLabel>

                <Input
                  id="dataNascimento"
                  type="date"
                  value={form.dataNascimento}
                  onChange={(e) => set("dataNascimento", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="cpf" required>
                  CPF
                </FieldLabel>

                <Input
                  id="cpf"
                  value={form.cpf}
                  onChange={(e) => set("cpf", maskCPF(e.target.value))}
                  inputMode="numeric"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="rg">RG</FieldLabel>

                <Input
                  id="rg"
                  value={form.rg}
                  onChange={(e) => set("rg", maskRGFlex(e.target.value))}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="telefone" required>
                  Telefone
                </FieldLabel>

                <Input
                  id="telefone"
                  value={form.telefone}
                  onChange={(e) => set("telefone", maskPhone(e.target.value))}
                  inputMode="tel"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>

                <EmailInput
                  id="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={MapPin} title="Endereço">
            <div className="grid sm:grid-cols-6 gap-4">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="cep" required>
                  CEP
                </FieldLabel>

                <Input
                  id="cep"
                  value={form.cep}
                  onChange={(e) => {
                    if (visualizando) return;

                    const cepFormatado = maskCEP(e.target.value);
                    set("cep", cepFormatado);

                    const cepLimpo = cepFormatado.replace(/\D/g, "");
                    if (cepLimpo.length === 8) {
                      void buscarEnderecoPorCep(cepFormatado);
                    }
                  }}
                  inputMode="numeric"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />

                {cepLoading && !visualizando && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Buscando endereço...
                  </p>
                )}
              </Field>

              <Field className="sm:col-span-4">
                <FieldLabel htmlFor="logradouro" required>
                  Logradouro
                </FieldLabel>

                <Input
                  id="logradouro"
                  value={form.logradouro}
                  onChange={(e) => set("logradouro", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="numero" required>
                  Número
                </FieldLabel>

                <Input
                  id="numero"
                  value={form.numero}
                  onChange={(e) =>
                    set(
                      "numero",
                      e.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  inputMode="numeric"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field className="sm:col-span-4">
                <FieldLabel htmlFor="complemento">Complemento</FieldLabel>

                <Input
                  id="complemento"
                  value={form.complemento}
                  onChange={(e) => set("complemento", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="bairro" required>
                  Bairro
                </FieldLabel>

                <Input
                  id="bairro"
                  value={form.bairro}
                  onChange={(e) => set("bairro", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="cidade" required>
                  Cidade
                </FieldLabel>

                <Input
                  id="cidade"
                  value={form.cidade}
                  onChange={(e) => set("cidade", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="estado" required>
                  Estado
                </FieldLabel>

                <Select
                  value={form.estado}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    set("estado", v);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="estado">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent className="max-h-72">
                    {estadosBrasil.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={Briefcase} title="Dados de atuação">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="funcaoColaborador"
                  required
                  tooltip="Informe o cargo ou função principal exercida pelo colaborador na organização. Ex.: professor de música, produtor cultural, coordenadora pedagógica ou auxiliar administrativo."
                >
                  Função do Colaborador
                </FieldLabel>

                <Input
                  id="funcaoColaborador"
                  value={form.funcaoColaborador}
                  onChange={(e) => set("funcaoColaborador", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="cargaHorariaSemanal"
                  required
                  tooltip="Informe a carga horária média semanal dedicada pelo colaborador à organização ou às atividades vinculadas. Ex.: 20 horas por semana."
                >
                  Carga Horária Semanal
                </FieldLabel>

                <Input
                  id="cargaHorariaSemanal"
                  value={form.cargaHorariaSemanal}
                  onChange={(e) =>
                    set(
                      "cargaHorariaSemanal",
                      e.target.value.replace(/\D/g, "").slice(0, 3),
                    )
                  }
                  inputMode="numeric"
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field full>
                <FieldLabel
                  htmlFor="descricaoAtuacao"
                  required
                  tooltip="Descreva de forma objetiva as atividades realizadas pelo colaborador, sua contribuição para a organização e sua participação em projetos, oficinas, eventos ou ações culturais. Ex.: Atua no planejamento e condução de oficinas de música, acompanha a frequência dos participantes e apoia apresentações públicas."
                >
                  Descrição da Atuação
                </FieldLabel>

                <Textarea
                  id="descricaoAtuacao"
                  value={form.descricaoAtuacao}
                  onChange={(e) => set("descricaoAtuacao", e.target.value)}
                  rows={4}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>
            </div>
          </Section>

          <Section icon={CalendarClock} title="Vínculo e situação">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  htmlFor="dataInicioVinculo"
                  required
                  tooltip="Informe a data em que o colaborador iniciou sua atuação ou vínculo com a organização. Ex.: 01/02/2024."
                >
                  Data de Início do Vínculo
                </FieldLabel>

                <Input
                  id="dataInicioVinculo"
                  type="date"
                  value={form.dataInicioVinculo}
                  onChange={(e) => set("dataInicioVinculo", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="dataFimVinculo"
                  tooltip="Informe a data de término apenas se o vínculo já foi encerrado ou tiver uma previsão formal de encerramento. Caso a data de término já tenha passado, o status deve ser Inativo ou Concluído."
                >
                  Data de Término do Vínculo
                </FieldLabel>

                <Input
                  id="dataFimVinculo"
                  type="date"
                  value={form.dataFimVinculo}
                  onChange={(e) => set("dataFimVinculo", e.target.value)}
                  disabled={bloqueado}
                  readOnly={visualizando}
                />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="status"
                  required
                  tooltip="Indique a situação atual do colaborador no sistema. Use “Ativo” para colaboradores em atuação, “Pendente” para cadastros em conferência, “Concluído” para vínculos finalizados conforme previsto e “Inativo” para vínculos que não devem mais ser considerados ativos."
                >
                  Status do Colaborador
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
                    {statusColaboradorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="tipoVinculo"
                  required
                  tooltip="Selecione a forma de vínculo ou contratação do colaborador com a organização. Ex.: pessoa física, pessoa jurídica, MEI ou voluntário."
                >
                  Tipo de Vínculo
                </FieldLabel>

                <Select
                  value={form.tipoVinculo}
                  onValueChange={(v) => {
                    if (visualizando) return;
                    set("tipoVinculo", v);
                  }}
                  disabled={bloqueado}
                >
                  <SelectTrigger id="tipoVinculo">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent>
                    {tipoVinculoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/colaboradores")}
              disabled={loading || saving}
            >
              {visualizando ? "Voltar" : "Cancelar"}
            </Button>

            {!visualizando && (
              <Button
                type="submit"
                className="sm:min-w-32"
                disabled={loading || saving}
              >
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