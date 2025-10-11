"use client";

import { useEffect, useRef, useState } from "react";
import { scanImageData } from "@undecaf/zbar-wasm";

interface DiagnosticsData {
  videoWidth: number;
  videoHeight: number;
  videoFrameRate: number;
  roiWidth: number;
  roiHeight: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  scanAttempts: number;
  scanSuccesses: number;
  scanFailures: number;
  avgScanTime: number;
  lastError: string | null;
}

export default function BarcodeScannerDiagnostics() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isScanningRef = useRef(false); // useRefに変更
  const [isScanning, setIsScanning] = useState(false);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);
  const [zbarReady, setZbarReady] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData>({
    videoWidth: 0,
    videoHeight: 0,
    videoFrameRate: 0,
    roiWidth: 0,
    roiHeight: 0,
    brightness: 0,
    contrast: 0,
    sharpness: 0,
    scanAttempts: 0,
    scanSuccesses: 0,
    scanFailures: 0,
    avgScanTime: 0,
    lastError: null,
  });

  const statsRef = useRef({
    scanTimes: [] as number[],
    attempts: 0,
    successes: 0,
    failures: 0,
  });

  // 画像品質の計算
  const calculateImageQuality = (imageData: ImageData) => {
    const data = imageData.data;
    let sumBrightness = 0;
    let sumSquares = 0;
    const pixels = data.length / 4;

    // 明るさとコントラストの計算
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sumBrightness += gray;
      sumSquares += gray * gray;
    }

    const brightness = sumBrightness / pixels;
    const variance = sumSquares / pixels - brightness * brightness;
    const contrast = Math.sqrt(variance);

    // シャープネスの計算（ラプラシアンフィルタの分散）
    let sharpnessSum = 0;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        
        const top = 0.299 * data[((y-1) * width + x) * 4] + 0.587 * data[((y-1) * width + x) * 4 + 1] + 0.114 * data[((y-1) * width + x) * 4 + 2];
        const bottom = 0.299 * data[((y+1) * width + x) * 4] + 0.587 * data[((y+1) * width + x) * 4 + 1] + 0.114 * data[((y+1) * width + x) * 4 + 2];
        const left = 0.299 * data[(y * width + x - 1) * 4] + 0.587 * data[(y * width + x - 1) * 4 + 1] + 0.114 * data[(y * width + x - 1) * 4 + 2];
        const right = 0.299 * data[(y * width + x + 1) * 4] + 0.587 * data[(y * width + x + 1) * 4 + 1] + 0.114 * data[(y * width + x + 1) * 4 + 2];
        
        const laplacian = Math.abs(4 * gray - top - bottom - left - right);
        sharpnessSum += laplacian * laplacian;
      }
    }

    const sharpness = Math.sqrt(sharpnessSum / ((width - 2) * (height - 2)));

    return { brightness, contrast, sharpness };
  };

  const diagnosticLoop = async () => {
    if (!isScanningRef.current || !videoRef.current) {
      animationFrameRef.current = requestAnimationFrame(diagnosticLoop);
      return;
    }

    const video = videoRef.current;
    
    if (video.readyState < video.HAVE_METADATA) {
      animationFrameRef.current = requestAnimationFrame(diagnosticLoop);
      return;
    }

    const canvas = canvasRef.current ?? (canvasRef.current = document.createElement("canvas"));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(diagnosticLoop);
      return;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // ビデオのメタデータがまだ読み込まれていない場合はスキップ
    if (videoWidth === 0 || videoHeight === 0) {
      animationFrameRef.current = requestAnimationFrame(diagnosticLoop);
      return;
    }

    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
    }

    try {
      const startTime = performance.now();

      // ROI設定
      const roiX = Math.floor(videoWidth * 0.1);
      const roiY = Math.floor(videoHeight * 0.35);
      const roiWidth = Math.floor(videoWidth * 0.8);
      const roiHeight = Math.floor(videoHeight * 0.3);

      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      const imageData = ctx.getImageData(roiX, roiY, roiWidth, roiHeight);

      // 画質計算
      const quality = calculateImageQuality(imageData);

      // フレームレート取得
      const track = streamRef?.getVideoTracks()[0];
      const settings = track?.getSettings();
      const frameRate = settings?.frameRate || 0;

      // スキャン試行
      statsRef.current.attempts += 1;
      let scanSuccess = false;
      let lastError = null;

      try {
        const results = await scanImageData(imageData) as Array<{ data: string }>;
        if (results && results.length > 0) {
          scanSuccess = true;
          statsRef.current.successes += 1;
        } else {
          statsRef.current.failures += 1;
        }
      } catch (e: any) {
        statsRef.current.failures += 1;
        lastError = e.message || "Unknown error";
      }

      const endTime = performance.now();
      const scanTime = endTime - startTime;
      statsRef.current.scanTimes.push(scanTime);

      // 最新100件のみ保持
      if (statsRef.current.scanTimes.length > 100) {
        statsRef.current.scanTimes.shift();
      }

      const avgScanTime = statsRef.current.scanTimes.reduce((a, b) => a + b, 0) / statsRef.current.scanTimes.length;

      // デバッグキャンバスに表示
      const debugCanvas = document.getElementById("diagnosticDebugCanvas") as HTMLCanvasElement;
      if (debugCanvas) {
        const debugCtx = debugCanvas.getContext("2d");
        if (debugCtx) {
          debugCanvas.width = roiWidth;
          debugCanvas.height = roiHeight;
          debugCtx.putImageData(imageData, 0, 0);
          
          // ROI情報をオーバーレイ
          debugCtx.strokeStyle = scanSuccess ? "#00ff00" : "#ff0000";
          debugCtx.lineWidth = 2;
          debugCtx.strokeRect(0, 0, roiWidth, roiHeight);
        }
      }

      const newDiagnostics = {
        videoWidth,
        videoHeight,
        videoFrameRate: frameRate,
        roiWidth,
        roiHeight,
        brightness: quality.brightness,
        contrast: quality.contrast,
        sharpness: quality.sharpness,
        scanAttempts: statsRef.current.attempts,
        scanSuccesses: statsRef.current.successes,
        scanFailures: statsRef.current.failures,
        avgScanTime,
        lastError,
      };

      setDiagnostics(newDiagnostics);
    } catch (e: any) {
      console.error("Diagnostic error:", e);
    } finally {
      animationFrameRef.current = requestAnimationFrame(diagnosticLoop);
    }
  };

  const startScanning = async () => {
    try {
      if (!videoRef.current) return;

      isScanningRef.current = true; // refを先に更新
      setIsScanning(true);
      statsRef.current = { scanTimes: [], attempts: 0, successes: 0, failures: 0 };

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

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = async () => {
          await video.play();
          // ビデオが実際に再生されるまで少し待機
          setTimeout(resolve, 100);
        };
      });

      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(diagnosticLoop);
    } catch (err) {
      console.error("Camera access error:", err);
      isScanningRef.current = false;
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    isScanningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef) {
      streamRef.getTracks().forEach((track) => track.stop());
      setStreamRef(null);
    }

    setIsScanning(false);
  };

  useEffect(() => {
    // zbar-wasmの初期化を待つ
    const initZbar = async () => {
      try {
        // ダミーのImageDataでzbar-wasmを初期化
        const dummyData = new ImageData(1, 1);
        await scanImageData(dummyData);
        setZbarReady(true);
      } catch (e) {
        console.log("zbar-wasm initialized");
        setZbarReady(true);
      }
    };
    
    initZbar();
    
    return () => {
      stopScanning();
    };
  }, []);

  const successRate = diagnostics.scanAttempts > 0 
    ? ((diagnostics.scanSuccesses / diagnostics.scanAttempts) * 100).toFixed(2) 
    : "0.00";

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <h2 className="text-2xl font-bold">バーコードスキャナー診断ツール (zbar-wasm)</h2>
      
      {!zbarReady && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded">
          zbar-wasmを初期化中...
        </div>
      )}
      
      <div className="relative">
        <video
          ref={videoRef}
          className="w-[640px] h-[480px] bg-gray-200 rounded-lg"
          autoPlay
          muted
          playsInline
        />
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
            <p className="text-gray-500">カメラ待機中...</p>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        {!isScanning ? (
          <button
            onClick={startScanning}
            disabled={!zbarReady}
            className={`px-4 py-2 text-white rounded-md ${
              zbarReady
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            診断開始
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            診断停止
          </button>
        )}
      </div>

      <div className="w-full max-w-3xl bg-white border border-gray-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">診断結果</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>ビデオ解像度:</strong> {diagnostics.videoWidth}x{diagnostics.videoHeight}
          </div>
          <div>
            <strong>フレームレート:</strong> {diagnostics.videoFrameRate.toFixed(1)} fps
          </div>
          <div>
            <strong>ROI領域:</strong> {diagnostics.roiWidth}x{diagnostics.roiHeight}
          </div>
          <div>
            <strong>明るさ:</strong> {diagnostics.brightness.toFixed(2)} <span className="text-xs text-gray-500">(最適: 100-150)</span>
          </div>
          <div>
            <strong>コントラスト:</strong> {diagnostics.contrast.toFixed(2)} <span className="text-xs text-gray-500">(最適: 40以上)</span>
          </div>
          <div>
            <strong>シャープネス:</strong> {diagnostics.sharpness.toFixed(2)} <span className="text-xs text-gray-500">(最適: 20以上)</span>
          </div>
          <div>
            <strong>スキャン試行:</strong> {diagnostics.scanAttempts}
          </div>
          <div>
            <strong>成功/失敗:</strong> {diagnostics.scanSuccesses}/{diagnostics.scanFailures}
          </div>
          <div className="col-span-2">
            <strong>成功率:</strong> <span className={parseFloat(successRate) > 10 ? "text-green-600" : "text-red-600"}>{successRate}%</span>
          </div>
          <div>
            <strong>平均スキャン時間:</strong> {diagnostics.avgScanTime.toFixed(2)} ms
          </div>
          {diagnostics.lastError && (
            <div className="col-span-2 text-red-600">
              <strong>最後のエラー:</strong> {diagnostics.lastError}
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-3xl bg-yellow-50 border border-yellow-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">診断ガイド</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>明るさが80未満:</strong> 照明が不足しています</li>
          <li>• <strong>明るさが180以上:</strong> 露出オーバーです</li>
          <li>• <strong>コントラストが30未満:</strong> 画像がぼやけています</li>
          <li>• <strong>シャープネスが15未満:</strong> フォーカスが合っていません</li>
          <li>• <strong>成功率が5%未満:</strong> カメラ設定または画像処理に問題があります</li>
          <li>• <strong>スキャン時間が100ms以上:</strong> 処理が遅すぎます</li>
        </ul>
      </div>

      <div className="w-full max-w-3xl">
        <h3 className="text-lg font-semibold mb-2">ROI領域プレビュー</h3>
        <canvas
          id="diagnosticDebugCanvas"
          className="border-2 border-blue-500 w-full"
          style={{ maxHeight: "300px", objectFit: "contain" }}
        ></canvas>
      </div>
    </div>
  );
}
