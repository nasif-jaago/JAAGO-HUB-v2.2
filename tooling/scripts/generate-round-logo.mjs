import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('D:/JAAGO-HUB-v2.2/node_modules/sharp');
import path from 'path';
import fs from 'fs';

async function main() {
  const srcPath = 'D:/JAAGO-HUB-v2.2/apps/web/public/jaago-logo.png';
  const outDir = 'D:/JAAGO-HUB-v2.2/apps/web/public';
  const appDir = 'D:/JAAGO-HUB-v2.2/apps/web/app';

  // 1. Content bounding box from original 1024x640:
  // minX: 66, maxX: 960, minY: 35, maxY: 618
  // Let's crop content tightly with balanced margins:
  // Width: 894, Height: 583
  const targetW = 390;

  const croppedContent = await sharp(srcPath)
    .extract({ left: 66, top: 35, width: 894, height: 583 })
    .resize(targetW)
    .png()
    .toBuffer();

  const croppedMeta = await sharp(croppedContent).metadata();
  const size = 512;
  const radius = size / 2;
  const left = Math.round((size - croppedMeta.width) / 2);
  const top = Math.round((size - croppedMeta.height) / 2);

  // 2. Create a square yellow background with the cropped logo centered
  const squareWithLogo = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 254, g: 206, b: 10, alpha: 1 }
    }
  })
  .composite([
    { input: croppedContent, left, top }
  ])
  .png()
  .toBuffer();

  // 3. Create SVG circle mask (white circle on transparent background)
  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#ffffff" /></svg>`
  );

  // Apply the circle mask using 'dest-in'
  const circularMaster = await sharp(squareWithLogo)
    .composite([
      { input: circleMask, blend: 'dest-in' }
    ])
    .png()
    .toBuffer();

  // Save 512x512 round logo
  const round512Path = path.join(outDir, 'jaago-logo-round.png');
  await sharp(circularMaster).toFile(round512Path);
  console.log('Saved:', round512Path);

  // Generate standard web & app icon sizes:
  // 1. icon.png (32x32, 192x192, 512x512)
  const icon192Path = path.join(outDir, 'icon-192.png');
  await sharp(circularMaster).resize(192, 192).toFile(icon192Path);
  console.log('Saved:', icon192Path);

  const icon512Path = path.join(outDir, 'icon-512.png');
  await sharp(circularMaster).resize(512, 512).toFile(icon512Path);
  console.log('Saved:', icon512Path);

  // 2. apple-touch-icon.png (180x180)
  const appleIconPath = path.join(outDir, 'apple-touch-icon.png');
  await sharp(circularMaster).resize(180, 180).toFile(appleIconPath);
  console.log('Saved:', appleIconPath);

  // 3. favicon-32x32.png and favicon-16x16.png
  const favicon32Path = path.join(outDir, 'favicon-32x32.png');
  await sharp(circularMaster).resize(32, 32).toFile(favicon32Path);
  console.log('Saved:', favicon32Path);

  const favicon16Path = path.join(outDir, 'favicon-16x16.png');
  await sharp(circularMaster).resize(16, 16).toFile(favicon16Path);
  console.log('Saved:', favicon16Path);

  // 4. Also copy / generate for Next.js App Router root app/ folder
  const appIconPath = path.join(appDir, 'icon.png');
  await sharp(circularMaster).resize(192, 192).toFile(appIconPath);
  console.log('Saved:', appIconPath);

  const appAppleIconPath = path.join(appDir, 'apple-icon.png');
  await sharp(circularMaster).resize(180, 180).toFile(appAppleIconPath);
  console.log('Saved:', appAppleIconPath);

  // 5. Generate a true .ico file (16x16, 32x32, 48x48)
  const faviconIcoPublic = path.join(outDir, 'favicon.ico');
  const faviconIcoApp = path.join(appDir, 'favicon.ico');
  
  const buf16 = await sharp(circularMaster).resize(16, 16).png().toBuffer();
  const buf32 = await sharp(circularMaster).resize(32, 32).png().toBuffer();
  const buf48 = await sharp(circularMaster).resize(48, 48).png().toBuffer();

  const icoBuffer = buildIco([
    { size: 16, buffer: buf16 },
    { size: 32, buffer: buf32 },
    { size: 48, buffer: buf48 }
  ]);

  fs.writeFileSync(faviconIcoPublic, icoBuffer);
  fs.writeFileSync(faviconIcoApp, icoBuffer);
  console.log('Saved:', faviconIcoPublic, 'and', faviconIcoApp);
}

function buildIco(images) {
  const numImages = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(numImages, 4); // count

  let offset = headerSize + dirEntrySize * numImages;
  const entries = [];
  const buffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // width
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // height
    entry.writeUInt8(0, 2); // color palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset

    entries.push(entry);
    buffers.push(img.buffer);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...buffers]);
}

main().catch(console.error);
