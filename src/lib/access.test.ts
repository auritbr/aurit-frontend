import { describe, expect, it } from "vitest";

import { isPlanoAccessDenied } from "@/lib/access";

describe("isPlanoAccessDenied", () => {
  it("recognizes backend plan-block messages", () => {
    expect(
      isPlanoAccessDenied("Este módulo está disponível apenas no plano pago"),
    ).toBe(true);
  });

  it("keeps unrelated errors outside plan access denial", () => {
    expect(isPlanoAccessDenied("Não foi possível carregar os dados.")).toBe(
      false,
    );
  });
});
