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
  EditIcon,
  CheckCircle2,
  AlertCircle,
  Camera,
  ChevronDown,
  X,
  ImagePlus,
  ZoomIn,
  Trash2,
} from "lucide-react";

type ProductFormData = {
  productId?: string;
  sku: string;
  name: string;
  stockQuantity: number;
  category: string;
  weight: number;
  unit: "KG" | "ML_G";
  expirationDate: string;
  section: string;
  note: string;
  imageUrl?: string;
  imageBase64?: string;
  isImageRemoved?: boolean;
};

type CreateProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (formData: ProductFormData) => void;
  initialData?: ProductFormData | null;
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
    stockQuantity: "0",
    category: "",
    weight: "0,000",
    expirationDate: "",
    section: "",
    note: "",
  });

  const [skuErro, setSkuErro] = useState<string | null>(null);
  const [skuValido, setSkuValido] = useState<boolean>(false);
  const [isCameraAberta, setIsCameraAberta] = useState<boolean>(false);

  const [isSelectAberto, setIsSelectAberto] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Hook de Busca Externa (Cosmos / Open Food Facts) ────────
  const [triggerLookup, { isLoading: isSearchingApi }] =
    useLazyLookupProductByEanQuery();

  // ── Estado da imagem do produto ─────────────────────────────
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

      const extrairDataStringPura = (dataRaw: string) => {
        if (!dataRaw) return "";
        return dataRaw.substring(0, 10);
      };

      setFormData({
        productId: initialData.productId || v4(),
        sku: initialData.sku || "",
        name: initialData.name || "",
        stockQuantity: String(initialData.stockQuantity || 0),
        category: initialData.category || "",
        weight: pesoFormatado,
        expirationDate: initialData.expirationDate
          ? extrairDataStringPura(initialData.expirationDate)
          : "",
        section: initialData.section || "",
        note: initialData.note || "",
      });
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
        stockQuantity: "0",
        category: "",
        weight: "0,000",
        expirationDate: "",
        section: "",
        note: "",
      });
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

  // ── useEffect Automático para Busca via API quando SKU = 13 ──
  useEffect(() => {
    const buscarProdutoExterno = async () => {
      if (formData.sku.length === 13 && validarEAN13(formData.sku)) {
        try {
          const resultado = await triggerLookup(formData.sku).unwrap();

          if (resultado) {
            // Preenche o nome se estiver vazio ou substitui
            if (resultado.name) {
              setFormData((prev) => ({ ...prev, name: resultado.name }));
            }

            // Preenche o peso e unidade caso venha da API
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

            // Preenche a imagem caso venha convertida em Base64
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
  }, [formData.sku, triggerLookup]);

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

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "sku") {
      processarEValidarSku(value);
    } else if (name === "stockQuantity") {
      setFormData({ ...formData, stockQuantity: formatarQuantidadeBR(value) });
    } else if (name === "weight") {
      setFormData({
        ...formData,
        weight: formatarEntradaPeso(value, unidadeMedida),
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleLeituraCameraSucesso = (codigoEscaneado: string) => {
    processarEValidarSku(codigoEscaneado);
    setIsCameraAberta(false);
  };

  // ── Handlers de imagem ───────────────────────────────────────
  const handleSelecionarImagem = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setScale(1.2);
    setIsCropOpen(true);
    e.target.value = "";
  };

  const handleAplicarRecorte = () => {
    if (!editorRef.current) return;
    const canvas = editorRef.current.getImage();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setNewImageBase64(dataUrl);
    setImagePreview(dataUrl);
    setIsCropOpen(false);
    setPendingFile(null);
    setIsImageRemoved(false);
  };

  const handleCancelarRecorte = () => {
    setIsCropOpen(false);
    setPendingFile(null);
  };

  const handleRemoverImagem = () => {
    setImagePreview(null);
    setNewImageBase64(null);
    setIsImageRemoved(true);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!skuValido) return;

    let pesoFinal = parseFloat(formData.weight.replace(",", ".")) || 0;
    if (unidadeMedida === "ML_G") {
      pesoFinal = pesoFinal / 1000;
    }

    const dadosParaEnviar: ProductFormData = {
      ...formData,
      stockQuantity: parseInt(formData.stockQuantity, 10) || 0,
      weight: pesoFinal,
      unit: unidadeMedida,
      section: formData.category.trim(),
      ...(newImageBase64 && { imageBase64: newImageBase64 }),
      isImageRemoved,
    };

    onCreate(dadosParaEnviar);
    onClose();
  };

  if (!isOpen) return null;

  const labelCssStyles =
    "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5";
  const inputCssStyles =
    "block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/80 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium";

  const isEditing = !!initialData;

  const labelCategoriaAtual =
    SECOES_SUPERMERCADO.flatMap((g) => g.itens).find(
      (i) => i.value === formData.category,
    )?.label || "Selecione o departamento comercial...";

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-xs overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/70 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-xl p-6 md:p-8 max-h-[90vh] overflow-y-auto transition-all scale-100">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <Header
            name={isEditing ? "Editar Produto" : "Cadastrar Novo Produto"}
          />

          <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-2 gap-4">
            {/* FOTO DO PRODUTO */}
            <div className="col-span-2 flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="Prévia do produto"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImagePlus className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelCssStyles + " mb-0"}>
                  Foto do Produto (opcional)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/60 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    {imagePreview ? "Trocar foto" : "Adicionar foto"}
                  </button>

                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoverImagem}
                      className="px-3 py-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                      title="Remover foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
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
            </div>

            {/* CÓDIGO DE BARRAS (SKU) */}
            <div className="col-span-2">
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="sku" className={labelCssStyles}>
                  <span className="flex items-center gap-1.5">
                    <BarcodeIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />{" "}
                    Código de Barras
                  </span>
                </label>
                {skuValido && (
                  <span className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 tracking-wider bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3" /> Válido
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="sku"
                  placeholder="Bipe com o leitor ou use a câmera..."
                  onChange={handleChange}
                  value={formData.sku}
                  className={`${inputCssStyles} font-mono tracking-wider flex-1 ${
                    skuErro && formData.sku.length === 13
                      ? "border-rose-500 focus:ring-rose-500 focus:border-rose-500"
                      : ""
                  } ${skuValido ? "border-emerald-500 focus:ring-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10" : ""}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsCameraAberta(true)}
                  className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100/70 dark:hover:bg-emerald-950/60 transition-all flex items-center justify-center shadow-xs active:scale-95 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              {skuErro && (
                <p
                  className={`text-[11px] mt-1.5 flex items-center gap-1 ${
                    formData.sku.length === 13
                      ? "text-rose-600 dark:text-rose-400 font-semibold"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {formData.sku.length === 13 && (
                    <AlertCircle className="w-3 h-3 text-rose-500" />
                  )}
                  {skuErro}
                </p>
              )}
              {isSearchingApi && (
                <p className="text-[11px] mt-1.5 text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                  Buscando informações do produto nas bases oficiais...
                </p>
              )}
            </div>

            {/* NOME DO PRODUTO */}
            <div className="col-span-2">
              <label htmlFor="name" className={labelCssStyles}>
                <span className="flex items-center gap-1.5">
                  <PackageIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />{" "}
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

            {/* DROPDOWN CUSTOMIZADO DE CATEGORIA */}
            <div className="col-span-2 relative" ref={dropdownRef}>
              <label htmlFor="category" className={labelCssStyles}>
                <span className="flex items-center gap-1.5">
                  <TagIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />{" "}
                  Corredor e Departamento
                </span>
              </label>

              <button
                type="button"
                onClick={() => setIsSelectAberto(!isSelectAberto)}
                className={`w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border rounded-lg text-xs transition-all text-left font-medium outline-hidden cursor-pointer ${
                  isSelectAberto
                    ? "border-emerald-500 ring-1 ring-emerald-500 text-gray-800 dark:text-gray-100"
                    : "border-gray-200 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-900/80"
                }`}
              >
                <span
                  className={
                    formData.category
                      ? "font-semibold"
                      : "text-gray-400 dark:text-gray-500 font-normal"
                  }
                >
                  {labelCategoriaAtual}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 ${
                    isSelectAberto ? "rotate-180 text-emerald-500" : ""
                  }`}
                  strokeWidth={2.5}
                />
              </button>

              {isSelectAberto && (
                <div className="absolute top-[100%] left-0 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-lg shadow-xl mt-1 z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                  {SECOES_SUPERMERCADO.map((grupo) => (
                    <div
                      key={grupo.grupo}
                      className="border-b border-gray-50 last:border-none dark:border-gray-700/50 pb-1.5"
                    >
                      <div className="px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-900/30 select-none">
                        {grupo.grupo}
                      </div>
                      <div className="px-1.5 pt-1 space-y-0.5">
                        {grupo.itens.map((item) => {
                          const selecionado = formData.category === item.value;
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
                              className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors cursor-pointer flex justify-between items-center ${
                                selecionado
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold"
                                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100"
                              }`}
                            >
                              {item.label}
                              {selecionado && (
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
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

            {/* QUANTIDADE EM ESTOQUE */}
            <div>
              <label htmlFor="stockQuantity" className={labelCssStyles}>
                <span className="flex items-center gap-1.5">
                  <PackageIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />{" "}
                  Qtd. Estoque
                </span>
              </label>
              <input
                type="text"
                name="stockQuantity"
                inputMode="numeric"
                placeholder="0"
                onChange={handleChange}
                value={formData.stockQuantity}
                className={`${inputCssStyles} text-right font-semibold`}
                required
              />
            </div>

            {/* PESO / VOLUME COM SELETOR ACOPLADO */}
            <div>
              <label htmlFor="weight" className={labelCssStyles}>
                <span className="flex items-center gap-1.5">
                  <ScaleIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />{" "}
                  Peso / Vol. Líquido
                </span>
              </label>
              <div className="flex border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
                <button
                  type="button"
                  onClick={() => {
                    const novaUnidade = unidadeMedida === "KG" ? "ML_G" : "KG";
                    setUnidadeMedida(novaUnidade);
                    setFormData({
                      ...formData,
                      weight: novaUnidade === "KG" ? "0,000" : "0",
                    });
                  }}
                  className="bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 px-3 text-[9px] font-black text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors uppercase tracking-wider min-w-[75px] select-none text-center cursor-pointer"
                  title="Clique para alternar a unidade de medida"
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
                  className="w-full px-3 py-2.5 text-right font-mono text-xs text-gray-700 dark:text-gray-200 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* DATA DE VENCIMENTO */}
            <div className="col-span-2">
              <label htmlFor="expirationDate" className={labelCssStyles}>
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />{" "}
                  Data de Vencimento
                </span>
              </label>
              <input
                type="date"
                name="expirationDate"
                onChange={handleChange}
                value={formData.expirationDate}
                className={`${inputCssStyles} cursor-pointer`}
                required
              />
            </div>

            {/* OBSERVAÇÃO */}
            <div className="col-span-2">
              <label htmlFor="note" className={labelCssStyles}>
                <span className="flex items-center gap-1.5">
                  <EditIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />{" "}
                  Observação Importante
                </span>
              </label>
              <textarea
                name="note"
                placeholder="Ex: Lote com embalagem frágil..."
                onChange={handleChange}
                value={formData.note}
                className={`${inputCssStyles} h-20 resize-none`}
              />
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="col-span-2 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600/80 text-gray-700 dark:text-gray-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!skuValido}
                className={`px-6 py-2.5 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer ${
                  !skuValido
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60"
                    : isEditing
                      ? "bg-amber-500 hover:bg-amber-600 active:scale-95 shadow-md"
                      : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md"
                }`}
              >
                {isEditing ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </form>
        </div>
      </div>

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

      {isCameraAberta && (
        <ScannerCamera
          onScanSuccess={handleLeituraCameraSucesso}
          onClose={() => setIsCameraAberta(false)}
        />
      )}
    </>
  );
};

export default CreateProductModal;
