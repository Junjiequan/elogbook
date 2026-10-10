import { AppConfig } from './app-config';

describe('AppConfig', () => {
  afterEach(() => vi.restoreAllMocks());

  const withConfigFile = (response: Promise<Response>) =>
    vi.spyOn(window, 'fetch').mockReturnValue(response);
  const file = (body: unknown, ok = true) =>
    Promise.resolve(new Response(JSON.stringify(body), { status: ok ? 200 : 404 }));

  it('expects the API on the same site until told otherwise', () => {
    expect(new AppConfig().apiUrl).toBe('/api/v1');
  });

  it('takes the API address from config.json, without a trailing slash', async () => {
    withConfigFile(file({ apiUrl: 'https://logbook.example.org/api/v1/' }));
    const config = new AppConfig();

    await config.load();

    expect(config.apiUrl).toBe('https://logbook.example.org/api/v1');
  });

  it('keeps the default when the file is missing, unreadable or has no address', async () => {
    const responses: (() => Promise<Response>)[] = [
      () => file({}, false),
      () => file({ apiUrl: '   ' }),
      () => file({ other: 1 }),
      () => Promise.reject(new Error('offline')),
    ];
    for (const response of responses) {
      vi.restoreAllMocks(); // each pass spies on fetch afresh
      withConfigFile(response());
      const config = new AppConfig();

      await config.load();

      expect(config.apiUrl).toBe('/api/v1');
    }
  });
});
