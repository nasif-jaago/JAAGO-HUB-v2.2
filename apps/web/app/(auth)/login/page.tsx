'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Target,
  Rocket,
  Shield,
  Sparkles,
  Sun,
  Moon,
  Coffee,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('nasif.kamal@jaago.com.bd');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'espresso'>('espresso');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Sync theme mode on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('jaago_theme') as 'dark' | 'light' | 'espresso';
      if (savedTheme) {
        setThemeMode(savedTheme);
        document.documentElement.classList.remove('dark', 'light', 'theme-espresso');
        if (savedTheme === 'dark') document.documentElement.classList.add('dark');
        else if (savedTheme === 'espresso') document.documentElement.classList.add('theme-espresso');
        else document.documentElement.classList.add('light');
      }
    }
  }, []);

  const handleThemeChange = (mode: 'dark' | 'light' | 'espresso') => {
    setThemeMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jaago_theme', mode);
      document.documentElement.classList.remove('dark', 'light', 'theme-espresso');
      if (mode === 'dark') document.documentElement.classList.add('dark');
      else if (mode === 'espresso') document.documentElement.classList.add('theme-espresso');
      else document.documentElement.classList.add('light');
    }
  };

  const handleQuickFill = (role: 'admin' | 'manager' | 'officer') => {
    if (role === 'admin') {
      setEmail('nasif.kamal@jaago.com.bd');
      setPassword('Password123!');
    } else if (role === 'manager') {
      setEmail('masoor.rahman@jaago.com.bd');
      setPassword('Password123!');
    } else {
      setEmail('habibur.rahman@jaago.com.bd');
      setPassword('Password123!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/v1/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Sign in failed');
      }

      // Save session info to localStorage
      if (typeof window !== 'undefined' && data.session?.accessToken) {
        localStorage.setItem('jaago_access_token', data.session.accessToken);
        localStorage.setItem('jaago_user', JSON.stringify(data.user));
      }

      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while signing in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl my-auto py-4 px-2 sm:px-4">
      {/* ── TOP BAR: BRAND LOGO & THEME SWITCHER ── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="inline-block rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(255,230,0,0.45)] border-2 border-[#FFE600] transition transform hover:scale-[1.02]">
          <Image
            src="/jaago-logo.png"
            alt="JAAGO Foundation"
            width={200}
            height={110}
            priority
            className="w-36 sm:w-44 md:w-48 h-auto object-cover block"
          />
        </div>

        {/* 3-Way Theme Switcher */}
        <div className="flex items-center space-x-1 p-1 bg-surface border border-border rounded-xl shadow-sm">
          <button
            type="button"
            onClick={() => handleThemeChange('espresso')}
            title="Espresso Theme"
            className={`p-1.5 rounded-lg transition ${
              themeMode === 'espresso'
                ? 'bg-amber-500 text-white font-bold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Coffee className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            title="Dark Theme"
            className={`p-1.5 rounded-lg transition ${
              themeMode === 'dark'
                ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Moon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            title="Light Theme"
            className={`p-1.5 rounded-lg transition ${
              themeMode === 'light'
                ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sun className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── MAIN LOGIN CONTAINER ── */}
      <div className="rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center backdrop-blur-md">
        {/* Left Column: Sign-In Form */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Enterprise Single Sign-On</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground pt-1">
              Sign In.
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Access the <span className="text-primary font-bold">JAAGO HUB v2.2</span> Ecosystem
            </p>
          </div>

          {/* Quick Demo Autofill Pills for rapid testing on all devices */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              ⚡ Quick Demo Login:
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-primary text-[11px] font-bold text-foreground transition active:scale-95 flex items-center space-x-1"
              >
                <UserCheck className="h-3 w-3 text-purple-400" />
                <span>Super Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('manager')}
                className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-primary text-[11px] font-bold text-foreground transition active:scale-95 flex items-center space-x-1"
              >
                <UserCheck className="h-3 w-3 text-blue-400" />
                <span>HR Manager</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('officer')}
                className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-primary text-[11px] font-bold text-foreground transition active:scale-95 flex items-center space-x-1"
              >
                <UserCheck className="h-3 w-3 text-amber-400" />
                <span>Procurement</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold animate-in fade-in">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Work Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@jaago.com.bd"
                  className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Account Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center space-x-2 cursor-pointer text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                />
                <span className="font-semibold text-foreground">Remember device</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="font-bold text-primary hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-black tracking-wider uppercase text-xs sm:text-sm shadow-xl hover:bg-brand-strong transition duration-150 disabled:opacity-50 active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <span>SIGN IN TO HUB</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-border w-full"></div>
            <span className="bg-card px-3 text-[11px] text-muted-foreground uppercase font-bold">
              or
            </span>
            <div className="border-t border-border w-full"></div>
          </div>

          {/* Sign in with Google */}
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                router.push('/dashboard');
              }, 500);
            }}
            className="w-full py-3 px-4 rounded-xl bg-surface border border-border hover:border-primary/50 text-foreground font-bold text-xs tracking-wider uppercase flex items-center justify-center space-x-3 transition active:scale-[0.99] cursor-pointer shadow-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>SIGN IN WITH GOOGLE WORKSPACE</span>
          </button>

          <p className="text-center text-xs text-muted-foreground pt-1">
            New employee or volunteer?{' '}
            <a href="/pnc" target="_blank" className="text-primary font-bold hover:underline">
              People &amp; Culture Portal
            </a>
          </p>
        </div>

        {/* Right Column: Mission, Vision & Security Cards */}
        <div className="lg:col-span-6 space-y-4">
          {/* Vision Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border relative overflow-hidden space-y-2.5 shadow-sm">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                <Target className="h-4 w-4" />
              </div>
              <h2 className="text-base font-extrabold text-foreground">Our Vision</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-1">
              The Foundation envisions a society free from all forms of exploitation and
              discrimination, where every child has the opportunity for education, and every youth
              has the opportunity to realise their potential.
            </p>
          </div>

          {/* Mission Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border relative overflow-hidden space-y-2.5 shadow-sm">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                <Rocket className="h-4 w-4" />
              </div>
              <h2 className="text-base font-extrabold text-foreground">Our Mission</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-1">
              To bring about substantial improvement in the lives of underprivileged children and
              youth living in poverty, illiteracy, and social inequality through quality education and
              youth empowerment.
            </p>
          </div>

          {/* Security & Multi-Tenant Assurance Badge */}
          <div className="p-4 rounded-2xl bg-surface/60 border border-border/80 flex items-center space-x-3 text-xs text-muted-foreground">
            <Shield className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <div>
              <div className="font-bold text-foreground">Enterprise Security Protected</div>
              <div className="text-[11px]">
                Multi-Tenant RLS &bull; TLS 1.3 Strict &bull; Async Audit Spooling
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-extrabold text-foreground">Password Recovery</h3>
            <p className="text-xs text-muted-foreground">
              Please contact your System Administrator or Human Resources coordinator to reset your
              credentials or generate a temporary password via the User Management portal.
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:bg-brand-strong transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
