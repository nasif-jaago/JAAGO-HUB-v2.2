'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RequisitionFormWindow } from '@/components/requisition-form-window';

export default function NewGeneralRequisitionPage() {
  const router = useRouter();

  return (
    <RequisitionFormWindow
      requisitionType="General"
      isOpen={true}
      onClose={() => router.push('/requests/general')}
      onSaved={() => router.push('/requests/general')}
    />
  );
}
