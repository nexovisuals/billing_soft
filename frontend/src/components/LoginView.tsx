import { API_BASE_URL } from '../config';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { UserSession } from '../types';
import PwaInstallPrompt from './PwaInstallPrompt';

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please check credentials.');
      }

      const session: UserSession = {
        ...data.user,
        token: data.token,
      };

      localStorage.setItem('svt_session', JSON.stringify(session));
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 selection:bg-slate-900 selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center justify-center shadow-2xs mb-3">
            <Cpu className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Shri Varshini Technologies
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-1">
            CNC Machining Billing & Material Management Portal
          </p>
        </div>

        {/* Login Form Card */}
        <div className="p-8 rounded-3xl border border-slate-200 bg-white shadow-subtle space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Enter your credentials to access your workshop dashboard
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Username</label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full min-h-[46px] pl-10 pr-4 rounded-2xl border border-slate-200 bg-slate-50 text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 outline-none transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Password</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[46px] pl-10 pr-4 rounded-2xl border border-slate-200 bg-slate-50 text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 outline-none transition-all"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] mt-2 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-slate-800" />
                </>
              )}
            </button>
          </form>

          {/* Quick Admin Credentials Selector */}
          <div className="pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => fillCredentials('admin', 'admin123')}
              className="w-full p-2.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-left transition-colors flex items-center justify-between whitespace-nowrap"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900 leading-tight">Admin Quick Fill</div>
                  <div className="text-[10px] text-slate-500 font-normal">admin / admin123</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Workshop Footer */}
        <div className="text-center text-[11px] text-slate-400 font-normal mt-6 flex items-center justify-center gap-2">
          <span>Shri Varshini Technologies</span>
          <span>•</span>
          <span>Coimbatore, Tamil Nadu</span>
        </div>
      </motion.div>

      {/* PWA Mobile Installation Prompt */}
      <PwaInstallPrompt />
    </div>
  );
}

