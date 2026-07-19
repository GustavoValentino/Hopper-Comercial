"use client";

import React, { useState, useEffect } from "react";
import { useGetDashboardMetricsQuery } from "@/state/api";
import { useAppSelector } from "@/app/redux";
import { FileSpreadsheet, Download, PackageIcon } from "lucide-react";
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

const Dashboard = () => {
  const { data: dashboardMetrics } = useGetDashboardMetricsQuery();
  const produtos = dashboardMetrics?.popularProducts || [];
  const user = useAppSelector((state) => state.auth.user);

  const [formattedDate, setFormattedDate] = useState("");
  const [isDateLoading, setIsDateLoading] = useState(true);
  const [isModalAberto, setIsModalAberto] = useState(false);
  const [filtroExportacao, setFiltroExportacao] = useState("todos");

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

  const obterProdutosFiltrados = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return produtos.filter((produto) => {
      let diferencaDias: number | null = null;
      if (produto.expirationDate) {
        const stringDataPura = produto.expirationDate.substring(0, 10);
        const dataValidade = new Date(`${stringDataPura}T00:00:00`);
        const diferencaTempo = dataValidade.getTime() - hoje.getTime();
        diferencaDias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));
      }

      if (filtroExportacao === "vencidos")
        return diferencaDias !== null && diferencaDias < 0;
      if (filtroExportacao === "criticos")
        return produto.stockQuantity <= LIMITE_CRITICO;
      if (filtroExportacao === "proximos")
        return (
          diferencaDias !== null && diferencaDias >= 0 && diferencaDias <= 15
        );

      return true;
    });
  };

  const dadosFiltrados = obterProdutosFiltrados();
  const produtosParaVisualizar = dadosFiltrados.slice(0, 5);
  const userName = user?.name || user?.email?.split("@")[0] || "Operador";

  const handleConfirmarExportacao = async () => {
    if (dadosFiltrados.length === 0) {
      alert(
        "Não há registros correspondentes ao filtro selecionado para exportação.",
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
    doc.rect(0, 39.2, 210, 22, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...cores.cinzaEscuro);
    doc.text("Relatório de Produtos Críticos", 14, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Escopo: ${filtroExportacao.toUpperCase()}`, 14, 54);

    const dataEmissao = `${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Emitido por: ${userName}`, 210 - 14, 48, { align: "right" });
    doc.text(`Data: ${dataEmissao}`, 210 - 14, 54, { align: "right" });

    doc.setDrawColor(220, 220, 220);
    doc.line(14, 61.2, 196, 61.2);

    // ── PRÉ-CARREGA AS IMAGENS DOS PRODUTOS (base64) ──
    const imagensBase64: Record<string, string | null> = {};
    await Promise.all(
      dadosFiltrados.map(async (p) => {
        if (p.imageUrl) {
          try {
            imagensBase64[p.productId] = await carregarImagemBase64(p.imageUrl);
          } catch {
            imagensBase64[p.productId] = null;
          }
        } else {
          imagensBase64[p.productId] = null;
        }
      }),
    );

    const colunasTabela = [
      "Foto",
      "Produto",
      "Código",
      "Quantidade",
      "Data de Validade",
    ];
    const linhasTabela = dadosFiltrados.map((p) => {
      const pesoFormatado = formatarPesoMetrico(p.weight, p.unit);
      return [
        "",
        `${p.name} (${pesoFormatado})`,
        p.sku || "—",
        `${p.stockQuantity} un`,
        formatarDataTabela(p.expirationDate ?? ""),
      ];
    });

    autoTable(doc, {
      head: [colunasTabela],
      body: linhasTabela,
      startY: 65,
      theme: "striped",
      headStyles: {
        fillColor: cores.verde,
        textColor: cores.branco,
        fontSize: 9,
        fontStyle: "bold",
        halign: "left",
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: cores.cinzaEscuro,
        cellPadding: 3.5,
        minCellHeight: 14,
      },
      columnStyles: {
        0: { cellWidth: 16 },
      },
      alternateRowStyles: { fillColor: cores.cinzaClaro },
      margin: { top: 65, right: 14, bottom: 22, left: 14 },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const produto = dadosFiltrados[data.row.index];
          const imgBase64 = produto ? imagensBase64[produto.productId] : null;

          if (imgBase64) {
            const tamanho = 10;
            const x = data.cell.x + (data.cell.width - tamanho) / 2;
            const y = data.cell.y + (data.cell.height - tamanho) / 2;
            try {
              doc.addImage(imgBase64, "PNG", x, y, tamanho, tamanho);
            } catch {
              // Se a imagem falhar ao desenhar, a célula fica em branco
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
    doc.save(`hopper_relatorio_${filtroExportacao}_${dataSlug}.pdf`);
    setIsModalAberto(false);
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-gradient-to-br from-[#006938] to-[#004d29] text-white p-6 rounded-xl shadow-sm min-h-[220px] flex flex-col justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Olá, {userName}! 👋
            </h1>
            {isDateLoading ? (
              <div
                className="h-3 w-32 bg-white/20 rounded animate-pulse mt-1.5"
                aria-hidden="true"
              />
            ) : (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-200/90 mt-1 animate-in fade-in duration-300">
                {formattedDate}
              </p>
            )}
            <p className="text-green-100/80 text-xs mt-3 border-t border-white/10 pt-3 leading-relaxed">
              Monitore a validade e a quantidade de produtos em tempo real antes
              de consolidar e transferir os dados para sua planilha local.
            </p>
          </div>

          <div className="mt-4">
            <Dialog open={isModalAberto} onOpenChange={setIsModalAberto}>
              <DialogTrigger asChild>
                <button
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#4a6357] text-white hover:bg-[#00522c] focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                  aria-label="Abrir modal de geração de relatório PDF"
                >
                  <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                  Gerar Relatório
                </button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-2xl rounded-xl transition-colors [&>button]:text-gray-500 [&>button]:dark:text-gray-400 [&>button]:hover:text-gray-800 [&>button]:dark:hover:text-gray-200 [&>button]:hover:bg-gray-100 [&>button]:dark:hover:bg-gray-800 [&>button]:rounded-lg [&>button]:transition-colors">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    Configurar Exportação de Dados
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-400 dark:text-gray-500">
                    Selecione o escopo do inventário que você deseja baixar para
                    atualizar sua planilha ou imprimir para controle físico.
                  </DialogDescription>
                </DialogHeader>

                <div className="my-5">
                  <span
                    className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2"
                    id="filtro-label"
                  >
                    Filtrar registros por:
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

                <div className="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50/50 dark:bg-gray-800/20">
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Prévia dos Dados (Primeiros 5)
                    </span>
                    <span
                      className="text-[10px] font-bold text-[#006938] dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full"
                      aria-live="polite"
                    >
                      {dadosFiltrados.length}{" "}
                      {dadosFiltrados.length === 1
                        ? "item encontrado"
                        : "itens encontrados"}
                    </span>
                  </div>

                  <div className="p-2 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                          <th className="p-2">Produto</th>
                          <th className="p-2">Código</th>
                          <th className="p-2">Qtd</th>
                          <th className="p-2">Validade</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-gray-700 dark:text-gray-300">
                        {produtosParaVisualizar.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-4 text-center text-gray-400 dark:text-gray-500 italic"
                            >
                              Nenhum produto corresponde ao filtro selecionado.
                            </td>
                          </tr>
                        ) : (
                          produtosParaVisualizar.map((p) => (
                            <tr
                              key={p.productId}
                              className="border-b border-gray-50 dark:border-gray-800/40 last:border-none hover:bg-gray-50/40 dark:hover:bg-gray-800/10 transition-colors"
                            >
                              <td className="p-2 flex items-center gap-2.5 max-w-[200px]">
                                <div className="relative w-8 h-8 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 shadow-xs shrink-0 flex items-center justify-center">
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
                                <div className="truncate">
                                  <p
                                    className="font-semibold text-gray-800 dark:text-gray-200 truncate"
                                    title={p.name}
                                  >
                                    {p.name}
                                  </p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                    {formatarPesoMetrico(p.weight, p.unit)}
                                  </p>
                                </div>
                              </td>
                              <td className="p-2 font-mono text-gray-500 dark:text-gray-400 text-[11px]">
                                {p.sku || "—"}
                              </td>
                              <td className="p-2 font-bold">
                                {p.stockQuantity} un
                              </td>
                              <td className="p-2 text-gray-500 dark:text-gray-400">
                                {formatarDataTabela(p.expirationDate ?? "")}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setIsModalAberto(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarExportacao}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#006938] text-white hover:bg-[#00522c] rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006938] focus-visible:ring-offset-2"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Baixar PDF
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="xl:col-span-1">
          <CardResumoGeral />
        </div>

        <div className="xl:col-span-1 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100/70 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:border-gray-200/60 dark:hover:border-gray-600/60 flex flex-col h-full min-h-[320px] overflow-visible relative">
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
          <div className="flex-1 overflow-visible">
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
