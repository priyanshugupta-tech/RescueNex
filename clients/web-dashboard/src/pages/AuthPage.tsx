import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Shield, Lock, Mail, User, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthPageProps {
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { login, signup, verifyOtp } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  // Form states
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'PUBLIC' | 'SCOUT' | 'OPERATOR'>('PUBLIC');
  const [agency, setAgency] = useState('COMMUTER');

  // OTP modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Status & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(userName, password);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await signup({
        userName,
        email,
        password,
        confirmPassword,
        role,
        agency: role === 'PUBLIC' ? 'COMMUTER' : agency || 'SDRF'
      });
      setShowOtpModal(true);
      setInfoMsg(`Verification code dispatched to ${email}. Valid for 5 minutes.`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await verifyOtp(email, otpCode);
      setShowOtpModal(false);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
      
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white font-sans">
          {tab === 'login' ? 'RescueNex Secure Access' : 'Register Official Account'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Himalayan Early Warning & Disaster Management System
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 mb-5">
        <button
          onClick={() => { setTab('login'); setError(''); }}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
            tab === 'login' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setTab('signup'); setError(''); }}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
            tab === 'signup' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Create Account
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      {tab === 'login' ? (
        <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Username / Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="lead@rescuenex"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-950/20"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>

          <p className="text-[11px] text-slate-500 text-center font-mono">
            Main Admin Seed: <span className="text-slate-400">lead@rescuenex</span> • Rate limit: 5 attempts
          </p>
        </form>
      ) : (
        /* Signup Form */
        <form onSubmit={handleSignupSubmit} className="space-y-3.5 text-xs font-sans">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Role Type</label>
            <select
              value={role}
              onChange={(e: any) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="PUBLIC">Public Commuter (Auto-approved)</option>
              <option value="SCOUT">SDRF Scout (Requires HQ Approval)</option>
              <option value="OPERATOR">BRO Road Operator (Requires HQ Approval)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Username</label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="ramban_scout"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Email (OTP Delivery via Resend)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="scout@rescuenex.org"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Confirm</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition mt-2 shadow"
          >
            {loading ? 'Submitting...' : 'Register & Send OTP'}
          </button>
        </form>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="text-center mb-4">
              <Mail className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">Enter Email Verification Code</h3>
              <p className="text-xs text-slate-400 mt-1">{infoMsg}</p>
            </div>

            <form onSubmit={handleOtpVerify} className="space-y-4">
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="6-digit code"
                className="w-full text-center text-xl font-mono tracking-widest py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
