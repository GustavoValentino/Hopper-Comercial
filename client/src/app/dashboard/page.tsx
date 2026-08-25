"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useGetDashboardMetricsQuery } from "@/state/api";
import { useAppSelector } from "@/app/redux";
import Link from "next/link";
import {
  FileSpreadsheet,
  Download,
  PackageIcon,
  Flame,
  CheckCircle2,
  ArrowRight,
  ImageOff,
  ChevronDownIcon,
  Check,
  Barcode,
} from "lucide-react";
import CardEstoqueCritico from "./CardEstoqueCritico";
import CardAlertaVencimento from "./CardAlertaVencimento";
import CardResumoGeral from "./CardResumoGeral";
import CardVencimentosPizza from "./CardVencimentosPizza";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";

const LIMITE_CRITICO = 15;

const carregarImagemBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Erro no contexto do Canvas");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
};

const formatarDataTabela = (isoString: string) => {
  if (!isoString) return "—";
  const stringDataPura = isoString.substring(0, 10);
  const dataObj = new Date(`${stringDataPura}T00:00:00`);
  if (isNaN(dataObj.getTime())) return "—";
  return dataObj.toLocaleDateString("pt-BR");
};

const formatarPesoMetrico = (
  pesoNumerico: number | undefined | null,
  unidade: string | undefined | null,
): string => {
  if (
    pesoNumerico === undefined ||
    pesoNumerico === null ||
    pesoNumerico === 0
  ) {
    return "0,000 kg";
  }
  if (unidade === "ML_G") {
    return `${Math.round(pesoNumerico * 1000)} ml`;
  }
  return `${pesoNumerico.toFixed(3).replace(".", ",")} kg`;
};

const getUrgenciaLabel = (dias: number) => {
  if (dias < 0)
    return {
      texto: `Vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`,
      classes:
        "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
    };
  if (dias === 0)
    return {
      texto: "Vence hoje",
      classes:
        "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
    };
  if (dias === 1)
    return {
      texto: "Vence amanhã",
      classes:
        "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400",
    };
  if (dias <= 5)
    return {
      texto: `Vence em ${dias} dias`,
      classes:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    };
  return {
    texto: `Vence em ${dias} dias`,
    classes: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  };
};

const Dashboard = () => {
  const { data: dashboardMetrics, isLoading: isLoadingMetrics } =
    useGetDashboardMetricsQuery();
  const produtos = dashboardMetrics?.popularProducts || [];
  const user = useAppSelector((state) => state.auth.user);

  const [formattedDate, setFormattedDate] = useState("");
  const [isDateLoading, setIsDateLoading] = useState(true);
  const [isModalAberto, setIsModalAberto] = useState(false);

  // Estados de filtro
  const [filtroExportacao, setFiltroExportacao] = useState("todos");
  const [filtroCategoriaExportacao, setFiltroCategoriaExportacao] =
    useState("TODAS");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const [imagensComErro, setImagensComErro] = useState<Set<string>>(new Set());
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const marcarErroImagem = (id: string) =>
    setImagensComErro((prev) => new Set(prev).add(id));

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    const dateText = new Date().toLocaleDateString("pt-BR", options);
    setFormattedDate(dateText.charAt(0).toUpperCase() + dateText.slice(1));
    setIsDateLoading(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const categoriasDisponiveis = useMemo(() => {
    const cats = produtos.map((p) => p.category).filter(Boolean);
    return ["TODAS", ...Array.from(new Set(cats))];
  }, [produtos]);

  const obterLotesFiltrados = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const itensProcessados: any[] = [];

    produtos.forEach((produto) => {
      const atendeCategoria =
        filtroCategoriaExportacao === "TODAS" ||
        produto.category === filtroCategoriaExportacao;

      if (!atendeCategoria) return;

      const lotes =
        produto.lotes && Array.isArray(produto.lotes) ? produto.lotes : [];

      if (lotes.length === 0) {
        let diferencaDias: number | null = null;
        if (produto.expirationDate) {
          const stringDataPura = produto.expirationDate.substring(0, 10);
          const dataValidade = new Date(`${stringDataPura}T00:00:00`);
          diferencaDias = Math.ceil(
            (dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
          );
        }

        let atendeStatus = true;
        if (filtroExportacao === "vencidos") {
          atendeStatus = diferencaDias !== null && diferencaDias < 0;
        } else if (filtroExportacao === "criticos") {
          atendeStatus = (produto.stockQuantity ?? 0) <= LIMITE_CRITICO;
        } else if (filtroExportacao === "proximos") {
          atendeStatus =
            diferencaDias !== null && diferencaDias >= 0 && diferencaDias <= 15;
        }

        if (atendeStatus) {
          itensProcessados.push({
            ...produto,
            loteAtualId: "sem-lote",
            lotNumber: "Sem Lote",
            stockQuantity: produto.stockQuantity ?? 0,
            expirationDate: produto.expirationDate,
            diferencaDias,
          });
        }
      } else {
        lotes.forEach((lote) => {
          let diferencaDias: number | null = null;
          if (lote.expirationDate) {
            const stringDataPura = lote.expirationDate.substring(0, 10);
            const dataValidade = new Date(`${stringDataPura}T00:00:00`);
            diferencaDias = Math.ceil(
              (dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
            );
          }

          let atendeStatus = true;
          if (filtroExportacao === "vencidos") {
            atendeStatus = diferencaDias !== null && diferencaDias < 0;
          } else if (filtroExportacao === "criticos") {
            atendeStatus = (lote.stockQuantity ?? 0) <= LIMITE_CRITICO;
          } else if (filtroExportacao === "proximos") {
            atendeStatus =
              diferencaDias !== null &&
              diferencaDias >= 0 &&
              diferencaDias <= 15;
          }

          if (atendeStatus) {
            itensProcessados.push({
              ...produto,
              loteAtualId: lote.loteId || lote.lotNumber,
              lotNumber: lote.lotNumber || "Lote Principal",
              stockQuantity: lote.stockQuantity ?? 0,
              expirationDate: lote.expirationDate,
              diferencaDias,
            });
          }
        });
      }
    });

    return itensProcessados;
  }, [produtos, filtroExportacao, filtroCategoriaExportacao]);

  const produtosParaVisualizar = obterLotesFiltrados.slice(0, 5);
  const userName = user?.name || user?.email?.split("@")[0] || "Operador";

  const produtosParaRebaixa = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return produtos
      .map((produto) => {
        if (!produto.lotes || produto.lotes.length === 0) return null;

        const lotesComDias = produto.lotes
          .map((lote) => {
            if (!lote.expirationDate) return null;
            const stringDataPura = lote.expirationDate.substring(0, 10);
            const dataValidade = new Date(`${stringDataPura}T00:00:00`);
            const dias = Math.ceil(
              (dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
            );
            return { lote, dias };
          })
          .filter(
            (
              item,
            ): item is { lote: (typeof produto.lotes)[number]; dias: number } =>
              item !== null,
          );

        const lotesCriticos = lotesComDias.filter((item) => item.dias <= 15);

        if (lotesCriticos.length === 0) return null;

        lotesCriticos.sort((a, b) => a.dias - b.dias);
        const maisUrgente = lotesCriticos[0];

        return {
          produto,
          loteAtivo: maisUrgente.lote,
          dias: maisUrgente.dias,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.dias - b.dias);
  }, [produtos]);

  const handleConfirmarExportacao = async () => {
    if (obterLotesFiltrados.length === 0) {
      alert(
        "Não há registros correspondentes aos filtros selecionados para exportação.",
      );
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const cores = {
      verde: [0, 105, 56] as [number, number, number],
      verdeEscuro: [0, 77, 41] as [number, number, number],
      branco: [255, 255, 255] as [number, number, number],
      cinzaEscuro: [51, 51, 51] as [number, number, number],
      cinzaClaro: [245, 247, 250] as [number, number, number],
    };

    doc.setFillColor(...cores.verde);
    doc.rect(0, 0, 210, 38, "F");
    doc.setFillColor(...cores.verdeEscuro);
    doc.rect(140, 0, 70, 38, "F");

    try {
      const logoUrl =
        "https://res.cloudinary.com/rz9e24ny/image/upload/v1783305928/hopper_icon_tight_hvpesz.svg";
      const logoBase64 = await carregarImagemBase64(logoUrl);
      doc.addImage(logoBase64, "PNG", 14, 8, 18, 18);
    } catch {
      doc.setFillColor(...cores.branco);
      doc.setDrawColor(...cores.branco);
      doc.roundedRect(14, 8, 18, 18, 3, 3, "S");
      doc.setTextColor(...cores.branco);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("H", 22, 20.5, { align: "center" });
    }

    doc.setTextColor(...cores.branco);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Hopper", 36, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(200, 230, 210);
    doc.text("Sistema de Controle de Estoque e Validades", 36, 23);

    doc.setFillColor(0, 180, 100);
    doc.rect(0, 38, 210, 1.2, "F");

    doc.setFillColor(...cores.cinzaClaro);
    doc.rect(0, 39.2, 210, 26, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...cores.cinzaEscuro);
    doc.text("Relatório Analítico de Produtos", 14, 47);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Escopo de Status: ${filtroExportacao.toUpperCase()} | Categoria: ${filtroCategoriaExportacao.toUpperCase()}`,
      14,
      53,
    );

    const dataEmissao = `${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Emitido por: ${userName}`, 210 - 14, 47, { align: "right" });
    doc.text(`Data: ${dataEmissao}`, 210 - 14, 53, { align: "right" });

    doc.setDrawColor(220, 220, 220);
    doc.line(14, 65.2, 196, 65.2);

    const imagensBase64: Record<string, string | null> = {};
    await Promise.all(
      obterLotesFiltrados.map(async (p) => {
        if (p.imageUrl && !imagensBase64[p.productId]) {
          try {
            imagensBase64[p.productId] = await carregarImagemBase64(p.imageUrl);
          } catch {
            imagensBase64[p.productId] = null;
          }
        }
      }),
    );

    const colunasTabela = [
      "Foto",
      "Produto",
      "Código",
      "Lote",
      "Categoria",
      "Quantidade",
      "Validade",
    ];

    const linhasTabela = obterLotesFiltrados.map((p) => {
      const pesoFormatado = formatarPesoMetrico(p.weight, p.unit);
      return [
        "",
        `${p.name} (${pesoFormatado})`,
        p.barcode || p.sku || "—",
        p.lotNumber || "—",
        p.category || "—",
        `${p.stockQuantity ?? 0} un`,
        formatarDataTabela(p.expirationDate ?? ""),
      ];
    });

    autoTable(doc, {
      head: [colunasTabela],
      body: linhasTabela,
      startY: 68,
      theme: "striped",
      headStyles: {
        fillColor: cores.verde,
        textColor: cores.branco,
        fontSize: 8.5,
        fontStyle: "bold",
        halign: "left",
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: cores.cinzaEscuro,
        cellPadding: 3.5,
        minCellHeight: 14,
      },
      columnStyles: {
        0: { cellWidth: 16, halign: "center" },
        2: { cellWidth: 28, halign: "center", font: "courier" },
      },
      alternateRowStyles: { fillColor: cores.cinzaClaro },
      margin: { top: 68, right: 14, bottom: 22, left: 14 },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const item = obterLotesFiltrados[data.row.index];
          const imgBase64 = item ? imagensBase64[item.productId] : null;

          if (imgBase64) {
            const tamanho = 10;
            const x = data.cell.x + (data.cell.width - tamanho) / 2;
            const y = data.cell.y + (data.cell.height - tamanho) / 2;
            try {
              doc.addImage(imgBase64, "PNG", x, y, tamanho, tamanho);
            } catch {
              // noop
            }
          }
        }
      },
      didDrawPage: (data) => {
        const pageH = doc.internal.pageSize.height;
        doc.setFillColor(...cores.verde);
        doc.rect(0, pageH - 14, 210, 14, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...cores.branco);
        doc.text(
          "Hopper · Sistema de Controle de Estoque e Validades",
          14,
          pageH - 5.5,
        );
        doc.text(
          `Página ${data.pageNumber} de ${doc.getNumberOfPages()}`,
          210 - 14,
          pageH - 5.5,
          { align: "right" },
        );
      },
    });

    const dataSlug = new Date().toISOString().slice(0, 10);
    doc.save(
      `hopper_relatorio_lotes_${filtroExportacao}_${filtroCategoriaExportacao.toLowerCase()}_${dataSlug}.pdf`,
    );
    setIsModalAberto(false);
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100/70 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:border-gray-200/60 dark:hover:border-gray-600/60 min-h-[380px] flex flex-col justify-between">
          <div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Olá, {userName}! 👋
              </h1>
              {isDateLoading ? (
                <div
                  className="h-3 w-32 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mt-1.5"
                  aria-hidden="true"
                />
              ) : (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-1 animate-in fade-in duration-300">
                  {formattedDate}
                </p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60 flex flex-col">
              <div className="flex items-center gap-1.5 mb-3">
                {!isLoadingMetrics && produtosParaRebaixa.length > 0 && (
                  <>
                    <Flame
                      className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-black text-rose-600 dark:text-rose-400 tracking-tight truncate">
                      Peça a rebaixa agora mesmo!
                    </p>
                  </>
                )}
              </div>

              {isLoadingMetrics ? (
                <div className="space-y-2 flex-1">
                  <div className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                  <div className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                </div>
              ) : produtosParaRebaixa.length > 0 ? (
                <>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">
                    {produtosParaRebaixa.length}{" "}
                    {produtosParaRebaixa.length === 1
                      ? "produto identificado"
                      : "produtos identificados"}
                  </p>

                  <div className="flex flex-col gap-2 overflow-y-auto max-h-[170px] pr-1 -mr-1">
                    {produtosParaRebaixa
                      .slice(0, 4)
                      .map(({ produto, dias }) => {
                        const urgencia = getUrgenciaLabel(dias);
                        const semImagem =
                          !produto.imageUrl ||
                          imagensComErro.has(produto.productId);

                        return (
                          <div
                            key={produto.productId}
                            className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/40 rounded-xl p-2"
                          >
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                              {!semImagem ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={produto.imageUrl!}
                                  alt={produto.name}
                                  className="w-full h-full object-cover"
                                  onError={() =>
                                    marcarErroImagem(produto.productId)
                                  }
                                />
                              ) : (
                                <ImageOff
                                  className="w-4 h-4 text-gray-300 dark:text-gray-600"
                                  aria-hidden="true"
                                />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate"
                                title={produto.name}
                              >
                                {produto.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span
                                  className={`inline-block text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md ${urgencia.classes}`}
                                >
                                  {urgencia.texto}
                                </span>
                                {produto.category && (
                                  <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500">
                                    · {produto.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                    <CheckCircle2
                      className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
                      Tudo sob controle
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Nenhum produto está próximo da janela limite de 15 dias.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 flex items-center justify-end gap-2 shrink-0">
            <Dialog open={isModalAberto} onOpenChange={setIsModalAberto}>
              <DialogTrigger asChild>
                <button
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                  aria-label="Abrir modal de geração de relatório PDF"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                  Gerar Relatório
                </button>
              </DialogTrigger>

              <DialogContent className="w-[95vw] sm:max-w-[780px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 sm:p-6 shadow-2xl rounded-2xl transition-colors [&>button]:text-gray-500 [&>button]:dark:text-gray-400 [&>button]:hover:text-gray-800 [&>button]:dark:hover:text-gray-200 [&>button]:hover:bg-gray-100 [&>button]:dark:hover:bg-gray-800 [&>button]:rounded-lg [&>button]:transition-colors">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">
                    Configurar Exportação de Dados
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-400 dark:text-gray-500">
                    Filtre os produtos por status de criticidade e departamento
                  </DialogDescription>
                </DialogHeader>

                <div className="my-3 sm:my-4 space-y-4">
                  {/* Filtro por Status */}
                  <div>
                    <span
                      className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2"
                      id="filtro-label"
                    >
                      1. Status / Criticidade:
                    </span>
                    <div
                      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                      role="group"
                      aria-labelledby="filtro-label"
                    >
                      {[
                        { id: "todos", label: "Tudo" },
                        { id: "vencidos", label: "Vencidos" },
                        { id: "proximos", label: "Próx. 15 dias" },
                        { id: "criticos", label: "Estoque Crítico" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setFiltroExportacao(opt.id)}
                          aria-pressed={filtroExportacao === opt.id}
                          className={`px-3 py-2 text-xs font-bold border rounded-lg transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006938] ${
                            filtroExportacao === opt.id
                              ? "bg-[#006938] text-white border-[#006938] shadow-sm"
                              : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtro por Categoria */}
                  <div className="relative" ref={categoryDropdownRef}>
                    <span
                      className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2"
                      id="categoria-label"
                    >
                      2. Categoria / Departamento:
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                      }
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100/70 dark:hover:bg-gray-800 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#006938]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <PackageIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {filtroCategoriaExportacao === "TODAS"
                            ? "Todas as Categorias (Geral)"
                            : filtroCategoriaExportacao.toUpperCase()}
                        </span>
                      </div>
                      <ChevronDownIcon
                        className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-300 ${
                          isCategoryDropdownOpen
                            ? "transform rotate-180 text-[#006938]"
                            : ""
                        }`}
                      />
                    </button>

                    {isCategoryDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700/60">
                          Selecione o Corredor
                        </div>
                        <div className="max-h-48 overflow-y-auto px-1 py-1 space-y-0.5 custom-scrollbar">
                          {categoriasDisponiveis.map((cat) => {
                            const isSelected =
                              filtroCategoriaExportacao === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setFiltroCategoriaExportacao(cat);
                                  setIsCategoryDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-[#006938] dark:text-emerald-400"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                }`}
                              >
                                <span className="truncate">
                                  {cat === "TODAS"
                                    ? "Todas as Categorias (Geral)"
                                    : cat.toUpperCase()}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-[#006938] dark:text-emerald-400 shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bloco de Prévia Estruturado e Sofisticado */}
                <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-gray-50/50 dark:bg-gray-800/20">
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Prévia dos Produtos Filtrados
                    </span>
                    <span
                      className="text-[10px] font-bold text-[#006938] dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full"
                      aria-live="polite"
                    >
                      {obterLotesFiltrados.length}{" "}
                      {obterLotesFiltrados.length === 1
                        ? "lote encontrado"
                        : "lotes encontrados"}
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-[220px] custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[620px]">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50/80 dark:bg-gray-900/40">
                          <th className="py-2.5 px-3 w-[35%]">Produto</th>
                          <th className="py-2.5 px-3 w-[22%]">Cód. Barras</th>
                          <th className="py-2.5 px-3 w-[15%]">Lote</th>
                          <th className="py-2.5 px-3 w-[13%]">Qtd</th>
                          <th className="py-2.5 px-3 w-[15%]">Validade</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-gray-700 dark:text-gray-300 divide-y divide-gray-100 dark:divide-gray-800/50">
                        {produtosParaVisualizar.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-6 text-center text-gray-400 dark:text-gray-500 italic text-xs"
                            >
                              Nenhum lote corresponde aos filtros selecionados.
                            </td>
                          </tr>
                        ) : (
                          produtosParaVisualizar.map((p, index) => (
                            <tr
                              key={`${p.productId}-${p.loteAtualId || index}`}
                              className="hover:bg-gray-100/60 dark:hover:bg-gray-800/30 transition-colors"
                            >
                              {/* Coluna Produto */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xs shrink-0 flex items-center justify-center">
                                    {p.imageUrl ? (
                                      <img
                                        src={p.imageUrl}
                                        alt={`Foto de ${p.name}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <PackageIcon className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className="font-bold text-gray-800 dark:text-gray-200 truncate text-xs leading-snug"
                                      title={p.name}
                                    >
                                      {p.name}
                                    </p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                      {formatarPesoMetrico(p.weight, p.unit)}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Coluna Código de Barras */}
                              <td className="py-2.5 px-3">
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 max-w-full">
                                  <Barcode className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="font-mono text-[11px] font-medium text-gray-600 dark:text-gray-300 truncate">
                                    {p.barcode || p.sku || "—"}
                                  </span>
                                </div>
                              </td>

                              {/* Coluna Lote */}
                              <td className="py-2.5 px-3">
                                <span className="font-mono text-[11px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100/50 dark:bg-gray-800/40 px-2 py-0.5 rounded">
                                  {p.lotNumber || "—"}
                                </span>
                              </td>

                              {/* Coluna Quantidade */}
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                                  {p.stockQuantity}{" "}
                                  <span className="text-[10px] font-normal text-gray-400">
                                    un
                                  </span>
                                </span>
                              </td>

                              {/* Coluna Validade */}
                              <td className="py-2.5 px-3">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                  {formatarDataTabela(p.expirationDate || "")}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalAberto(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarExportacao}
                    disabled={obterLotesFiltrados.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#006938] hover:bg-[#00522c] text-white rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Baixar PDF
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-sm"
            >
              <span>Ver produtos</span>
              <ArrowRight
                className="w-3.5 h-3.5 transform transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>

        <div className="xl:col-span-1">
          <CardResumoGeral />
        </div>

        <div className="xl:col-span-1 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100/70 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:border-gray-200/60 dark:hover:border-gray-600/60 flex flex-col h-full min-h-[380px] overflow-hidden relative">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                Análise de Vencimento
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                Distribuição por criticidade
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <CardVencimentosPizza />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
        <CardEstoqueCritico />
        <div className="md:col-span-2">
          <CardAlertaVencimento />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
