'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  X,
  Send,
} from 'lucide-react';
import {
  isAllowedWorkDomain,
  getDomainRestrictionError,
  signInWithGoogle,
  requestPasswordReset,
  getSupabase,
} from '@/lib/supabase-auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Auto-detect OAuth redirect session, password recovery, or query error parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const urlError = params.get('error');
    const rejectedEmail = params.get('rejectedEmail');
    const resetStatus = params.get('reset');

    if (resetStatus === 'success') {
      setSuccessMessage('Your password has been reset successfully! Please sign in with your new password.');
    }

    if (urlError === 'domain_restricted') {
      setErrorMessage(
        `Access Restricted: Only official organization email domains (@jaago.com.bd, @jaagofoundation.org, @emkcenter.org) are permitted to sign in.${
          rejectedEmail ? ` ("${rejectedEmail}" is unauthorized)` : ''
        }`
      );
    } else if (urlError) {
      setErrorMessage(decodeURIComponent(urlError));
    }

    // Check if this is a password recovery link landing on /login
    const isRecovery =
      params.get('type') === 'recovery' ||
      params.get('next') === '/reset-password' ||
      hash.includes('type=recovery');

    if (isRecovery) {
      window.location.href = `/reset-password${window.location.search}${window.location.hash}`;
      return;
    }

    // Check if Supabase session is already active or returned via OAuth hash
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        // If recovery hash or recovery type, redirect to /reset-password
        if (
          window.location.hash.includes('type=recovery') ||
          window.location.search.includes('type=recovery')
        ) {
          window.location.href = `/reset-password${window.location.search}${window.location.hash}`;
          return;
        }

        const userEmail = session.user.email || '';
        if (!isAllowedWorkDomain(userEmail)) {
          supabase.auth.signOut();
          setErrorMessage(getDomainRestrictionError(userEmail));
          return;
        }
        const userPayload = {
          id: session.user.id,
          email: session.user.email,
          fullName: session.user.user_metadata['full_name'] || session.user.user_metadata['name'] || userEmail,
          avatarUrl: session.user.user_metadata['avatar_url'] || session.user.user_metadata['picture'] || '',
          jobTitle: 'Coordinator',
          organizationName: 'JAAGO Foundation Trust',
          roles: ['super_admin', 'coordinator'],
          permissions: ['system.*', 'hr.*', 'finance.*', 'pnc.*'],
        };
        localStorage.setItem('jaago_access_token', session.access_token);
        localStorage.setItem('jaago_user', JSON.stringify(userPayload));
        document.cookie = `jaago_access_token=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `jaago_user=${encodeURIComponent(JSON.stringify(userPayload))}; path=/; max-age=604800; SameSite=Lax`;
        window.location.href = '/dashboard';
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = `/reset-password${window.location.search}${window.location.hash}`;
        return;
      }

      if (event === 'SIGNED_IN' && session && session.user) {
        if (
          window.location.hash.includes('type=recovery') ||
          window.location.search.includes('type=recovery')
        ) {
          window.location.href = `/reset-password${window.location.search}${window.location.hash}`;
          return;
        }

        const userEmail = session.user.email || '';
        if (!isAllowedWorkDomain(userEmail)) {
          supabase.auth.signOut();
          setErrorMessage(getDomainRestrictionError(userEmail));
          return;
        }
        const userPayload = {
          id: session.user.id,
          email: session.user.email,
          fullName: session.user.user_metadata['full_name'] || session.user.user_metadata['name'] || userEmail,
          avatarUrl: session.user.user_metadata['avatar_url'] || session.user.user_metadata['picture'] || '',
          jobTitle: 'Coordinator',
          organizationName: 'JAAGO Foundation Trust',
          roles: ['super_admin', 'coordinator'],
          permissions: ['system.*', 'hr.*', 'finance.*', 'pnc.*'],
        };
        localStorage.setItem('jaago_access_token', session.access_token);
        localStorage.setItem('jaago_user', JSON.stringify(userPayload));
        document.cookie = `jaago_access_token=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `jaago_user=${encodeURIComponent(JSON.stringify(userPayload))}; path=/; max-age=604800; SameSite=Lax`;
        window.location.href = '/dashboard';
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();

    // ── 1. STRICT WORK DOMAIN VALIDATION ──
    if (!isAllowedWorkDomain(cleanEmail)) {
      setErrorMessage(getDomainRestrictionError(cleanEmail));
      setLoading(false);
      return;
    }

    try {
      // ── 2. SUPABASE DIRECT AUTHENTICATION ──
      const supabase = getSupabase();
      const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (supaError) {
        throw new Error(supaError.message || 'Invalid email or password.');
      }

      if (supaData?.session && supaData?.user) {
        const userPayload = {
          id: supaData.user.id,
          email: supaData.user.email,
          fullName: supaData.user.user_metadata['full_name'] || supaData.user.user_metadata['name'] || cleanEmail,
          avatarUrl: supaData.user.user_metadata['avatar_url'] || supaData.user.user_metadata['picture'] || '',
          jobTitle: 'Coordinator',
          organizationName: 'JAAGO Foundation Trust',
          roles: ['super_admin', 'coordinator'],
          permissions: ['system.*', 'hr.*', 'finance.*', 'pnc.*'],
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('jaago_access_token', supaData.session.access_token);
          localStorage.setItem('jaago_user', JSON.stringify(userPayload));
          document.cookie = `jaago_access_token=${supaData.session.access_token}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `jaago_user=${encodeURIComponent(JSON.stringify(userPayload))}; path=/; max-age=604800; SameSite=Lax`;
        }

        window.location.href = '/dashboard';
        return;
      }

      throw new Error('Authentication failed. Please verify your credentials.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // ── 4. SIGN IN WITH GOOGLE WORKSPACE (SUPABASE OAUTH) ──
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await signInWithGoogle();
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Could not retrieve Google OAuth authorization URL');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate Google sign-in');
      setGoogleLoading(false);
    }
  };


  // ── 5. FORGOT PASSWORD HANDLER (SUPABASE AUTH) ──
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const cleanForgotEmail = forgotEmail.trim().toLowerCase();

    // Domain validation
    if (!isAllowedWorkDomain(cleanForgotEmail)) {
      setForgotError(getDomainRestrictionError(cleanForgotEmail));
      return;
    }

    setForgotLoading(true);

    try {
      const { error } = await requestPasswordReset(cleanForgotEmail);
      if (error) {
        // Fallback to API route
        const res = await fetch('/api/v1/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanForgotEmail }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Failed to send reset link');
      }

      setForgotSuccess(
        `Password reset link sent to ${cleanForgotEmail}. Please check your inbox.`
      );
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send password recovery email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* ── FULLSCREEN AUTO-ADJUSTING PINE FOREST BACKGROUND IMAGE ── */}
      <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden bg-black">
        <Image
          src="/login-bg.jpg"
          alt="JAAGO HUB Background"
          fill
          priority
          sizes="100vw"
          quality={100}
          className="object-cover object-center w-full h-full"
        />
        {/* Ambient Dark Frosted Overlay to ensure high contrast & glassmorphism effect */}
        <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />
      </div>

      {/* ── MAIN FROSTED GLASS LOGIN CARD ── */}
      <div className="relative z-10 w-full max-w-[420px] rounded-[32px] border border-white/40 bg-black/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-2xl p-7 sm:p-9 space-y-6 text-white animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-block rounded-2xl overflow-hidden mb-1">
            <Image
              src="/jaago-logo.png"
              alt="JAAGO Foundation"
              width={160}
              height={90}
              priority
              className="w-32 sm:w-36 h-auto object-contain block mx-auto rounded-2xl shadow-md"
            />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
            Login
          </h1>
          <p className="text-xs sm:text-sm text-white/85 font-medium drop-shadow-sm">
            Welcome back please login to your account
          </p>
        </div>

        {/* Success Alert Box */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/30 border border-emerald-500/50 text-white text-xs font-semibold backdrop-blur-md animate-in fade-in flex items-start space-x-2 shadow-lg">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-300" />
            <div className="leading-relaxed drop-shadow-sm">{successMessage}</div>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-500/30 border border-red-500/50 text-white text-xs font-semibold backdrop-blur-md animate-in fade-in flex items-start space-x-2 shadow-lg">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-200" />
            <div className="leading-relaxed drop-shadow-sm">{errorMessage}</div>
          </div>
        )}

        {/* Sign-In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Email Field */}
          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="User Name / Work Email"
              className="w-full pl-4 pr-11 py-3.5 bg-white/10 border border-white/30 rounded-2xl text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:bg-white/15 backdrop-blur-md text-sm font-medium transition shadow-inner"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-black">
              <User className="h-5 w-5 text-black" />
            </div>
          </div>

          {/* Password Field */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-4 pr-11 py-3.5 bg-white/10 border border-white/30 rounded-2xl text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:bg-white/15 backdrop-blur-md text-sm font-medium transition shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-black hover:text-black/70 transition cursor-pointer"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="h-5 w-5 text-black" /> : <Eye className="h-5 w-5 text-black" />}
            </button>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-1 text-white/90">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/40 bg-white/20 text-[#FFE600] focus:ring-0 accent-[#FFE600] cursor-pointer"
              />
              <span className="font-semibold drop-shadow-sm">Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setForgotError('');
                setForgotSuccess('');
                setShowForgotModal(true);
              }}
              className="font-medium hover:underline cursor-pointer text-white/90 hover:text-white drop-shadow-sm"
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#698a3b]/90 to-[#4d6b27]/90 hover:from-[#7aa046] hover:to-[#5a7d30] border border-white/40 text-white font-extrabold tracking-wide text-base shadow-[0_4px_20px_rgba(77,107,39,0.5)] backdrop-blur-md transition duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                <span>Logging In...</span>
              </>
            ) : (
              <span>Login</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-white/20 w-full"></div>
          <span className="px-3 text-[11px] text-white/70 uppercase font-bold tracking-wider">
            or
          </span>
          <div className="border-t border-white/20 w-full"></div>
        </div>

        {/* Google OAuth Button (Icon Only) */}
        <div className="flex justify-center pt-1">
          <button
            type="button"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
            aria-label="Sign in with Google"
            title="Sign in with Google"
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 flex items-center justify-center transition duration-200 active:scale-95 cursor-pointer shadow-lg backdrop-blur-md disabled:opacity-50 group hover:border-white/50"
          >
            {googleLoading ? (
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <svg className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24">
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
            )}
          </button>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-white/70 pt-1 font-medium tracking-wide flex items-center justify-center">
          <span>JAAGO Foundation ERP</span>
          <sup className="ml-1 inline-flex items-center justify-center text-[8.5px] font-bold lowercase border border-white/60 rounded-full px-1.5 py-0.5 leading-none -translate-y-0.5">
            t4d
          </sup>
        </p>
      </div>

      {/* ── FORGOT PASSWORD MODAL (FROSTED GLASS) ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-black/50 border border-white/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 backdrop-blur-2xl text-white animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Password Recovery</h3>
                  <p className="text-[11px] text-white/70">Enterprise Identity &amp; Access Control</p>
                </div>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-white/80 leading-relaxed">
              Enter your registered organization work email address. We will send a secure password reset link to your inbox.
            </p>

            {forgotError && (
              <div className="p-3 rounded-xl bg-red-500/30 border border-red-500/40 text-white text-xs font-semibold animate-in fade-in">
                {forgotError}
              </div>
            )}

            {forgotSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/25 border border-emerald-500/40 text-center space-y-2 animate-in fade-in">
                <CheckCircle2 className="h-7 w-7 text-emerald-300 mx-auto" />
                <div className="text-xs font-bold text-white">{forgotSuccess}</div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="mt-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/40 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white">Work Email Address *</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. name@jaago.com.bd"
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/30 rounded-xl text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFE600] text-xs backdrop-blur-md"
                  />
                  <p className="text-[10px] text-white/70">
                    Only <strong className="text-white">@jaago.com.bd</strong>,{' '}
                    <strong className="text-white">@jaagofoundation.org</strong>, or{' '}
                    <strong className="text-white">@emkcenter.org</strong> are eligible.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#698a3b] to-[#4d6b27] hover:from-[#7aa046] hover:to-[#5a7d30] border border-white/30 text-white font-black text-xs uppercase tracking-wider shadow-md transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <span>SENDING...</span>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>DISPATCH RESET LINK</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
