import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const employeeCode = (formData.get('employeeCode') as string) || 'emp';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const supabaseAdmin = getSupabaseAdminClient();

    const cleanCode = employeeCode.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const fileName = `emp_${cleanCode}_${Date.now()}.jpg`;
    const filePath = `avatars/${fileName}`;

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.some((b) => b.id === 'employees')) {
      await supabaseAdmin.storage.createBucket('employees', { public: true });
    }

    // Upload image to Supabase Storage bucket 'employees'
    const { error: uploadError } = await supabaseAdmin.storage
      .from('employees')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      logger.error('SYSTEM', 'upload_employee_photo.error', {
        metadata: { error: uploadError.message, employeeCode },
      });
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('employees')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    logger.info('SYSTEM', 'upload_employee_photo.success', {
      metadata: { publicUrl, employeeCode, filePath },
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filePath,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to upload photo' }, { status: 500 });
  }
}
