export type ImportFieldKind = "enum" | "enum-array" | "relationship" | "relationship-array";

export interface ImportFieldRule {
  targetField?: string;
  kind: ImportFieldKind;
  options?: Array<{ value: string; label?: string }>;
}

export interface ImportApplyWarning {
  field: string;
  value: unknown;
  message: string;
}

export interface ImportApplyResult<T> {
  data: T;
  warnings: ImportApplyWarning[];
  appliedFields: string[];
  preservedFields: string[];
}

export function normalizeComparable(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[\s_-]+/g, "")
    .trim();
}

const BRAZILIAN_STATES_BY_UF: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

export function normalizeBrazilianState(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const byUf = BRAZILIAN_STATES_BY_UF[raw.toLocaleUpperCase("pt-BR")];
  if (byUf) return byUf;
  const normalized = normalizeComparable(raw);
  return Object.values(BRAZILIAN_STATES_BY_UF).find((state) => normalizeComparable(state) === normalized) ?? raw;
}

function isAddressStateField(current: Record<string, unknown>, sourceField: string) {
  if (normalizeComparable(sourceField) === "uf") return "estado" in current;
  if (normalizeComparable(sourceField) !== "estado") return false;
  return ["cep", "cidade", "logradouro", "bairro", "numero", "complemento"]
    .some((field) => field in current);
}

export function isImportValueEmpty(value: unknown): boolean {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0 || value.every(isImportValueEmpty);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(isImportValueEmpty);
  return false;
}

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function comparableItem(value: unknown) {
  if (value && typeof value === "object") {
    return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
  }
  return `${typeof value}:${String(value)}`;
}

function mergeArrays(current: unknown[], imported: unknown[]) {
  const base = current.filter((item) => !isImportValueEmpty(item)).map(clone);
  const seen = new Set(base.map(comparableItem));
  for (const item of imported) {
    if (isImportValueEmpty(item)) continue;
    const key = comparableItem(item);
    if (!seen.has(key)) {
      base.push(clone(item));
      seen.add(key);
    }
  }
  return base;
}

function findOption(value: unknown, options: ImportFieldRule["options"]) {
  const normalized = normalizeComparable(value);
  return options?.find((option) =>
    normalizeComparable(option.value) === normalized || normalizeComparable(option.label) === normalized,
  );
}

function isSafeId(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) || typeof value === "string" && /^\d+$/.test(value.trim());
}

function isAllowedRelationshipId(value: unknown, options: ImportFieldRule["options"]) {
  if (options?.length) return options.some((option) => String(option.value) === String(value));
  return isSafeId(value);
}

function applyRule(field: string, value: unknown, rule: ImportFieldRule, warnings: ImportApplyWarning[]) {
  if (rule.kind === "enum") {
    const option = findOption(value, rule.options);
    if (option) return option.value;
    warnings.push({ field, value, message: `“${String(value)}” não corresponde a uma opção disponível.` });
    return undefined;
  }
  if (rule.kind === "enum-array") {
    const values = Array.isArray(value) ? value : [value];
    const matched: string[] = [];
    for (const item of values) {
      const option = findOption(item, rule.options);
      if (option) matched.push(option.value);
      else warnings.push({ field, value: item, message: `“${String(item)}” não corresponde a uma opção disponível.` });
    }
    return matched;
  }
  if (rule.kind === "relationship") {
    if (isAllowedRelationshipId(value, rule.options)) return String(value);
    warnings.push({ field, value, message: "Relacionamento recebido como texto; selecione-o manualmente." });
    return undefined;
  }
  const values = Array.isArray(value) ? value : [value];
  const ids = values.filter((item) => isAllowedRelationshipId(item, rule.options)).map(String);
  for (const item of values.filter((item) => !isAllowedRelationshipId(item, rule.options))) {
    warnings.push({ field, value: item, message: `“${String(item)}” não é um ID seguro; selecione o relacionamento manualmente.` });
  }
  return ids;
}

function mergeValue(current: unknown, imported: unknown): unknown {
  if (Array.isArray(imported)) {
    return mergeArrays(Array.isArray(current) ? current : [], imported);
  }
  if (imported && typeof imported === "object") {
    if (isImportValueEmpty(current)) return clone(imported);
    if (current && typeof current === "object" && !Array.isArray(current)) {
      const next = { ...(current as Record<string, unknown>) };
      for (const [key, value] of Object.entries(imported as Record<string, unknown>)) {
        next[key] = mergeValue(next[key], value);
      }
      return next;
    }
    return current;
  }
  return isImportValueEmpty(current) ? imported : current;
}

export function applyImportedData<T extends object>(
  current: T,
  imported: Record<string, unknown>,
  rules: Record<string, ImportFieldRule> = {},
): ImportApplyResult<T> {
  const next = clone(current) as Record<string, unknown>;
  const warnings: ImportApplyWarning[] = [];
  const appliedFields: string[] = [];
  const preservedFields: string[] = [];

  for (const [sourceField, rawValue] of Object.entries(imported)) {
    if (rawValue === undefined) continue;
    if (normalizeComparable(sourceField) === "complemento" && typeof rawValue === "string" && /^\s*-\s*$/.test(rawValue)) {
      continue;
    }
    const rule = rules[sourceField];
    const addressState = !rule && isAddressStateField(next, sourceField);
    const targetField = rule?.targetField ?? (addressState ? "estado" : sourceField);
    const value = rule
      ? applyRule(targetField, rawValue, rule, warnings)
      : addressState
        ? normalizeBrazilianState(rawValue)
        : clone(rawValue);
    if (value === undefined || isImportValueEmpty(value)) continue;
    const before = next[targetField];
    const merged = mergeValue(before, value);
    next[targetField] = merged;
    if (comparableItem(before) === comparableItem(merged)) preservedFields.push(targetField);
    else appliedFields.push(targetField);
  }

  return { data: next as T, warnings, appliedFields, preservedFields };
}
