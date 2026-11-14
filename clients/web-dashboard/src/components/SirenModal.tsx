import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Volume2, X } from 'lucide-react';
import { api } from '../services/api.ts';

interface SirenModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectorId: string;
  isSirenActive: boolean;
  onSuccess: () => void;
}

export const SirenModal: React.FC<SirenModalProps> = ({
  isOpen,
  onClose,
  sectorId,
  isSirenActive,
  onSuccess
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const targetConfirmPhrase = 'CONFIRM_DISASTER_OVERRIDE';
  const isMatch = confirmText.trim() === targetConfirmPhrase;

  const handleToggle = async () => {
    if (!isMatch) return;
    setLoading(true);
    setError('');

    try {
      await api.post(
        '/api/alerts/siren/toggle',
        {
          sectorId: sectorId || 'SECTOR_RAMBAN',
          active: !isSirenActive
        },
        {
          headers: {
            'x-emergency-confirm': targetConfirmPhrase
          }
        }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to trigger siren override.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-sans">
              Emergency Siren Interlock
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Sector: {sectorId || 'SECTOR_RAMBAN'}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Manual acoustic siren broadcast triggers physical audio warning horns across the active sector. 
          To prevent accidental triggers, enter the disaster override code below.
        </p>

        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 mb-4 text-xs font-mono text-center">
          <span className="text-slate-400">Type exact confirmation: </span>
          <span className="text-amber-400 font-bold select-all">CONFIRM_DISASTER_OVERRIDE</span>
        </div>

        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type CONFIRM_DISASTER_OVERRIDE"
          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 mb-4"
        />

        {error && (
          <p className="text-xs font-medium text-rose-400 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleToggle}
            disabled={!isMatch || loading}
            className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition ${
              isMatch && !loading
                ? isSirenActive
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>
              {loading
                ? 'Dispatching...'
                : isSirenActive
                ? 'Standby Sirens'
                : 'Broadcast Alarm'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
