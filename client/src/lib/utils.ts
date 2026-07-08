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
