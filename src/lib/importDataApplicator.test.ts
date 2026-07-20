import { describe, expect, it } from "vitest";
import { applyImportedData, normalizeBrazilianState, normalizeComparable } from "@/lib/importDataApplicator";

describe("aplicador global de dados importados", () => {
  it("substitui linhas placeholder por DTOs aninhados e evita duplicatas", () => {
    const current = { objetivos: [{ objetivoEspecifico: "" }] };
    const imported = { objetivos: [
      { objetivoEspecifico: "Incentivar o descarte adequado de pneus." },
      { objetivoEspecifico: "Realizar oficinas de reciclagem." },
    ] };
    const first = applyImportedData(current, imported);
    expect(first.data.objetivos).toEqual(imported.objetivos);
    expect(applyImportedData(first.data, imported).data.objetivos).toHaveLength(2);
  });

  it("normaliza arrays de enums por valor ou label", () => {
    const result = applyImportedData(
      { produtosGerados: [] as string[] },
      { produtosGerados: ["livro", "Documentário", "SITE"] },
      { produtosGerados: { kind: "enum-array", options: [
        { value: "LIVRO", label: "Livro" },
        { value: "DOCUMENTARIO", label: "Documentário" },
        { value: "SITE", label: "Site" },
      ] } },
    );
    expect(result.data.produtosGerados).toEqual(["LIVRO", "DOCUMENTARIO", "SITE"]);
    expect(result.warnings).toEqual([]);
  });

  it("compara enums ignorando acentos, espaços, hífens e underscores", () => {
    expect(normalizeComparable("Altas habilidades_superdotação")).toBe(
      normalizeComparable("ALTAS-HABILIDADES SUPERDOTACAO"),
    );
  });

  it("preserva campos preenchidos e faz merge aditivo de listas", () => {
    const result = applyImportedData(
      { nome: "Digitado", areasAtuacao: ["CULTURA"] },
      { nome: "Importado", areasAtuacao: ["EDUCACAO"] },
    );
    expect(result.data).toEqual({ nome: "Digitado", areasAtuacao: ["CULTURA", "EDUCACAO"] });
  });

  it("mantém enums desconhecidos pendentes em avisos", () => {
    const result = applyImportedData(
      { tipos: [] as string[] },
      { tipos: ["CONHECIDO", "VALOR NOVO"] },
      { tipos: { kind: "enum-array", options: [{ value: "CONHECIDO" }] } },
    );
    expect(result.data.tipos).toEqual(["CONHECIDO"]);
    expect(result.warnings[0]).toMatchObject({ field: "tipos", value: "VALOR NOVO" });
  });

  it("aplica apenas IDs seguros em relacionamentos e avisa sobre nomes", () => {
    const result = applyImportedData(
      { colaboradores: [] as string[] },
      { colaboradoresIds: [12, "Maria", "34"] },
      { colaboradoresIds: { kind: "relationship-array", targetField: "colaboradores" } },
    );
    expect(result.data.colaboradores).toEqual(["12", "34"]);
    expect(result.warnings).toHaveLength(1);
  });

  it("converte UF importada para o nome de estado esperado pelo formulário", () => {
    const result = applyImportedData(
      { logradouro: "", cidade: "", estado: "", cep: "" },
      { logradouro: "Rua A", cidade: "São Paulo", uf: "SP" },
    );
    expect(result.data.estado).toBe("São Paulo");
    expect(result.data).not.toHaveProperty("uf");
  });

  it("reconhece nomes de estados sem acento e não altera campos homônimos fora de endereço", () => {
    expect(normalizeBrazilianState("espirito santo")).toBe("Espírito Santo");
    const result = applyImportedData({ estado: "" }, { estado: "EM_ANDAMENTO" });
    expect(result.data.estado).toBe("EM_ANDAMENTO");
  });

  it("mantém o complemento vazio quando a importação retorna somente hífen", () => {
    const result = applyImportedData(
      { logradouro: "", numero: "", complemento: "" },
      { logradouro: "Rua A", numero: "10", complemento: "-" },
    );
    expect(result.data.complemento).toBe("");
  });
});
