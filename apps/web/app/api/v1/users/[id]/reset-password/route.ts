import { NextResponse } from 'next/server';
import { createApiHandler } from '@jaago/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = createApiHandler({
  requireAuth: true,
  permission: 'system.users.manage',
  async handler() {
    return NextResponse.json(
      {
        success: false,
        error: 'Direct password reset via this endpoint is deprecated. Use the secure recovery link dispatch via /api/v1/auth/forgot-password instead.',
      },
      { status: 403 }
    );
  },
});
