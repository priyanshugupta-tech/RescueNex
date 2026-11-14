import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Lock, Mail, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
  onSuccess: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, initialMode = 'login' }) => {
  const { login, signup, googleLogin, verifyOtp } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>(initialMode);

  // Form states
  const [fullName, setFullName] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'PUBLIC' | 'SCOUT' | 'OPERATOR'>('PUBLIC');
  const [showPassword, setShowPassword] = useState(false);

  // OTP modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Status & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Google OAuth setup with Google Identity Services (GIS)
  useEffect(() => {
    const handleGoogleCredentialResponse = async (response: any) => {
      if (response && response.credential) {
        setLoading(true);
        setError('');
        try {
          await googleLogin(response.credential);
          onSuccess();
        } catch (err: any) {
          setError(err.response?.data?.message || 'Google authentication failed. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: '286184216559-q897knrrbm22j52cb08qmstdvt402cro.apps.googleusercontent.com',
          callback: handleGoogleCredentialResponse,
        });

        const btnContainer = document.getElementById('googleAuthBtnContainer');
        if (btnContainer) {
          (window as any).google.accounts.id.renderButton(btnContainer, {
            theme: 'filled_black',
            size: 'large',
            width: '100%',
            text: tab === 'login' ? 'signin_with' : 'signup_with',
            shape: 'rectangular'
          });
        }
      } catch (e) {
        console.warn('Google Identity Services notice:', e);
      }
    }
  }, [tab]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(userName, password);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password. Please try again.');
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signup({
        fullName,
        userName,
        email,
        password,
        confirmPassword,
        role,
        agency: role === 'PUBLIC' ? 'COMMUTER' : 'SDRF'
      });
      setShowOtpModal(true);
      setInfoMsg(`A 6-digit verification code has been sent to ${email}.`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please verify your details.');
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
      setError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 p-8 rounded-2xl bg-[#161B22] border border-[#30363D] shadow-2xl">
      
      {/* Brand Header with Borderless Merged Emblem */}
      <div className="text-center mb-6">
        <img 
          src="/logo/rescuenex_emblem.png" 
          alt="RescueNex" 
          className="w-14 h-14 object-contain mx-auto mb-2"
        />
        <h2 className="text-2xl font-extrabold text-white font-sans tracking-tight">
          Rescue<span className="text-amber-400">Nex</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-sans">
          Real-Time Landslide Risk Analytics & Early Warning Platform
        </p>
      </div>

      {/* Modern Tabs */}
      <div className="flex rounded-lg bg-[#0D1117] p-1 border border-[#21262D] mb-5">
        <button
          type="button"
          onClick={() => { setTab('login'); setError(''); }}
          className={`flex-1 py-2 rounded-md text-xs font-semibold transition ${
            tab === 'login' ? 'bg-[#21262D] text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setTab('signup'); setError(''); }}
          className={`flex-1 py-2 rounded-md text-xs font-semibold transition ${
            tab === 'signup' ? 'bg-[#21262D] text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Create Account
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Google OAuth Section */}
      <div className="space-y-3 mb-5">
        <div id="googleAuthBtnContainer" className="w-full flex justify-center"></div>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-[#30363D] w-full"></div>
          <span className="bg-[#161B22] px-3 text-[11px] text-slate-500 font-medium uppercase tracking-wider relative">
            Or with credentials
          </span>
        </div>
      </div>

      {/* Sign In Form */}
      {tab === 'login' ? (
        <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Username or Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your username or email"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 text-xs transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-9 pr-10 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 text-xs transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      ) : (
        /* Create Account Form */
        <form onSubmit={handleSignupSubmit} className="space-y-3.5 text-xs font-sans">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Account Role</label>
            <select
              value={role}
              onChange={(e: any) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-slate-200 focus:outline-none focus:border-amber-400 text-xs transition"
            >
              <option value="PUBLIC">Public Commuter / Resident</option>
              <option value="SCOUT">Emergency Field Scout</option>
              <option value="OPERATOR">Operations Officer</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 text-xs transition"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Username</label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Choose a username"
              className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 text-xs font-mono transition"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 text-xs transition"
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
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 text-xs transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3 py-2 rounded-lg bg-[#0D1117] border border-[#30363D] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 text-xs transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition mt-2 shadow"
          >
            {loading ? 'Processing...' : 'Register Account'}
          </button>
        </form>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-[#161B22] border border-[#30363D] p-6 shadow-2xl">
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
                className="w-full text-center text-xl font-mono tracking-widest py-2.5 rounded-lg bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-amber-400"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="flex-1 py-2 rounded-lg bg-[#21262D] text-slate-300 text-xs font-semibold transition"
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
