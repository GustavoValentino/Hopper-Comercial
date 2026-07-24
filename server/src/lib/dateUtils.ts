// Fuso horário de referência do negócio. Todo cálculo de "hoje" e de dias
// restantes até o vencimento deve respeitar este fuso, e não o fuso
// horário do servidor (que em produção normalmente é UTC).
const TZ = "America/Sao_Paulo";

/**
 * Retorna a data de "hoje" (00:00:00) no fuso horário do Brasil,
 * representada como um Date em UTC "puro" (T00:00:00Z).
 * Isso evita divergência de 1 dia quando o servidor roda em UTC
 * ou em qualquer fuso diferente de America/Sao_Paulo.
 */
export function getHojeNoFusoBrasil(): Date {
  const hojeStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(
    new Date(),
  );
  return new Date(`${hojeStr}T00:00:00Z`);
}

/**
 * Normaliza uma data de vencimento (Date ou string) para meia-noite UTC
 * "pura", descartando qualquer componente de hora. Usar sempre esta
 * função em vez de `new Date(x).setHours(0,0,0,0)`, que zera as horas
 * no fuso local do processo Node e pode deslocar a data em ±1 dia.
 */
export function normalizarDataUTC(data: Date | string): Date {
  const iso = typeof data === "string" ? data : data.toISOString();
  const stringData = iso.substring(0, 10); // "YYYY-MM-DD"
  return new Date(`${stringData}T00:00:00Z`);
}

/**
 * Calcula quantos dias faltam (ou já passaram, se negativo) até a data
 * de vencimento informada, sempre em relação ao "hoje" no fuso do Brasil.
 */
export function calcularDiasRestantes(expirationDate: Date | string): number {
  const hoje = getHojeNoFusoBrasil();
  const venc = normalizarDataUTC(expirationDate);
  return Math.round((venc.getTime() - hoje.getTime()) / 86400000);
}
