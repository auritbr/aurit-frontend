import { afterEach, describe, expect, it, vi } from "vitest";
import { previewImport } from "@/data/importacoes";

vi.mock("@/lib/apiHeaders", () => ({
  getJsonHeaders: () => ({ "Content-Type": "application/json" }),
  getMultipartHeaders: () => ({}),
}));

afterEach(() => vi.restoreAllMocks());

describe("API de importações", () => {
  it("envia o arquivo somente ao endpoint de prévia no campo arquivo", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ modulo: "participantes", nomeArquivo: "dados.csv", colunasReconhecidas: {}, colunasIgnoradas: [], linhas: [] }), { status: 200 }));
    const file = new File(["nome\nMaria"], "dados.csv", { type: "text/csv" });
    await previewImport("participantes", file);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/importacoes/participantes/preview");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("arquivo")).toBe(file);
  });
});
