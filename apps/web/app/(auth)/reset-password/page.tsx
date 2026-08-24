'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { updatePassword } from '@/lib/supabase-auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md my-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-center">
        <div className="inline-block rounded-2xl overflow-hidden shadow-md">
          <Image
            src="/jaago-logo.png"
            alt="JAAGO Foundation"
            width={180}
            height={100}
            priority
            className="w-40 h-auto object-cover block rounded-2xl"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-6 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-4 w-4" />
            <span>Supabase Password Recovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground pt-1">
            Set New Password
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Choose a strong password to secure your <span className="font-bold text-primary">JAAGO HUB</span> account.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2 animate-in fade-in">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <h2 className="text-sm font-bold text-foreground">Password Successfully Updated!</h2>
            <p className="text-xs text-muted-foreground">
              Redirecting you to the login screen in a moment...
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full pl-10 pr-10 py-3 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Confirm New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-black tracking-wider uppercase text-xs sm:text-sm shadow-xl hover:bg-brand-strong transition duration-150 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <span>UPDATING PASSWORD...</span>
              ) : (
                <>
                  <span>UPDATE &amp; SIGN IN</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
