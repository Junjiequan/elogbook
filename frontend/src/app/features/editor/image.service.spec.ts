import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ImageRejected, ImageService, MAX_IMAGE_BYTES } from './image.service';

describe('ImageService', () => {
  let service: ImageService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    service = TestBed.inject(ImageService);
  });

  const readBack = async (url: string) => new Uint8Array(await (await fetch(url)).arrayBuffer());

  it('keeps the file exactly as it was, byte for byte', async () => {
    const bytes = Uint8Array.from({ length: 2048 }, (_, i) => i % 251);
    const file = new File([bytes], 'plot.png', { type: 'image/png' });

    const url = await service.toDocumentUrl(file);

    expect(url.startsWith('data:image/png;base64,')).toBe(true);
    expect(await readBack(url)).toEqual(bytes);
  });

  it('does not touch large images either (no resizing, no re-encoding)', async () => {
    const bytes = new Uint8Array(1024 * 1024).fill(7); // 1 MB, over the old 300 KB threshold
    const file = new File([bytes], 'detector.jpg', { type: 'image/jpeg' });

    expect(await readBack(await service.toDocumentUrl(file))).toEqual(bytes);
  });

  it('refuses things that are not images', async () => {
    const error = await service
      .toDocumentUrl(new File(['x'], 'notes.txt', { type: 'text/plain' }))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ImageRejected);
    expect((error as Error).message).toMatch(/not an image/);
  });

  it('refuses images above the size limit, saying so', async () => {
    const huge = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'huge.png', { type: 'image/png' });

    const error = await service.toDocumentUrl(huge).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ImageRejected);
    expect((error as Error).message).toMatch(/at most 20 MB/);
  });
});
