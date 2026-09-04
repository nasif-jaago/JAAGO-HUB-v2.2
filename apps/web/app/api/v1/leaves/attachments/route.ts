import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'leave-attachments');

function ensureUploadDirExists() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create upload dir:', err);
  }
}

/**
 * Maps common file extensions to appropriate MIME content types
 */
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.csv':
      return 'text/csv';
    case '.txt':
      return 'text/plain;charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

/**
 * POST /api/v1/leaves/attachments
 * Accepts multipart/form-data upload of the requester's original supporting document.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const employeeCode = (formData.get('employeeCode') as string) || 'emp';
    const originalName = (formData.get('fileName') as string) || file?.name || 'attachment.pdf';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 10 MB limit' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    ensureUploadDirExists();

    // 1. Save locally with original name (and sanitized name if needed)
    const cleanFileName = originalName.replace(/[\/\\]/g, '_').trim();
    const targetPath = path.join(UPLOAD_DIR, cleanFileName);
    fs.writeFileSync(targetPath, buffer);

    const publicUrl = `/uploads/leave-attachments/${encodeURIComponent(cleanFileName)}`;

    // 2. Also try uploading to Supabase Storage bucket 'leave_attachments' if available
    try {
      const supabaseAdmin = getSupabaseAdminClient();
      if (supabaseAdmin) {
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        if (!buckets?.some((b) => b.id === 'leave_attachments')) {
          await supabaseAdmin.storage.createBucket('leave_attachments', { public: true });
        }
        await supabaseAdmin.storage
          .from('leave_attachments')
          .upload(`documents/${cleanFileName}`, buffer, {
            contentType: file.type || getMimeType(cleanFileName),
            upsert: true,
          });
      }
    } catch (sbErr) {
      console.warn('Supabase storage backup upload error (local disk saved):', sbErr);
    }

    logger.info('SYSTEM', 'leave_attachment_uploaded', {
      metadata: { cleanFileName, size: file.size, employeeCode, publicUrl },
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: cleanFileName,
      size: file.size,
    });
  } catch (err: any) {
    console.error('Attachment upload failed:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/leaves/attachments?name=...
 * Serves the original binary document with proper Content-Type & Content-Disposition
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('name') || searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json({ success: false, error: 'File name required' }, { status: 400 });
    }

    const cleanFileName = path.basename(fileName.replace(/[\/\\]/g, '_').trim());
    const filePath = path.join(UPLOAD_DIR, cleanFileName);

    // 1. Check local filesystem
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = getMimeType(cleanFileName);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(cleanFileName)}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // 2. Check Supabase Storage
    try {
      const supabaseAdmin = getSupabaseAdminClient();
      if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin.storage
          .from('leave_attachments')
          .download(`documents/${cleanFileName}`);
        if (data && !error) {
          const arrayBuffer = await data.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = getMimeType(cleanFileName);

          // Cache on local disk for subsequent instant access
          ensureUploadDirExists();
          fs.writeFileSync(filePath, buffer);

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': mimeType,
              'Content-Disposition': `attachment; filename="${encodeURIComponent(cleanFileName)}"`,
              'Content-Length': buffer.length.toString(),
            },
          });
        }
      }
    } catch {}

    return NextResponse.json({ success: false, error: 'File not found on server' }, { status: 404 });
  } catch (err: any) {
    console.error('Failed to serve attachment:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to serve attachment' },
      { status: 500 }
    );
  }
}
