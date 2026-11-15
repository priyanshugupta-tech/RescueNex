import React, { useState } from 'react';
import { Volume2, X, AlertTriangle } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleToggle = async () => {
    setLoading(true);
    setError('');

    try {
      await api.post(
        '/api/alerts/siren/toggle',
        {
          sectorId: sectorId || 'SECTOR_RAMBAN',
          active: !isSirenActive
        }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle siren status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-none bg-[#0D1117] border border-[#30363D] p-6 shadow-2xl relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h3 className="text-base font-bold text-white font-sans">
            Acoustic Siren Override
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Target Sector: {sectorId || 'SECTOR_RAMBAN'}
          </p>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          {isSirenActive
            ? 'The evacuation horn is currently broadcasting in this sector. Do you want to silence the physical siren?'
            : 'Sounding the emergency siren will trigger physical audio warning horns across the active sector to instruct drivers and commuters to halt and evacuate immediately.'}
        </p>

        <div className="p-3 bg-[#161B22] border border-[#21262D] mb-4 text-xs font-mono flex items-center justify-between">
          <span className="text-slate-400">Current Status:</span>
          <span className={`font-bold ${isSirenActive ? 'text-rose-400' : 'text-slate-300'}`}>
            {isSirenActive ? 'ACTIVE (BROADCASTING)' : 'STANDBY'}
          </span>
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-400 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-none bg-[#21262D] hover:bg-[#30363D] text-slate-300 text-xs font-semibold transition border border-[#30363D]"
          >
            Cancel
          </button>
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`flex-1 py-2 px-4 rounded-none flex items-center justify-center gap-2 text-xs font-bold transition text-white ${
              isSirenActive
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>
              {loading
                ? 'Dispatching...'
                : isSirenActive
                ? 'Silence Siren'
                : 'Sound Evacuation Siren'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
