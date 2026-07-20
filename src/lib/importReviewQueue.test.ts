import { beforeEach, describe, expect, it } from "vitest";
import {
  advanceImportReviewQueue,
  clearImportReviewQueue,
  getImportReviewQueue,
  removeCurrentImportReviewItem,
  saveImportReviewQueue,
} from "@/lib/importReviewQueue";

const queue = {
  module: "colaboradores",
  entity: "Colaboradores",
  currentIndex: 0,
  rows: [
    { linha: 2, dados: { nomeCompleto: "Maria" }, avisos: [] },
    { linha: 3, dados: { nomeCompleto: "João" }, avisos: [] },
  ],
};

beforeEach(() => sessionStorage.clear());

describe("fila local de revisão", () => {
  it("armazena apenas no sessionStorage e avança sem persistir no backend", () => {
    saveImportReviewQueue(queue);
    expect(getImportReviewQueue("colaboradores")?.currentIndex).toBe(0);
    expect(advanceImportReviewQueue("colaboradores")?.currentIndex).toBe(1);
    expect(getImportReviewQueue("colaboradores")?.resumeAfterSave).toBe(true);
  });

  it("remove itens e encerra a fila ao concluir o último", () => {
    saveImportReviewQueue(queue);
    expect(removeCurrentImportReviewItem("colaboradores")?.rows).toHaveLength(1);
    expect(advanceImportReviewQueue("colaboradores")).toBeNull();
    expect(getImportReviewQueue("colaboradores")).toBeNull();
    clearImportReviewQueue("colaboradores");
  });
});
