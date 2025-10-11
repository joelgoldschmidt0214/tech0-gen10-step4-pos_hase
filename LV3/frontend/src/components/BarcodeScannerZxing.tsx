"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";

interface BarcodeScannerZxingProps {
  onScan?: (janCode: string) => void;
  onError?: (error: string) => void;
  compact?: boolean;
  enableDiagnostics?: boolean; // 診断モード
}

interface DiagnosticsData {
  scanAttempts: number;
  scanSuccesses: number;
  scanFailures: number;
  avgScanTime: number;
  lastScannedCode: string | null;
}

export default function BarcodeScannerZxing({
  onScan,
  onError,
  compact = false,
  enableDiagnostics = false,
}: BarcodeScannerZxingProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanningRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);

  const [diagnostics, setDiagnostics] = useState<DiagnosticsData>({
    scanAttempts: 0,
    scanSuccesses: 0,
    scanFailures: 0,
    avgScanTime: 0,
    lastScannedCode: null,
  });

  const statsRef = useRef({
    scanTimes: [] as number[],
    attempts: 0,
    successes: 0,
    failures: 0,
  });

  // JANコード形式/チェックディジット検証
  const isValidJAN = (code: string): boolean => /^(\d{8}|\d{13})$/.test(code);
  const validateJANCheckDigit = (code: string): boolean => {
    if (code.length === 8) {
      const digits = code.slice(0, 7).split("").map(Number);
      const oddSum = digits.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
      const evenSum = digits.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0);
      const checkDigit = (10 - ((oddSum + evenSum * 3) % 10)) % 10;
      return checkDigit === Number(code[7]);
    } else if (code.length === 13) {
      const digits = code.slice(0, 12).split("").map(Number);
      const oddSum = digits.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
      const evenSum = digits.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0);
      const checkDigit = (10 - ((oddSum + evenSum * 3) % 10)) % 10;
      return checkDigit === Number(code[12]);
    }
    return false;
  };

  const scanFromVideo = async () => {
    if (!scanningRef.current || !videoRef.current || !readerRef.current) {
      if (scanningRef.current) {
        animationFrameRef.current = requestAnimationFrame(scanFromVideo);
      }
      return;
    }

    const video = videoRef.current;
    if (video.readyState < video.HAVE_METADATA) {
      animationFrameRef.current = requestAnimationFrame(scanFromVideo);
      return;
    }

    const startTime = performance.now();
    statsRef.current.attempts += 1;

    try {
      // canvasを使ってvideoから画像をキャプチャしてデコード
      const canvas = canvasRef.current ?? (canvasRef.current = document.createElement("canvas"));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(scanFromVideo);
        return;
      }

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // ビデオのメタデータがまだ読み込まれていない場合はスキップ
      if (videoWidth === 0 || videoHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(scanFromVideo);
        return;
      }

      canvas.width = videoWidth;
      canvas.height = videoHeight;
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

      const result = readerRef.current.decodeFromCanvas(canvas);
      const endTime = performance.now();
      const scanTime = endTime - startTime;
      statsRef.current.scanTimes.push(scanTime);

      if (statsRef.current.scanTimes.length > 100) {
        statsRef.current.scanTimes.shift();
      }

      if (result) {
        const scannedCode = result.getText().trim();
        statsRef.current.successes += 1;

        if (enableDiagnostics) {
          const avgScanTime = statsRef.current.scanTimes.reduce((a, b) => a + b, 0) / statsRef.current.scanTimes.length;
          setDiagnostics({
            scanAttempts: statsRef.current.attempts,
            scanSuccesses: statsRef.current.successes,
            scanFailures: statsRef.current.failures,
            avgScanTime,
            lastScannedCode: scannedCode,
          });
        }

        if (scannedCode) {
          if (!isValidJAN(scannedCode)) {
            const errorMsg = "対応していないバーコード形式です。JANコード（8桁または13桁）をスキャンしてください。";
            setError(errorMsg);
            onError?.(errorMsg);
          } else if (!validateJANCheckDigit(scannedCode)) {
            const errorMsg = "JANコードのチェックディジットが正しくありません。";
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
    } catch (err) {
      const endTime = performance.now();
      const scanTime = endTime - startTime;
      statsRef.current.scanTimes.push(scanTime);

      if (statsRef.current.scanTimes.length > 100) {
        statsRef.current.scanTimes.shift();
      }

      if (err instanceof NotFoundException) {
        statsRef.current.failures += 1;
        
        if (enableDiagnostics) {
          const avgScanTime = statsRef.current.scanTimes.reduce((a, b) => a + b, 0) / statsRef.current.scanTimes.length;
          setDiagnostics({
            scanAttempts: statsRef.current.attempts,
            scanSuccesses: statsRef.current.successes,
            scanFailures: statsRef.current.failures,
            avgScanTime,
            lastScannedCode: null,
          });
        }
      } else {
        console.error("ZXing scan error:", err);
      }
    }

    // 連続スキャン
    if (scanningRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanFromVideo);
    }
  };

  const startScanning = async () => {
    try {
      if (!videoRef.current) return;

      setError(null);
      setIsScanning(true);
      scanningRef.current = true;
      statsRef.current = { scanTimes: [], attempts: 0, successes: 0, failures: 0 };

      // ZXing reader初期化
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },  // より高解像度
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
          // ビデオが実際に再生されるまで少し待機
          setTimeout(resolve, 100);
        };
      });

      // スキャンループ開始
      animationFrameRef.current = requestAnimationFrame(scanFromVideo);
    } catch (err) {
      const errorMsg = "カメラへのアクセスに失敗しました。カメラの権限を確認してください。";
      setError(errorMsg);
      onError?.(errorMsg);
      stopScanning();
      setIsScanning(false);
      console.error("Camera access error:", err);
    }
  };

  const stopScanning = () => {
    scanningRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef) {
      streamRef.getTracks().forEach((track) => track.stop());
      setStreamRef(null);
    }

    setIsScanning(false);
    setError(null);
    setLastScanned(null);
  };

  useEffect(() => {
    // 診断モードでも手動起動にする
    return () => {
      stopScanning();
    };
  }, []);

  const successRate = diagnostics.scanAttempts > 0 
    ? ((diagnostics.scanSuccesses / diagnostics.scanAttempts) * 100).toFixed(2) 
    : "0.00";

  return (
    <div className={compact ? "w-full" : "flex flex-col items-center space-y-4 p-4"}>
      {enableDiagnostics && (
        <h2 className="text-2xl font-bold">バーコードスキャナー診断ツール (ZXing)</h2>
      )}
      
      <div className="relative">
        <video
          ref={videoRef}
          className={
            compact
              ? "w-full h-32 bg-gray-200 rounded-lg object-cover"
              : enableDiagnostics
              ? "w-[640px] h-[480px] bg-gray-200 rounded-lg"
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
            <div className="absolute inset-0 border-2 border-green-500 border-dashed rounded-lg"></div>
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-green-500"></div>
            <div className="absolute bottom-2 w-full flex justify-center">
              <span className="text-green-600 text-xs font-semibold bg-white bg-opacity-80 px-2 rounded">
                バーコードを中央の線に合わせてください (ZXing)
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
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              スキャン開始 (ZXing)
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

      {!compact && !enableDiagnostics && (
        <div className="text-sm text-gray-600 text-center max-w-md">
          <p>JANコード（8桁または13桁）のバーコードをカメラに向けてスキャンしてください。</p>
          <p className="text-green-600 font-semibold">ZXingライブラリ使用 (高精度)</p>
        </div>
      )}

      {enableDiagnostics && (
        <div className="w-full max-w-3xl bg-white border border-gray-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">診断結果 (ZXing)</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>スキャン試行:</strong> {diagnostics.scanAttempts}
            </div>
            <div>
              <strong>成功/失敗:</strong> {diagnostics.scanSuccesses}/{diagnostics.scanFailures}
            </div>
            <div className="col-span-2">
              <strong>成功率:</strong>{" "}
              <span className={parseFloat(successRate) > 10 ? "text-green-600" : "text-red-600"}>
                {successRate}%
              </span>
            </div>
            <div>
              <strong>平均スキャン時間:</strong> {diagnostics.avgScanTime.toFixed(2)} ms
            </div>
            {diagnostics.lastScannedCode && (
              <div className="col-span-2 text-green-600">
                <strong>最後のスキャン:</strong> {diagnostics.lastScannedCode}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
