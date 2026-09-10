import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import { DataTableCard } from "@/components/list/DataTableCard";
import { DataTableToolbar } from "@/components/list/DataTableToolbar";
import { WikiFloatingButton } from "@/components/WikiFloatingButton";
import { DataTableEmptyState } from "@/components/list/DataTableEmptyState";
import { DataTablePagination } from "@/components/DataTablePagination";
import { RowActionsDropdown } from "@/components/RowActionsDropdown";
import { TableCellText } from "@/components/TableCellText";
import { StatusPill } from "@/components/StatusPill";
import { FieldLabel } from "@/components/FieldLabel";
import { usePagination } from "@/hooks/usePagination";
import {
  alterarSituacaoModelo,
  classificarModelo,
  excluirModelo,
  listarModelos,
  listarTiposDocumento,
  ModelosDocumentoError,
  type ModeloDocumento,
} from "@/data/modeloDocumento";

const inputClass =
  "h-9 rounded-[11px] border-border/70 bg-background/60 text-sm";

const normalize = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatarData = (valor?: string | null) => {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString("pt-BR");
};

export default function ModelosDocumento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [situacaoFiltro, setSituacaoFiltro] = useState("todas");
  const [preview, setPreview] = useState<ModeloDocumento | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] =
    useState<ModeloDocumento | null>(null);

  const { data: modelos = [], isLoading } = useQuery({
    queryKey: ["modelos-documento"],
    queryFn: listarModelos,
  });

  const { data: tipos = [] } = useQuery({
    queryKey: ["modelos-documento", "tipos"],
    queryFn: listarTiposDocumento,
  });

  const nomeDoTipo = (valor: string) =>
    tipos.find((t) => t.valor === valor)?.nome || valor;
  const origemVisivel = classificarModelo;

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["modelos-documento"] });

  const excluirMutation = useMutation({
    mutationFn: (modelo: ModeloDocumento) => excluirModelo(modelo.id),
    onSuccess: () => {
      toast.success("Modelo de documento excluído.");
      setConfirmarExclusao(null);
      invalidar();
    },
    onError: (erro) => {
      toast.error(
        erro instanceof ModelosDocumentoError
          ? erro.message
          : "Não foi possível excluir o modelo. Ele pode já ter sido utilizado — inative-o em vez de excluir.",
      );
    },
  });

  const situacaoMutation = useMutation({
    mutationFn: (modelo: ModeloDocumento) =>
      alterarSituacaoModelo(
        modelo.id,
        modelo.situacao === "ATIVO" ? "INATIVO" : "ATIVO",
      ),
    onSuccess: (_dados, modelo) => {
      toast.success(
        modelo.situacao === "ATIVO" ? "Modelo inativado." : "Modelo ativado.",
      );
      invalidar();
    },
    onError: () =>
      toast.error("Não foi possível alterar a situação do modelo."),
  });

  const filtrados = useMemo(() => {
    const termo = normalize(busca);
    return modelos.filter((m) => {
      if (
        termo &&
        !normalize(m.nome || "").includes(termo) &&
        !normalize(m.tituloDocumento || "").includes(termo)
      )
        return false;
      if (tipoFiltro !== "todos" && m.tipoDocumento !== tipoFiltro)
        return false;
      if (situacaoFiltro !== "todas" && m.situacao !== situacaoFiltro)
        return false;
      return true;
    });
  }, [modelos, busca, tipoFiltro, situacaoFiltro]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginated: paginados,
  } = usePagination(filtrados);

  const exportColumns = [
    { key: "nome", header: "Nome" },
    { key: "tipo", header: "Tipo" },
    { key: "versao", header: "Versão" },
    { key: "situacao", header: "Situação" },
    { key: "origem", header: "Disponibilizado por" },
    { key: "atualizado", header: "Última atualização" },
  ];

  const getExportData = () =>
    filtrados.map((m) => ({
      nome: m.nome,
      tipo: nomeDoTipo(m.tipoDocumento),
      versao: m.versaoAtual ?? "—",
      situacao: m.situacao === "ATIVO" ? "Ativo" : "Inativo",
      origem: origemVisivel(m),
      atualizado: formatarData(m.atualizadoEm),
    }));

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <ListPageHeader
            title="Layouts de Impressão"
            tooltip="Nesta página são criados e organizados os modelos utilizados na geração de contratos, termos, declarações e outros documentos da organização. O conteúdo pode ser personalizado e receber informações automáticas já cadastradas na Aurit."
            objective="Crie e personalize os modelos de documentos utilizados pela organização, inserindo textos, formatações e informações automáticas da Aurit para facilitar a geração de contratos, termos e declarações."
            actions={
              <Button
                type="button"
                variant="glassPrimary"
                className="h-9 gap-2 px-4"
                onClick={() => navigate("/modelos-documento/novo")}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Cadastrar modelo
              </Button>
            }
          />

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel
                htmlFor="buscaModelo"
                tooltip="Pesquise pelo nome do modelo ou pelo título do documento."
              >
                Buscar modelo
              </FieldLabel>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="buscaModelo"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Nome ou título do documento"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>
            <div>
              <FieldLabel
                htmlFor="filtroTipo"
                tooltip="Filtre os modelos pela finalidade do documento."
              >
                Tipo de documento
              </FieldLabel>
              <Select
                value={tipoFiltro}
                onValueChange={(v) => {
                  setTipoFiltro(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="filtroTipo" className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo.valor} value={tipo.valor}>
                      {tipo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel
                htmlFor="filtroSituacao"
                tooltip="Filtre os modelos disponíveis ou indisponíveis para uso."
              >
                Situação
              </FieldLabel>
              <Select
                value={situacaoFiltro}
                onValueChange={(v) => {
                  setSituacaoFiltro(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="filtroSituacao" className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as situações</SelectItem>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTableCard>
            <DataTableToolbar
              total={filtrados.length}
              exportColumns={exportColumns}
              getExportData={getExportData}
              exportFilename="modelos-documento"
            />
            {isLoading ? (
              <div className="px-6 py-14 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : filtrados.length === 0 ? (
              <DataTableEmptyState
                emptyTitle="Nenhum modelo de documento cadastrado"
                emptyDescription="Cadastre o primeiro modelo para gerar contratos, termos e declarações com os dados já registrados na Aurit."
                activeCount={
                  (busca ? 1 : 0) +
                  (tipoFiltro !== "todos" ? 1 : 0) +
                  (situacaoFiltro !== "todas" ? 1 : 0)
                }
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/45 supports-[backdrop-filter]:bg-muted/35">
                        {[
                          "Ações",
                          "Nome",
                          "Tipo",
                          "Origem",
                          "Versão",
                          "Situação",
                          "Última atualização",
                        ].map((coluna) => (
                          <th
                            key={coluna}
                            className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            {coluna}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginados.map((m) => (
                        <tr
                          key={String(m.id)}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                        >
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <RowActionsDropdown
                              onView={() => setPreview(m)}
                              onEdit={
                                m.editavel
                                  ? () =>
                                      navigate(
                                        `/modelos-documento/${m.id}/editar`,
                                      )
                                  : undefined
                              }
                              onDelete={
                                m.editavel
                                  ? () => setConfirmarExclusao(m)
                                  : undefined
                              }
                              extraItems={
                                m.origem === "AURIT"
                                  ? [
                                      {
                                        label: "Usar este modelo",
                                        icon: Copy,
                                        onClick: () =>
                                          navigate(
                                            `/modelos-documento/novo?modeloBase=${m.id}`,
                                          ),
                                      },
                                    ]
                                  : [
                                      {
                                        label:
                                          m.situacao === "ATIVO"
                                            ? "Inativar"
                                            : "Ativar",
                                        icon: Power,
                                        onClick: () =>
                                          situacaoMutation.mutate(m),
                                      },
                                    ]
                              }
                            />
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={m.nome}>
                              {m.nome}
                            </TableCellText>
                          </td>
                          <td className="px-6 py-2.5">
                            <TableCellText text={nomeDoTipo(m.tipoDocumento)}>
                              {nomeDoTipo(m.tipoDocumento)}
                            </TableCellText>
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[12px] font-medium text-muted-foreground">
                            {origemVisivel(m)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                            {m.versaoAtual ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5">
                            <StatusPill
                              status={
                                m.situacao === "ATIVO" ? "Ativo" : "Inativo"
                              }
                              ariaLabelPrefix="Situação do modelo"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-2.5 text-[13px] text-foreground">
                            {formatarData(m.atualizadoEm)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {paginados.map((m) => (
                    <div key={String(m.id)} className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <RowActionsDropdown
                          onView={() => setPreview(m)}
                          onEdit={
                            m.editavel
                              ? () =>
                                  navigate(`/modelos-documento/${m.id}/editar`)
                              : undefined
                          }
                          onDelete={
                            m.editavel
                              ? () => setConfirmarExclusao(m)
                              : undefined
                          }
                          extraItems={
                            m.origem === "AURIT"
                              ? [
                                  {
                                    label: "Usar este modelo",
                                    icon: Copy,
                                    onClick: () =>
                                      navigate(
                                        `/modelos-documento/novo?modeloBase=${m.id}`,
                                      ),
                                  },
                                ]
                              : [
                                  {
                                    label:
                                      m.situacao === "ATIVO"
                                        ? "Inativar"
                                        : "Ativar",
                                    icon: Power,
                                    onClick: () => situacaoMutation.mutate(m),
                                  },
                                ]
                          }
                        />
                        <StatusPill
                          status={m.situacao === "ATIVO" ? "Ativo" : "Inativo"}
                          ariaLabelPrefix="Situação do modelo"
                        />
                      </div>
                      <p className="font-medium text-foreground">{m.nome}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {nomeDoTipo(m.tipoDocumento)} · {origemVisivel(m)} ·
                        Versão {m.versaoAtual ?? "—"}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Última atualização: {formatarData(m.atualizadoEm)}
                      </p>
                    </div>
                  ))}
                </div>

                <DataTablePagination
                  totalItems={filtrados.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  entityLabel="modelo"
                  entityLabelPlural="modelos"
                  pageSizeLabel="Modelos por página"
                />
              </>
            )}
          </DataTableCard>
        </div>
      </div>

      <Dialog
        open={!!preview}
        onOpenChange={(aberto) => !aberto && setPreview(null)}
      >
        <DialogContent className="modelo-preview-glass max-h-[88vh] max-w-3xl overflow-y-auto rounded-[18px]">
          <DialogHeader>
            <DialogTitle>
              {preview?.tituloDocumento || preview?.nome}
            </DialogTitle>
            <DialogDescription>
              Prévia somente leitura do modelo. As variáveis serão substituídas
              pelos dados cadastrados no momento da geração do documento.
            </DialogDescription>
          </DialogHeader>
          <div className="documento-folha-area">
            <div className="documento-folha">
              <div
                className="documento-folha-conteudo"
                dangerouslySetInnerHTML={{ __html: preview?.conteudo || "" }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmarExclusao}
        onOpenChange={(aberto) => !aberto && setConfirmarExclusao(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo de documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Modelos já utilizados na geração de documentos não podem ser
              excluídos — nesse caso, inative o modelo para preservar o
              histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmarExclusao && excluirMutation.mutate(confirmarExclusao)
              }
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <WikiFloatingButton
        pageTitle="Layouts de Impressão"
        href="/wiki/configuracoes/layouts-de-impressao"
      />
    </AppLayout>
  );
}
