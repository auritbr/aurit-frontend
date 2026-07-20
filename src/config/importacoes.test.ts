import { describe, expect, it } from "vitest";
import { IMPORT_MODULE_CONFIGS, getImportConfigForPath } from "@/config/importacoes";

describe("configuração central de importações", () => {
  it("contém todos os módulos habilitados previstos", () => {
    expect(IMPORT_MODULE_CONFIGS).toHaveLength(29);
    expect(new Set(IMPORT_MODULE_CONFIGS.map((item) => item.module)).size).toBe(29);
  });

  it("habilita listagem, criação e edição, mas não visualização", () => {
    expect(getImportConfigForPath("/participantes")?.module).toBe("participantes");
    expect(getImportConfigForPath("/participantes/novo")?.module).toBe("participantes");
    expect(getImportConfigForPath("/participantes/42/editar")?.module).toBe("participantes");
    expect(getImportConfigForPath("/participantes/42")).toBeUndefined();
    expect(getImportConfigForPath("/relatorios/participantes")).toBeUndefined();
  });

  it("não inventa valores padrão durante a transformação", () => {
    const participantes = IMPORT_MODULE_CONFIGS.find((item) => item.module === "participantes");
    expect(participantes?.transform?.({ nomeCompleto: "Maria" })).toEqual({ nomeCompleto: "Maria" });
  });
});
