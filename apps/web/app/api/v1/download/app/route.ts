import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getApkFilePath(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), 'apps', 'web', 'public', 'downloads', 'jaago-hub-v2.2.apk'),
    path.join(process.cwd(), 'public', 'downloads', 'jaago-hub-v2.2.apk'),
    path.join(process.cwd(), 'apps', 'web', 'public', 'downloads', 'jaago-hub.apk'),
    path.join(process.cwd(), 'public', 'downloads', 'jaago-hub.apk'),
    'D:\\APK\\app\\build\\outputs\\apk\\release\\app-release.apk',
    'D:\\APK\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        // Only return if it is a real APK (> 100KB), not a stub/dummy JSON
        if (stat.isFile() && stat.size > 100000) {
          return p;
        }
      }
    } catch {
      // Continue searching
    }
  }

  return null;
}

export async function GET() {
  const filePath = getApkFilePath();

  if (filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const stat = fs.statSync(filePath);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="jaago-hub-v2.2.apk"',
          'Content-Length': stat.size.toString(),
          'Cache-Control': 'public, max-age=3600, must-revalidate',
        },
      });
    } catch (err) {
      console.error('[DownloadApp] Failed to read APK file:', err);
    }
  }

  return NextResponse.json(
    {
      error: 'Package file not found',
      message: 'The official JAAGO HUB Android APK package is being prepared.',
    },
    { status: 404 }
  );
}

export async function HEAD() {
  const filePath = getApkFilePath();

  if (filePath) {
    try {
      const stat = fs.statSync(filePath);
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="jaago-hub-v2.2.apk"',
          'Content-Length': stat.size.toString(),
          'Cache-Control': 'public, max-age=3600, must-revalidate',
        },
      });
    } catch {
      // Fall through to 404
    }
  }

  return new NextResponse(null, { status: 404 });
}
