import { TestBed } from '@angular/core/testing';
import { OAuthWidgets } from './oauth-widgets';

interface FakeGoogle {
  accounts: {
    id: { initialize: ReturnType<typeof vi.fn>; renderButton: ReturnType<typeof vi.fn> };
  };
}

describe('OAuthWidgets', () => {
  const win = window as unknown as { google?: FakeGoogle };
  let google: FakeGoogle;

  beforeEach(() => {
    google = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };
    win.google = google; // as if Google's script had loaded
  });
  afterEach(() => delete win.google);

  const widgets = () => TestBed.inject(OAuthWidgets);
  const host = () => {
    const element = document.createElement('div');
    document.body.append(element);
    return element;
  };

  it("draws Google's own button into the place it is given", async () => {
    const element = host();

    await widgets().render(
      { kind: 'google', clientId: 'client-1.apps.googleusercontent.com' },
      element,
      () => undefined,
    );

    expect(google.accounts.id.initialize).toHaveBeenCalledWith({
      client_id: 'client-1.apps.googleusercontent.com',
      callback: expect.any(Function),
    });
    expect(google.accounts.id.renderButton).toHaveBeenCalledWith(
      element,
      expect.objectContaining({ type: 'standard', text: 'continue_with' }),
    );
    element.remove();
  });

  it('hands on the ID token Google returns', async () => {
    const onCredential = vi.fn().mockName('onCredential');
    await widgets().render({ kind: 'google', clientId: 'c' }, host(), onCredential);

    const { callback } = google.accounts.id.initialize.mock.calls[0][0] as {
      callback: (r: { credential: string }) => void;
    };
    callback({ credential: 'the-id-token' });

    expect(onCredential).toHaveBeenCalledWith('the-id-token');
  });

  it('keeps the button within the width Google allows', async () => {
    const element = host();
    element.style.width = '900px';
    await widgets().render({ kind: 'google', clientId: 'c' }, element, () => undefined);

    const { width } = google.accounts.id.renderButton.mock.calls[0][1] as { width: number };
    expect(width).toBe(400);
    element.remove();
  });
});
