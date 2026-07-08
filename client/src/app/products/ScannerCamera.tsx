"use client";

import React, { useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X } from "lucide-react";

type ScannerCameraProps = {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
};

const ScannerCamera = ({ onScanSuccess, onClose }: ScannerCameraProps) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "leitor-camera-container",
      {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.777778,
        formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
      },
      false,
    );

    scannerRef.current.render(
      (text) => {
        onScanSuccess(text);
        scannerRef.current?.clear().then(onClose).catch(console.error);
      },
      () => {},
    );

    return () => {
      scannerRef.current?.clear().catch(console.error);
    };
  }, [onScanSuccess, onClose]);

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden w-full max-w-md shadow-2xl relative">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Escaneando Código EAN
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-400 font-medium">
              Aponte para o código de barras
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-gray-900">
          <div
            id="leitor-camera-container"
            className="w-full overflow-hidden rounded-lg bg-gray-950 text-white"
          />
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 text-center text-[10px] text-gray-400 dark:text-gray-400 font-medium">
          Certifique-se de que o ambiente possui boa iluminação.
        </div>
      </div>
    </div>
  );
};

export default ScannerCamera;
