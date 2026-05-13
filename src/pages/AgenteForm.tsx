import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, MapPin, Building2, UserCog, Info, Users2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldLabel } from "@/components/FieldLabel";
import { FormLegend } from "@/components/FormLegend";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { maskCPF, maskPhone, maskCEP, maskDate, maskRG } from "@/lib/masks";
import { estadosBrasil } from "@/data/colaboradores";
import { TipoAgente, tipoAgenteLabels, tipoAgenteDescricoes } from "@/data/agentes";
import { toast } from "sonner";

const maskCNPJ = (v: string) =>
  v.replace(/\D/g, "").slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");

interface PessoaFisica {
  nomeCompleto: string; dataNascimento: string; cpf: string; rg: string;
  telefone: string; email: string;
}
interface Endereco {
  cep: string; logradouro: string; numero: string; complemento: string;
  bairro: string; cidade: string; estado: string;
}
interface PessoaJuridica {
  razaoSocial: string; nomeFantasia: string; cnpj: string; dataFundacao: string;
}
interface Coletivo { nome: string; dataCriacao: string; }

const emptyPF: PessoaFisica = { nomeCompleto: "", dataNascimento: "", cpf: "", rg: "", telefone: "", email: "" };
const emptyEnd: Endereco = { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" };
const emptyPJ: PessoaJuridica = { razaoSocial: "", nomeFantasia: "", cnpj: "", dataFundacao: "" };
const emptyCol: Coletivo = { nome: "", dataCriacao: "" };

export default function AgenteForm() {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<TipoAgente | "">("");
  const [pf, setPf] = useState<PessoaFisica>(emptyPF);
  const [pj, setPj] = useState<PessoaJuridica>(emptyPJ);
  const [coletivo, setColetivo] = useState<Coletivo>(emptyCol);
  const [representante, setRepresentante] = useState<PessoaFisica>(emptyPF);
  const [endereco, setEndereco] = useState<Endereco>(emptyEnd);

  const setPF = <K extends keyof PessoaFisica>(k: K, v: PessoaFisica[K]) => setPf((p) => ({ ...p, [k]: v }));
  const setPJ = <K extends keyof PessoaJuridica>(k: K, v: PessoaJuridica[K]) => setPj((p) => ({ ...p, [k]: v }));
  const setCol = <K extends keyof Coletivo>(k: K, v: Coletivo[K]) => setColetivo((p) => ({ ...p, [k]: v }));
  const setRep = <K extends keyof PessoaFisica>(k: K, v: PessoaFisica[K]) => setRepresentante((p) => ({ ...p, [k]: v }));
  const setEnd = <K extends keyof Endereco>(k: K, v: Endereco[K]) => setEndereco((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipo) {
      toast.error("Selecione o tipo de agente.");
      return;
    }
    toast.success("Agente salvo com sucesso.");
    setTimeout(() => navigate("/agentes"), 600);
  };

  const isPJ = tipo === "MEI" || tipo === "PESSOA_JURIDICA_SEM_FINS_LUCRATIVOS" || tipo === "PESSOA_JURIDICA_COM_FINS_LUCRATIVOS";
  const isPF = tipo === "PESSOA_FISICA";
  const isColetivo = tipo === "GRUPO_COLETIVO";

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 sm:py-8">
        <button
          onClick={() => navigate("/agentes")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageTitle
          title="Agente Cultural"
          tooltip="Cadastre o agente cultural responsável pela iniciativa. O agente é quem responde pelas informações, execução do projeto e prestação de contas."
        />

        {/* Bloco explicativo */}
        <div className="mb-5 flex gap-3 rounded border border-primary/15 bg-primary-soft px-4 py-3">
          <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={2.2} />
          <p className="text-[13px] leading-relaxed text-foreground">
            <span className="font-semibold">Agente cultural</span> é a pessoa responsável pela iniciativa cultural.
            É quem responde pelas informações, execução do projeto e prestação de contas, mesmo quando a atividade
            está vinculada a uma organização, coletivo ou empresa.
          </p>
        </div>

        <FormLegend />

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={UserCog} title="Tipo de agente">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="tipoAgente" required tooltip="Selecione o tipo de agente cultural que será cadastrado.">Tipo de agente</FieldLabel>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAgente)}>
                  <SelectTrigger id="tipoAgente"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(tipoAgenteLabels) as TipoAgente[]).map((k) => (
                      <SelectItem key={k} value={k}>{tipoAgenteLabels[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Bloco explicativo dos tipos */}
            <div className="mt-5 grid sm:grid-cols-2 gap-2.5">
              {(Object.keys(tipoAgenteLabels) as TipoAgente[]).map((k) => (
                <div
                  key={k}
                  className={`rounded border px-3 py-2.5 text-[12px] leading-relaxed transition-colors ${tipo === k
                      ? "border-primary/40 bg-primary-soft"
                      : "border-border bg-muted/30"
                    }`}
                >
                  <p className="font-semibold text-foreground text-[12.5px] mb-0.5">{tipoAgenteLabels[k]}</p>
                  <p className="text-muted-foreground">{tipoAgenteDescricoes[k]}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Pessoa Física */}
          {isPF && (
            <>
              <Section icon={User} title="Dados pessoais">
                <PessoaFisicaFields data={pf} set={setPF} />
              </Section>
              <Section icon={MapPin} title="Endereço">
                <EnderecoFields data={endereco} set={setEnd} />
              </Section>
            </>
          )}

          {/* Pessoa Jurídica / MEI */}
          {isPJ && (
            <>
              <Section icon={Building2} title={tipo === "MEI" ? "Dados da pessoa jurídica" : "Dados da organização"}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field full>
                    <FieldLabel htmlFor="razaoSocial" required>Razão social</FieldLabel>
                    <Input id="razaoSocial" value={pj.razaoSocial} onChange={(e) => setPJ("razaoSocial", e.target.value)} />
                  </Field>
                  <Field full>
                    <FieldLabel htmlFor="nomeFantasia">Nome fantasia</FieldLabel>
                    <Input id="nomeFantasia" value={pj.nomeFantasia} onChange={(e) => setPJ("nomeFantasia", e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cnpj" required>CNPJ</FieldLabel>
                    <Input id="cnpj" value={pj.cnpj} onChange={(e) => setPJ("cnpj", maskCNPJ(e.target.value))} inputMode="numeric" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="dataFundacao" required>Data de fundação</FieldLabel>
                    <Input id="dataFundacao" value={pj.dataFundacao} onChange={(e) => setPJ("dataFundacao", maskDate(e.target.value))} inputMode="numeric" />
                  </Field>
                </div>
              </Section>

              <Section icon={MapPin} title="Endereço">
                <EnderecoFields data={endereco} set={setEnd} />
              </Section>

              <Section icon={User} title="Dados do representante">
                <PessoaFisicaFields data={representante} set={setRep} prefix="rep" />
              </Section>
            </>
          )}

          {/* Coletivo */}
          {isColetivo && (
            <>
              <Section icon={Users2} title="Dados do coletivo">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field full>
                    <FieldLabel htmlFor="nomeColetivo" required>Nome do coletivo</FieldLabel>
                    <Input id="nomeColetivo" value={coletivo.nome} onChange={(e) => setCol("nome", e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="dataCriacao" required>Data de criação</FieldLabel>
                    <Input id="dataCriacao" value={coletivo.dataCriacao} onChange={(e) => setCol("dataCriacao", maskDate(e.target.value))} inputMode="numeric" />
                  </Field>
                </div>
              </Section>

              <Section icon={User} title="Dados do representante">
                <PessoaFisicaFields data={representante} set={setRep} prefix="rep" />
              </Section>
            </>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/agentes")}>
              Cancelar
            </Button>
            <Button type="submit" className="sm:min-w-32">
              Salvar
            </Button>
          </div>
        </form>
      </div>

      <WikiFloatingButton
        pageTitle="Cadastro de Agente Cultural"
        sections={[
          { title: "O que é um agente cultural?", content: "É a pessoa responsável pela iniciativa cultural — quem responde pelas informações, execução e prestação de contas." },
          { title: "Como escolher o tipo?", content: "Selecione o tipo que melhor representa o responsável: pessoa física, MEI, pessoa jurídica (com ou sem fins) ou coletivo." },
          { title: "Quem é o representante?", content: "Para empresas, organizações ou coletivos, o representante é a pessoa física que responde pela iniciativa." },
          { title: "Salvando", content: "Após preencher os campos, clique em 'Salvar' no final da página." },
        ]}
      />
    </AppLayout>
  );
}

function PessoaFisicaFields({
  data, set, prefix = "",
}: {
  data: PessoaFisica;
  set: <K extends keyof PessoaFisica>(k: K, v: PessoaFisica[K]) => void;
  prefix?: string;
}) {
  const id = (s: string) => prefix ? `${prefix}-${s}` : s;
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field full>
        <FieldLabel htmlFor={id("nomeCompleto")} required>Nome completo</FieldLabel>
        <Input id={id("nomeCompleto")} value={data.nomeCompleto} onChange={(e) => set("nomeCompleto", e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor={id("dataNascimento")} required>Data de nascimento</FieldLabel>
        <Input id={id("dataNascimento")} value={data.dataNascimento} onChange={(e) => set("dataNascimento", maskDate(e.target.value))} inputMode="numeric" />
      </Field>
      <Field>
        <FieldLabel htmlFor={id("cpf")} required>CPF</FieldLabel>
        <Input id={id("cpf")} value={data.cpf} onChange={(e) => set("cpf", maskCPF(e.target.value))} inputMode="numeric" />
      </Field>
      <Field>
        <FieldLabel htmlFor={id("rg")}>RG</FieldLabel>
        <Input id={id("rg")} value={data.rg} onChange={(e) => set("rg", maskRG(e.target.value))} />
      </Field>
      <Field>
        <FieldLabel htmlFor={id("telefone")} required>Telefone</FieldLabel>
        <Input id={id("telefone")} value={data.telefone} onChange={(e) => set("telefone", maskPhone(e.target.value))} inputMode="tel" />
      </Field>
      <Field>
        <FieldLabel htmlFor={id("email")}>E-mail</FieldLabel>
        <Input id={id("email")} type="email" value={data.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
    </div>
  );
}

function EnderecoFields({
  data, set,
}: {
  data: Endereco;
  set: <K extends keyof Endereco>(k: K, v: Endereco[K]) => void;
}) {
  return (
    <div className="grid sm:grid-cols-6 gap-4">
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="cep" required>CEP</FieldLabel>
        <Input id="cep" value={data.cep} onChange={(e) => set("cep", maskCEP(e.target.value))} inputMode="numeric" />
      </Field>
      <Field className="sm:col-span-4">
        <FieldLabel htmlFor="logradouro" required>Logradouro</FieldLabel>
        <Input id="logradouro" value={data.logradouro} onChange={(e) => set("logradouro", e.target.value)} />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="numero" required>Número</FieldLabel>
        <Input id="numero" value={data.numero} onChange={(e) => set("numero", e.target.value)} inputMode="numeric" />
      </Field>
      <Field className="sm:col-span-4">
        <FieldLabel htmlFor="complemento">Complemento</FieldLabel>
        <Input id="complemento" value={data.complemento} onChange={(e) => set("complemento", e.target.value)} />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="bairro" required>Bairro</FieldLabel>
        <Input id="bairro" value={data.bairro} onChange={(e) => set("bairro", e.target.value)} />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="cidade" required>Cidade</FieldLabel>
        <Input id="cidade" value={data.cidade} onChange={(e) => set("cidade", e.target.value)} />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="estado" required>Estado</FieldLabel>
        <Select value={data.estado} onValueChange={(v) => set("estado", v)}>
          <SelectTrigger id="estado"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            {estadosBrasil.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6 border border-border rounded shadow-none">
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-border">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />
        <h2 className="text-sm font-semibold text-foreground leading-tight uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function Field({ children, full, className }: { children: React.ReactNode; full?: boolean; className?: string }) {
  return <div className={`${full ? "sm:col-span-2" : ""} ${className ?? ""}`}>{children}</div>;
}