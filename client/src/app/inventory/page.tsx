"use client";

import {
  useGetProductsQuery,
  useDeleteProductMutation,
  useUpdateProductMutation,
} from "@/state/api";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import { useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarcodeIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  EditIcon,
  Trash2Icon,
  ScaleIcon,
  CalendarDaysIcon,
  PrinterIcon,
  Search,
  EyeIcon,
  X,
  PackageIcon,
  FileTextIcon,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CreateProductModal from "../products/CreateProductModal";

const Inventory = () => {
  const { data: products, isError, isLoading } = useGetProductsQuery();
  const [deleteProduct] = useDeleteProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [productToEdit, setProductToEdit] = useState<any>(null);
  const [productForLotsModal, setProductForLotsModal] = useState<any>(null);
  const [productForNoteModal, setProductForNoteModal] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = (products || []).filter((p) => {
    const nameMatch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const skuMatch = p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || skuMatch;
  });

  const handleDelete = async () => {
    if (productToDelete) {
      try {
        await deleteProduct(productToDelete).unwrap();
        toast.success("Produto removido com sucesso!");
        setProductToDelete(null);
      } catch (error) {
        toast.error("Erro ao excluir o produto.");
      }
    }
  };

  const handleUpdate = async (formData: any) => {
    try {
      await updateProduct({
        productId: formData.productId,
        ...formData,
      }).unwrap();
      toast.success("Informações atualizadas com sucesso!");
      setProductToEdit(null);
    } catch (error) {
      toast.error("Erro ao atualizar.");
    }
  };

  const formatarData = (isoString: string) => {
    if (!isoString) return "—";
    const stringDataPura = isoString.substring(0, 10);
    const [ano, mes, dia] = stringDataPura.split("-");
    return `${dia}/${mes}/${ano}`;
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

  const handleExportCSV = () => {
    if (!products || products.length === 0) {
      toast.error("Não há dados para exportar.");
      return;
    }
    const headers =
      "SKU,Nome,Categoria,Observacao,Estoque_Total,Peso_Medida,Lotes\n";
    const csvRows = products
      .map((p) => {
        const lotesStr = (p.lotes || [])
          .map(
            (l: any) =>
              `[Lote: ${l.lotNumber || "S/N"}, Qtd: ${l.stockQuantity}, Val: ${formatarData(l.expirationDate)}]`,
          )
          .join(" | ");
        const pesoFormatadoCSV = formatarPesoMetrico(p.weight, p.unit);
        const qtdTotal = (p.lotes || []).reduce(
          (acc: number, l: any) => acc + (l.stockQuantity || 0),
          0,
        );
        const obsLimpa = (p.note || "").replace(/"/g, '""');
        return `${p.sku || "N/A"},${p.name},${p.category},"${obsLimpa}",${qtdTotal},${pesoFormatadoCSV},"${lotesStr}"`;
      })
      .join("\n");

    const blob = new Blob(["\uFEFF" + headers + csvRows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `inventario_geral_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.click();
    toast.success("Planilha CSV gerada!");
  };

  const handleExportPDF = async () => {
    if (!products || products.length === 0) {
      toast.error("Não há dados para gerar o relatório.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const PW = 210;
    const PH = doc.internal.pageSize.height;

    const verde: [number, number, number] = [0, 105, 56];
    const verdeEscuro: [number, number, number] = [0, 77, 41];
    const verdeLinha: [number, number, number] = [0, 180, 100];
    const branco: [number, number, number] = [255, 255, 255];
    const cinzaEscuro: [number, number, number] = [51, 51, 51];
    const cinzaClaro: [number, number, number] = [245, 247, 250];
    const cinzaBorda: [number, number, number] = [220, 220, 220];

    doc.setFillColor(verde[0], verde[1], verde[2]);
    doc.rect(0, 0, PW, 38, "F");

    doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
    doc.rect(140, 0, 70, 38, "F");

    doc.setFillColor(verdeLinha[0], verdeLinha[1], verdeLinha[2]);
    doc.rect(0, 38, PW, 1.2, "F");

    const carregarImagem = (url: string): Promise<string> =>
      new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("ctx");
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = url;
      });

    try {
      const logoBase64 = await carregarImagem(
        "https://res.cloudinary.com/rz9e24ny/image/upload/v1783305928/hopper_icon_tight_hvpesz.svg",
      );
      doc.addImage(logoBase64, "PNG", 14, 8, 18, 18);
    } catch {
      doc.setTextColor(branco[0], branco[1], branco[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("H", 22, 20.5, { align: "center" });
    }

    doc.setTextColor(branco[0], branco[1], branco[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Hopper", 36, 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(200, 230, 210);
    doc.text("Sistema de Controle de Estoque e Validades", 36, 23);

    doc.setFillColor(cinzaClaro[0], cinzaClaro[1], cinzaClaro[2]);
    doc.rect(0, 39.2, PW, 22, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(cinzaEscuro[0], cinzaEscuro[1], cinzaEscuro[2]);
    doc.text("Relatório Completo de Inventário", 14, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total de Itens Cadastrados: ${products.length} produtos`, 14, 54);

    const dataEmissao = `${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Data de Emissão: ${dataEmissao}`, PW - 14, 54, {
      align: "right",
    });

    doc.setDrawColor(cinzaBorda[0], cinzaBorda[1], cinzaBorda[2]);
    doc.setLineWidth(0.3);
    doc.line(14, 61.2, PW - 14, 61.2);

    const colunasTabela = [
      "Código",
      "Nome do Produto",
      "Observação",
      "Peso/Vol.",
      "Estoque",
      "Lotes",
    ];
    const linhasTabela = products.map((p) => {
      const qtdTotal = (p.lotes || []).reduce(
        (acc: number, l: any) => acc + (l.stockQuantity || 0),
        0,
      );
      const lotesResumo = (p.lotes || [])
        .map(
          (l: any) =>
            `${formatarData(l.expirationDate)} (${l.stockQuantity} un)`,
        )
        .join("\n");

      return [
        p.sku || "—",
        p.name.toUpperCase(),
        p.note || "—",
        formatarPesoMetrico(p.weight, p.unit),
        `${qtdTotal} un`,
        lotesResumo || "Nenhum lote",
      ];
    });

    autoTable(doc, {
      head: [colunasTabela],
      body: linhasTabela,
      startY: 65,
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      headStyles: {
        fillColor: verde,
        textColor: branco,
        fontSize: 8.5,
        fontStyle: "bold",
        halign: "left",
      },
      bodyStyles: {
        textColor: cinzaEscuro,
        lineWidth: 0,
      },
      alternateRowStyles: {
        fillColor: cinzaClaro,
      },
      margin: { top: 65, right: 14, bottom: 22, left: 14 },
      didDrawPage: (data) => {
        doc.setFillColor(verde[0], verde[1], verde[2]);
        doc.rect(0, PH - 14, PW, 14, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(branco[0], branco[1], branco[2]);
        doc.text(
          "Hopper · Sistema de Controle de Estoque e Validades",
          14,
          PH - 5.5,
        );

        const totalPaginas = doc.getNumberOfPages();
        doc.text(
          `Página ${data.pageNumber} de ${totalPaginas}`,
          PW - 14,
          PH - 5.5,
          { align: "right" },
        );
      },
    });

    const dataSlug = new Date().toISOString().slice(0, 10);
    doc.save(`hopper_inventario_${dataSlug}.pdf`);
    toast.success("Documento PDF pronto para impressão!");
  };

  const columns: GridColDef[] = [
    {
      field: "sku",
      headerName: "Código",
      width: 130,
      minWidth: 120,
      renderCell: (params) => (
        <div className="flex items-center h-full gap-1.5 font-mono text-blue-600 dark:text-blue-400 font-bold text-xs">
          <BarcodeIcon className="w-4 h-4 shrink-0" />
          <span className="truncate">{params.value || "S/ SKU"}</span>
        </div>
      ),
    },
    {
      field: "name",
      headerName: "Nome do Produto",
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <span className="font-semibold uppercase text-gray-800 dark:text-gray-100 tracking-tight flex items-center h-full text-xs truncate">
          {params.value}
        </span>
      ),
    },
    {
      field: "note",
      headerName: "Observação",
      flex: 1,
      minWidth: 160,
      renderCell: (params) => {
        const observacao = params.value;
        if (!observacao) {
          return (
            <span className="text-gray-400 dark:text-gray-500 italic text-xs">
              —
            </span>
          );
        }
        return (
          <div className="flex items-center justify-between w-full h-full pr-1">
            <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
              {observacao}
            </span>
            <button
              onClick={() => setProductForNoteModal(params.row)}
              className="p-1.5 bg-slate-100 text-slate-600 dark:bg-gray-700/60 dark:text-gray-300 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shrink-0"
              title="Ler observação completa"
            >
              <FileTextIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
    {
      field: "weight",
      headerName: "Peso / Vol.",
      width: 120,
      minWidth: 110,
      renderCell: (params) => (
        <div className="flex items-center h-full gap-1.5 text-gray-600 dark:text-gray-200 font-medium text-xs">
          <ScaleIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          {formatarPesoMetrico(params.value, params.row.unit)}
        </div>
      ),
    },
    {
      field: "lotes",
      headerName: "Lotes e Validades",
      width: 160,
      minWidth: 150,
      sortable: false,
      renderCell: (params) => {
        const lotes = params.value || [];
        const qtdLotes = lotes.length;

        if (qtdLotes === 0) {
          return (
            <span className="text-gray-400 dark:text-gray-500 italic text-xs flex items-center h-full">
              Sem lotes
            </span>
          );
        }

        return (
          <div className="flex items-center justify-between w-full h-full pr-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 bg-slate-100 dark:bg-gray-700/60 px-2 py-0.5 rounded-md">
              {qtdLotes} {qtdLotes === 1 ? "lote" : "lotes"}
            </span>
            <button
              onClick={() => setProductForLotsModal(params.row)}
              className="p-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer flex items-center gap-1 font-semibold text-xs"
              title="Visualizar detalhes dos lotes"
            >
              <EyeIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
    {
      field: "stockQuantity",
      headerName: "Estoque Total",
      width: 130,
      minWidth: 120,
      type: "number",
      valueGetter: (params, row) => {
        const lotes = row.lotes || [];
        return lotes.reduce(
          (acc: number, l: any) => acc + (l.stockQuantity || 0),
          0,
        );
      },
      renderCell: (params) => {
        const qtdTotal = params.value;
        const isLowStock = qtdTotal < 15;
        return (
          <div
            className={`flex items-center h-full gap-1.5 font-bold text-xs ${isLowStock ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}
          >
            {isLowStock ? (
              <AlertTriangleIcon className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2Icon className="w-4 h-4 shrink-0" />
            )}
            {qtdTotal} un
          </div>
        );
      },
    },
    {
      field: "actions",
      headerName: "Ações",
      width: 100,
      minWidth: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="flex items-center h-full gap-2">
          <button
            onClick={() => setProductToEdit(params.row)}
            className="p-1.5 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
            title="Editar Produto"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setProductToDelete(params.row.productId)}
            className="p-1.5 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
            title="Excluir Produto"
          >
            <Trash2Icon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-bold text-gray-600 dark:text-gray-400 text-sm tracking-wide">
          Carregando inventário...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-10 text-center text-rose-500 font-bold">
        Falha ao carregar o inventário. Por favor, tente novamente.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-1 text-gray-900 dark:text-gray-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col text-gray-900 dark:text-gray-100">
          <Header name="Inventário Geral" />
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
            Controle de validades, lotes e volumetria de estoque seguro
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <DownloadIcon className="w-4 h-4 text-emerald-400" />
            Exportar (CSV)
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#006938] text-white hover:bg-[#00522c] rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <PrinterIcon className="w-4 h-4" />
            Imprimir (PDF)
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-xl border border-gray-100 dark:border-gray-700/60 overflow-hidden transition-all">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-gray-900/10">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou código de barras..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-medium"
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
            Mostrando {filteredProducts.length} de {(products || []).length}{" "}
            produtos
          </span>
        </div>

        <div className="w-full h-[520px] overflow-hidden [&_.MuiDataGrid-scrollbarFiller--header]:bg-gray-50 [&_.MuiDataGrid-scrollbarFiller--header]:dark:bg-gray-800 [&_.MuiDataGrid-scrollbarFiller--header]:border-b [&_.MuiDataGrid-scrollbarFiller--header]:border-gray-100 [&_.MuiDataGrid-scrollbarFiller--header]:dark:border-gray-700">
          <DataGrid
            rows={filteredProducts}
            columns={columns}
            getRowId={(row) => row.productId}
            checkboxSelection
            disableRowSelectionOnClick
            rowHeight={52}
            localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
            sx={{
              border: "none",
              backgroundColor: "transparent",
              height: "100%",
              "& .MuiDataGrid-virtualScroller": {
                overflowY: "auto",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: "700 !important",
                color: "#374151 !important",
              },
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: "#f9fafb",
                borderBottom: "1px solid #f3f4f6",
              },
              ".dark & .MuiDataGrid-columnHeaderTitle": {
                color: "#f3f4f6 !important",
              },
              ".dark & .MuiDataGrid-columnHeader": {
                backgroundColor: "#1f2937 !important",
                borderBottom: "1px solid #314151 !important",
              },
              "& .MuiDataGrid-iconButtonContainer, & .MuiDataGrid-menuIcon": {
                visibility: "visible !important",
                width: "auto !important",
              },
              "& .MuiSvgIcon-root, & .MuiDataGrid-iconButtonContainer .MuiButtonBase-root, & .MuiDataGrid-menuIcon .MuiButtonBase-root":
                { color: "#374151 !important" },
              ".dark & .MuiSvgIcon-root, .dark & .MuiDataGrid-iconButtonContainer .MuiButtonBase-root, .dark & .MuiDataGrid-menuIcon .MuiButtonBase-root":
                { color: "#9ca3af !important" },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                alignItems: "center",
              },
              ".dark & .MuiDataGrid-cell": {
                borderBottom: "1px solid #314151/70",
                color: "#e5e7eb",
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: "1px solid #f3f4f6",
                backgroundColor: "transparent",
              },
              ".dark & .MuiDataGrid-footerContainer": {
                borderTop: "1px solid #314151 !important",
                color: "#e5e7eb",
              },
              "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiTablePagination-select, & .MuiTablePagination-actions .MuiButtonBase-root":
                { color: "inherit !important" },
              ".dark & .MuiTablePagination-actions .MuiButtonBase-root": {
                color: "#9ca3af !important",
              },
              "& .MuiCheckbox-root": { color: "#10b981 !important" },
            }}
          />
        </div>
      </div>

      {/* MODAL PARA VISUALIZAR OBSERVAÇÃO COMPLETA */}
      {productForNoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setProductForNoteModal(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FileTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-100">
                  Observação do Produto
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProductForNoteModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">
                  Produto
                </span>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-tight mt-0.5">
                  {productForNoteModal.name}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700/60 max-h-48 overflow-y-auto">
                <p className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {productForNoteModal.note}
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setProductForNoteModal(null)}
                  className="w-full py-2.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA VISUALIZAR LOTES */}
      {productForLotsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setProductForLotsModal(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <PackageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-100">
                  Lotes do Produto
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProductForLotsModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">
                  Produto
                </span>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-tight mt-0.5">
                  {productForLotsModal.name}
                </p>
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold mt-1 inline-block">
                  SKU: {productForLotsModal.sku || "S/ SKU"}
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block mb-1">
                  Lotes Cadastrados ({productForLotsModal.lotes?.length || 0}):
                </span>
                {productForLotsModal.lotes?.map((lote: any) => (
                  <div
                    key={lote.loteId}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                        <CalendarDaysIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 block">
                          Validade: {formatarData(lote.expirationDate)}
                        </span>
                        {lote.lotNumber && (
                          <span className="text-[10px] font-mono text-gray-400">
                            Lote: {lote.lotNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                      {lote.stockQuantity} un
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setProductForLotsModal(null)}
                  className="w-full py-2.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!productToDelete}
        onOpenChange={() => setProductToDelete(null)}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl border border-gray-100 dark:border-gray-800 p-0 overflow-hidden shadow-2xl bg-white dark:bg-gray-900">
          <div className="bg-rose-50 dark:bg-rose-950/20 p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-4">
              <AlertTriangleIcon className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Confirmar Exclusão?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-rose-600 dark:text-rose-400 text-xs font-medium mt-1">
                Você está prestes a remover permanentemente este item do
                sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-5 leading-relaxed">
              Esta ação não pode ser desfeita. O produto deixará de constar
              imediatamente nos relatórios de estoque e painéis gerenciais.
            </p>
            <AlertDialogFooter className="flex gap-3 justify-center">
              <AlertDialogCancel className="flex-1 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl py-4 text-xs font-semibold transition-colors cursor-pointer">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-bold rounded-xl py-4 text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Excluir Produto
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {productToEdit && (
        <CreateProductModal
          isOpen={!!productToEdit}
          onClose={() => setProductToEdit(null)}
          onCreate={handleUpdate}
          initialData={productToEdit}
        />
      )}
    </div>
  );
};

export default Inventory;
