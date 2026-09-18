import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-auth';
import { syncMcpModules } from '@/lib/mcp/module-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/mcp/modules
 * Returns all dynamically synchronized modules, departments, menus, submenus, and pages
 * from the whole JAAGO HUB platform, automatically syncing any newly created departments/modules.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { modules, stats } = await syncMcpModules(supabase);

    return NextResponse.json({
      success: true,
      data: modules,
      stats,
    });
  } catch (err: any) {
    const errorDetails = {
      message: err?.message || 'Unknown error',
      stack: err?.stack || null,
    };
    console.error('[API /api/v1/mcp/modules] Error details:', errorDetails);
    return NextResponse.json(
      { success: false, error: errorDetails.message, details: errorDetails },
      { status: 200 } // Return 200 so we can read the JSON error cleanly
    );
  }
}
