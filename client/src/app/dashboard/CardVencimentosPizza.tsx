"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useGetProductsQuery } from "@/state/api";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from "chart.js";

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

interface ProdutoOriginal {
  productId: string;
  name: string;
  expirationDate?: string;
  [key: string]: any;
}

interface ProdutoProcessado extends ProdutoOriginal {
  tag: string;
  cor: string;
  corBg: string;
  diff: number;
  venc: string;
}

interface GrupoCategoria {
  tag: string;
  count: number;
  cor: string;
  corBg: string;
}

const CardVencimentosPizza = () => {
  const { data: products, isLoading } = useGetProductsQuery();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"doughnut"> | null>(null);
  const [filtroTag, setFiltroTag] = useState<string | null>(null);

  const produtosProcessados = useMemo<ProdutoProcessado[]>(() => {
    if (!products) return [];

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return products
      .map((p: ProdutoOriginal) => {
        const dataVenc = p.expirationDate
          ? new Date(`${p.expirationDate.substring(0, 10)}T00:00:00`)
          : null;
        const diff = dataVenc
          ? Math.ceil(
              (dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
            )
          : 999;

        let tag = "Seguro",
          cor = "#2a78d6",
          corBg = "rgba(42,120,214,0.10)";

        if (diff < 0) {
          tag = "Vencido";
          cor = "#f43f5e";
          corBg = "rgba(244,63,94,0.10)";
        } else if (diff <= 7) {
          tag = "Crítico";
          cor = "#fb923c";
          corBg = "rgba(251,146,60,0.10)";
        } else if (diff <= 15) {
          tag = "Atenção";
          cor = "#facc15";
          corBg = "rgba(250,204,21,0.10)";
        } else if (diff <= 30) {
          tag = "Moderado";
          cor = "#34d399";
          corBg = "rgba(52,211,153,0.10)";
        }

        const venc = p.expirationDate
          ? p.expirationDate.substring(0, 10).split("-").reverse().join("/")
          : "—";

        return { ...p, tag, cor, corBg, diff, venc };
      })
      .sort((a, b) => a.diff - b.diff);
  }, [products]);

  const ORDEM_TAGS = ["Vencido", "Crítico", "Atenção", "Moderado", "Seguro"];

  const grupos = useMemo<GrupoCategoria[]>(() => {
    const counts: Record<string, Omit<GrupoCategoria, "tag">> = {};

    produtosProcessados.forEach((p) => {
      if (!counts[p.tag]) {
        counts[p.tag] = { count: 0, cor: p.cor, corBg: p.corBg };
      }
      counts[p.tag].count++;
    });

    return ORDEM_TAGS.filter((tag) => counts[tag]).map((tag) => ({
      tag,
      ...counts[tag],
    }));
  }, [produtosProcessados]);

  const total = produtosProcessados.length;

  const listaExibida = filtroTag
    ? produtosProcessados.filter((p) => p.tag === filtroTag)
    : produtosProcessados;

  useEffect(() => {
    if (!canvasRef.current || grupos.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart<"doughnut">(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: grupos.map((g) => g.tag),
        datasets: [
          {
            data: grupos.map((g) => g.count),
            backgroundColor: grupos.map((g) => g.cor),
            borderWidth: 0,
            hoverOffset: 10,
            spacing: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        animation: {
          animateRotate: true,
          duration: 700,
          easing: "easeInOutQuart",
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: "rgba(17, 24, 39, 0.95)",
            titleColor: "#fff",
            titleFont: { size: 12, weight: "bold" },
            bodyColor: "#d1d5db",
            bodyFont: { size: 11 },
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              title: (items) => grupos[items[0].dataIndex].tag,
              label: (ctx) => {
                const c = ctx.parsed;
                return ` ${c} ${c === 1 ? "produto" : "produtos"}`;
              },
            },
          },
        },
        onClick: (_evt, elements) => {
          if (elements.length > 0) {
            const tag = grupos[elements[0].index]?.tag;
            setFiltroTag((prev) => (prev === tag ? null : (tag ?? null)));
          }
        },
        onHover: (evt: any) => {
          if (evt.native?.target) evt.native.target.style.cursor = "pointer";
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [grupos]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.data.datasets[0].backgroundColor = grupos.map((g) =>
      filtroTag && g.tag !== filtroTag ? g.cor + "30" : g.cor,
    );
    chartRef.current.update("none");
  }, [filtroTag, grupos]);

  if (isLoading) {
    return (
      <div
        aria-hidden="true"
        aria-busy="true"
        className="flex items-center gap-6 h-full w-full animate-pulse"
      >
        <div className="w-[160px] h-[160px] rounded-full bg-gray-200 dark:bg-gray-700/40 shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 rounded-lg bg-gray-100 dark:bg-gray-700/30"
            />
          ))}
        </div>
      </div>
    );
  }

  if (produtosProcessados.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400 dark:text-gray-500 italic">
        Nenhum produto cadastrado para análise.
      </div>
    );
  }

  return (
    <section
      aria-label="Distribuição de Vencimentos do Estoque"
      className="flex flex-col md:flex-row items-center gap-6 h-full w-full"
    >
      <figure
        className="relative w-[160px] h-[160px] shrink-0"
        aria-hidden="true"
      >
        <canvas ref={canvasRef} onMouseLeave={() => {}} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-black text-gray-800 dark:text-white">
            {filtroTag ? grupos.find((g) => g.tag === filtroTag)?.count : total}
          </p>
          <p className="text-[9px] font-bold text-gray-400 uppercase">
            {filtroTag || "Itens"}
          </p>
        </div>
      </figure>

      <div className="flex-1 w-full flex flex-col gap-2 h-full min-h-0">
        <header className="flex items-center justify-between shrink-0">
          <h3
            aria-live="polite"
            className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest"
          >
            {filtroTag ? `Filtrado: ${filtroTag}` : "Todos os produtos"}
          </h3>
          {filtroTag && (
            <button
              onClick={() => setFiltroTag(null)}
              aria-label="Limpar filtro de categoria"
              className="text-[9px] font-bold text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-0.5 rounded-md transition-colors"
            >
              limpar ✕
            </button>
          )}
        </header>

        <div className="flex-1 max-h-[160px] overflow-y-auto pr-1 -mr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          <ul className="flex flex-col gap-2 m-0 p-0 list-none">
            {listaExibida.length === 0 ? (
              <li className="flex items-center justify-center h-20 text-xs text-gray-400 dark:text-gray-500 italic">
                Nenhum produto nesta categoria.
              </li>
            ) : (
              listaExibida.map((p) => (
                <li
                  key={p.productId}
                  className="flex items-center justify-between p-2.5 rounded-lg transition-all border"
                  style={{ background: p.corBg, borderColor: p.cor + "30" }}
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">
                      {p.name}
                    </span>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      venc. {p.venc}
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ml-2"
                    style={{ borderColor: p.cor, color: p.cor }}
                    aria-label={`Status: ${p.tag}`}
                  >
                    {p.tag}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default CardVencimentosPizza;
