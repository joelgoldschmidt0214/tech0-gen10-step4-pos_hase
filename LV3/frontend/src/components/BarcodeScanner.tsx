"use client";

import { useEffect, useRef, useState } from "react";
import { scanImageData } from "@undecaf/zbar-wasm";

interface BarcodeScannerProps {
  onScan?: (janCode: string) => void;
  onError?: (error: string) => void;
  compact?: boolean; // 埋め込み型の横長レイアウト用
}

export default function BarcodeScanner({
  onScan,
  onError,
  compact = false,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);

  // JANコード形式/チェックディジット検証
  const isValidJAN = (code: string): boolean => /^(\d{8}|\d{13})$/.test(code);
  const validateJANCheckDigit = (code: string): boolean => {
    if (code.length === 8) {
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

  // zbar でのフレームスキャンループ
  const scanLoop = async () => {
    if (!isScanning || !videoRef.current || isProcessingRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const video = videoRef.current;
    if (video.readyState < video.HAVE_METADATA) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const canvas =
      canvasRef.current ??
      (canvasRef.current = document.createElement("canvas"));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
    }

    try {
      isProcessingRef.current = true;

      // 中央の領域だけを切り出してスキャンする (ROI)
      const roiX = videoWidth * 0.1;
      const roiY = videoHeight * 0.35;
      const roiWidth = videoWidth * 0.8;
      const roiHeight = videoHeight * 0.3;

      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      const imageData = ctx.getImageData(roiX, roiY, roiWidth, roiHeight);

      // --- デバッグ用 ---
      const debugCanvas = document.getElementById(
        "debugCanvas"
      ) as HTMLCanvasElement;
      if (debugCanvas) {
        const debugCtx = debugCanvas.getContext("2d");
        if (debugCtx) {
          debugCanvas.width = roiWidth;
          debugCanvas.height = roiHeight;
          debugCtx.putImageData(imageData, 0, 0);
        }
      }
      // --- デバッグ終了 ---

      const results = (await scanImageData(imageData)) as Array<{
        data: string;
      }>;

      if (results && results.length > 0) {
        const scannedCode = results[0].data?.trim();

        if (scannedCode) {
          if (!isValidJAN(scannedCode)) {
            const errorMsg =
              "対応していないバーコード形式です。JANコード（8桁または13桁）をスキャンしてください。";
            setError(errorMsg);
            onError?.(errorMsg);
          } else if (!validateJANCheckDigit(scannedCode)) {
            const errorMsg =
              "JANコードのチェックディジットが正しくありません。";
            setError(errorMsg);
            onError?.(errorMsg);
          } else {
            if (lastScanned !== scannedCode) {
              setLastScanned(scannedCode);
              setError(null);
              onScan?.(scannedCode);
              setTimeout(() => setLastScanned(null), 1000);
            }
          }
        }
      }
    } catch (e) {
      console.error("zbar scanning error:", e);
    } finally {
      isProcessingRef.current = false;
      animationFrameRef.current = requestAnimationFrame(scanLoop);
    }
  };

  const startScanning = async () => {
    try {
      if (!videoRef.current) return;

      setError(null);
      setIsScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStreamRef(stream);

      const video = videoRef.current;
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;

      // ここで onloadedmetadata を使う
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      // ループ開始
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      const errorMsg =
        "カメラへのアクセスに失敗しました。カメラの権限を確認してください。";
      setError(errorMsg);
      onError?.(errorMsg);
      stopScanning();
      setIsScanning(false);
      console.error("Camera access error:", err);
    }
  };

  const stopScanning = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isProcessingRef.current = false;

    if (streamRef) {
      streamRef.getTracks().forEach((track) => track.stop());
      setStreamRef(null);
    }

    setIsScanning(false);
    setError(null);
    setLastScanned(null);
  };

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div
      className={
        compact ? "w-full" : "flex flex-col items-center space-y-4 p-4"
      }
    >
      <div className="relative">
        <video
          ref={videoRef}
          className={
            compact
              ? "w-full h-32 bg-gray-200 rounded-lg object-cover"
              : "w-80 h-60 bg-gray-200 rounded-lg"
          }
          autoPlay
          muted
          playsInline
        />
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
            <p className="text-gray-500 text-sm">カメラ待機中...</p>
          </div>
        )}

        {compact && isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* 枠線のみ */}
            <div className="absolute inset-0 border-2 border-red-500 border-dashed rounded-lg"></div>
            {/* 中央の赤い水平線 */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-red-500"></div>
            {/* ガイドテキスト（必要なら） */}
            <div className="absolute bottom-2 w-full flex justify-center">
              <span className="text-red-600 text-xs font-semibold bg-white bg-opacity-80 px-2 rounded">
                バーコードを中央の線に合わせてください
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          className={
            compact
              ? "p-2 bg-red-100 border border-red-400 text-red-700 rounded-md text-xs"
              : "p-3 bg-red-100 border border-red-400 text-red-700 rounded-md max-w-md text-center"
          }
        >
          {error}
        </div>
      )}

      {!compact && (
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
      )}

      {!compact && (
        <div className="text-sm text-gray-600 text-center max-w-md">
          <p>
            JANコード（8桁または13桁）のバーコードをカメラに向けてスキャンしてください。
          </p>
          <p>文具などの商品バーコードに対応しています。</p>
        </div>
      )}

      {/* デバッグ用にスキャン対象領域を表示するcanvas */}
      {!compact && (
        <div>
          <p className="text-sm font-bold mt-4">
            デバッグビュー (スキャン対象領域)
          </p>
          <canvas
            id="debugCanvas"
            className="border-2 border-dashed border-blue-500"
          ></canvas>
        </div>
      )}
    </div>
  );
}
