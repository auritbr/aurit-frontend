import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare2,
  CircleDollarSign,
  FileDown,
  FileText,
  Flag,
  ImageOff,
  Images,
  ExternalLink,
  Loader2,
  Target,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { AccessNotPermitted } from "@/components/AccessNotPermitted";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { Button } from "@/components/ui/button";
import {
  getPlanoTrabalho,
  type PlanoTrabalho as Plano,
} from "@/data/planoTrabalho";
import { getEvidenciaImagemUrl } from "@/data/evidencias";
import { downloadIndividualReport } from "@/lib/individualReportDownload";
import {
  getPermissoesUsuarioLogadoPorModulo,
  permissoesVazias,
  type PermissoesModulo,
} from "@/lib/permissoes";

const moeda = (valor?: number | null) =>
  valor == null
    ? "—"
    : valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const data = (valor?: string | null) =>
  valor ? new Date(`${valor}T12:00:00`).toLocaleDateString("pt-BR") : "—";

const periodo = (inicio?: string | null, fim?: string | null) =>
  `${data(inicio)} a ${data(fim)}`;

const valor = (item?: unknown) =>
  item === null || item === undefined || item === "" ? "—" : String(item);

export default function PlanoTrabalhoPage() {
  const { id = "" } = useParams();
  const [plano, setPlano] = useState<Plano | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [permissoes, setPermissoes] =
    useState<PermissoesModulo>(permissoesVazias);

  useEffect(() => {
    let active = true;
    Promise.all([
      getPlanoTrabalho(id),
      getPermissoesUsuarioLogadoPorModulo("PROJETOS"),
    ])
      .then(([dados, permissoesData]) => {
        if (!active) return;
        setPlano(dados);
        setPermissoes(permissoesData);
      })
      .catch((error) => {
        if (active) {
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o Plano de Trabalho.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function baixarPdf() {
    if (!plano) return;
    try {
      setPdfLoading(true);
      await downloadIndividualReport(
        `/projetos/${id}/plano-trabalho/relatorio`,
        `plano-trabalho-${plano.identificacao.projeto}.pdf`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o PDF.",
      );
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="container flex min-h-[50vh] max-w-7xl items-center justify-center py-6 sm:py-8">
          <div className="form-section-glass flex items-center gap-2 rounded-[16px] px-5 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Carregando plano de trabalho...
          </div>
        </div>
      </AppLayout>
    );
  }

  if (erro) {
    return (
      <AppLayout>
        <div className="container max-w-7xl py-6 sm:py-8">
          <BackToProjects />
          <div className="rounded-[18px] border border-destructive/25 bg-destructive/10 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-destructive">
              Não foi possível carregar o plano
            </p>
            <p className="mx-auto mt-1 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
              {erro}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!plano || !permissoes.VISUALIZAR) {
    return (
      <AppLayout>
        <AccessNotPermitted />
      </AppLayout>
    );
  }

  const identificacao = plano.identificacao;
  return (
    <AppLayout>
      <div className="container max-w-7xl py-6 sm:py-8">
        <BackToProjects />
        <ListPageHeader
          title="Plano de Trabalho"
          tooltip="Visão consolidada, somente para leitura, construída com os dados atuais do projeto e dos módulos relacionados."
          objective="Visualize de forma consolidada o planejamento e a execução do projeto, reunindo identificação, objetivos, metas, cronograma, atividades, evidências, colaboradores e dados financeiros registrados no sistema."
          actions={
            permissoes.GERAR_PDF || permissoes.BAIXAR ? (
              <Button
                variant="glassPrimary"
                className="h-9 gap-2 px-4"
                onClick={baixarPdf}
                disabled={pdfLoading}
              >
                {pdfLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                {pdfLoading ? "Gerando PDF..." : "Gerar PDF"}
              </Button>
            ) : undefined
          }
        />

        <div className="space-y-5">
          <Section icon={FileText} number="1" title="Identificação">
            <InfoGrid
              items={[
                ["Projeto", identificacao.projeto],
                ["Organização", identificacao.organizacao],
                ["CPF/CNPJ", identificacao.documentoOrganizacao],
                ["Proposta", identificacao.proposta],
                ["Edital", identificacao.edital],
                ["Responsável", identificacao.responsavel],
                [
                  "Período",
                  periodo(
                    identificacao.inicioPrevisto,
                    identificacao.fimPrevisto,
                  ),
                ],
                ["Situação", identificacao.situacao],
                ["Valor previsto", moeda(identificacao.valorPrevisto)],
              ]}
            />
          </Section>

          {(plano.objeto || plano.justificativa) && (
            <Section icon={FileText} number="2" title="Objeto e justificativa">
              <TextBlock label="Objeto" text={plano.objeto} />
              <TextBlock label="Justificativa" text={plano.justificativa} />
            </Section>
          )}

          {(plano.objetivoGeral || plano.objetivosEspecificos.length > 0) && (
            <Section icon={Target} number="3" title="Objetivos">
              <TextBlock label="Objetivo geral" text={plano.objetivoGeral} />
              {plano.objetivosEspecificos.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Objetivos específicos
                  </p>
                  <ul className="space-y-2">
                    {plano.objetivosEspecificos.map((objetivo, index) => (
                      <li
                        key={`${objetivo}-${index}`}
                        className="flex gap-2.5 text-[13px] leading-relaxed text-foreground"
                      >
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/65"
                          text-justify
                        />
                        {objetivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          <CollectionSection
            icon={Target}
            number="4"
            title="Metas"
            empty="Nenhuma meta foi cadastrada para este projeto."
            to="/metas-projeto"
            items={plano.metas.map((meta) => ({
              title: meta.titulo,
              details: [
                ["Quantidade prevista", meta.quantidadePrevista],
                ["Comprovação", meta.formaComprovacao],
                ["Descrição", meta.descricao],
              ],
            }))}
          />
          <CollectionSection
            icon={CalendarDays}
            number="5"
            title="Cronograma"
            empty="Nenhuma etapa de cronograma foi cadastrada para este projeto."
            to="/cronograma"
            items={plano.cronograma.map((item) => ({
              title: item.etapa,
              details: [
                ["Período", periodo(item.dataInicio, item.dataFim)],
                ["Vínculo", item.vinculo],
                ["Situação", item.situacao],
                ["Descrição", item.descricao],
              ],
            }))}
          />
          <CollectionSection
            icon={CheckSquare2}
            number="6"
            title="Atividades"
            empty="Nenhuma atividade foi cadastrada para este projeto."
            to="/atividades"
            items={plano.atividades.map((atividade) => ({
              title: atividade.nome,
              details: [
                ["Tipo", atividade.tipo],
                ["Período", periodo(atividade.dataInicio, atividade.dataFim)],
                ["Público", atividade.publico],
                ["Vagas", atividade.vagas],
                ["Local", atividade.local],
                ["Situação", atividade.situacao],
              ],
            }))}
          />
          <CollectionSection
            icon={Users}
            number="7"
            title="Turmas"
            empty="Nenhuma turma foi cadastrada para as atividades deste projeto."
            to="/turmas"
            items={plano.turmas.map((turma) => ({
              title: turma.nome,
              details: [
                ["Atividade", turma.atividade],
                ["Vagas", turma.vagas],
                ["Horário", turma.horario],
                ["Nível", turma.nivel],
                ["Situação", turma.situacao],
              ],
            }))}
          />
          <CollectionSection
            icon={CalendarDays}
            number="8"
            title="Eventos culturais"
            empty="Nenhum evento cultural foi vinculado a este projeto."
            to="/eventos-culturais"
            items={plano.eventosCulturais.map((evento) => ({
              title: evento.nome,
              details: [
                ["Tipo", evento.tipo],
                ["Período", periodo(evento.dataInicio, evento.dataFim)],
                ["Local", evento.local],
                ["Situação", evento.situacao],
                ["Descrição", evento.descricao],
              ],
            }))}
          />
          <EvidenciasSection evidencias={plano.evidencias ?? []} />
          <CollectionSection
            icon={Users}
            number="10"
            title="Colaboradores do projeto"
            empty="Nenhum colaborador foi selecionado para este projeto."
            to="/colaboradores"
            items={plano.colaboradores.map((colaborador) => ({
              title: valor(colaborador.nome),
              details: [
                ["Função", colaborador.funcao],
                ["Vínculo", colaborador.tipoVinculo],
                ["Carga horária semanal", colaborador.cargaHorariaSemanal],
                [
                  "Período do vínculo",
                  periodo(colaborador.inicioVinculo, colaborador.fimVinculo),
                ],
                ["Situação", colaborador.situacao],
                ["Atuação", colaborador.descricaoAtuacao],
              ],
            }))}
          />
          {plano.contrapartidas.length > 0 && (
            <CollectionSection
              icon={BriefcaseBusiness}
              number="11"
              title="Contrapartidas"
              empty=""
              items={plano.contrapartidas.map((contrapartida) => ({
                title: valor(contrapartida.titulo),
                details: [
                  ["Tipo", contrapartida.tipo],
                  ["Descrição", contrapartida.descricao],
                ],
              }))}
            />
          )}

          <Section
            icon={CircleDollarSign}
            number="12"
            title="Contas a pagar e contas a receber"
          >
            <FinanceiroTable
              titulo="Contas a pagar"
              pessoa="Credor"
              items={plano.contasPagar}
              empty="Nenhuma conta a pagar está vinculada a este projeto."
              to="/contas-pagar"
            />
            <div className="mt-5">
              <FinanceiroTable
                titulo="Contas a receber"
                pessoa="Pagador"
                items={plano.contasReceber}
                empty="Nenhuma conta a receber está vinculada a este projeto."
                to="/contas-receber"
              />
            </div>
          </Section>

          <Section icon={Flag} number="13" title="Resumo do plano">
            <InfoGrid
              items={[
                [
                  "Total a pagar",
                  moeda(plano.resumoFinanceiro.totalContasPagar),
                ],
                [
                  "Total a receber",
                  moeda(plano.resumoFinanceiro.totalContasReceber),
                ],
                [
                  "Contas a pagar",
                  plano.resumoFinanceiro.quantidadeContasPagar,
                ],
                [
                  "Contas a receber",
                  plano.resumoFinanceiro.quantidadeContasReceber,
                ],
                ["Colaboradores do projeto", plano.colaboradores.length],
                ["Metas planejadas", plano.metas.length],
                ["Atividades previstas", plano.atividades.length],
                ["Turmas", plano.turmas.length],
                ["Eventos culturais", plano.eventosCulturais.length],
                ["Evidências", (plano.evidencias ?? []).length],
                [
                  "Imagens de evidências",
                  (plano.evidencias ?? []).reduce(
                    (total, evidencia) => total + evidencia.imagens.length,
                    0,
                  ),
                ],
              ]}
            />
          </Section>
        </div>
      </div>
    </AppLayout>
  );
}

function BackToProjects() {
  return (
    <Link
      to="/projetos"
      className="mb-4 inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Voltar para Projetos
    </Link>
  );
}

function Section({
  icon: Icon,
  number,
  title,
  children,
}: {
  icon: typeof FileText;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="form-section-glass rounded-[18px] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-border/60 pb-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-primary/15 bg-primary-soft text-primary">
          <Icon className="h-4 w-4" strokeWidth={2.1} />
        </span>
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            Seção {number}
          </p>
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function InfoGrid({ items }: { items: Array<[string, unknown]> }) {
  return (
    <dl className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {items
        .filter(
          ([, item]) => item !== null && item !== undefined && item !== "",
        )
        .map(([label, item]) => (
          <div
            key={label}
            className="rounded-[12px] border border-border/55 bg-background/35 px-3 py-2.5"
          >
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 break-words text-[13px] font-medium text-foreground">
              {valor(item)}
            </dd>
          </div>
        ))}
    </dl>
  );
}

function TextBlock({ label, text }: { label: string; text?: string | null }) {
  if (!text) return null;
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
        {text}
      </p>
    </div>
  );
}

function Empty({ text, to }: { text: string; to?: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-border/70 bg-background/25 px-5 py-8 text-center">
      <p className="text-[13px] text-muted-foreground">{text}</p>
      {to && (
        <Button
          asChild
          variant="glassSecondary"
          className="mt-3 h-8 px-3 text-[12px]"
        >
          <Link to={to}>Ir para o cadastro de origem</Link>
        </Button>
      )}
    </div>
  );
}

function CollectionSection({
  icon,
  number,
  title,
  items,
  empty,
  to,
}: {
  icon: typeof FileText;
  number: string;
  title: string;
  items: Array<{ title: string; details: Array<[string, unknown]> }>;
  empty: string;
  to?: string;
}) {
  return (
    <Section icon={icon} number={number} title={title}>
      {items.length === 0 ? (
        <Empty text={empty} to={to} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item, index) => (
            <article
              key={`${item.title}-${index}`}
              className="rounded-[14px] border border-border/60 bg-background/35 p-3.5 transition-colors hover:bg-background/55"
            >
              <h3 className="mb-3 text-[13px] font-semibold text-foreground">
                {item.title}
              </h3>
              <InfoGrid items={item.details} />
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}

function EvidenciasSection({
  evidencias,
}: {
  evidencias: Plano["evidencias"];
}) {
  return (
    <Section icon={Images} number="9" title="Evidências de execução">
      {evidencias.length === 0 ? (
        <Empty
          text="Nenhuma evidência foi cadastrada para este projeto."
          to="/evidencias"
        />
      ) : (
        <div className="space-y-4">
          {evidencias.map((evidencia) => (
            <article
              key={evidencia.id}
              className="rounded-[14px] border border-border/60 bg-background/35 p-3.5 sm:p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {evidencia.contexto}
                  </p>
                  <h3 className="mt-1 text-[13.5px] font-semibold text-foreground">
                    {valor(evidencia.referencia)}
                  </h3>
                </div>
                <span className="text-[12px] text-muted-foreground">
                  {data(evidencia.dataReferencia)}
                </span>
              </div>
              <InfoGrid
                items={[
                  ["Turma", evidencia.turma],
                  ["Plano de aula", evidencia.planoAula],
                  ["Imagens", evidencia.imagens.length],
                  ["Links", evidencia.links.length],
                ]}
              />
              {evidencia.descricao && (
                <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                  {evidencia.descricao}
                </p>
              )}
              {evidencia.imagens.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {evidencia.imagens.map((imagem) => (
                    <PlanoEvidenciaImagem
                      key={imagem.id}
                      evidenciaId={evidencia.id}
                      imagem={imagem}
                    />
                  ))}
                </div>
              )}
              {evidencia.links.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {evidencia.links.map((link) => (
                    <li key={link.id}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-[9px] border border-border/60 bg-background/60 px-2.5 py-1.5 text-[12px] font-medium text-primary hover:bg-background/90"
                      >
                        {link.titulo?.trim() || "Abrir link"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}

function PlanoEvidenciaImagem({
  evidenciaId,
  imagem,
}: {
  evidenciaId: number;
  imagem: Plano["evidencias"][number]["imagens"][number];
}) {
  const [url, setUrl] = useState("");
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    let ativo = true;
    setFalhou(false);
    getEvidenciaImagemUrl(evidenciaId, imagem.id)
      .then((resultado) => {
        if (ativo) setUrl(resultado);
      })
      .catch(() => {
        if (ativo) setFalhou(true);
      });
    return () => {
      ativo = false;
    };
  }, [evidenciaId, imagem.id]);

  return (
    <figure className="attachment-file-glass overflow-hidden rounded-[13px]">
      {url && !falhou ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt={imagem.nome || "Imagem da evidência"}
            className="aspect-[4/3] w-full object-cover"
            onError={() => setFalhou(true)}
          />
        </a>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-muted/25 text-muted-foreground">
          {falhou ? (
            <ImageOff className="h-6 w-6" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
        </div>
      )}
      <figcaption className="truncate px-2.5 py-2 text-[11px] text-muted-foreground">
        {imagem.nome || "Imagem da evidência"}
      </figcaption>
    </figure>
  );
}

function FinanceiroTable({
  titulo,
  pessoa,
  items,
  empty,
  to,
}: {
  titulo: string;
  pessoa: string;
  items: Plano["contasPagar"];
  empty: string;
  to: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-[13px] font-semibold text-foreground">
        {titulo}
      </h3>
      {items.length === 0 ? (
        <Empty text={empty} to={to} />
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-border/60 bg-background/35">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b border-border/60 bg-muted/35 text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-3.5 py-3">Lançamento</th>
                <th className="px-3.5 py-3">Classificação</th>
                <th className="px-3.5 py-3">{pessoa}</th>
                <th className="px-3.5 py-3">Vencimento</th>
                <th className="px-3.5 py-3 text-right">Valor previsto</th>
                <th className="px-3.5 py-3 text-right">Realizado</th>
                <th className="px-3.5 py-3">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-muted/25"
                >
                  <td className="px-3.5 py-3 font-medium text-foreground">
                    {item.titulo}
                    <p className="mt-0.5 max-w-xs text-xs font-normal text-muted-foreground">
                      {item.descricao}
                    </p>
                  </td>
                  <td className="px-3.5 py-3 text-muted-foreground">
                    {valor(item.classificacao)}
                  </td>
                  <td className="px-3.5 py-3 text-muted-foreground">
                    {valor(item.pessoa)}
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap text-muted-foreground">
                    {data(item.vencimento)}
                  </td>
                  <td className="px-3.5 py-3 text-right whitespace-nowrap font-medium text-foreground">
                    {moeda(item.valorPrevisto)}
                  </td>
                  <td className="px-3.5 py-3 text-right whitespace-nowrap text-muted-foreground">
                    {moeda(item.valorRealizado)}
                  </td>
                  <td className="px-3.5 py-3 text-muted-foreground">
                    {valor(item.situacao)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
