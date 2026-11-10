import { useEffect, useState } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { REPORT_DATA_INVALIDATED_EVENT } from "@/lib/reportDataInvalidation";
import {
  escopoAnalitico,
  queryAnalitica,
  type FiltroApi,
  type Metrica,
  type Pagina,
} from "@/data/analitico";

export type FiltroCard = { situacoesCard?: string[]; card?: string };
type Resposta<T> = Pagina<T> & { cards: Record<string, Metrica> };

export function useConsultaOperacional<T, R>(
  recurso: string,
  filtros: FiltroApi | null,
  filtroCard: FiltroCard | undefined,
  permitido: boolean,
  mapear: (row: T) => R,
) {
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(25);
  const chaveFiltro = queryAnalitica({ ...filtros, ...filtroCard });
  const [chavePaginacao, setChavePaginacao] = useState(chaveFiltro);
  const atual = chavePaginacao === chaveFiltro ? pagina : 1;
  const tenant = JSON.stringify(escopoAnalitico());
  const client = useQueryClient();
  const habilitado = permitido && filtros !== null;
  const request = (extra: FiltroApi) =>
    apiFetch<Resposta<T>>(
      `/${recurso}${queryAnalitica({ ...filtros, ...extra, dto: true })}`,
    );
  const base = useQuery({
    queryKey: ["operacional", tenant, recurso, filtros, "cards"],
    queryFn: () => request({ pagina: 0, tamanho: 1 }),
    enabled: habilitado && !!filtroCard,
  });
  const consulta = useQuery({
    queryKey: [
      "operacional",
      tenant,
      recurso,
      filtros,
      filtroCard,
      atual,
      tamanho,
    ],
    queryFn: () => request({ ...filtroCard, pagina: atual - 1, tamanho }),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
  const maxPagina = Math.max(
    1,
    Math.ceil((consulta.data?.total ?? 0) / tamanho),
  );
  useEffect(() => {
    if (
      habilitado &&
      consulta.data &&
      !consulta.isPlaceholderData &&
      atual > maxPagina
    ) {
      setChavePaginacao(chaveFiltro);
      setPagina(maxPagina);
    }
  }, [
    habilitado,
    consulta.data,
    consulta.isPlaceholderData,
    atual,
    maxPagina,
    chaveFiltro,
  ]);
  useEffect(() => {
    if (!habilitado) return;
    const invalidar = () =>
      void client.invalidateQueries({
        queryKey: ["operacional", tenant, recurso],
      });
    window.addEventListener(REPORT_DATA_INVALIDATED_EVENT, invalidar);
    return () =>
      window.removeEventListener(REPORT_DATA_INVALIDATED_EVENT, invalidar);
  }, [client, tenant, recurso, habilitado]);
  return {
    habilitado,
    cards: (filtroCard ? base.data?.cards : consulta.data?.cards) ?? {},
    rows: consulta.data?.registros.map(mapear) ?? [],
    total: consulta.data?.total ?? 0,
    loading: consulta.isFetching,
    error: consulta.error ?? base.error,
    currentPage: atual,
    pageSize: tamanho,
    setCurrentPage: (next: number) => {
      setChavePaginacao(chaveFiltro);
      setPagina(next);
    },
    setPageSize: (next: number) => {
      setChavePaginacao(chaveFiltro);
      setTamanho(next);
      setPagina(1);
    },
    atualizar: () =>
      void client.invalidateQueries({
        queryKey: ["operacional", tenant, recurso],
      }),
    carregarExportacao: async () => {
      const primeira = await request({
        ...filtroCard,
        pagina: 0,
        tamanho: 200,
      });
      const rows = [...primeira.registros];
      for (
        let pagina = 1;
        pagina * primeira.tamanho < primeira.total;
        pagina++
      ) {
        const parte = await request({
          ...filtroCard,
          pagina,
          tamanho: primeira.tamanho,
        });
        rows.push(...parte.registros);
      }
      return rows.map(mapear);
    },
  };
}
