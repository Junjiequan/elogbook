import { Injectable } from '@angular/core';

/** Embedded images live inside the entry (and in every saved version of it), so there is a ceiling. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

/** An image that was refused; the message is meant for the user. */
export class ImageRejected extends Error {}

/**
 * Turns image files (pasted, dropped, or photographed) into URLs that can live in the document.
 * Images are kept exactly as they were given, with no resizing or re-encoding: in a logbook the
 * original pixels of a plot or detector image are the record. MVP embeds the file as a data URL;
 * with a backend this becomes an upload returning a file URL, and only this class changes.
 */
@Injectable({ providedIn: 'root' })
export class ImageService {
  async toDocumentUrl(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new ImageRejected(`${file.name} is not an image.`);
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const mb = Math.round(file.size / 1024 / 1024);
      throw new ImageRejected(
        `${file.name} is ${mb} MB; images can be at most ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`,
      );
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
