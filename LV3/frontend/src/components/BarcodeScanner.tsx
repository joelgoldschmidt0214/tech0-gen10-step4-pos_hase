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
  const isScanningRef = useRef(false); // useRefに変更
  const isProcessingRef = useRef(false);

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);
  const lastScannedTimeRef = useRef<number>(0); // 最後にスキャンした時刻

  // デジタルズーム倍率（1.0=ズームなし、2.0=2倍）
  const zoom = 1.5;

  // スキャンインターバル（ミリ秒）
  const SCAN_INTERVAL = 1000;

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

  // 画像前処理: コントラスト強化とシャープ化
  const preprocessImage = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    const processed = new ImageData(
      new Uint8ClampedArray(data),
      imageData.width,
      imageData.height
    );
    const pData = processed.data;

    // 1. グレースケール変換 + コントラスト強化
    const contrast = 1.5; // コントラスト係数
    const factor = (259 * (contrast + 1)) / (259 - contrast);

    for (let i = 0; i < data.length; i += 4) {
      // グレースケール
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

      // コントラスト強化
      const enhanced = factor * (gray - 128) + 128;
      const clamped = Math.max(0, Math.min(255, enhanced));

      pData[i] = pData[i + 1] = pData[i + 2] = clamped;
      pData[i + 3] = data[i + 3];
    }

    // 2. シャープ化フィルタ（3x3カーネル）
    const width = imageData.width;
    const height = imageData.height;
    const sharpened = new Uint8ClampedArray(pData);

    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]; // シャープ化カーネル

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            sum += pData[idx] * kernel[kernelIdx];
          }
        }
        const idx = (y * width + x) * 4;
        const value = Math.max(0, Math.min(255, sum));
        sharpened[idx] = sharpened[idx + 1] = sharpened[idx + 2] = value;
      }
    }

    return new ImageData(sharpened, width, height);
  };

  // zbar でのフレームスキャンループ
  const scanLoop = async () => {
    if (
      !isScanningRef.current ||
      !videoRef.current ||
      isProcessingRef.current
    ) {
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

    if (videoWidth === 0 || videoHeight === 0) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
    }

    try {
      isProcessingRef.current = true;

      // ズーム処理: 中央部分を拡大
      const zoomedWidth = videoWidth / zoom;
      const zoomedHeight = videoHeight / zoom;
      const sx = (videoWidth - zoomedWidth) / 2;
      const sy = (videoHeight - zoomedHeight) / 2;

      ctx.drawImage(
        video,
        sx,
        sy,
        zoomedWidth,
        zoomedHeight,
        0,
        0,
        videoWidth,
        videoHeight
      );

      // 中央の領域だけを切り出してスキャンする (ROI)
      const roiX = Math.floor(videoWidth * 0.1);
      const roiY = Math.floor(videoHeight * 0.35);
      const roiWidth = Math.floor(videoWidth * 0.8);
      const roiHeight = Math.floor(videoHeight * 0.3);

      let imageData = ctx.getImageData(roiX, roiY, roiWidth, roiHeight);

      // 画像前処理
      imageData = preprocessImage(imageData);

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
        data: string | Uint8Array;
      }>;

      if (results && results.length > 0) {
        // dataが文字列かTypedArrayかチェック
        let scannedCode: string;
        const rawData = results[0].data;

        if (typeof rawData === "string") {
          scannedCode = rawData.trim();
        } else if (ArrayBuffer.isView(rawData)) {
          // TypedArray (Uint8Array, Int8Array等) の場合
          const uint8Array =
            rawData instanceof Uint8Array
              ? rawData
              : new Uint8Array(
                  (
                    rawData as {
                      buffer: ArrayBuffer;
                      byteOffset: number;
                      byteLength: number;
                    }
                  ).buffer,
                  (
                    rawData as {
                      buffer: ArrayBuffer;
                      byteOffset: number;
                      byteLength: number;
                    }
                  ).byteOffset,
                  (
                    rawData as {
                      buffer: ArrayBuffer;
                      byteOffset: number;
                      byteLength: number;
                    }
                  ).byteLength
                );
          const decoder = new TextDecoder("utf-8");
          scannedCode = decoder.decode(uint8Array).trim();
        } else if (Array.isArray(rawData)) {
          // 通常の配列の場合
          const uint8Array = new Uint8Array(rawData);
          const decoder = new TextDecoder("utf-8");
          scannedCode = decoder.decode(uint8Array).trim();
        } else {
          // その他の型は文字列化を試みる
          scannedCode = String(rawData || "").trim();
        }

        if (scannedCode) {
          if (!isValidJAN(scannedCode)) {
            const errorMsg = `対応していないバーコード形式です。JANコード（8桁または13桁）をスキャンしてください。`;
            setError(errorMsg);
            onError?.(errorMsg);
          } else if (!validateJANCheckDigit(scannedCode)) {
            const errorMsg =
              "JANコードのチェックディジットが正しくありません。";
            setError(errorMsg);
            onError?.(errorMsg);
          } else {
            // 連続読み取り防止: インターバルベースで制御
            const now = Date.now();
            const timeSinceLastScan = now - lastScannedTimeRef.current;

            if (timeSinceLastScan >= SCAN_INTERVAL) {
              console.log(
                "[BarcodeScanner] Scan approved:",
                scannedCode,
                "interval:",
                timeSinceLastScan
              );
              lastScannedTimeRef.current = now;
              setError(null);
              onScan?.(scannedCode);
            } else {
              console.log(
                "[BarcodeScanner] Scan blocked by interval:",
                scannedCode,
                "remaining:",
                SCAN_INTERVAL - timeSinceLastScan
              );
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

      isScanningRef.current = true;
      setError(null);
      setIsScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setStreamRef(stream);

      const video = videoRef.current;
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = async () => {
          await video.play();
          setTimeout(resolve, 100);
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
      isScanningRef.current = false;
      setIsScanning(false);
      console.error("Camera access error:", err);
    }
  };

  const stopScanning = () => {
    isScanningRef.current = false;

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
    lastScannedTimeRef.current = 0; // リセット
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Canvas context is null");
      return;
    }

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
      const results = await scanImageData(imageData);
      if (results.length > 0) {
        console.log("静的画像からのスキャン成功:", results[0].data);
        alert("スキャン成功！: " + results[0].data);
      } else {
        console.log("静的画像からのスキャン失敗: バーコードが見つかりません。");
        alert("スキャン失敗");
      }
    } catch (error) {
      console.error("静的画像スキャンエラー:", error);
    }
  };

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {/* 開発環境（pnpm dev）のときだけ、このブロックが表示される */}
      {!compact && process.env.NODE_ENV === "development" && (
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

      {/* 開発環境（pnpm dev）のときだけ、このブロックが表示される */}
      {process.env.NODE_ENV === "development" && (
        <>
          <hr className="mt-4 mb-1 border-dashed" />
          <h3>静的画像テスト</h3>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 mt-2
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-500 file:text-white
              hover:file:bg-blue-600
              file:cursor-pointer"
          />{" "}
          <hr className="mb-4 mt-1 border-dashed" />
        </>
      )}
    </div>
  );
}
