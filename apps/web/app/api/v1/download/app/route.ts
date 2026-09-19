import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'downloads', 'jaago-hub.apk');
  
  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="jaago-hub-v2.2.apk"',
        'Cache-Control': 'no-cache',
      },
    });
  }

  return NextResponse.json(
    {
      error: 'Package file not found',
      message: 'The official JAAGO HUB Android APK will be available shortly.',
    },
    { status: 404 }
  );
}
