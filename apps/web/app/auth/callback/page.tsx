'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  getSupabase,
  isAllowedWorkDomain,
} from '@/lib/supabase-auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function processAuthCallback() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          if (!isMounted) return;
          setStatus('error');
          setErrorMessage(errorDescription || error || 'OAuth authorization failed.');
          return;
        }

        const supabase = getSupabase();

        // 1. If PKCE authorization code is present, exchange it for a session in the browser
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('[Auth Callback] Code exchange error:', exchangeError);
            // Fallback: check if session was already established
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData?.session?.user) {
              if (!isMounted) return;
              setStatus('error');
              setErrorMessage(exchangeError.message || 'Failed to exchange authorization code.');
              return;
            }
          }
        }

        // 2. Retrieve the active session
        const { data: sessionResult } = await supabase.auth.getSession();
        const session = sessionResult?.session;
        const user = session?.user;

        if (!session || !user) {
          // Wait briefly for onAuthStateChange to capture implicit hash token
          const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, newSession) => {
              if (newSession?.user) {
                authListener.subscription.unsubscribe();
                await handleSuccessfulSession(newSession);
              }
            }
          );


          setTimeout(() => {
            if (isMounted && status === 'loading') {
              setStatus('error');
              setErrorMessage('Authentication session could not be established. Please try logging in again.');
            }
          }, 4000);
          return;
        }

        await handleSuccessfulSession(session);
      } catch (err: any) {
        console.error('[Auth Callback] Unexpected error:', err);
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(err.message || 'An unexpected error occurred during authentication.');
      }
    }

    async function handleSuccessfulSession(session: any) {
      const email = session.user?.email || '';

      // Strict Domain Validation
      if (!isAllowedWorkDomain(email)) {
        const supabase = getSupabase();
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('jaago_access_token');
          localStorage.removeItem('jaago_user');
        }
        window.location.href = `/login?error=domain_restricted&rejectedEmail=${encodeURIComponent(email)}`;
        return;
      }

      // Store in localStorage
      const userPayload = {
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.user_metadata?.['full_name'] || session.user.user_metadata?.['name'] || email,
        avatarUrl: session.user.user_metadata?.['avatar_url'] || session.user.user_metadata?.['picture'] || '',
        jobTitle: 'Coordinator',
        organizationName: 'JAAGO Foundation Trust',
        organizationId: session.user.user_metadata?.['organization_id'] || 'org-jaago-dhaka',
        roles: ['super_admin', 'coordinator'],
        permissions: ['system.*', 'hr.*', 'finance.*', 'pnc.*'],
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('jaago_access_token', session.access_token);
        localStorage.setItem('jaago_user', JSON.stringify(userPayload));

        // Also set auth cookie for server/SSR synchronization
        const maxAge = session.expires_in || 604800;
        document.cookie = `jaago_access_token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `jaago_user=${encodeURIComponent(JSON.stringify(userPayload))}; path=/; max-age=${maxAge}; SameSite=Lax`;
      }

      if (isMounted) {
        setStatus('success');
      }

      // Redirect smoothly to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 300);
    }

    processAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* Background Image */}
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
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px]" />
      </div>

      {/* Frosted Glass Status Card */}
      <div className="relative z-10 w-full max-w-[420px] rounded-[32px] border border-white/40 bg-black/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] backdrop-blur-2xl p-8 sm:p-10 space-y-6 text-white text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Header */}
        <div className="inline-block rounded-2xl overflow-hidden mb-2">
          <Image
            src="/jaago-logo.png"
            alt="JAAGO Foundation"
            width={140}
            height={70}
            priority
            className="w-28 sm:w-32 h-auto object-contain block mx-auto rounded-2xl shadow-md"
          />
        </div>

        {status === 'loading' && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <Loader2 className="h-10 w-10 text-[#FFE600] animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white tracking-tight drop-shadow-md">
                Verifying Google Workspace
              </h2>
              <p className="text-xs text-white/80 font-medium leading-relaxed">
                Authenticating your organizational account credentials and initializing your JAAGO HUB session...
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-in zoom-in" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white tracking-tight drop-shadow-md">
                Authentication Successful
              </h2>
              <p className="text-xs text-white/80 font-medium leading-relaxed">
                Redirecting you to the JAAGO Foundation Enterprise Dashboard...
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-2">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-amber-400 animate-in zoom-in" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-extrabold text-white tracking-tight drop-shadow-md">
                Authentication Notice
              </h2>
              <p className="text-xs text-red-200/90 font-semibold bg-red-500/20 border border-red-500/40 rounded-2xl p-3 leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => {
                window.location.href = '/login';
              }}
              className="w-full py-3 px-4 rounded-2xl bg-[#FFE600] hover:bg-[#ffe600]/90 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg transition active:scale-[0.98] cursor-pointer mt-2"
            >
              Return to Login Page
            </button>
          </div>
        )}

        <p className="text-[11px] text-white/60 pt-2 font-medium tracking-wide flex items-center justify-center">
          <span>JAAGO Foundation ERP</span>
          <sup className="ml-1 inline-flex items-center justify-center text-[8px] font-bold lowercase border border-white/50 rounded-full px-1.5 py-0.5 leading-none -translate-y-0.5 mr-1.5">
            t4d
          </sup>
          <span>&bull; Single Sign-On</span>
        </p>
      </div>
    </div>
  );
}
