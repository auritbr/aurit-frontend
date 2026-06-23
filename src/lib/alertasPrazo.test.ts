import { describe, expect, it } from "vitest";
import type { Emprestimo } from "@/data/emprestimos";
import type { RegistroPresenca } from "@/data/relatorioPresencas";
import {
  daysUntil,
  montarAlertasAusencias,
  montarAlertasEmprestimos,
} from "@/lib/alertasPrazo";

const today = new Date(2026, 5, 23);

function emprestimo(
  id: string,
  dataPrevistaDevolucao: string,
  statusEmprestimo = "EM_ANDAMENTO",
): Emprestimo {
  return {
    id,
    patrimonioId: "1",
    dataEmprestimo: "01/06/2026",
    dataPrevistaDevolucao,
    dataDevolucao: "",
    observacaoEmprestimo: "",
    observacaoDevolucao: "",
    tipoDestinatario: "PARTICIPANTE",
    colaboradorId: "",
    participanteId: "1",
    integranteId: "",
    destinatarioExterno: "",
    estadoConservacao: "NOVO",
    estadoDevolucao: "",
    statusEmprestimo,
    projetoId: "",
    propostaEditalId: "",
    atividadeId: "",
    eventoCulturalId: "",
  };
}

function registro(data: string, status: "PRESENTE" | "AUSENTE"): RegistroPresenca {
  return {
    id: data,
    presencaId: data,
    participanteId: "7",
    participanteNome: "Ana",
    atividadeId: "2",
    atividadeNome: "Dança",
    data,
    status,
  };
}

describe("alertas de prazo", () => {
  it("calcula dias por calendário sem diferença de fuso", () => {
    expect(daysUntil("2026-07-03", today)).toBe(10);
    expect(daysUntil("28/06/2026", today)).toBe(5);
  });

  it("avisa em 10, 5, 0 dias e após o vencimento, exceto devolvidos", () => {
    const resumo = montarAlertasEmprestimos(
      [
        emprestimo("1", "03/07/2026"),
        emprestimo("2", "28/06/2026"),
        emprestimo("3", "23/06/2026"),
        emprestimo("4", "22/06/2026"),
        emprestimo("5", "03/07/2026", "DEVOLVIDO"),
        emprestimo("6", "29/06/2026"),
      ],
      today,
    );

    expect(resumo?.total).toBe(4);
    expect(resumo?.proximos.map((item) => item.dias)).toEqual([5, 10]);
    expect(resumo?.hoje).toHaveLength(1);
    expect(resumo?.vencidos).toHaveLength(1);
  });

  it("gera alerta somente após 3 ausências consecutivas", () => {
    expect(
      montarAlertasAusencias([
        registro("2026-06-23", "AUSENTE"),
        registro("2026-06-30", "AUSENTE"),
        registro("2026-07-04", "AUSENTE"),
      ])[0]?.quantidade,
    ).toBe(3);

    expect(
      montarAlertasAusencias([
        registro("2026-06-23", "AUSENTE"),
        registro("2026-06-30", "PRESENTE"),
        registro("2026-07-04", "AUSENTE"),
      ]),
    ).toEqual([]);
  });

  it("não conta registros duplicados da mesma data como novas ausências", () => {
    expect(
      montarAlertasAusencias([
        registro("2026-06-23", "AUSENTE"),
        registro("2026-06-23", "AUSENTE"),
        registro("2026-06-30", "AUSENTE"),
      ]),
    ).toEqual([]);
  });
});
