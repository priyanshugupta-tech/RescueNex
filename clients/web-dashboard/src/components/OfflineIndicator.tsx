import React, { useState, useEffect } from 'react';
import { offlineSync } from '../services/offlineSync.ts';
import { offlineCache } from '../services/offlineCache.ts';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(offlineSync.getOnlineStatus());
  const [pendingCount, setPendingCount] = useState<number>(offlineSync.getPendingCount());
  const [justSyncedCount, setJustSyncedCount] = useState<number | null>(null);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  useEffect(() => {
    const unsubStatus = offlineSync.subscribeStatus((online, count) => {
      setIsOnline(online);
      setPendingCount(count);
    });

    const unsubComp = offlineSync.subscribeCompletion((count) => {
      setJustSyncedCount(count);
      const timer = setTimeout(() => {
        setJustSyncedCount(null);
      }, 4500);
      return () => clearTimeout(timer);
    });

    return () => {
      unsubStatus();
      unsubComp();
    };
  }, []);

  const handleManualRetry = async () => {
    setIsReconnecting(true);
    await offlineSync.checkConnectivityAndSync();
    setTimeout(() => setIsReconnecting(false), 800);
  };

  return (
    <>
      {/* 1. Offline Banner (Persistent when network link is lost) */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-amber-950/90 border-b border-amber-600/60 text-amber-200 px-4 py-2 font-mono text-xs flex flex-wrap items-center justify-between gap-3 shadow-md z-40 relative rounded-none"
          >
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-300 uppercase tracking-wide">
                  [ SATELLITE / CELLULAR LINK DISCONNECTED ]
                </span>
                <span className="text-amber-200/90 ml-2 hidden sm:inline">
                  Running on local cache. Last sync: {offlineCache.formatLastSyncTime()}.
                </span>
                {pendingCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold rounded-none">
                    {pendingCount} item(s) queued for auto-sync
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleManualRetry}
              disabled={isReconnecting}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded-none transition font-semibold text-[11px]"
            >
              <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Reconnecting...' : 'Retry Link'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Auto-Sync Successful Confirmation Toast */}
      <AnimatePresence>
        {isOnline && justSyncedCount !== null && justSyncedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 right-4 z-50 bg-[#161B22] border border-emerald-500/60 text-emerald-300 px-4 py-2.5 rounded-none shadow-2xl font-mono text-xs flex items-center gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold uppercase tracking-wider text-white">
                [ NETWORK RESTORED • SYNC COMPLETED ]
              </p>
              <p className="text-[11px] text-emerald-400/90 mt-0.5 font-sans">
                {justSyncedCount} offline report(s) successfully transmitted to Core Gateway.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
