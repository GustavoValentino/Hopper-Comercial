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
import { toast, Toaster } from "sonner";
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
      toast.success("Informações updated!");
      setProductToEdit(null);
    } catch (error) {
      toast.error("Erro ao atualizar.");
    }
  };

  const formatarDataPDF = (isoString: string) => {
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
      "SKU,Nome,Categoria,Observacao,Estoque,Peso_Medida,Vencimento\n";
    const csvRows = products
      .map((p) => {
        const dataVencimentoPura = p.expirationDate
          ? p.expirationDate.substring(0, 10)
          : "N/A";
        const pesoFormatadoCSV = formatarPesoMetrico(p.weight, p.unit);
        return `${p.sku || "N/A"},${p.name},${p.category},${p.note || ""},${p.stockQuantity},${pesoFormatadoCSV},${dataVencimentoPura}`;
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

  // 📄 PDF COM IDENTIDADE VISUAL HOPPER
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

    // ── PALETA ──
    const verde: [number, number, number] = [0, 105, 56];
    const verdeEscuro: [number, number, number] = [0, 77, 41];
    const verdeLinha: [number, number, number] = [0, 180, 100];
    const branco: [number, number, number] = [255, 255, 255];
    const cinzaEscuro: [number, number, number] = [51, 51, 51];
    const cinzaClaro: [number, number, number] = [245, 247, 250];
    const cinzaBorda: [number, number, number] = [220, 220, 220];

    // ── BANNER HEADER VERDE ──
    doc.setFillColor(verde[0], verde[1], verde[2]);
    doc.rect(0, 0, PW, 38, "F");

    doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
    doc.rect(140, 0, 70, 38, "F");

    doc.setFillColor(verdeLinha[0], verdeLinha[1], verdeLinha[2]);
    doc.rect(0, 38, PW, 1.2, "F");

    // ── LOGO H ──
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

    // ── NOME "HOPPER" ──
    doc.setTextColor(branco[0], branco[1], branco[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Hopper", 36, 17);

    // ── SUBTÍTULO ──
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(200, 230, 210);
    doc.text("Sistema de Controle de Estoque e Validades", 36, 23);

    // ── BLOCO DE META-INFORMAÇÕES ──
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

    // ── TABELA ──
    const colunasTabela = [
      "Código",
      "Nome do Produto",
      "Peso/Vol.",
      "Estoque",
      "Validade",
    ];
    const linhasTabela = products.map((p) => [
      p.sku || "—",
      p.name.toUpperCase(),
      formatarPesoMetrico(p.weight, p.unit),
      `${p.stockQuantity} un`,
      formatarDataPDF(p.expirationDate ?? ""),
    ]);

    autoTable(doc, {
      head: [colunasTabela],
      body: linhasTabela,
      startY: 65,
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      headStyles: {
        fillColor: verde,
        textColor: branco,
        fontSize: 9,
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
      // Linha singela entre cada produto
      didDrawCell: (data) => {
        if (
          data.section === "body" &&
          data.column.index === colunasTabela.length - 1
        ) {
          doc.setDrawColor(cinzaBorda[0], cinzaBorda[1], cinzaBorda[2]);
          doc.setLineWidth(0.2);
          doc.line(
            14,
            data.cell.y + data.cell.height,
            PW - 14,
            data.cell.y + data.cell.height,
          );
        }
      },
      margin: { top: 65, right: 14, bottom: 22, left: 14 },
      didDrawPage: (data) => {
        // ── RODAPÉ ──
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
      headerName: "Código de Barras",
      width: 150,
      renderCell: (params) => (
        <div className="flex items-center h-full gap-2 font-mono text-blue-600 dark:text-blue-400 font-bold">
          <BarcodeIcon className="w-4 h-4" />
          {params.value || "S/ SKU"}
        </div>
      ),
    },
    {
      field: "name",
      headerName: "Nome do Produto",
      width: 220,
      renderCell: (params) => (
        <span className="font-semibold uppercase text-gray-800 dark:text-gray-100 tracking-tight flex items-center h-full">
          {params.value}
        </span>
      ),
    },
    {
      field: "weight",
      headerName: "Peso / Vol.",
      width: 120,
      renderCell: (params) => (
        <div className="flex items-center h-full gap-1.5 text-gray-600 dark:text-gray-200 font-medium">
          <ScaleIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          {formatarPesoMetrico(params.value, params.row.unit)}
        </div>
      ),
    },
    {
      field: "expirationDate",
      headerName: "Vencimento",
      width: 140,
      renderCell: (params) => {
        if (!params.value)
          return <span className="flex items-center h-full">---</span>;
        const stringDataPura = params.value.substring(0, 10);
        const [ano, mes, dia] = stringDataPura.split("-");
        return (
          <div className="flex items-center h-full gap-2 text-gray-600 dark:text-gray-200">
            <CalendarDaysIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>{`${dia}/${mes}/${ano}`}</span>
          </div>
        );
      },
    },
    {
      field: "note",
      headerName: "Observação",
      width: 200,
      renderCell: (params) => (
        <span
          className="text-gray-400 dark:text-gray-400 italic truncate flex items-center h-full w-full"
          title={params.value}
        >
          {params.value || "---"}
        </span>
      ),
    },
    {
      field: "stockQuantity",
      headerName: "Estoque",
      width: 130,
      type: "number",
      renderCell: (params) => {
        const isLowStock = params.value < 15;
        return (
          <div
            className={`flex items-center justify-end md:justify-start h-full gap-2 font-bold ${isLowStock ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}
          >
            {isLowStock ? (
              <AlertTriangleIcon className="w-4 h-4" />
            ) : (
              <CheckCircle2Icon className="w-4 h-4" />
            )}
            {params.value} un
          </div>
        );
      },
    },
    {
      field: "actions",
      headerName: "Ações",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="flex items-center h-full gap-2">
          <button
            onClick={() => setProductToEdit(params.row)}
            className="p-1.5 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            title="Editar Produto"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setProductToDelete(params.row.productId)}
            className="p-1.5 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
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
      <Toaster richColors closeButton />

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
            <DownloadIcon className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
            Exportar (CSV)
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#006938] text-white hover:bg-[#00522c] rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <PrinterIcon className="w-4 h-4 mr-2" />
            Imprimir (PDF)
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-xl border border-gray-100 dark:border-gray-700/60 overflow-hidden transition-all">
        <DataGrid
          rows={products || []}
          columns={columns}
          getRowId={(row) => row.productId}
          checkboxSelection
          disableRowSelectionOnClick
          autoHeight
          rowHeight={52}
          localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
          sx={{
            border: "none",
            backgroundColor: "transparent",
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
              borderBottom: "1px solid #374151 !important",
            },
            "& .MuiDataGrid-columnHeader--scrollbarFiller, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller":
              { backgroundColor: "#f9fafb !important" },
            ".dark & .MuiDataGrid-columnHeader--scrollbarFiller, .dark & .MuiDataGrid-filler, .dark & .MuiDataGrid-scrollbarFiller":
              {
                backgroundColor: "#1f2937 !important",
                borderBottom: "1px solid #374151 !important",
              },
            "& .MuiDataGrid-iconButtonContainer, & .MuiDataGrid-menuIcon": {
              visibility: "visible !important",
              width: "auto !important",
            },
            "& .MuiDataGrid-iconButtonContainer b, & .MuiDataGrid-menuIcon button":
              { visibility: "visible !important" },
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
              borderBottom: "1px solid #374151/70",
              color: "#e5e7eb",
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid #f3f4f6",
              backgroundColor: "transparent",
            },
            ".dark & .MuiDataGrid-footerContainer": {
              borderTop: "1px solid #374151 !important",
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
              <AlertDialogCancel className="flex-1 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl py-4 text-xs font-semibold transition-colors">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-bold rounded-xl py-4 text-xs shadow-md transition-all active:scale-95"
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
