import { useEffect, useState } from 'react';
import { Download, X, Share2, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// 保存全局事件，防止組件掛載前已觸發
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 檢查是否已安裝
    const checkInstalled = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
        || (window.navigator as any).standalone === true;
      const displayMode = (window.navigator as any).standalone;

      console.log('[PWA] display-mode standalone:', window.matchMedia('(display-mode: standalone)').matches);
      console.log('[PWA] navigator.standalone:', displayMode);

      if (standalone) {
        console.log('[PWA] Already installed');
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkInstalled()) return;

    // 檢查是否為 iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    console.log('[PWA] Is iOS:', isIOSDevice);

    // 檢查是否已經關閉過提示
    const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (lastDismissed) {
      const hoursSinceDismissed = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        console.log('[PWA] Recently dismissed, hiding');
        return;
      }
    }

    // 如果全局已有事件，直接使用（事件在組件掛載前已觸發）
    if (deferredPrompt) {
      console.log('[PWA] Using deferred prompt');
      setInstallPrompt(deferredPrompt);
      setShowPrompt(true);
    }

    // 監聽 beforeinstallprompt 事件
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt fired');
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 監聽 appinstalled 事件
    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      setIsInstalled(true);
      setShowPrompt(false);
      deferredPrompt = null;
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 對於 iOS，顯示自定義指引
    let timer: NodeJS.Timeout | null = null;
    if (isIOSDevice) {
      timer = setTimeout(() => {
        if (!localStorage.getItem('pwa-ios-prompt-shown') && !deferredPrompt) {
          console.log('[PWA] Showing iOS prompt');
          setShowPrompt(true);
        }
      }, 3000);
    }

    // 檢查 manifest 和 service worker 是否正確載入
    const checkPWARequirements = async () => {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      console.log('[PWA] Manifest found:', !!manifestLink);

      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        console.log('[PWA] Service workers:', regs.length);
      }
    };
    checkPWARequirements();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = installPrompt || deferredPrompt;
    if (!prompt) {
      console.log('[PWA] No prompt available');
      return;
    }

    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    console.log('[PWA] User choice:', outcome);

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setShowPrompt(false);
    deferredPrompt = null;
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  const handleIOSShown = () => {
    localStorage.setItem('pwa-ios-prompt-shown', 'true');
    setShowPrompt(false);
  };

  const forceShow = () => {
    console.log('[PWA] Force show');
    console.log('[PWA] deferredPrompt:', deferredPrompt);
    console.log('[PWA] installPrompt:', installPrompt);
    console.log('[PWA] isInstalled:', isInstalled);
    console.log('[PWA] isIOS:', isIOS);
    setShowPrompt(true);
  };

  // 如果已安裝或已關閉，不顯示
  if (!showPrompt) {
    // 開發模式：顯示除錯資訊
    if (import.meta.env.DEV) {
      return (
        <div className="fixed bottom-4 left-4 z-50">
          <button
            onClick={forceShow}
            className="p-2 text-xs text-gray-400 bg-gray-100 rounded opacity-50 hover:opacity-100"
            title="強制顯示 PWA 提示"
          >
            PWA 測試
          </button>
          {!installPrompt && !deferredPrompt && !isIOS && (
            <div className="mt-2 p-2 text-xs text-yellow-600 bg-yellow-100 rounded max-w-xs">
              ⚠️ 開發模式無法觸發 beforeinstallprompt<br/>
              請用 <b>npm run preview</b> 測試 PWA
            </div>
          )}
        </div>
      );
    }
    return null;
  }

  // iOS 指引
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-grow">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                安裝應用程式
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                請點擊下方的分享按鈕，然後選擇「加入主畫面」
              </p>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>1. 點擊</span>
                <Share2 className="w-4 h-4 text-blue-600" />
                <span>2. 選擇</span>
                <PlusSquare className="w-4 h-4 text-blue-600" />
                <span>加入主畫面</span>
              </div>
            </div>
            <button
              onClick={handleIOSShown}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Android/Chrome/Edge 安裝提示
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-grow">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                安裝離線零售 POS
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                安裝到主畫面，離線也能使用，體驗更流暢
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  disabled={!installPrompt && !deferredPrompt}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {installPrompt || deferredPrompt ? '安裝' : '無法安裝'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                >
                  稍後
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
