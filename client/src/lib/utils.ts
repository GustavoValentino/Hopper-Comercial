import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const validarEAN13 = (codigo: string): boolean => {
  const apenasNumeros = codigo.replace(/\D/g, "");

  if (apenasNumeros.length !== 13) return false;
  if (/^(\d)\1+$/.test(apenasNumeros)) return false;

  let soma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = parseInt(apenasNumeros[i], 10);
    soma += digito * (i % 2 === 0 ? 1 : 3);
  }

  const resto = soma % 10;
  const verificadorCalculado = resto === 0 ? 0 : 10 - resto;

  return verificadorCalculado === parseInt(apenasNumeros[12], 10);
};

/**
 * Validação para produtos internos (Padaria, Açougue, Hortifrúti, Frios, etc.)
 * Aceita:
 * - Códigos curtos digitados na balança: 1 a 6 dígitos numéricos (ex: 57089, 9620, 930)
 * - Códigos de barras gerados na etiqueta da balança: 13 dígitos iniciados por '2'
 */
export const validarPLU = (codigo: string): boolean => {
  const apenasNumeros = codigo.replace(/\D/g, "");
  if (!apenasNumeros) return false;

  const eCodigoCurtoValido =
    apenasNumeros.length >= 1 && apenasNumeros.length <= 6;
  const eEANBalancaValido =
    apenasNumeros.length === 13 && apenasNumeros.startsWith("2");

  return eCodigoCurtoValido || eEANBalancaValido;
};

/**
 * Helper unificado para validar qualquer tipo de código de produto
 */
export const validarCodigoProduto = (
  codigo: string,
  tipo: "EAN" | "PLU",
): boolean => {
  return tipo === "EAN" ? validarEAN13(codigo) : validarPLU(codigo);
};

export const formatarEntradaPeso = (
  value: string,
  unidade: "KG" | "ML_G",
): string => {
  const apenasNumeros = value.replace(/\D/g, "");
  if (!apenasNumeros) return "";

  return unidade === "KG"
    ? (parseFloat(apenasNumeros) / 1000).toFixed(3).replace(".", ",")
    : apenasNumeros;
};

export const formatarQuantidadeBR = (value: string): string => {
  return value.replace(/\D/g, "");
};
