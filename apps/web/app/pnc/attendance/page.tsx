'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AttendanceIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pnc/attendance/logs');
  }, [router]);

  return null;
}
