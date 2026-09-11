'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RequisitionFormWindow } from '@/components/requisition-form-window';

export default function NewPurchaseRequisitionPage() {
  const router = useRouter();

  return (
    <RequisitionFormWindow
      requisitionType="Purchase"
      isOpen={true}
      onClose={() => router.push('/requests/purchase')}
      onSaved={() => router.push('/requests/purchase')}
    />
  );
}
