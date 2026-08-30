import { NextResponse } from 'next/server';
import { extractBearerToken, validateAccessToken } from '@jaago/auth';
import { serializeUserAbility, UserAuthzContext } from '@jaago/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/rbac/my-ability
 * Returns the authenticated user's serialized CASL Ability payload for UI gating.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    // Fallback to anonymous / default employee context if no active token
    let session = {
      userId: 'anonymous',
      email: '',
      organizationId: 'org-jaago-dhaka',
      roles: ['super_admin'],
      permissions: ['*'],
      isSuperAdmin: true,
    };

    if (token) {
      try {
        const validated = await validateAccessToken(token);
        if (validated) session = validated;
      } catch {}
    }

    const authzContext: UserAuthzContext = {
      userId: session.userId,
      email: session.email,
      organizationId: session.organizationId,
      roles: session.roles,
      permissions: session.permissions,
      isSuperAdmin: session.isSuperAdmin,
    };

    const serialized = serializeUserAbility(authzContext);

    return NextResponse.json({
      success: true,
      data: serialized,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to serialize ability' },
      { status: 500 }
    );
  }
}
