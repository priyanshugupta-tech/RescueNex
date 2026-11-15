import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { X, Check, Smartphone, Send, KeyRound, Mail, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmergencyPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const EmergencyPhoneModal: React.FC<EmergencyPhoneModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const { user, refreshMe } = useAuth();
  const [step, setStep] = useState<'INPUT' | 'OTP' | 'VERIFIED'>('INPUT');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (cooldownSeconds > 0) {
      timer = setTimeout(() => setCooldownSeconds((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (isOpen) {
      if (user?.phoneNumber && user.isPhoneVerified) {
        setPhoneNumber(user.phoneNumber);
        setStep('VERIFIED');
      } else {
        const savedPhone = localStorage.getItem('rescuenex_user_phone');
        if (savedPhone) {
          setPhoneNumber(savedPhone);
        } else {
          setPhoneNumber('');
        }
        setStep('INPUT');
      }
      setOtpCode('');
      setStatusMsg(null);
      setCooldownSeconds(0);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Step 1: Request 6-digit OTP via SMS
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldownSeconds > 0) return;

    const clean = phoneNumber.replace(/[^0-9]/g, '');
    if (clean.length < 10) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      await api.post('/api/broadcast/phone/send-otp', {
        phoneNumber: clean
      });

      setStep('OTP');
      setCooldownSeconds(60); // 60s rate limit cooldown
      localStorage.setItem('rescuenex_user_phone', clean);

      setStatusMsg({
        type: 'info',
        text: `6-digit verification code dispatched to +91 ${clean.slice(-10)} via SMS.`
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to dispatch SMS verification code.';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setStatusMsg({ type: 'error', text: 'Enter the 6-digit code received via SMS.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await api.post('/api/broadcast/phone/verify-otp', {
        otp: otpCode.trim()
      });

      setStep('VERIFIED');
      sessionStorage.setItem('rescuenex_phone_prompt_dismissed', 'true');
      await refreshMe();

      setStatusMsg({
        type: 'success',
        text: res.data.message || 'Mobile number verified successfully!'
      });

      setTimeout(() => {
        onSaved?.();
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid verification code.';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  // Skip for now -> Record dismissal & inform user about email alerts
  const handleSkip = async () => {
    sessionStorage.setItem('rescuenex_phone_prompt_dismissed', 'true');
    try {
      await api.post('/api/broadcast/phone/dismiss-prompt', {});
    } catch {
      // non-blocking
    }
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center pt-24 sm:pt-16 pb-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md my-auto bg-[#0D1117] border border-[#30363D] shadow-2xl rounded-none text-slate-200 overflow-hidden font-mono"
        >
          {/* Header - Chaukor style, no cringe warning icons */}
          <div className="px-5 py-3.5 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
              [ EMERGENCY SMS NOTIFICATIONS ]
            </h3>
            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-white p-1 rounded-none hover:bg-[#21262D] transition"
              title="Close / Skip"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {/* Status Alert Banner */}
            {statusMsg && (
              <div
                className={`p-2.5 border rounded-none font-sans text-xs ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                    : statusMsg.type === 'info'
                    ? 'bg-cyan-950/40 border-cyan-600 text-cyan-300'
                    : 'bg-rose-950/40 border-rose-600 text-rose-300'
                }`}
              >
                {statusMsg.text}
              </div>
            )}

            {/* STEP 1: INPUT PHONE NUMBER */}
            {step === 'INPUT' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="p-3 bg-[#161B22] border border-[#30363D] space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold uppercase text-[11px]">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    <span>Instant Emergency SMS Alerts</span>
                  </div>
                  <p className="text-slate-400 font-sans text-[11px] leading-relaxed">
                    When severe rockfall or slope instability strikes nearby, the Core Gateway broadcasts urgent evacuation notices directly to commuters in the hazard zone.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                    Mobile Number (India +91):
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-[#21262D] border border-r-0 border-[#30363D] text-slate-400 font-mono text-xs select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phoneNumber.replace(/^\+91/, '')}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="99XXXXXXXX"
                      required
                      maxLength={10}
                      className="w-full bg-[#161B22] border border-[#30363D] text-slate-100 px-3 py-2 rounded-none font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans block">
                    A 6-digit verification code will be sent to this number via SMS.
                  </span>
                </div>

                {/* Email Notice Fallback */}
                <div className="p-2.5 bg-blue-950/20 border border-blue-900/60 rounded-none flex items-start gap-2">
                  <Mail className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-300 font-sans leading-relaxed">
                    If you do not add a mobile number, emergency disaster notices will be delivered to your registered email (<strong>{user?.email}</strong>).
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#30363D]">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-slate-400 hover:text-slate-200 underline text-[11px] font-sans"
                  >
                    Skip for now (Use Email alerts)
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !phoneNumber.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold border border-amber-400 rounded-none transition shadow-sm disabled:opacity-50 text-xs"
                  >
                    <span>{loading ? 'Sending OTP...' : 'Send Verification SMS'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: VERIFY 6-DIGIT OTP */}
            {step === 'OTP' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-[#161B22] border border-[#30363D] space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-[11px]">
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    <span>Enter 6-Digit SMS Verification Code</span>
                  </div>
                  <p className="text-slate-400 font-sans text-[11px]">
                    We sent a 6-digit one-time code to <strong>+91 {phoneNumber.replace(/[^0-9]/g, '').slice(-10)}</strong>.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                    6-Digit Verification Code:
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    maxLength={6}
                    required
                    autoFocus
                    className="w-full bg-[#161B22] border border-[#30363D] text-center tracking-[0.5em] text-lg font-bold text-amber-400 px-3 py-2 rounded-none font-mono focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Valid for 10 minutes</span>
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={loading || cooldownSeconds > 0}
                      className="text-amber-400 hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                      <span>{cooldownSeconds > 0 ? `Resend Code (${cooldownSeconds}s)` : 'Resend Code'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#30363D]">
                  <button
                    type="button"
                    onClick={() => { setStep('INPUT'); setStatusMsg(null); }}
                    className="text-slate-400 hover:text-slate-200 text-xs"
                  >
                    Edit Phone Number
                  </button>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold border border-emerald-400 rounded-none transition shadow-sm disabled:opacity-50 text-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{loading ? 'Verifying...' : 'Verify & Activate'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: VERIFIED ACTIVE STATUS */}
            {step === 'VERIFIED' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/60 rounded-none space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-xs">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Emergency SMS Broadcast Active</span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs">
                    Verified Mobile: <strong className="font-mono text-white">+91 {user?.phoneNumber || phoneNumber}</strong>
                  </p>
                  <p className="text-slate-400 font-sans text-[11px] leading-relaxed">
                    You will receive instant SMS alerts whenever terrain sensors detect critical slope risk near your transit corridor.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#30363D]">
                  <button
                    type="button"
                    onClick={() => { setStep('INPUT'); setStatusMsg(null); }}
                    className="px-3 py-1.5 bg-[#161B22] hover:bg-[#21262D] text-slate-300 hover:text-white border border-[#30363D] hover:border-amber-400 text-xs rounded-none transition"
                  >
                    Change Number
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-none transition shadow-sm"
                  >
                    Done
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 font-sans text-center">
                  * Mobile number updates are limited to 2 times per week for account security.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
