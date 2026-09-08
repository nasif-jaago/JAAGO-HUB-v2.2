'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

/**
 * Legacy HR Employees Route
 * Seamlessly redirects to the canonical People & Culture Employee Directory at /pnc/employees.
 * Preserves backward-compatibility with all external links, bookmarks, and internal routers.
 */
export default function LegacyHrEmployeesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pnc/employees');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-lg animate-pulse">
        <Users className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-extrabold text-foreground mb-2">
        Opening People &amp; Culture Employee Directory...
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Redirecting you to the unified employee management portal with full profile editing, attendance, and payroll records.
      </p>
      <div className="flex items-center space-x-3">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <Link
          href="/pnc/employees"
          className="inline-flex items-center space-x-2 text-xs font-bold text-primary hover:underline"
        >
          <span>Click here if you are not redirected automatically</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
