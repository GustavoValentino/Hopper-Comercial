"use client";

import React, { useMemo } from "react";
import { useGetDashboardMetricsQuery } from "@/state/api";
import {
  AlertTriangle,
  CalendarClock,
  PackageX,
  LucideIcon,
  ShieldCheck,
} from "lucide-react";

interface ItemAlerta {
  label: string;
  valor: number;
  sufixo: string;
  subtext: string;
  icone: LucideIcon;
  tipo: "vencido" | "proximo" | "critico";
}

interface ProdutoData {
  stockQuantity: number;
  expirationDate?: string;
  [key: string]: any;
}

const CardResumoGeral = () => {
  const { data: dashboardMetrics, isLoading } = useGetDashboardMetricsQuery();
  const produtos: ProdutoData[] = dashboardMetrics?.popularProducts || [];

  const alertas = useMemo<ItemAlerta[]>(() => {
    const LIMITE_CRITICO = 15;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let totalEstoqueCritico = 0;
    let totalVencimentoProximo = 0;
    let totalVencidos = 0;

    produtos.forEach((produto) => {
      // 1. Verificação volumétrica do estoque mínimo
      if (produto.stockQuantity <= LIMITE_CRITICO) {
        totalEstoqueCritico++;
      }

      // 2. Verificação imune a fusos horários da validade
      if (produto.expirationDate) {
        const stringDataPura = produto.expirationDate.substring(0, 10);
        const dataValidade = new Date(`${stringDataPura}T00:00:00`);

        const diferencaTempo = dataValidade.getTime() - hoje.getTime();
        const diferencaDias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

        if (diferencaDias < 0) {
          totalVencidos++;
        } else if (diferencaDias <= 15) {
          totalVencimentoProximo++;
        }
      }
    });

    return [
      {
        label: "Produtos Vencidos",
        valor: totalVencidos,
        sufixo: totalVencidos === 1 ? "item" : "itens",
        subtext: "Retirar da gôndola imediatamente",
        icone: PackageX,
        tipo: "vencido",
      },
      {
        label: "Vencimento Próximo",
        valor: totalVencimentoProximo,
        sufixo: totalVencimentoProximo === 1 ? "lote" : "lotes",
        subtext: "Validades em até 15 dias",
        icone: CalendarClock,
        tipo: "proximo",
      },
      {
        label: "Estoque Crítico",
        valor: totalEstoqueCritico,
        sufixo: totalEstoqueCritico === 1 ? "item" : "itens",
        subtext: "Abaixo do mínimo de segurança",
        icone: AlertTriangle,
        tipo: "critico",
      },
    ];
  }, [produtos]);

  return (
    <section
      aria-label="Resumo Geral de Alertas Operacionais"
      className="bg-gradient-to-b from-slate-50 to-slate-100/80 dark:bg-none dark:bg-gray-800 p-5 rounded-xl border border-gray-100/70 dark:border-gray-700/50 flex flex-col justify-between h-full min-h-[240px] transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:border-gray-200/60 dark:hover:border-gray-600/60"
    >
      {isLoading ? (
        <div
          aria-hidden="true"
          aria-busy="true"
          className="flex flex-col h-full justify-between animate-pulse"
        >
          <div className="space-y-1.5 mb-5">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-1/3" />
            <div className="h-2 bg-gray-100 dark:bg-gray-700/50 rounded-md w-1/2" />
          </div>
          <div className="flex flex-col gap-3 flex-1 justify-center">
            <div className="h-12 bg-gray-100/70 dark:bg-gray-700/30 rounded-lg w-full" />
            <div className="h-12 bg-gray-100/70 dark:bg-gray-700/30 rounded-lg w-full" />
            <div className="h-12 bg-gray-100/70 dark:bg-gray-700/30 rounded-lg w-full" />
          </div>
        </div>
      ) : (
        <>
          <header className="mb-4 flex flex-col">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight">
              Alertas Operacionais
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
              Diagnóstico em tempo real de inconformidades
            </p>
          </header>

          <ul className="flex flex-col gap-3 flex-1 justify-center m-0 p-0 list-none">
            {alertas.map((item, index) => {
              const IconeComponente = item.icone;
              const temItens = item.valor > 0;

              let estiloItem =
                "bg-white/60 border-slate-200/60 text-slate-400 dark:bg-gray-700/20 dark:border-gray-700/40";
              let estiloIcone =
                "bg-slate-100 text-slate-400 dark:bg-gray-700 dark:text-gray-500";

              if (temItens) {
                if (item.tipo === "vencido") {
                  estiloItem =
                    "bg-rose-50/60 border-rose-500/80 text-rose-700 dark:bg-rose-950/20 dark:border-rose-500/50 animate-[pulse_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite]";
                  estiloIcone = "bg-rose-500 text-white shadow-xs";
                } else if (item.tipo === "proximo") {
                  estiloItem =
                    "bg-amber-50/50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30";
                  estiloIcone = "bg-amber-500 text-white shadow-xs";
                } else if (item.tipo === "critico") {
                  estiloItem =
                    "bg-yellow-50/50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/20 dark:border-yellow-900/30";
                  estiloIcone = "bg-yellow-500 text-white shadow-xs";
                }
              }

              return (
                <li
                  key={index}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 hover:scale-[1.01] ${estiloItem}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 flex items-center justify-center transition-all ${estiloIcone}`}
                    >
                      {temItens ? (
                        <IconeComponente
                          className="w-4 h-4"
                          strokeWidth={2.25}
                          aria-hidden="true"
                        />
                      ) : (
                        <ShieldCheck
                          className="w-4 h-4 text-slate-400 dark:text-gray-500"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-xs font-bold leading-tight ${
                          temItens
                            ? "text-gray-800 dark:text-gray-200"
                            : "text-slate-400 dark:text-gray-500 font-medium"
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5 truncate">
                        {temItens ? item.subtext : "Nenhuma anomalia detectada"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    {temItens ? (
                      <span
                        role="status"
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md inline-block ${
                          item.tipo === "vencido"
                            ? "bg-rose-100/60 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                            : item.tipo === "proximo"
                              ? "bg-amber-100/60 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                              : "bg-yellow-100/60 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                        }`}
                      >
                        {item.valor} {item.sufixo}
                      </span>
                    ) : (
                      <span
                        role="status"
                        className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-md inline-block"
                      >
                        Ok
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
};

export default CardResumoGeral;
