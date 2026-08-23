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
  ChevronDownIcon,
  ImageIcon,
  CircleX,
  Filter,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import Header from "@/app/(components)/Header";
import CreateProductModal from "./CreateProductModal";

const ProductSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 border-t-4 border-t-gray-200 dark:border-t-gray-700 rounded-xl p-5 border border-gray-100/50 dark:border-gray-700/40 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
      <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700 rounded" />
    </div>
    <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-700 rounded mb-3" />
    <div className="h-16 bg-gray-50 dark:bg-gray-700/30 rounded-xl mb-3.5" />
    <div className="h-14 bg-gray-50 dark:bg-gray-900/20 rounded-lg mb-4" />
    <div className="flex justify-between pt-3.5 border-t border-gray-100 dark:border-gray-700/60">
      <div className="h-8 w-16 bg-gray-100 dark:bg-gray-700 rounded" />
      <div className="h-8 w-20 bg-gray-100 dark:bg-gray-700 rounded" />
    </div>
  </div>
);

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODAS");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [lightboxProduct, setLightboxProduct] = useState<{
    imageUrl: string;
    name: string;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: allProducts, isLoading, isError } = useGetProductsQuery();
  const [createProduct] = useCreateProductMutation();

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lista única de categorias para o seletor
  const categories = useMemo(() => {
    const cats = ["TODAS", ...(allProducts?.map((p) => p.category) || [])];
    return Array.from(new Set(cats));
  }, [allProducts]);

  // Lógica de filtragem combinada (Busca + Categoria)
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "TODAS" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allProducts, searchTerm, selectedCategory]);

  useEffect(() => {
    setVisibleCount(8);
  }, [searchTerm, selectedCategory]);

  const handleCreateProduct = async (productData: any) => {
    try {
      await createProduct(productData).unwrap();
      toast.success("Produto cadastrado com sucesso!");
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Erro ao cadastrar o produto.");
    }
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

  if (isError) {
    return (
      <div className="text-center text-rose-500 py-10 font-bold">
        Erro ao conectar com o banco de dados de logística.
      </div>
    );
  }

  const productsToRender = filteredProducts.slice(0, visibleCount);
  const hasMoreProducts = filteredProducts.length > visibleCount;

  return (
    <div className="mx-auto pb-5 w-full text-gray-900 dark:text-gray-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex flex-col">
          <Header name="Produtos Cadastrados" />
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
            Gestão física, monitoramento de volumetria e status de integridade
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full md:flex-row md:items-center md:w-auto">
          {/* Barra de Pesquisa e Filtro Discreto Agrupados */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-grow md:w-72 lg:w-80">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none text-xs font-medium text-gray-700 dark:text-gray-200 shadow-xs focus:border-emerald-500 dark:focus:border-emerald-500 transition-all"
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Botão de Filtro com Ícone Discreto e Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                title="Filtrar por Categoria"
                className={`flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer shadow-xs shrink-0 ${
                  selectedCategory !== "TODAS"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-400"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <Filter className="w-4 h-4" />
              </button>

              {isCategoryOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700/60">
                    Filtrar Categoria
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoryOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                          selectedCategory === cat
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                        }`}
                      >
                        <span className="truncate">{cat.toUpperCase()}</span>
                        {selectedCategory === cat && (
                          <CheckCircle2Icon className="w-3.5 h-3.5 shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium md:hidden">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "produto" : "produtos"}
            </span>
            <button
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
              onClick={() => setIsModalOpen(true)}
            >
              <PlusCircleIcon className="w-4 h-4" /> Novo produto
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productsToRender.map((product: any) => {
              const lotes = product.lotes || [];
              const qtdTotal = lotes.reduce(
                (acc: number, l: any) => acc + (l.stockQuantity || 0),
                0,
              );

              const hoje = new Date();
              hoje.setHours(0, 0, 0, 0);

              let corBordaSuperior =
                "border-t-emerald-600 dark:border-t-emerald-400";
              let statusBadge = (
                <span className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                  <CheckCircle2Icon className="w-3 h-3" /> SEGURO
                </span>
              );

              // Analisa os lotes para determinar o status global do produto
              if (lotes.length > 0) {
                let menorDataDiff = Infinity;

                lotes.forEach((lote: any) => {
                  if (lote.expirationDate) {
                    const stringDataPura = lote.expirationDate.substring(0, 10);
                    const dataVencimento = new Date(
                      `${stringDataPura}T00:00:00`,
                    );
                    const diferencaTempo =
                      dataVencimento.getTime() - hoje.getTime();
                    const diferencaDias = Math.ceil(
                      diferencaTempo / (1000 * 60 * 60 * 24),
                    );

                    if (diferencaDias < menorDataDiff) {
                      menorDataDiff = diferencaDias;
                    }
                  }
                });

                if (menorDataDiff !== Infinity) {
                  if (menorDataDiff < 0) {
                    corBordaSuperior =
                      "border-t-rose-600 dark:border-t-rose-600";
                    statusBadge = (
                      <span className="text-[9px] bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 animate-pulse">
                        <AlertTriangleIcon className="w-3 h-3" /> VENCIDO
                      </span>
                    );
                  } else if (menorDataDiff <= 15) {
                    corBordaSuperior =
                      "border-t-amber-500 dark:border-t-amber-500";
                    statusBadge = (
                      <span className="text-[9px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <AlertTriangleIcon className="w-3 h-3" /> ALERTA
                        VALIDADE
                      </span>
                    );
                  }
                }
              }

              return (
                <div
                  key={product.productId}
                  className={`bg-white dark:bg-gray-800 border-t-4 ${corBordaSuperior} rounded-xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.01)] border border-gray-100/50 dark:border-gray-700/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 flex flex-col justify-between`}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center text-[10px] font-mono text-blue-600 bg-blue-50/60 dark:bg-blue-950/30 dark:text-blue-400 px-2 py-0.5 rounded font-bold truncate">
                        <BarcodeIcon className="w-3 h-3 mr-1 shrink-0" />
                        <span className="truncate">
                          {product.sku || "SEM SKU"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {product.imageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxProduct({
                                imageUrl: product.imageUrl,
                                name: product.name,
                              })
                            }
                            title="Ver imagem do produto"
                            className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-all cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {statusBadge}
                      </div>
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

                      {/* Listagem de todos os lotes e validades */}
                      <div className="border-t border-slate-200/60 dark:border-gray-600/50 pt-2 mt-1">
                        <span className="text-[9px] text-gray-400 dark:text-gray-400 font-bold uppercase tracking-wider block mb-1.5">
                          Lotes e Validades ({lotes.length}):
                        </span>
                        {lotes.length > 0 ? (
                          <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                            {lotes.map((lote: any) => {
                              const stringDataPura =
                                lote.expirationDate?.substring(0, 10) || "";
                              const [ano, mes, dia] = stringDataPura
                                ? stringDataPura.split("-")
                                : ["", "", ""];
                              const dataFormatada = stringDataPura
                                ? `${dia}/${mes}/${ano}`
                                : "Sem data";

                              return (
                                <div
                                  key={lote.loteId}
                                  className="flex items-center justify-between text-[11px] bg-white dark:bg-gray-800 px-2 py-1 rounded border border-slate-200/40 dark:border-gray-700"
                                >
                                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                                    <CalendarDaysIcon className="w-3 h-3 shrink-0" />
                                    <span>{dataFormatada}</span>
                                    {lote.lotNumber && (
                                      <span className="text-[9px] text-gray-400 dark:text-gray-500">
                                        ({lote.lotNumber})
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-bold text-gray-700 dark:text-gray-300">
                                    {lote.stockQuantity} un
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 italic block">
                            Nenhum lote cadastrado.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-grow mb-4">
                      <div className="flex items-start gap-2 text-gray-500 dark:text-gray-400 italic text-[11px] bg-gray-50/50 dark:bg-gray-900/20 p-2.5 rounded-lg border-l-2 border-slate-300 dark:border-gray-700 min-h-[2.5rem]">
                        <MessageSquareMoreIcon className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
                        <p className="line-clamp-2 leading-relaxed">
                          {product.note || "Sem anotações complementares."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3.5 border-t border-gray-100 dark:border-gray-700/60">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-gray-400 uppercase font-bold tracking-wider">
                          Estoque Total
                        </span>
                        <span
                          className={`text-base font-black tracking-tight mt-0.5 ${
                            qtdTotal < 5
                              ? "text-rose-600 dark:text-rose-400"
                              : qtdTotal <= 15
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {qtdTotal} un
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

          {hasMoreProducts && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setVisibleCount((prev) => prev + 8)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <span>Ver mais produtos</span>
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-16 text-center">
          <PackageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Nenhum produto localizado no catálogo.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Tente buscar por outro termo ou selecione outra categoria.
          </p>
        </div>
      )}

      <CreateProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateProduct}
      />

      {lightboxProduct && (
        <div
          className="flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setLightboxProduct(null)}
        >
          <div
            className="w-full max-w-xs bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setLightboxProduct(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
              >
                <CircleX className="w-4 h-4" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxProduct.imageUrl}
              alt={lightboxProduct.name}
              className="w-full aspect-square object-cover"
            />
            <p className="p-3 text-xs font-bold text-center text-gray-700 dark:text-gray-200 uppercase tracking-tight">
              {lightboxProduct.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
