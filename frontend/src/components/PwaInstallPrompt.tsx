import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (window.navigator as any).standalone === true;
      setIsStandalone(isDisplayStandalone || isNavStandalone);
    };

    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    setIsIosDevice(isIos);

    // Capture Chrome/Android beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if user dismissed previously in this session
    const isDismissed = sessionStorage.getItem('svt_pwa_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIosDevice) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('svt_pwa_dismissed', 'true');
  };

  // If already installed or dismissed, do not show the banner
  if (isStandalone || dismissed) {
    return null;
  }

  // Only show if browser supports prompt or is iOS Safari
  if (!deferredPrompt && !isIosDevice) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 max-w-sm w-[calc(100vw-2rem)] p-4 rounded-3xl bg-white text-slate-900 shadow-xl border border-slate-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-slate-900">Install SVT Billing App</h4>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    PWA Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5 leading-relaxed">
                  Fast offline-capable access on your mobile phone or tablet home screen.
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              title="Dismiss"
              className="w-7 h-7 rounded-xl text-slate-400 hover:text-slate-700 flex items-center justify-center hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap"
            >
              Maybe Later
            </button>
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install to Device</span>
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* iOS Safari Installation Guide Modal */}
      <AnimatePresence>
        {showIosGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIosGuide(false)}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center justify-center font-semibold text-xs">
                    SVT
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Install on iPhone / iPad</h3>
                    <p className="text-[11px] text-slate-500 font-normal">Add to Home Screen via Safari</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIosGuide(false)}
                  className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 whitespace-nowrap"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 font-normal">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-800 flex items-center justify-center text-xs font-semibold shrink-0">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Tap the Share Icon</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Locate the <Share className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" /> Share button in Safari's bottom toolbar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-800 flex items-center justify-center text-xs font-semibold shrink-0">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Select 'Add to Home Screen'</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Scroll down the share options and tap <span className="font-medium text-slate-800">"Add to Home Screen"</span>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-800 flex items-center justify-center text-xs font-semibold shrink-0">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Launch from Home Screen</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tap <span className="font-medium text-slate-800">"Add"</span> in the top-right corner to finish.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIosGuide(false)}
                className="w-full py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs whitespace-nowrap"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
