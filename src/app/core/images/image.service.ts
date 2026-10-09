import { Injectable } from '@angular/core';

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.88;
/** Files below this are embedded untouched (screenshots, small figures). */
const KEEP_AS_IS_BELOW_BYTES = 300 * 1024;

/**
 * Turns image files (pasted, dropped, or photographed) into URLs that can live in the document.
 * MVP embeds a downscaled data URL; with a backend this becomes an upload returning a file URL,
 * and only this class changes.
 */
@Injectable({ providedIn: 'root' })
export class ImageService {
  async toDocumentUrl(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error(`Not an image: ${file.name}`);
    }
    if (
      file.size < KEEP_AS_IS_BELOW_BYTES ||
      file.type === 'image/svg+xml' ||
      file.type === 'image/gif'
    ) {
      return readAsDataUrl(file);
    }
    return this.downscale(file);
  }

  private async downscale(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, type, JPEG_QUALITY),
      );
      return blob ? readAsDataUrl(blob) : readAsDataUrl(file);
    } finally {
      bitmap.close();
    }
  }
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
