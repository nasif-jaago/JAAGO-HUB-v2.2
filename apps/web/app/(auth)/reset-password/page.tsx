'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { getSupabase, updatePassword } from '@/lib/supabase-auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States: 'verifying' | 'ready' | 'expired' | 'success'
  const [pageState, setPageState] = useState<'verifying' | 'ready' | 'expired' | 'success'>('verifying');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    let authUnsubscribe: (() => void) | null = null;
    const supabase = getSupabase();

    async function initRecoverySession(): Promise<void> {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          if (!isMounted) return;
          setPageState('expired');
          setErrorMessage(errorDescription || error || 'The password reset link is invalid or expired.');
          return;
        }

        // 1. If PKCE code is in the URL, exchange for session
        if (code) {
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('[Reset Password] Code exchange notice:', exchangeError.message);
          } else if (exchangeData?.session?.user) {
            if (!isMounted) return;
            setUserEmail(exchangeData.session.user.email || '');
            setPageState('ready');
            return;
          }
        }

        // 2. Check for active session from Supabase
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          if (!isMounted) return;
          setUserEmail(sessionData.session.user.email || '');
          setPageState('ready');
          return;
        }

        // 3. Listen for auth state change (PASSWORD_RECOVERY or SIGNED_IN from URL hash)
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
            if (!isMounted) return;
            setUserEmail(session.user.email || '');
            setPageState('ready');
          }
        });
        authUnsubscribe = () => authListener.subscription.unsubscribe();

        // 4. Fallback timeout: if after 3.5s no valid session is established
        setTimeout(() => {
          if (isMounted) {
            setPageState((current) => (current === 'verifying' ? 'expired' : current));
          }
        }, 3500);
      } catch (err: any) {
        if (!isMounted) return;
        setPageState('expired');
        setErrorMessage(err.message || 'Unable to verify reset link.');
      }
    }

    initRecoverySession();

    return () => {
      isMounted = false;
      if (authUnsubscribe) {
        authUnsubscribe();
      }
    };
  }, []);

  // Validation criteria
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!hasMinLength) {
      setErrorMessage('Password must contain at least 8 characters.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await updatePassword(password);
      if (error) throw error;

      // Successfully updated password
      setPageState('success');

      // Clear any temporary tokens and sign out of recovery session
      const supabase = getSupabase();
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jaago_access_token');
        localStorage.removeItem('jaago_user');
        document.cookie = 'jaago_access_token=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'jaago_user=; path=/; max-age=0; SameSite=Lax';
      }

      // Redirect after smooth confirmation
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Your reset link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* ── FULLSCREEN BACKGROUND WITH FROSTED BLUR ── */}
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
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" />
      </div>

      {/* ── MAIN FROSTED GLASS CARD ── */}
      <div className="relative z-10 w-full max-w-[440px] rounded-[32px] border border-white/40 bg-black/45 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] backdrop-blur-2xl p-7 sm:p-9 space-y-6 text-white animate-in fade-in zoom-in-95 duration-300">
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

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
            Reset Password
          </h1>
          <p className="text-xs sm:text-sm text-white/80 font-medium drop-shadow-sm">
            {pageState === 'ready'
              ? userEmail
                ? `Set a new secure password for ${userEmail}`
                : 'Enter a new password for your account'
              : 'Enterprise Account Security & Access Control'}
          </p>
        </div>

        {/* ── 1. VERIFYING STATE ── */}
        {pageState === 'verifying' && (
          <div className="space-y-4 py-6 text-center">
            <div className="flex justify-center">
              <Loader2 className="h-10 w-10 text-[#FFE600] animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-white tracking-tight drop-shadow-md">
                Verifying Security Link
              </h2>
              <p className="text-xs text-white/80 font-medium leading-relaxed">
                Authenticating your secure recovery token and preparing password reset session...
              </p>
            </div>
          </div>
        )}

        {/* ── 2. EXPIRED / INVALID LINK STATE ── */}
        {pageState === 'expired' && (
          <div className="space-y-5 py-2 text-center">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 animate-in zoom-in">
                <AlertTriangle className="h-7 w-7" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-extrabold text-white tracking-tight drop-shadow-md">
                Link Expired or Invalid
              </h2>
              <p className="text-xs text-white/85 leading-relaxed bg-black/30 border border-white/20 rounded-2xl p-3.5">
                {errorMessage ||
                  'This password reset link has expired or has already been used. For your security, password links are single-use and time-limited.'}
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#698a3b]/90 to-[#4d6b27]/90 hover:from-[#7aa046] hover:to-[#5a7d30] border border-white/40 text-white font-extrabold tracking-wide text-xs uppercase shadow-lg transition active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Request New Reset Link</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full py-2 text-xs text-white/70 hover:text-white font-semibold transition cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ── 3. SUCCESS STATE ── */}
        {pageState === 'success' && (
          <div className="space-y-5 py-4 text-center animate-in zoom-in duration-300">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/25 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="h-9 w-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-white tracking-tight drop-shadow-md">
                Password Successfully Updated!
              </h2>
              <p className="text-xs text-white/85 leading-relaxed">
                Your account password has been reset securely. Redirecting you to the login screen...
              </p>
            </div>
            <div className="flex justify-center pt-2">
              <Loader2 className="h-5 w-5 text-[#FFE600] animate-spin" />
            </div>
          </div>
        )}

        {/* ── 4. READY: RESET PASSWORD FORM ── */}
        {pageState === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error banner if any during submit */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-red-500/30 border border-red-500/50 text-white text-xs font-semibold backdrop-blur-md animate-in fade-in flex items-start space-x-2 shadow-lg">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-200" />
                <div className="leading-relaxed drop-shadow-sm">{errorMessage}</div>
              </div>
            )}

            {/* New Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/90 drop-shadow-sm flex items-center space-x-1.5">
                <Lock className="h-3.5 w-3.5 text-[#FFE600]" />
                <span>New Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password (min. 8 chars)"
                  className="w-full pl-4 pr-11 py-3 bg-white/10 border border-white/30 rounded-2xl text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:bg-white/15 backdrop-blur-md text-sm font-medium transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-black hover:text-black/70 transition cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-black" /> : <Eye className="h-4 w-4 text-black" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/90 drop-shadow-sm flex items-center space-x-1.5">
                <Lock className="h-3.5 w-3.5 text-[#FFE600]" />
                <span>Confirm New Password</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full pl-4 pr-11 py-3 bg-white/10 border border-white/30 rounded-2xl text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:bg-white/15 backdrop-blur-md text-sm font-medium transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-black hover:text-black/70 transition cursor-pointer"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-black" /> : <Eye className="h-4 w-4 text-black" />}
                </button>
              </div>
            </div>

            {/* Password Validation Requirements */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-md space-y-1.5 text-[11px]">
              <div className="font-bold text-white/80 pb-0.5 flex items-center space-x-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Password Requirements:</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className={`flex items-center space-x-1.5 ${hasMinLength ? 'text-emerald-300' : 'text-white/60'}`}>
                  {hasMinLength ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/40 ml-0.5 mr-1" />}
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${hasUpper && hasLower ? 'text-emerald-300' : 'text-white/60'}`}>
                  {hasUpper && hasLower ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/40 ml-0.5 mr-1" />}
                  <span>Upper &amp; lower case</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${hasNumberOrSymbol ? 'text-emerald-300' : 'text-white/60'}`}>
                  {hasNumberOrSymbol ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/40 ml-0.5 mr-1" />}
                  <span>Number or symbol</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${passwordsMatch ? 'text-emerald-300' : 'text-white/60'}`}>
                  {passwordsMatch ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/40 ml-0.5 mr-1" />}
                  <span>Passwords match</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={submitting || !isFormValid}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#698a3b]/90 to-[#4d6b27]/90 hover:from-[#7aa046] hover:to-[#5a7d30] border border-white/40 text-white font-extrabold tracking-wide text-xs sm:text-sm uppercase shadow-[0_4px_20px_rgba(77,107,39,0.5)] backdrop-blur-md transition duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save &amp; Set New Password</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full py-2 flex items-center justify-center space-x-1.5 text-xs text-white/70 hover:text-white font-semibold transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Login</span>
              </button>
            </div>
          </form>
        )}

        {/* Brand Footer */}
        <p className="text-center text-xs text-white/70 pt-1 font-medium tracking-wide flex items-center justify-center">
          <span>JAAGO Foundation ERP</span>
          <sup className="ml-1 inline-flex items-center justify-center text-[8.5px] font-bold lowercase border border-white/60 rounded-full px-1.5 py-0.5 leading-none -translate-y-0.5 mr-1.5">
            t4d
          </sup>
          <span>&bull; Security Management</span>
        </p>
      </div>
    </div>
  );
}
