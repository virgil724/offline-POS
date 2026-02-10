import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // 使用 Ref 追蹤實例，避免 useEffect 閉包問題
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasScannedRef = useRef(false);

  // 使用 ref 保存最新的 callback，避免父組件 re-render 導致相機重啟
  const callbacksRef = useRef({ onScan, onClose });
  useEffect(() => {
    callbacksRef.current = { onScan, onClose };
  }, [onScan, onClose]);

  useEffect(() => {
    let isMounted = true;
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    const stopCamera = () => {
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch (e) {
          // 忽略重置時的錯誤
        }
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const startScanning = async () => {
      try {
        if (!isMounted) return;
        setIsScanning(true);

        const devices = await codeReader.listVideoInputDevices();

        if (!isMounted) return;
        if (devices.length === 0) {
          setError('未找到攝影機設備');
          setIsScanning(false);
          return;
        }

        // 優先選擇後置鏡頭
        const deviceId = devices.find(d => d.label.toLowerCase().includes('back'))?.deviceId
          || devices[devices.length - 1].deviceId;

        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            facingMode: 'environment',
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            // @ts-ignore
            advanced: [{ focusMode: 'continuous' }]
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
        }

        await codeReader.decodeFromStream(
          stream,
          videoRef.current!,
          (result, err) => {
            if (!isMounted) return;

            if (result && !hasScannedRef.current) {
              hasScannedRef.current = true;
              const barcode = result.getText();
              console.log('[BarcodeScanner] Barcode detected:', barcode);

              if (navigator.vibrate) navigator.vibrate(200);

              callbacksRef.current.onScan(barcode);
              stopCamera();
              callbacksRef.current.onClose();
            }

            if (err && !(err instanceof NotFoundException)) {
              console.warn('Scan error:', err);
            }
          }
        );
      } catch (err) {
        if (isMounted) {
          console.error('Failed to start scanner:', err);
          setError('無法啟動攝影機，請檢查權限設定');
          setIsScanning(false);
        }
      }
    };

    startScanning();

    return () => {
      isMounted = false;
      stopCamera();
      codeReaderRef.current = null;
    };
    // 依賴陣列留空，確保只在 mount 時執行一次
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 pt-[max(env(safe-area-inset-top),24px)]">
      <div className="relative w-full max-w-md p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5" />
            <span className="text-lg font-medium">掃描條碼</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Video feed */}
        <div className="relative overflow-hidden rounded-lg bg-gray-900 shadow-2xl ring-1 ring-white/10" style={{ minHeight: '300px' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />

          {/* Scan overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* 掃描框框 (置中) */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/30 rounded-lg">
              <div className="absolute top-0 left-0 w-4 h-4 border-l-4 border-t-4 border-green-500 -ml-0.5 -mt-0.5 rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-4 h-4 border-r-4 border-t-4 border-green-500 -mr-0.5 -mt-0.5 rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-l-4 border-b-4 border-green-500 -ml-0.5 -mb-0.5 rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r-4 border-b-4 border-green-500 -mr-0.5 -mb-0.5 rounded-br-sm" />

              {/* 動畫掃描線 */}
              {isScanning && (
                <div className="absolute left-2 right-2 h-0.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-scan" />
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 mt-4 text-sm text-red-200 bg-red-900/50 border border-red-700 rounded-lg flex items-center justify-center">
            {error}
          </div>
        )}

        {/* Instructions */}
        <p className="mt-4 text-center text-gray-300 text-sm">
          將條碼置於框線內即可自動辨識
        </p>
      </div>
    </div>
  );
}
