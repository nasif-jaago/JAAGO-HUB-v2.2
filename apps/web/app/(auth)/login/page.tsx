'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  Download,
  Smartphone,
  Share2,
  Check,
} from 'lucide-react';
import {
  isAllowedWorkDomain,
  getDomainRestrictionError,
  signInWithGoogle,
  requestPasswordReset,
  getSupabase,
  buildUserSessionPayload,
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
  const [forgotResetUrl, setForgotResetUrl] = useState('');

  // Mobile Download & Platform Detection State
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<'android' | 'ios' | 'windows' | 'mac' | 'desktop'>('android');
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Email input auto-adjusting font size state & ref
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [emailFontSize, setEmailFontSize] = useState<number | null>(null);

  // Dynamically auto-adjust font size so placeholder or long email address fits inside the block without clipping
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const adjustEmailFontSize = () => {
      const input = emailInputRef.current;
      if (!input) return;

      const placeholderText = 'Please input your official email address.';
      const currentText = email || placeholderText;

      // Available width: input inner width minus left padding (16px), right icon area (44px), and safety margin (12px)
      const availableWidth = input.clientWidth - 72;
      if (availableWidth <= 0) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const computedStyle = window.getComputedStyle(input);
      const fontFamily = computedStyle.fontFamily || 'sans-serif';
      const fontWeight = computedStyle.fontWeight || '500';

      // Measure text width at 14px (base text-sm)
      ctx.font = `${fontWeight} 14px ${fontFamily}`;
      const textWidth = ctx.measureText(currentText).width;

      if (textWidth > availableWidth) {
        // Calculate proportional scale down, clamped between 10.5px and 14px
        const optimalSize = Math.max(10.5, Math.min(14, (availableWidth / textWidth) * 14));
        setEmailFontSize(Number(optimalSize.toFixed(1)));
      } else {
        setEmailFontSize(null);
      }
    };

    adjustEmailFontSize();

    // Re-adjust once custom fonts finish loading
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        adjustEmailFontSize();
      });
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && emailInputRef.current) {
      resizeObserver = new ResizeObserver(() => {
        adjustEmailFontSize();
      });
      resizeObserver.observe(emailInputRef.current);
    }

    window.addEventListener('resize', adjustEmailFontSize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', adjustEmailFontSize);
    };
  }, [email]);

  // Platform Detection & PWA Install Prompt Listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) {
      setDetectedPlatform('android');
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      setDetectedPlatform('ios');
    } else if (/win/i.test(ua)) {
      setDetectedPlatform('windows');
    } else if (/mac/i.test(ua)) {
      setDetectedPlatform('mac');
    } else {
      setDetectedPlatform('desktop');
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerApkDownload = () => {
    if (typeof window === 'undefined') return;
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = '/api/v1/download/app';
    link.download = 'jaago-hub-v2.2.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadStarted(false), 4000);
  };

  const handleDownloadClick = () => {
    if (detectedPlatform === 'android') {
      triggerApkDownload();
    }
    setShowDownloadModal(true);
  };

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult?.outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowDownloadModal(false);
      }
    }
  };

  const handleCopyApkLink = () => {
    if (typeof window === 'undefined') return;
    const downloadUrl = `${window.location.origin}/api/v1/download/app`;
    navigator.clipboard.writeText(downloadUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Auto-detect OAuth redirect session, password recovery, or query error parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const urlError = params.get('error');
    const rejectedEmail = params.get('rejectedEmail');
    const resetStatus = params.get('reset');

    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }

    if (resetStatus === 'success') {
      setSuccessMessage('Your password has been reset successfully! Please sign in with your new password.');
    } else if (params.get('welcome') === '1' || params.get('invite') === '1') {
      setSuccessMessage('Welcome to JAAGO HUB! Please sign in using your work email and temporary password.');
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
        const userPayload = buildUserSessionPayload(session.user);
        localStorage.setItem('jaago_access_token', session.access_token);
        localStorage.setItem('jaago_user', JSON.stringify(userPayload));
        document.cookie = `jaago_access_token=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `jaago_user=${encodeURIComponent(JSON.stringify(userPayload))}; path=/; max-age=604800; SameSite=Lax`;
        const params = new URLSearchParams(window.location.search);
        const redirectTarget = params.get('redirect') || '/dashboard';
        window.location.href = redirectTarget;
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
        const userPayload = buildUserSessionPayload(session.user);
        localStorage.setItem('jaago_access_token', session.access_token);
        localStorage.setItem('jaago_user', JSON.stringify(userPayload));
        document.cookie = `jaago_access_token=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `jaago_user=${encodeURIComponent(JSON.stringify(userPayload))}; path=/; max-age=604800; SameSite=Lax`;
        
        const params = new URLSearchParams(window.location.search);
        const redirectTarget = params.get('redirect') || '/dashboard';
        window.location.href = redirectTarget;
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

    const searchParams = new URLSearchParams(window.location.search);
    const redirectTarget = searchParams.get('redirect') || '/dashboard';

    try {
      // ── 2. SUPABASE DIRECT AUTHENTICATION ──
      const supabase = getSupabase();
      const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!supaError && supaData?.session && supaData?.user) {
        const userPayload = buildUserSessionPayload(supaData.user);

        if (typeof window !== 'undefined') {
          localStorage.setItem('jaago_access_token', supaData.session.access_token);
          localStorage.setItem('jaago_user', JSON.stringify(userPayload));
          document.cookie = `jaago_access_token=${supaData.session.access_token}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `jaago_user=${encodeURIComponent(JSON.stringify(userPayload))}; path=/; max-age=604800; SameSite=Lax`;
        }

        window.location.href = redirectTarget;
        return;
      }

      // ── 3. FALLBACK API AUTHENTICATION ──
      try {
        const apiRes = await fetch('/api/v1/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const apiData = await apiRes.json();
        if (apiRes.ok && apiData.user && apiData.session) {
          const userPayload = apiData.user;
          const token = apiData.session.accessToken;
          if (typeof window !== 'undefined') {
            localStorage.setItem('jaago_access_token', token);
            localStorage.setItem('jaago_user', JSON.stringify(userPayload));
            document.cookie = `jaago_access_token=${token}; path=/; max-age=604800; SameSite=Lax`;
            document.cookie = `jaago_user=${encodeURIComponent(JSON.stringify(userPayload))}; path=/; max-age=604800; SameSite=Lax`;
          }
          window.location.href = redirectTarget;
          return;
        }
      } catch {}

      throw new Error(supaError?.message || 'Invalid email or password.');
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


  // ── 5. FORGOT PASSWORD HANDLER (CENTRAL SMTP SERVICE) ──
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
      const res = await requestPasswordReset(cleanForgotEmail);
      setForgotSuccess(
        res.data?.message || `Password reset link sent to ${cleanForgotEmail}. Please check your inbox.`
      );
      if (res.data?.debug?.directResetUrl) {
        setForgotResetUrl(res.data.debug.directResetUrl);
      }
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
        {/* ── TOP-RIGHT: DOWNLOAD ANDROID APP (COMPACT PILL, NEON BLUE ICON, MATCHING MARK) ── */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
          <button
            type="button"
            onClick={handleDownloadClick}
            className="flex items-center space-x-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 hover:border-[#00F0FF]/60 hover:shadow-[0_0_12px_rgba(0,240,255,0.3)] backdrop-blur-md shadow-md text-white transition-all duration-200 group cursor-pointer"
            title="Download JAAGO Android App"
            aria-label="Download Android App"
          >
            {/* Neon Blue Download Icon */}
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.9)] group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />

            {/* Label: Download Android App */}
            <span className="text-[8.5px] sm:text-[9.5px] font-bold text-white/90 group-hover:text-white tracking-tight whitespace-nowrap leading-none">
              Download Android App
            </span>
          </button>
        </div>

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
              ref={emailInputRef}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Please input your official email address."
              style={{ fontSize: emailFontSize ? `${emailFontSize}px` : undefined }}
              className="w-full h-[50px] pl-4 pr-11 py-3.5 bg-white/10 border border-white/30 rounded-2xl text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:bg-white/15 backdrop-blur-md text-xs sm:text-[13px] md:text-sm font-medium transition shadow-inner"
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
              className="w-full h-[50px] pl-4 pr-11 py-3.5 bg-white/10 border border-white/30 rounded-2xl text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:bg-white/15 backdrop-blur-md text-sm font-medium transition shadow-inner"
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
              <div className="p-4 rounded-2xl bg-emerald-500/25 border border-emerald-500/40 text-center space-y-2.5 animate-in fade-in">
                <CheckCircle2 className="h-7 w-7 text-emerald-300 mx-auto" />
                <div className="text-xs font-bold text-white">{forgotSuccess}</div>
                {forgotResetUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = forgotResetUrl;
                    }}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#698a3b] to-[#4d6b27] hover:from-[#7aa046] hover:to-[#5a7d30] border border-white/40 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <span>Open Reset Password Screen</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="mt-1 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/40 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
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
      {/* ── DOWNLOAD APP MODAL (AUTO-ADJUSTED FOR ALL PLATFORMS) ── */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-black/75 border border-white/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 backdrop-blur-2xl text-white animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center text-white shadow-md">
                  <Smartphone className="h-5 w-5 text-[#00F0FF] drop-shadow-[0_0_6px_rgba(0,240,255,0.8)]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">JAAGO HUB Android App</h3>
                  <p className="text-[11px] text-white/70">Official Field &amp; Enterprise Edition v2.2</p>
                </div>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Platform Awareness Tag */}
            <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 flex items-center justify-between text-[11px]">
              <span className="text-white/70">Your Device:</span>
              <span className="font-semibold text-emerald-300 flex items-center space-x-1">
                {detectedPlatform === 'android' && <span>📱 Android Device</span>}
                {detectedPlatform === 'ios' && <span>🍎 Apple iOS Device</span>}
                {detectedPlatform === 'windows' && <span>💻 Windows PC</span>}
                {detectedPlatform === 'mac' && <span>💻 macOS System</span>}
                {detectedPlatform === 'desktop' && <span>💻 Desktop System</span>}
              </span>
            </div>

            {/* Direct APK Download Button */}
            <button
              type="button"
              onClick={triggerApkDownload}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#698a3b] to-[#4d6b27] hover:from-[#7aa046] hover:to-[#5a7d30] border border-white/30 text-white font-extrabold shadow-lg transition active:scale-[0.98] flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-left">
                <div className="p-2 rounded-xl bg-white/20">
                  <Download className="h-5 w-5 text-[#00F0FF] drop-shadow-[0_0_6px_rgba(0,240,255,0.8)]" />
                </div>
                <div>
                  <div className="text-sm font-bold leading-tight">Download Android APK</div>
                  <div className="text-[10px] text-white/80 font-normal">Direct package (jaago-hub-v2.2.apk)</div>
                </div>
              </div>
              {downloadStarted ? (
                <span className="text-xs bg-white/25 px-2 py-1 rounded-lg font-bold">Starting...</span>
              ) : (
                <ArrowRight className="h-4 w-4 text-white/80" />
              )}
            </button>

            {/* PWA Install Button (if browser prompt is available) */}
            {deferredPrompt && (
              <button
                type="button"
                onClick={handlePwaInstall}
                className="w-full py-2.5 px-4 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Smartphone className="h-4 w-4 text-[#00F0FF]" />
                <span>Install Directly on Device (PWA)</span>
              </button>
            )}

            {/* Platform Guidance Box */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 space-y-2 text-xs">
              <div className="font-bold text-white flex items-center justify-between">
                <span>Installation Guidance</span>
                <span className="text-[10px] text-white/60 font-normal">Auto-Adjusted</span>
              </div>

              {detectedPlatform === 'android' ? (
                <ol className="list-decimal list-inside space-y-1 text-white/80 text-[11px] leading-relaxed">
                  <li>Download the APK using the button above.</li>
                  <li>Tap the downloaded file from notifications or your Downloads folder.</li>
                  <li>If prompted, select <strong>Allow from this source</strong> to install.</li>
                </ol>
              ) : detectedPlatform === 'ios' ? (
                <div className="space-y-1 text-white/80 text-[11px] leading-relaxed">
                  <p>For iOS (iPhone / iPad):</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open this page in <strong>Safari</strong>.</li>
                    <li>Tap the <strong>Share</strong> button (box with arrow).</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2 text-[11px] text-white/80 leading-relaxed">
                  <p>To transfer the Android App to your phone or tablet:</p>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleCopyApkLink}
                      className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white font-semibold text-[11px] transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Share2 className="h-3.5 w-3.5" />}
                      <span>{copiedLink ? 'Link Copied!' : 'Copy Mobile Download Link'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-white/60">
                    Send the copied link to your phone via WhatsApp or email to install directly.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Close &amp; Return to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
