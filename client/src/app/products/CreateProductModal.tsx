"use client";

import React, {
  ChangeEvent,
  FormEvent,
  useState,
  useEffect,
  useRef,
} from "react";
import { v4 } from "uuid";
import AvatarEditor from "react-avatar-editor";
import Header from "@/app/(components)/Header";
import {
  validarEAN13,
  formatarQuantidadeBR,
  formatarEntradaPeso,
} from "@/lib/utils";
import ScannerCamera from "./ScannerCamera";
import { useLazyLookupProductByEanQuery } from "@/state/api";
import {
  BarcodeIcon,
  TagIcon,
  PackageIcon,
  ScaleIcon,
  CalendarIcon,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  X,
  ImagePlus,
  ZoomIn,
  Trash2,
  Barcode,
  Plus,
  FileText,
  Sparkles,
} from "lucide-react";

export type LoteFormData = {
  loteId?: string;
  lotNumber?: string;
  expirationDate: string;
  stockQuantity: number;
};

type ProductFormData = {
  productId?: string;
  sku: string;
  name: string;
  category: string;
  weight: number;
  unit: "KG" | "ML_G";
  section: string;
  note: string;
  lotes: LoteFormData[];
  imageUrl?: string;
  imageBase64?: string;
  isImageRemoved?: boolean;
};

type CreateProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (formData: ProductFormData) => void;
  initialData?: any | null;
};

const SECOES_SUPERMERCADO = [
  {
    grupo: "Corredores de Gôndola",
    itens: [
      { value: "Bazar", label: "Corredor 1: Bazar" },
      { value: "Perfumaria", label: "Corredor 2: Perfumaria" },
      { value: "Limpeza", label: "Corredor 3: Limpeza" },
      { value: "Bebidas Alcoólicas", label: "Corredor 4: Bebidas (Alcoólico)" },
      { value: "Bebidas", label: "Corredor 5: Bebidas" },
      { value: "Mercearia Corredor 6", label: "Corredor 6: Mercearia" },
      { value: "Mercearia Corredor 7", label: "Corredor 7: Mercearia" },
      { value: "Mercearia Corredor 8", label: "Corredor 8: Mercearia" },
      { value: "Mercearia Corredor 9", label: "Corredor 9: Mercearia" },
      { value: "Mercearia Corredor 10", label: "Corredor 10: Mercearia" },
    ],
  },
  {
    grupo: "Departamentos e Serviços",
    itens: [
      { value: "Carnes e Aves", label: "Carnes e Aves" },
      { value: "Hortifruti", label: "Hortifruti" },
      { value: "Padaria", label: "Padaria" },
      { value: "Laticínios", label: "Laticínios" },
      { value: "Congelados", label: "Congelados" },
    ],
  },
];

const CreateProductModal = ({
  isOpen,
  onClose,
  onCreate,
  initialData,
}: CreateProductModalProps) => {
  const [unidadeMedida, setUnidadeMedida] = useState<"KG" | "ML_G">("KG");

  const [formData, setFormData] = useState({
    productId: v4(),
    sku: "",
    name: "",
    category: "",
    weight: "0,000",
    section: "",
    note: "",
  });

  const [lotes, setLotes] = useState<LoteFormData[]>([
    { loteId: v4(), lotNumber: "", expirationDate: "", stockQuantity: 1 },
  ]);

  const [skuErro, setSkuErro] = useState<string | null>(null);
  const [skuValido, setSkuValido] = useState<boolean>(false);
  const [isCameraAberta, setIsCameraAberta] = useState<boolean>(false);

  const [isSelectAberto, setIsSelectAberto] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isEditing = !!initialData;

  const [triggerLookup, { isLoading: isSearchingApi }] =
    useLazyLookupProductByEanQuery();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [scale, setScale] = useState(1.2);
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null);
  const editorRef = useRef<React.ElementRef<typeof AvatarEditor>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);

  useEffect(() => {
    if (initialData) {
      const pesoNumerico = initialData.weight || 0;
      const definirUnidade =
        initialData.unit ||
        (pesoNumerico < 1 && pesoNumerico > 0 ? "ML_G" : "KG");
      setUnidadeMedida(definirUnidade);

      const pesoFormatado =
        definirUnidade === "ML_G"
          ? String(Math.round(pesoNumerico * 1000))
          : pesoNumerico.toFixed(3).replace(".", ",");

      setFormData({
        productId: initialData.productId || v4(),
        sku: initialData.sku || "",
        name: initialData.name || "",
        category: initialData.category || "",
        weight: pesoFormatado,
        section: initialData.section || "",
        note: initialData.note || "",
      });

      if (initialData.lotes && initialData.lotes.length > 0) {
        setLotes(
          initialData.lotes.map((l: any) => ({
            loteId: l.loteId || v4(),
            lotNumber: l.lotNumber || "",
            expirationDate: l.expirationDate
              ? l.expirationDate.substring(0, 10)
              : "",
            stockQuantity: l.stockQuantity || 0,
          })),
        );
      } else {
        setLotes([
          {
            loteId: v4(),
            lotNumber: initialData.lotNumber || "",
            expirationDate: initialData.expirationDate
              ? initialData.expirationDate.substring(0, 10)
              : "",
            stockQuantity: initialData.stockQuantity || 0,
          },
        ]);
      }

      const valido = validarEAN13(initialData.sku || "");
      setSkuValido(valido);
      setSkuErro(valido ? null : "Código EAN inválido na base de dados");
      setImagePreview(initialData.imageUrl || null);
      setNewImageBase64(null);
    } else {
      setUnidadeMedida("KG");
      setFormData({
        productId: v4(),
        sku: "",
        name: "",
        category: "",
        weight: "0,000",
        section: "",
        note: "",
      });
      setLotes([
        { loteId: v4(), lotNumber: "", expirationDate: "", stockQuantity: 1 },
      ]);
      setSkuErro(null);
      setSkuValido(false);
      setImagePreview(null);
      setNewImageBase64(null);
    }
    setPendingFile(null);
    setIsCropOpen(false);
    setScale(1.2);
    setIsImageRemoved(false);
  }, [initialData, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsSelectAberto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const buscarProdutoExterno = async () => {
      if (isEditing) return;

      if (formData.sku.length === 13 && validarEAN13(formData.sku)) {
        try {
          const resultado = await triggerLookup(formData.sku).unwrap();

          if (resultado) {
            if (resultado.name) {
              setFormData((prev) => ({ ...prev, name: resultado.name }));
            }

            if (
              resultado.weightGrams !== null &&
              resultado.weightGrams !== undefined
            ) {
              const unidadeApi = resultado.unit || "KG";
              setUnidadeMedida(unidadeApi);

              const pesoFormatado =
                unidadeApi === "ML_G"
                  ? String(Math.round(resultado.weightGrams))
                  : (resultado.weightGrams / 1000).toFixed(3).replace(".", ",");

              setFormData((prev) => ({ ...prev, weight: pesoFormatado }));
            }

            if (resultado.imageBase64) {
              setImagePreview(resultado.imageBase64);
              setNewImageBase64(resultado.imageBase64);
              setIsImageRemoved(false);
            }
          }
        } catch (error) {
          console.log(
            "Produto não localizado nas bases externas. Preencha manualmente.",
          );
        }
      }
    };

    buscarProdutoExterno();
  }, [formData.sku, triggerLookup, isEditing]);

  const processarEValidarSku = (codigoRaw: string) => {
    const apenasNumeros = codigoRaw.replace(/\D/g, "").slice(0, 13);
    setFormData((prev) => ({ ...prev, sku: apenasNumeros }));

    if (apenasNumeros.length === 0) {
      setSkuErro(null);
      setSkuValido(false);
    } else if (apenasNumeros.length < 13) {
      setSkuErro(`Digitando... (${apenasNumeros.length}/13)`);
      setSkuValido(false);
    } else {
      const ehValido = validarEAN13(apenasNumeros);
      if (ehValido) {
        setSkuErro(null);
        setSkuValido(true);
      } else {
        setSkuErro("Dígito verificador inválido. Verifique o código.");
        setSkuValido(false);
      }
    }
  };

  const handleLeituraCameraSucesso = (codigoLido: string) => {
    setIsCameraAberta(false);
    processarEValidarSku(codigoLido);
  };

  const handleCancelarRecorte = () => {
    setIsCropOpen(false);
    setPendingFile(null);
  };

  const handleAplicarRecorte = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      const base64String = canvas.toDataURL("image/jpeg");
      setImagePreview(base64String);
      setNewImageBase64(base64String);
      setIsImageRemoved(false);
      setIsCropOpen(false);
      setPendingFile(null);
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "sku") {
      processarEValidarSku(value);
    } else if (name === "weight") {
      setFormData({
        ...formData,
        weight: formatarEntradaPeso(value, unidadeMedida),
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleLoteChange = (
    index: number,
    field: keyof LoteFormData,
    value: any,
  ) => {
    const novosLotes = [...lotes];
    if (field === "stockQuantity") {
      novosLotes[index][field] = parseInt(value, 10) || 0;
    } else {
      (novosLotes[index] as any)[field] = value;
    }
    setLotes(novosLotes);
  };

  const adicionarLote = () => {
    setLotes([
      ...lotes,
      { loteId: v4(), lotNumber: "", expirationDate: "", stockQuantity: 1 },
    ]);
  };

  const removerLote = (index: number) => {
    if (lotes.length === 1) return;
    setLotes(lotes.filter((_, i) => i !== index));
  };

  const handleSelecionarImagem = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setScale(1.2);
    setIsCropOpen(true);
    e.target.value = "";
  };

  const handleRemoverImagem = () => {
    setImagePreview(null);
    setNewImageBase64(null);
    setIsImageRemoved(true);
  };

  const getValidadeStatus = (dateStr: string) => {
    if (!dateStr) return "bg-gray-300 dark:bg-gray-600";
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const validade = new Date(dateStr + "T00:00:00");
    const diffDays = Math.ceil(
      (validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]";
    if (diffDays <= 30)
      return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]";
    return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
  };

  const totalUnidadesLotes = lotes.reduce(
    (acc, l) => acc + (Number(l.stockQuantity) || 0),
    0,
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!skuValido) return;

    let pesoFinal = parseFloat(formData.weight.replace(",", ".")) || 0;
    if (unidadeMedida === "ML_G") {
      pesoFinal = pesoFinal / 1000;
    }

    const dadosParaEnviar: ProductFormData = {
      ...formData,
      weight: pesoFinal,
      unit: unidadeMedida,
      section: formData.category.trim(),
      lotes: lotes.map((l) => ({
        lotNumber: l.lotNumber?.trim() || undefined,
        expirationDate: l.expirationDate,
        stockQuantity: Number(l.stockQuantity) || 0,
      })),
      ...(newImageBase64 && { imageBase64: newImageBase64 }),
      isImageRemoved,
    };

    onCreate(dadosParaEnviar);
    onClose();
  };

  if (!isOpen) return null;

  const labelCssStyles =
    "block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1";
  const inputCssStyles =
    "block w-full px-3.5 py-2 bg-gray-50/80 dark:bg-gray-900/40 border border-gray-200/90 dark:border-gray-700/70 rounded-lg text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium placeholder:text-gray-400 dark:placeholder:text-gray-600";

  const labelCategoriaAtual =
    SECOES_SUPERMERCADO.flatMap((g) => g.itens).find(
      (i) => i.value === formData.category,
    )?.label || "Selecione o departamento comercial...";

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 backdrop-blur-xs overflow-y-auto h-full w-full z-50 flex items-center justify-center p-3 sm:p-4">
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800/95 border border-gray-100 dark:border-gray-700/70 shadow-[0_25px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] rounded-2xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto transition-all scale-100">
          {/* Botão Fechar */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100 dark:border-gray-700/60">
            <Header
              name={
                isEditing ? "Editar Produto e Lotes" : "Cadastrar Novo Produto"
              }
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Bloco 1: Identificação Principal & Foto (Grid Compacto) */}
            <div className="bg-gray-50/60 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Foto do Produto (Compacta) */}
              <div className="sm:col-span-3 flex sm:flex-col items-center gap-3 sm:gap-2">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center shadow-xs group">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt="Prévia"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {!imagePreview ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      Adicionar Foto
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRemoverImagem}
                      className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir Foto
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSelecionarImagem}
                  className="hidden"
                />
              </div>

              {/* SKU e Nome */}
              <div className="sm:col-span-9 space-y-3">
                {/* Código de Barras */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="sku" className={labelCssStyles + " mb-0"}>
                      <span className="flex items-center gap-1">
                        <BarcodeIcon className="w-3.5 h-3.5 text-emerald-500" />{" "}
                        Código de Barras (EAN)
                      </span>
                    </label>
                    {skuValido && (
                      <span className="text-[9px] uppercase font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Válido
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="sku"
                      placeholder="Bipe ou digite o código..."
                      onChange={handleChange}
                      value={formData.sku}
                      className={`${inputCssStyles} font-mono tracking-wider flex-1 ${
                        skuErro && formData.sku.length === 13
                          ? "border-rose-500 focus:ring-rose-500"
                          : ""
                      } ${skuValido ? "border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10" : ""}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIsCameraAberta(true)}
                      className="px-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/40 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                      title="Escanear com a câmera"
                    >
                      <Barcode className="w-4 h-4" />
                    </button>
                  </div>
                  {skuErro && (
                    <p
                      className={`text-[10px] mt-1 flex items-center gap-1 ${formData.sku.length === 13 ? "text-rose-500 font-semibold" : "text-gray-400"}`}
                    >
                      {skuErro}
                    </p>
                  )}
                  {isSearchingApi && (
                    <p className="text-[10px] mt-1 text-blue-500 font-medium animate-pulse flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Consultando bases
                      oficiais...
                    </p>
                  )}
                </div>

                {/* Nome do Produto */}
                <div>
                  <label htmlFor="name" className={labelCssStyles}>
                    <span className="flex items-center gap-1">
                      <PackageIcon className="w-3.5 h-3.5 text-emerald-500" />{" "}
                      Nome do Produto
                    </span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Ex: Arroz Branco Camil Tipo 1 5kg"
                    onChange={handleChange}
                    value={formData.name}
                    className={inputCssStyles}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Categoria, Peso/Volume (Grid de 2 colunas perfeitamente alinhado) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Corredor / Departamento (Dropdown Customizado) */}
              <div className="relative" ref={dropdownRef}>
                <label htmlFor="category" className={labelCssStyles}>
                  <span className="flex items-center gap-1">
                    <TagIcon className="w-3.5 h-3.5 text-emerald-500" />{" "}
                    Corredor / Departamento
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsSelectAberto(!isSelectAberto)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 bg-gray-50/80 dark:bg-gray-900/40 border rounded-lg text-xs transition-all text-left font-medium cursor-pointer ${
                    isSelectAberto
                      ? "border-emerald-500 ring-1 ring-emerald-500 text-gray-800 dark:text-gray-100"
                      : "border-gray-200/90 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 hover:bg-gray-100/50"
                  }`}
                >
                  <span
                    className={
                      formData.category
                        ? "font-semibold truncate pr-2"
                        : "text-gray-400 truncate pr-2"
                    }
                  >
                    {labelCategoriaAtual}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ${isSelectAberto ? "rotate-180 text-emerald-500" : ""}`}
                  />
                </button>

                {isSelectAberto && (
                  <div className="absolute top-[100%] left-0 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-lg shadow-xl mt-1 z-50 max-h-56 overflow-y-auto">
                    {SECOES_SUPERMERCADO.map((grupo) => (
                      <div
                        key={grupo.grupo}
                        className="border-b border-gray-50 last:border-none dark:border-gray-700/50 pb-1"
                      >
                        <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50/50 dark:bg-gray-900/30">
                          {grupo.grupo}
                        </div>
                        <div className="px-1 pt-0.5 space-y-0.5">
                          {grupo.itens.map((item) => {
                            const selecionado =
                              formData.category === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    category: item.value,
                                  });
                                  setIsSelectAberto(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex justify-between items-center ${
                                  selecionado
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                }`}
                              >
                                <span className="truncate">{item.label}</span>
                                {selecionado && (
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Peso / Volume com seletor acoplado */}
              <div>
                <label htmlFor="weight" className={labelCssStyles}>
                  <span className="flex items-center gap-1">
                    <ScaleIcon className="w-3.5 h-3.5 text-emerald-500" /> Peso
                    / Volume
                  </span>
                </label>
                <div className="flex border border-gray-200/90 dark:border-gray-700/70 bg-gray-50/80 dark:bg-gray-900/40 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
                  <button
                    type="button"
                    onClick={() => {
                      const novaUnidade =
                        unidadeMedida === "KG" ? "ML_G" : "KG";
                      setUnidadeMedida(novaUnidade);
                      setFormData({
                        ...formData,
                        weight: novaUnidade === "KG" ? "0,000" : "0",
                      });
                    }}
                    className="bg-gray-100/80 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 px-2.5 text-[9px] font-black text-gray-500 dark:text-gray-400 hover:bg-gray-200 transition-colors uppercase tracking-wider min-w-[65px] text-center cursor-pointer select-none"
                    title="Alternar unidade"
                  >
                    {unidadeMedida === "KG" ? "⚖️ KG" : "💧 ML"}
                  </button>
                  <input
                    type="text"
                    name="weight"
                    inputMode="numeric"
                    placeholder={unidadeMedida === "KG" ? "0,000" : "0"}
                    onChange={handleChange}
                    value={formData.weight}
                    className="w-full px-3 py-2 text-right font-mono text-xs text-gray-800 dark:text-gray-100 bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700/60 pt-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <label className={labelCssStyles + " mb-0"}>
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-500" />{" "}
                    Lotes e Validades
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded">
                    Total:{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {formatarQuantidadeBR(String(totalUnidadesLotes))} un
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={adicionarLote}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Novo Lote
                  </button>
                </div>
              </div>

              <div className="bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200/70 dark:border-gray-700/70 rounded-xl overflow-hidden p-2.5">
                <div className="grid grid-cols-12 gap-1.5 px-1 pb-2 border-b border-gray-200/60 dark:border-gray-700/60 text-[9px] font-black tracking-wider text-gray-400 uppercase">
                  <div className="col-span-4">Nº do Lote</div>
                  <div className="col-span-4">Validade</div>
                  <div className="col-span-3 text-right">Quantidade</div>
                </div>

                <div className="space-y-2 pt-2">
                  {lotes.map((lote, index) => (
                    <div
                      key={lote.loteId || index}
                      className="grid grid-cols-12 gap-1.5 items-center group"
                    >
                      {/* Número do Lote */}
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Opcional"
                          value={lote.lotNumber || ""}
                          onChange={(e) =>
                            handleLoteChange(index, "lotNumber", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-700/70 focus:border-emerald-500 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                      </div>

                      {/* Validade */}
                      <div className="col-span-4 relative flex items-center">
                        <span
                          className={`absolute left-2.5 w-1.5 h-1.5 rounded-full z-10 ${getValidadeStatus(lote.expirationDate)}`}
                          title="Status do prazo"
                        />
                        <input
                          type="date"
                          required
                          value={lote.expirationDate}
                          onChange={(e) =>
                            handleLoteChange(
                              index,
                              "expirationDate",
                              e.target.value,
                            )
                          }
                          className="w-full pl-6 pr-2 py-1.5 bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-700/70 focus:border-emerald-500 rounded-lg text-[11px] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                        />
                      </div>

                      {/* Quantidade */}
                      <div className="col-span-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          value={formatarQuantidadeBR(
                            String(lote.stockQuantity),
                          )}
                          onChange={(e) =>
                            handleLoteChange(
                              index,
                              "stockQuantity",
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1.5 bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-700/70 focus:border-emerald-500 rounded-lg text-xs font-semibold text-right text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                      </div>

                      {/* Ação (Remover) */}
                      <div className="col-span-1 flex items-center justify-center">
                        {lotes.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removerLote(index)}
                            className="p-1 text-gray-400 hover:text-rose-500 transition-all cursor-pointer"
                            title="Remover lote"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700 text-[10px]">
                            -
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Bloco 4: Observações Opcionais (Compacto) */}
            <div>
              <label htmlFor="note" className={labelCssStyles}>
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />{" "}
                  Observação Importante (Opcional)
                </span>
              </label>
              <textarea
                name="note"
                rows={2}
                placeholder="Ex: Lote com embalagem frágil ou cuidados especiais..."
                onChange={handleChange}
                value={formData.note}
                className={inputCssStyles + " resize-none"}
              />
            </div>

            {/* Botões de Ação Final */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700/60">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!skuValido}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                  skuValido
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20 cursor-pointer active:scale-95"
                    : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-60"
                }`}
              >
                {isEditing ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL DA CÂMERA SCANNER */}
      {isCameraAberta && (
        <ScannerCamera
          onClose={() => setIsCameraAberta(false)}
          onScanSuccess={handleLeituraCameraSucesso}
        />
      )}

      {/* MODAL DE RECORTE DE IMAGEM */}
      {isCropOpen && pendingFile && (
        <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">
              Ajustar foto do produto
            </h3>

            <div className="flex justify-center mb-4">
              <AvatarEditor
                ref={editorRef}
                image={pendingFile}
                width={220}
                height={220}
                border={20}
                borderRadius={12}
                color={[0, 0, 0, 0.5]}
                scale={scale}
                rotate={0}
              />
            </div>

            <div className="flex items-center gap-2 mb-5">
              <ZoomIn className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelarRecorte}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600/80 text-gray-700 dark:text-gray-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAplicarRecorte}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateProductModal;
