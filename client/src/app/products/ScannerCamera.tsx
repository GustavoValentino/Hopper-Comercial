"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  X,
  Camera,
  ScanLine,
  AlertCircle,
  Loader2,
  RefreshCw,
  Lightbulb,
} from "lucide-react";

type ScannerCameraProps = {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
};

type Estado = "solicitando" | "carregando" | "escaneando" | "erro";

const ScannerCamera = ({ onScanSuccess, onClose }: ScannerCameraProps) => {
  const [estado, setEstado] = useState<Estado>("solicitando");
  const [mensagemErro, setMensagemErro] = useState("");
  const [scanLine, setScanLine] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const animRef = useRef<number>(0);
  const dirRef = useRef<1 | -1>(1);

  const animarLinha = useCallback(() => {
    setScanLine((prev) => {
      const proximo = prev + dirRef.current * 1.5;
      if (proximo >= 100) dirRef.current = -1;
      if (proximo <= 0) dirRef.current = 1;
      return Math.max(0, Math.min(100, proximo));
    });
    animRef.current = requestAnimationFrame(animarLinha);
  }, []);

  const pararScanner = useCallback(async () => {
    cancelAnimationFrame(animRef.current);
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch {}
  }, []);

  const iniciarScanner = useCallback(async () => {
    setEstado("carregando");

    try {
      const scanner = new Html5Qrcode("scanner-viewport", {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 280, height: 140 },
          aspectRatio: 1.777778,
        },
        async (texto) => {
          await pararScanner();
          onScanSuccess(texto);
          onClose();
        },
        () => {},
      );

      setEstado("escaneando");
      animRef.current = requestAnimationFrame(animarLinha);
    } catch (err: any) {
      const negado =
        err?.message?.toLowerCase().includes("permission") ||
        err?.message?.toLowerCase().includes("denied") ||
        err?.name === "NotAllowedError";

      setMensagemErro(
        negado
          ? "Permissão de câmera negada. Habilite o acesso nas configurações do seu navegador e tente novamente."
          : "Não foi possível acessar a câmera. Verifique se ela está disponível e tente novamente.",
      );
      setEstado("erro");
    }
  }, [animarLinha, onScanSuccess, onClose, pararScanner]);

  useEffect(() => {
    return () => {
      pararScanner();
    };
  }, [pararScanner]);

  return (
    <div
      className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Scanner de código de barras"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800">
        {/* HEADER */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Scanner de Código de Barras
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                Leitura EAN-13
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await pararScanner();
              onClose();
            }}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Fechar scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* VIEWPORT DA CÂMERA */}
        <div className="relative bg-gray-950 w-full aspect-video overflow-hidden">
          {/* Elemento nativo da lib — sempre montado */}
          <div
            id="scanner-viewport"
            className="absolute inset-0 [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>img]:hidden [&>div]:hidden"
          />

          {/* ESTADO: SOLICITANDO PERMISSÃO */}
          {estado === "solicitando" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 bg-gray-950">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center">
                <ScanLine className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white">
                  Acesso à câmera necessário
                </p>
              </div>
              <button
                type="button"
                onClick={iniciarScanner}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Permitir câmera
              </button>
            </div>
          )}

          {/* ESTADO: CARREGANDO */}
          {estado === "carregando" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-sm text-gray-400 font-medium">
                Iniciando câmera...
              </p>
            </div>
          )}

          {/* ESTADO: ESCANEANDO — overlay de mira */}
          {estado === "escaneando" && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Escurecimento lateral */}
              <div className="absolute inset-0 bg-black/40" />

              {/* Área central transparente com borda */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="relative border-2 border-emerald-400/80 rounded-lg"
                  style={{ width: 280, height: 140 }}
                >
                  {/* Cantos */}
                  {[
                    "top-0 left-0 border-t-2 border-l-2",
                    "top-0 right-0 border-t-2 border-r-2",
                    "bottom-0 left-0 border-b-2 border-l-2",
                    "bottom-0 right-0 border-b-2 border-r-2",
                  ].map((cls, i) => (
                    <span
                      key={i}
                      className={`absolute w-5 h-5 border-emerald-400 rounded-sm ${cls}`}
                    />
                  ))}

                  {/* Linha de scan animada */}
                  <div
                    className="absolute left-1 right-1 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-90 transition-none"
                    style={{ top: `${scanLine}%` }}
                  />
                </div>
              </div>

              {/* Dica inferior */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <span className="text-[10px] text-white/60 font-medium px-3 py-1 bg-black/40 rounded-full">
                  Aponte para o código de barras
                </span>
              </div>
            </div>
          )}

          {/* ESTADO: ERRO */}
          {estado === "erro" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 bg-gray-950">
              <div className="w-14 h-14 rounded-2xl bg-red-950/50 border border-red-800/40 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white">
                  Câmera indisponível
                </p>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed max-w-[240px]">
                  {mensagemErro}
                </p>
              </div>
              <button
                type="button"
                onClick={iniciarScanner}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar novamente
              </button>
            </div>
          )}
        </div>
        {/* FOOTER */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
          {estado === "solicitando" ||
          estado === "escaneando" ||
          estado === "carregando" ? (
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {estado === "escaneando"
              ? "Scanner ativo — mantenha o código dentro da área"
              : estado === "carregando"
                ? "Inicializando câmera..."
                : estado === "erro"
                  ? "Verifique as permissões do navegador"
                  : "Certifique-se de ter boa iluminação no ambiente"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScannerCamera;
