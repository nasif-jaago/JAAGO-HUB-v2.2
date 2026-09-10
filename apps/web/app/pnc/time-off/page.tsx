'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JaagoSpinner } from '@/components/ui/jaago-loading-overlay';

export default function TimeOffIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pnc/time-off/calendar');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <JaagoSpinner size="md" message="Loading Time Off..." />
    </div>
  );
}
