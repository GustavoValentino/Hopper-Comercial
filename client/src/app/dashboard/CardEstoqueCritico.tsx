"use client";

import React, { useState, useMemo } from "react";
import { useGetDashboardMetricsQuery } from "@/state/api";
import { AlertTriangle, Package2 } from "lucide-react";

interface ProdutoCritico {
  productId: string;
  name: string;
  stockQuantity: number;
  imageUrl?: string;
  image?: string; // Fallback legadp
  [key: string]: any;
}

const obterIniciais = (nome: string) => {
  if (!nome) return "";
  return nome
    .split(" ")
    .slice(0, 2)
    .map((palavra) => palavra.charAt(0))
    .join("")
    .toUpperCase();
};

const CardEstoqueCritico = () => {
  const { data: dashboardMetrics, isLoading } = useGetDashboardMetricsQuery();
  const [imagensQuebradas, setImagensQuebradas] = useState<
    Record<string, boolean>
  >({});

  const produtosCriticos = useMemo(() => {
    const produtos: ProdutoCritico[] = dashboardMetrics?.popularProducts || [];
    return produtos.filter((p) => p.stockQuantity <= 20).slice(0, 4);
  }, [dashboardMetrics?.popularProducts]);

  const handleImageError = (productId: string) => {
    setImagensQuebradas((prev) => ({ ...prev, [productId]: true }));
  };

  return (
    <section
      aria-label="Alerta de Estoque Crítico"
      className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100/70 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:border-gray-200/60 dark:hover:border-gray-600/60 flex flex-col justify-between h-full"
    >
      <div>
        <header className="flex justify-between items-start mb-5">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-1.5">
              <AlertTriangle
                className="w-4 h-4 text-rose-500 shrink-0"
                strokeWidth={2.25}
                aria-hidden="true"
              />
              Estoque Crítico
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
              Itens abaixo do ponto de segurança
            </p>
          </div>

          {produtosCriticos.length > 0 && (
            <span
              role="status"
              className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/40 px-2.5 py-0.5 rounded-full animate-pulse tracking-wide uppercase"
            >
              Ruptura
            </span>
          )}
        </header>

        <div className="flex flex-col gap-4.5">
          {isLoading ? (
            <div
              aria-hidden="true"
              aria-busy="true"
              className="flex flex-col gap-4.5"
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 animate-pulse"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
                      <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-12" />
                    </div>
                    <div className="h-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-full w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : produtosCriticos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50/50 dark:bg-gray-700/20 rounded-xl border border-dashed border-gray-100 dark:border-gray-700/60">
              <Package2
                className="w-6 h-6 text-gray-300 dark:text-gray-600 mb-1.5"
                aria-hidden="true"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium italic">
                Nível de estoque seguro em toda a rede.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4.5 m-0 p-0 list-none">
              {produtosCriticos.map((produto) => {
                const porcentagemEstoque = Math.min(
                  (produto.stockQuantity / 60) * 100,
                  100,
                );
                const urlImagemReal = produto.imageUrl || produto.image;
                const hasImageError = imagensQuebradas[produto.productId];

                return (
                  <li
                    key={produto.productId}
                    className="flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center shrink-0 shadow-xs relative transition-transform group-hover:scale-102 duration-200">
                      {urlImagemReal && !hasImageError ? (
                        <img
                          src={urlImagemReal}
                          alt={`Imagem do produto ${produto.name}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={() => handleImageError(produto.productId)}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="text-[11px] font-black text-gray-400 dark:text-gray-500 font-mono tracking-wider select-none"
                        >
                          {obterIniciais(produto.name)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1.5">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate pr-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors duration-150">
                          {produto.name}
                        </p>
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 shrink-0 font-mono bg-rose-50/60 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">
                          {produto.stockQuantity} un
                        </span>
                      </div>

                      <div
                        role="progressbar"
                        aria-label={`Nível de estoque atual: ${produto.stockQuantity} unidades`}
                        aria-valuenow={produto.stockQuantity}
                        aria-valuemin={0}
                        aria-valuemax={60}
                        className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden"
                      >
                        <div
                          className="bg-gradient-to-r from-rose-500 to-amber-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${porcentagemEstoque}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default CardEstoqueCritico;
