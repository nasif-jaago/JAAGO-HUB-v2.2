/**
 * Resizes and crops an image file to a square frame using HTML5 Canvas
 */
export async function resizeAndCropImage(
  file: File,
  targetSize = 500,
  quality = 0.92
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
 * Uploads employee photo to Supabase Storage bucket via server-side admin endpoint
 */
export async function uploadEmployeePhoto(
  file: File,
  employeeCode: string
): Promise<{ url: string; isFallback?: boolean }> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size exceeds maximum allowed size of 5 MB');
  }

  const { blob, dataUrl } = await resizeAndCropImage(file, 500, 0.92);

  try {
    const formData = new FormData();
    const croppedFile = new File([blob], `avatar_${employeeCode || 'emp'}.jpg`, {
      type: 'image/jpeg',
    });
    formData.append('file', croppedFile);
    formData.append('employeeCode', employeeCode || 'emp');

    const res = await fetch('/api/v1/hr/employees/upload-photo', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (res.ok && data.success && data.url) {
      return { url: data.url };
    }

    console.warn('Server upload failed, falling back to dataUrl:', data?.error);
    return { url: dataUrl, isFallback: true };
  } catch (err) {
    console.error('Photo upload unexpected error:', err);
    return { url: dataUrl, isFallback: true };
  }
}
