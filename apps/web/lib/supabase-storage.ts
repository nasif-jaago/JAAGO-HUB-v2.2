import { getSupabase } from './supabase-auth';

/**
 * Resizes and crops an image file to a square frame using HTML5 Canvas
 */
export async function resizeAndCropImage(
  file: File,
  targetSize = 500,
  quality = 0.9
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Calculate center crop
      const minDim = Math.min(img.width, img.height);
      const startX = (img.width - minDim) / 2;
      const startY = (img.height - minDim) / 2;

      // Draw high quality cropped square
      ctx.drawImage(
        img,
        startX,
        startY,
        minDim,
        minDim,
        0,
        0,
        targetSize,
        targetSize
      );

      const dataUrl = canvas.toDataURL('image/jpeg', quality);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, dataUrl });
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image file'));
    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads employee photo to Supabase Storage bucket
 */
export async function uploadEmployeePhoto(
  file: File,
  employeeCode: string
): Promise<{ url: string; isFallback?: boolean }> {
  // Max size 3MB check
  if (file.size > 3 * 1024 * 1024) {
    throw new Error('Image size exceeds maximum allowed size of 3 MB');
  }

  // Allowed file formats check
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Allowed file types are *.jpeg, *.jpg, *.png, *.gif');
  }

  // 1. Process & Auto-Crop to Profile Frame
  const { blob, dataUrl } = await resizeAndCropImage(file, 500, 0.92);

  try {
    const supabase = getSupabase();
    const cleanCode = employeeCode.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const fileName = `emp_${cleanCode}_${Date.now()}.jpg`;
    const filePath = `avatars/${fileName}`;

    // Try uploading to 'employees' bucket or 'jaago-public-assets'
    const targetBucket = 'employees';

    // Check/upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(targetBucket)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      // Try fallback to 'jaago-public-assets'
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from('jaago-public-assets')
        .upload(`employees/${fileName}`, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!fallbackError && fallbackData) {
        const { data: publicUrlData } = supabase.storage
          .from('jaago-public-assets')
          .getPublicUrl(`employees/${fileName}`);
        return { url: publicUrlData.publicUrl };
      }

      console.warn('Supabase storage upload fallback to local DataURI:', uploadError.message);
      return { url: dataUrl, isFallback: true };
    }

    if (uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from(targetBucket)
        .getPublicUrl(filePath);

      return { url: publicUrlData.publicUrl };
    }

    return { url: dataUrl, isFallback: true };
  } catch (err) {
    console.error('Photo upload unexpected error:', err);
    return { url: dataUrl, isFallback: true };
  }
}
