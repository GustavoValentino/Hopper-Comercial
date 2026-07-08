"use client";

import React, { useMemo } from "react";
import { useGetDashboardMetricsQuery } from "@/state/api";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

interface ProdutoData {
  expirationDate?: string;
  [key: string]: any;
}

const CardAlertaVencimento = () => {
  const { data: dashboardMetrics, isLoading } = useGetDashboardMetricsQuery();
  const produtos: ProdutoData[] = dashboardMetrics?.popularProducts || [];

  const { graficoData, totalCriticos } = useMemo(() => {
    let ate7Dias = 0;
    let de8a15Dias = 0;
    let de16a30Dias = 0;
    let proximoMes = 0;
    let emDia = 0;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    produtos.forEach((produto) => {
      if (!produto.expirationDate) return;

      const stringDataPura = produto.expirationDate.substring(0, 10);
      const dataValidade = new Date(`${stringDataPura}T00:00:00`);

      const diferencaTempo = dataValidade.getTime() - hoje.getTime();
      const diferencaDias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

      if (diferencaDias <= 7) {
        ate7Dias++;
      } else if (diferencaDias <= 15) {
        de8a15Dias++;
      } else if (diferencaDias <= 30) {
        de16a30Dias++;
      } else if (diferencaDias <= 60) {
        proximoMes++;
      } else {
        emDia++;
      }
    });

    return {
      graficoData: [
        { periodo: "Até 7 dias", lotes: ate7Dias, color: "#f43f5e" },
        { periodo: "8 a 15 dias", lotes: de8a15Dias, color: "#f59e0b" },
        { periodo: "16 a 30 dias", lotes: de16a30Dias, color: "#eab308" },
        { periodo: "Próx. Mês", lotes: proximoMes, color: "#3b82f6" },
        { periodo: "Em dia", lotes: emDia, color: "#006938" },
      ],
      totalCriticos: ate7Dias + de8a15Dias + de16a30Dias,
    };
  }, [produtos]);

  return (
    <section
      aria-label="Cronograma de Vencimentos do Estoque"
      className="flex flex-col justify-between h-full bg-white dark:bg-gray-800 border border-gray-100/70 dark:border-gray-700/50 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:border-gray-200/60 dark:hover:border-gray-600/60"
    >
      {isLoading ? (
        <div
          className="flex flex-col h-full justify-between animate-pulse p-6 gap-6"
          aria-hidden="true"
          aria-busy="true"
        >
          <div className="flex justify-between items-center">
            <div className="space-y-2 w-1/3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-2 bg-gray-100 dark:bg-gray-700/60 rounded w-2/3" />
            </div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
          <div className="h-10 bg-gray-50 dark:bg-gray-700/30 rounded-xl w-1/2 mt-2" />
          <div className="flex-1 flex items-end justify-around gap-4 min-h-[220px] pt-8">
            <div className="bg-gray-200 dark:bg-gray-700 w-8 h-[25%] rounded-t-md" />
            <div className="bg-gray-200 dark:bg-gray-700 w-8 h-[50%] rounded-t-md" />
            <div className="bg-gray-200 dark:bg-gray-700 w-8 h-[70%] rounded-t-md" />
            <div className="bg-gray-200 dark:bg-gray-700 w-8 h-[40%] rounded-t-md" />
            <div className="bg-gray-200 dark:bg-gray-700 w-8 h-[90%] rounded-t-md" />
          </div>
        </div>
      ) : (
        <>
          <header className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-700/50">
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                Cronograma de Vencimentos
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                Mapeamento temporal das validades do estoque
              </p>
            </div>
            <span
              className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-600/30 px-2.5 py-1 rounded-md uppercase tracking-wider"
              aria-label="Atualizado em tempo real"
            >
              Real-time
            </span>
          </header>

          <div className="px-6 mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Atenção nos Próximos 30 dias
              </h3>
              <div className="flex items-baseline mt-1 gap-2">
                <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                  {totalCriticos}
                </p>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 pb-1">
                  {totalCriticos === 1
                    ? "produto sob risco"
                    : "produtos sob risco"}
                </p>
              </div>
            </div>

            <div
              role="alert"
              aria-live="polite"
              className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border ${
                totalCriticos === 0
                  ? "bg-green-50/50 text-green-700 border-green-100/60 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30"
                  : "bg-amber-50/50 text-amber-700 border-amber-100/60 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
              }`}
            >
              {totalCriticos === 0 ? (
                <>
                  <CheckCircle2
                    className="w-4 h-4 shrink-0 text-green-600 dark:text-green-400"
                    aria-hidden="true"
                  />
                  <span>Estoque 100% seguro contra perdas temporais.</span>
                </>
              ) : (
                <>
                  <AlertTriangle
                    className="w-4 h-4 shrink-0 text-amber-500 animate-pulse"
                    aria-hidden="true"
                  />
                  <span>Lotes críticos exigem triagem para exportação.</span>
                </>
              )}
            </div>
          </div>

          <figure className="flex-1 min-h-[220px] mt-6 px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={graficoData}
                margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                accessibilityLayer
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="periodo"
                  tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc", opacity: 0.8 }}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(8px)",
                    borderRadius: "12px",
                    border: "1px solid #f1f5f9",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.03)",
                  }}
                  itemStyle={{ fontSize: "12px", fontWeight: 700 }}
                  labelStyle={{
                    color: "#94a3b8",
                    fontWeight: 600,
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                  formatter={(value: number) => [
                    `${value} ${value === 1 ? "lote" : "lotes"}`,
                    "Volume",
                  ]}
                />
                <Bar dataKey="lotes" barSize={32} radius={[6, 6, 0, 0]}>
                  {graficoData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="transition-all duration-200 hover:opacity-80 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-400"
                      tabIndex={0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </figure>
        </>
      )}
    </section>
  );
};

export default CardAlertaVencimento;
