import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlertasPrazoNotifier } from "@/components/AlertasPrazoNotifier";

const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("AlertasPrazoNotifier", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mostra o popup na página de presenças para três faltas na turma", async () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    };
    const datas = ["2026-04-07", "2026-04-20", "2026-04-23"];

    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (
          url.endsWith("/emprestimos") ||
          url.endsWith("/patrimonios") ||
          url.endsWith("/editais")
        ) {
          return jsonResponse([]);
        }

        if (url.endsWith("/presencas")) {
          return jsonResponse(
            datas.map((data, index) => ({
              id: index + 1,
              dataPresenca: data,
              atividadeId: 5,
              turmaId: 10,
              participantes: [
                { participanteId: 7, statusPresenca: "AUSENTE" },
                { participanteId: 8, statusPresenca: "PRESENTE" },
              ],
            })),
          );
        }

        if (url.endsWith("/atividades")) {
          return jsonResponse([
            { id: 5, nomeAtividade: "Oficina de Percussão e Cultura Popular" },
          ]);
        }

        if (url.endsWith("/turmas")) {
          return jsonResponse([
            { id: 10, nomeTurma: "Turma Percussão", atividadeId: 5 },
          ]);
        }

        if (url.endsWith("/participantes")) {
          return jsonResponse([
            { id: 7, nomeCompleto: "Ana Beatriz Costa Almeida" },
            { id: 8, nomeCompleto: "Bruno Henrique Lima Martins" },
          ]);
        }

        return new Response(null, { status: 404 });
      }),
    );

    render(
      <MemoryRouter initialEntries={["/presencas"]}>
        <AlertasPrazoNotifier />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ausências consecutivas")).toBeVisible();
    expect(screen.getByText("Ana Beatriz Costa Almeida")).toBeVisible();
    expect(
      screen.getByText("Oficina de Percussão e Cultura Popular · Turma Percussão · 3 ausências"),
    ).toBeVisible();
  });
});
