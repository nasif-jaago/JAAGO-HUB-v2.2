'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdvanceRequestFormWindow } from '@/components/finance/advance-request-form-window';

export default function NewAdvanceRequestPage() {
  const router = useRouter();

  return (
    <AdvanceRequestFormWindow
      isOpen={true}
      onClose={() => router.push('/requests/expenses')}
      onSaved={() => router.push('/requests/expenses')}
    />
  );
}
