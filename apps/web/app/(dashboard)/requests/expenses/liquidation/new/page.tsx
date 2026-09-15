'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LiquidationFormWindow } from '@/components/finance/liquidation-form-window';

export default function NewLiquidationPage() {
  const router = useRouter();

  return (
    <LiquidationFormWindow
      isOpen={true}
      onClose={() => router.push('/requests/expenses')}
      onSaved={() => router.push('/requests/expenses')}
    />
  );
}
