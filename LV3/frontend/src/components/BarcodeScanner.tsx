"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface BarcodeScannerProps {
  onScan?: (janCode: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

export default function BarcodeScanner({
  onScan,
  onError,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  // JANコード形式チェック（8桁または13桁の数字）
  const isValidJAN = (code: string): boolean => {
    return /^(\d{8}|\d{13})$/.test(code);
  };

  // JANコードのチェックディジット検証
  const validateJANCheckDigit = (code: string): boolean => {
    if (code.length === 8) {
      // JAN-8のチェックディジット計算
      const digits = code.slice(0, 7).split("").map(Number);
      const oddSum = digits
        .filter((_, i) => i % 2 === 0)
        .reduce((a, b) => a + b, 0);
      const evenSum = digits
        .filter((_, i) => i % 2 === 1)
        .reduce((a, b) => a + b, 0);
      const checkDigit = (10 - ((oddSum + evenSum * 3) % 10)) % 10;
      return checkDigit === Number(code[7]);
    } else if (code.length === 13) {
      // JAN-13のチェックディジット計算
      const digits = code.slice(0, 12).split("").map(Number);
      const oddSum = digits
        .filter((_, i) => i % 2 === 0)
        .reduce((a, b) => a + b, 0);
      const evenSum = digits
        .filter((_, i) => i % 2 === 1)
        .reduce((a, b) => a + b, 0);
      const checkDigit = (10 - ((oddSum + evenSum * 3) % 10)) % 10;
      return checkDigit === Number(code[12]);
    }
    return false;
  };

  const startScanning = async () => {
    try {
      if (!videoRef.current) return;

      setError(null);
      setIsScanning(true);

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // getUserMediaでカメラストリームを取得
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // 背面カメラを優先
      });
      setStreamRef(stream);
      videoRef.current.srcObject = stream;

      reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const scannedCode = result.getText();

            // JANコード形式チェック
            if (!isValidJAN(scannedCode)) {
              const errorMsg =
                "対応していないバーコード形式です。JANコード（8桁または13桁）をスキャンしてください。";
              setError(errorMsg);
              onError?.(errorMsg);
              return;
            }

            // チェックディジット検証
            if (!validateJANCheckDigit(scannedCode)) {
              const errorMsg =
                "JANコードのチェックディジットが正しくありません。";
              setError(errorMsg);
              onError?.(errorMsg);
              return;
            }

            // 連続読み取り防止（同じコードを1秒以内に読み取らない）
            if (lastScanned === scannedCode) return;

            setLastScanned(scannedCode);
            setError(null);
            onScan?.(scannedCode);
            onClose?.(); // モーダルを閉じる

            // 1秒後にlastScannedをリセット
            setTimeout(() => setLastScanned(null), 1000);
          }

          if (
            error &&
            !(error instanceof Error && error.name === "NotFoundException")
          ) {
            console.error("Barcode scanning error:", error);
          }
        }
      );
    } catch (err) {
      const errorMsg =
        "カメラへのアクセスに失敗しました。カメラの権限を確認してください。";
      setError(errorMsg);
      onError?.(errorMsg);
      setIsScanning(false);
      console.error("Camera access error:", err);
    }
  };

  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);

  const stopScanning = () => {
    // カメラストリームを停止
    if (streamRef) {
      streamRef.getTracks().forEach((track) => track.stop());
      setStreamRef(null);
    }

    if (readerRef.current) {
      readerRef.current = null;
    }
    setIsScanning(false);
    setError(null);
    setLastScanned(null);
  };

  useEffect(() => {
    // モーダルが開かれた時に自動的にスキャンを開始
    startScanning();
    
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <div className="relative">
        <video
          ref={videoRef}
          className="w-80 h-60 bg-gray-200 rounded-lg"
          style={{ transform: "scaleX(-1)" }} // ミラー表示
        />
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
            <p className="text-gray-500">カメラ待機中...</p>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md max-w-md text-center">
          {error}
        </div>
      )}

      <div className="flex space-x-2">
        {!isScanning ? (
          <button
            onClick={startScanning}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            スキャン開始
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            スキャン停止
          </button>
        )}
      </div>

      <div className="text-sm text-gray-600 text-center max-w-md">
        <p>
          JANコード（8桁または13桁）のバーコードをカメラに向けてスキャンしてください。
        </p>
        <p>文具などの商品バーコードに対応しています。</p>
      </div>
    </div>
  );
}
