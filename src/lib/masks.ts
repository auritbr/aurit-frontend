export const maskCPF = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const maskCNPJ = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");

export const isValidCNPJ = (value: string): boolean => {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const calculateDigit = (base: string, weights: number[]) => {
    const total = base
      .split("")
      .reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0);
    const remainder = total % 11;

    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateDigit(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const secondDigit = calculateDigit(
    digits.slice(0, 12) + firstDigit,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return digits === `${digits.slice(0, 12)}${firstDigit}${secondDigit}`;
};

export const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
      [a && `(${a})`, b && ` ${b}`, c && `-${c}`].filter(Boolean).join(""),
    );
  return d.replace(/(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
};

export const maskCEP = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");

export const maskDate = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2");

/**
 * RG não possui um padrão nacional único. A máscara abaixo aceita os
 * comprimentos numéricos mais usados pelos estados sem forçar um único
 * formato de nove dígitos.
 */
export const maskRGFlex = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 7) {
    if (digits.length <= 1) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
    return `${digits.slice(0, 1)}-${digits.slice(1, 4)}.${digits.slice(4)}`;
  }
  if (digits.length <= 8) {
    return digits.replace(/^(\d{2})(\d{3})(\d{0,3})$/, (_, a, b, c) =>
      c ? `${a}.${b}.${c}` : `${a}.${b}`,
    );
  }
  if (digits.length === 9) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d)$/, "$1.$2.$3-$4");
  }
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})$/, (_, a, b, c, d) =>
    d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`,
  );
};

export const maskRG = maskRGFlex;

export const maskCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length <= 11 ? maskCPF(digits) : maskCNPJ(digits);
};

export const maskBankAgency = (value: string) => {
  const normalized = value
    .replace(/[^\dXx]/g, "")
    .toUpperCase()
    .slice(0, 5);
  return normalized.length <= 4
    ? normalized
    : `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
};

export const maskBankAccount = (value: string) => {
  const normalized = value
    .replace(/[^\dXx]/g, "")
    .toUpperCase()
    .slice(0, 20);
  return normalized.length <= 1
    ? normalized
    : `${normalized.slice(0, -1)}-${normalized.slice(-1)}`;
};
