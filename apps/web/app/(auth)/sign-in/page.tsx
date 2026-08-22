'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Target, Rocket } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('nasif.kamal@jaago.com.bd');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

      // Save mock token to localStorage
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
    <div className="w-full max-w-5xl my-auto">
      {/* Brand Logo Header */}
      <div className="mb-6 flex items-center justify-start">
        <div className="inline-block rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(255,230,0,0.45)] border-2 border-[#FFE600] transition transform hover:scale-[1.02]">
          <Image
            src="/jaago-logo.png"
            alt="JAAGO Foundation"
            width={200}
            height={110}
            priority
            className="w-44 sm:w-48 h-auto object-cover block"
          />
        </div>
      </div>

      {/* Main Dual-Card Container */}
      <div className="rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center backdrop-blur-md">
        {/* Left Column: Sign-In Form */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Sign In.
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Access the <span className="text-primary font-semibold">JAAGO</span> HUB Ecosystem
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-base"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-11 pr-11 py-3 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                />
                <span className="text-xs font-medium">Remember</span>
              </label>
              <a href="#forgot" className="text-xs font-semibold text-primary hover:underline">
                Forgot?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold tracking-wider uppercase text-sm shadow-md hover:bg-brand-strong transition duration-150 disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? 'AUTHENTICATING...' : 'SIGN IN NOW'}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-border w-full"></div>
            <span className="bg-card px-3 text-xs text-muted-foreground uppercase font-medium">
              or
            </span>
            <div className="border-t border-border w-full"></div>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                router.push('/dashboard');
              }, 400);
            }}
            className="w-full py-3 px-4 rounded-xl bg-surface border border-border hover:border-primary/50 text-foreground font-semibold text-xs tracking-wider uppercase flex items-center justify-center space-x-3 transition active:scale-[0.99]"
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
            <span>SIGN IN WITH GOOGLE</span>
          </button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            New to the platform?{' '}
            <a href="#request-access" className="text-primary font-bold hover:underline">
              Request Access
            </a>
          </p>
        </div>

        {/* Right Column: Mission & Vision Cards */}
        <div className="lg:col-span-6 space-y-5">
          {/* Vision Card */}
          <div className="p-6 rounded-2xl bg-surface border border-border relative overflow-hidden space-y-3">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Our Vision</h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-1">
              The Foundation envisions a society free from all forms of exploitation and
              discrimination, where every child has the opportunity for education, and every youth
              has the opportunity to realise their potential.
            </p>
          </div>

          {/* Mission Card */}
          <div className="p-6 rounded-2xl bg-surface border border-border relative overflow-hidden space-y-3">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Rocket className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Our Mission</h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-1">
              To bring about substantial improvement in the lives of underprivileged children and
              youth living in poverty, illiteracy, and social inequality through quality education and
              youth empowerment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
