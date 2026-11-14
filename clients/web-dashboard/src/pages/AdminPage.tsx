import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { ShieldCheck, UserCheck, Check, Clock, AlertTriangle, Loader2 } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/auth/pending');
      if (res.data.success) {
        setPendingUsers(res.data.pendingUsers || []);
      }
    } catch (e) {
      console.error('Failed to fetch pending accounts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    try {
      await api.post(`/api/auth/approve/${id}`);
      setSuccessMsg(`Approved officer ${name}. Access granted.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchPending();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Approval failed.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>HQ Command & Personnel Authorization</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Main verification queue for Incident Commanders and Field Response Operators.
          </p>
        </div>

        {successMsg && (
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            ✓ {successMsg}
          </span>
        )}
      </div>

      {/* Pending Authorizations List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
          <span>Pending Official Authorizations</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
            {pendingUsers.length}
          </span>
        </h3>

        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center space-y-2 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <p className="text-xs font-mono text-slate-400">Checking pending authorization requests...</p>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="p-8 rounded-none bg-slate-900/60 border border-slate-800 text-center space-y-2">
            <UserCheck className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No Pending Officer Approvals</p>
            <p className="text-xs text-slate-500">All registered field accounts are verified and active.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((u) => {
              const userId = u._id || u.id;
              return (
                <div
                  key={userId}
                  className="p-4 rounded-none bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-sans">{u.fullName || u.email}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400">
                        {u.role}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Agency: {u.agency || 'SDRF'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Email: {u.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(userId, u.fullName || u.email)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
                    >
                      <Check className="w-4 h-4" />
                      <span>Authorize Access</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
