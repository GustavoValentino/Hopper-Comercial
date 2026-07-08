"use client";

import { useCreateProductMutation, useGetProductsQuery } from "@/state/api";
import {
  PlusCircleIcon,
  SearchIcon,
  BarcodeIcon,
  ScaleIcon,
  AlertTriangleIcon,
  MessageSquareMoreIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  PackageIcon,
} from "lucide-react";
import { useState } from "react";
import Header from "@/app/(components)/Header";
import CreateProductModal from "./CreateProductModal";

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    data: products,
    isLoading,
    isError,
  } = useGetProductsQuery(searchTerm);

  const [createProduct] = useCreateProductMutation();

  const handleCreateProduct = async (productData: any) => {
    await createProduct(productData);
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

    // Se no banco o registro for ML_G, exibe estritamente como mililitros inteiros
    if (unidade === "ML_G") {
      return `${Math.round(pesoNumerico * 1000)} ml`;
    }

    // Caso contrário, renderiza como kilogramas formatados
    return `${pesoNumerico.toFixed(3).replace(".", ",")} kg`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-bold text-gray-600 dark:text-gray-400 text-sm tracking-wide">
          Carregando catálogo de produtos...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-rose-500 py-10 font-bold">
        Erro ao conectar com o banco de dados de logística.
      </div>
    );
  }

  return (
    <div className="mx-auto pb-5 w-full text-gray-900 dark:text-gray-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex flex-col">
          <Header name="Produtos Cadastrados" />
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
            Gestão física, monitoramento de volumetria e status de integridade
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
          <div className="relative w-full sm:w-72 md:w-80 lg:w-96">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none text-xs font-medium text-gray-700 dark:text-gray-200 shadow-xs focus:border-emerald-500 dark:focus:border-emerald-500 transition-all"
              placeholder="Buscar por nome ou código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#006938] text-white hover:bg-[#00522c] rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            <PlusCircleIcon className="w-4 h-4 mr-2" /> Novo Produto
          </button>
        </div>
      </div>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product: any) => {
            const qtd = product.stockQuantity;

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            let corBordaSuperior = "border-t-emerald-500";
            let statusBadge = (
              <span className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <CheckCircle2Icon className="w-3 h-3" /> SEGURO
              </span>
            );

            let dataExibicaoFormatada = "";

            if (product.expirationDate) {
              const stringDataPura = product.expirationDate.substring(0, 10);
              const [ano, mes, dia] = stringDataPura.split("-");

              dataExibicaoFormatada = `${dia}/${mes}/${ano}`;

              const dataVencimento = new Date(`${stringDataPura}T00:00:00`);
              const diferencaTempo = dataVencimento.getTime() - hoje.getTime();
              const diferencaDias = Math.ceil(
                diferencaTempo / (1000 * 60 * 60 * 24),
              );

              if (diferencaDias < 0) {
                corBordaSuperior = "border-t-rose-600";
                statusBadge = (
                  <span className="text-[9px] bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 animate-pulse">
                    <AlertTriangleIcon className="w-3 h-3" /> VENCIDO
                  </span>
                );
              } else if (diferencaDias <= 15) {
                corBordaSuperior = "border-t-amber-500";
                statusBadge = (
                  <span className="text-[9px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <AlertTriangleIcon className="w-3 h-3" /> ALERTA VALIDADE
                  </span>
                );
              }
            }

            return (
              <div
                key={product.productId}
                className={`bg-white dark:bg-gray-800 border-t-4 ${corBordaSuperior} rounded-xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.01)] border border-gray-100/50 dark:border-gray-700/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:border-gray-600/60 transition-all duration-300 flex flex-col justify-between`}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center text-[10px] font-mono text-blue-600 bg-blue-50/60 dark:bg-blue-950/30 dark:text-blue-400 px-2 py-0.5 rounded font-bold">
                      <BarcodeIcon className="w-3 h-3 mr-1" />
                      {product.sku || "SEM SKU"}
                    </div>
                    {statusBadge}
                  </div>

                  <h3 className="text-sm text-gray-800 dark:text-gray-100 font-bold uppercase leading-snug mb-3 line-clamp-2 min-h-[2.25rem] tracking-tight">
                    {product.name}
                  </h3>

                  <div className="flex flex-col gap-2 bg-slate-50 dark:bg-gray-700/30 p-2.5 rounded-xl mb-3.5 border border-slate-100/50 dark:border-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-gray-700 dark:text-gray-200 font-semibold">
                        <ScaleIcon className="w-3.5 h-3.5 mr-2 text-gray-400 dark:text-gray-500" />

                        <span>
                          {formatarPesoMetrico(product.weight, product.unit)}
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                        Peso / Vol.
                      </span>
                    </div>

                    {product.expirationDate && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs text-amber-600 dark:text-amber-400 font-semibold">
                          <CalendarDaysIcon className="w-3.5 h-3.5 mr-2" />
                          <span>{dataExibicaoFormatada}</span>
                        </div>
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                          Validade
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-grow mb-4">
                    <div className="flex items-start gap-2 text-gray-500 dark:text-gray-400 italic text-[11px] bg-gray-50/50 dark:bg-gray-900/20 p-2.5 rounded-lg border-l-2 border-slate-300 dark:border-gray-700 min-h-[3.5rem]">
                      <MessageSquareMoreIcon className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
                      <p className="line-clamp-3 leading-relaxed">
                        {product.note ||
                          "Sem anotações complementares para este lote."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3.5 border-t border-gray-100 dark:border-gray-700/60">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 dark:text-gray-400 uppercase font-bold tracking-wider">
                        Qtd em Estoque
                      </span>
                      <span
                        className={`text-base font-black tracking-tight mt-0.5 ${
                          qtd < 5
                            ? "text-rose-600 dark:text-rose-400"
                            : qtd <= 15
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {qtd} un
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-gray-400 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">
                        Categoria
                      </span>
                      <span className="text-[10px] text-gray-600 dark:text-gray-300 font-bold bg-slate-100 dark:bg-gray-700 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <PackageIcon className="w-3 h-3 text-gray-400" />
                        {product.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-16 text-center">
          <PackageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Nenhum produto localizado no catálogo.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Tente buscar pelo código ou realize um novo registro operacional.
          </p>
        </div>
      )}

      <CreateProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateProduct}
      />
    </div>
  );
};

export default Products;
