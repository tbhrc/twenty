import { fetchMarkdownPreview } from '@/activities/files/utils/fetchMarkdownPreview';

const mockTextResponse = ({
  text,
  contentLength,
  ok = true,
  status = 200,
}: {
  text: string;
  contentLength?: string;
  ok?: boolean;
  status?: number;
}) => {
  const cancel = jest.fn().mockResolvedValue(undefined);

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      status,
      headers: { get: () => contentLength ?? null },
      body: { cancel },
      text: () => Promise.resolve(text),
    } as unknown as Response),
  );

  return { cancel };
};

const mockStreamedResponse = (chunks: Uint8Array[]) => {
  const cancel = jest.fn().mockResolvedValue(undefined);
  const read = jest.fn();

  chunks.forEach((chunk) =>
    read.mockResolvedValueOnce({ done: false, value: chunk }),
  );
  read.mockResolvedValue({ done: true, value: undefined });

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => null },
      body: { getReader: () => ({ read, cancel }) },
    } as unknown as Response),
  );

  return { cancel };
};

describe('fetchMarkdownPreview', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the text of a small file', async () => {
    mockTextResponse({ text: '# Title\n\nBody' });

    const result = await fetchMarkdownPreview('https://example.com/a.md');

    expect(result).toEqual({ status: 'ready', text: '# Title\n\nBody' });
  });

  it('should pass the abort signal to fetch', async () => {
    mockTextResponse({ text: 'x' });
    const { signal } = new AbortController();

    await fetchMarkdownPreview('https://example.com/a.md', { signal });

    expect(fetch).toHaveBeenCalledWith('https://example.com/a.md', { signal });
  });

  it('should reject when the response is not ok', async () => {
    mockTextResponse({ text: '', ok: false, status: 403 });

    await expect(
      fetchMarkdownPreview('https://example.com/a.md'),
    ).rejects.toThrow('403');
  });

  it('should report too large from the declared content length without reading the body', async () => {
    const { cancel } = mockTextResponse({ text: 'x', contentLength: '2000' });

    const result = await fetchMarkdownPreview('https://example.com/a.md', {
      maxBytes: 1000,
    });

    expect(result).toEqual({ status: 'tooLarge' });
    expect(cancel).toHaveBeenCalled();
  });

  it('should count bytes rather than characters when there is no stream', async () => {
    mockTextResponse({ text: 'é'.repeat(600) });

    const result = await fetchMarkdownPreview('https://example.com/a.md', {
      maxBytes: 1000,
    });

    expect(result).toEqual({ status: 'tooLarge' });
  });

  it('should decode a streamed body', async () => {
    const encoder = new TextEncoder();
    mockStreamedResponse([encoder.encode('# Hé'), encoder.encode('llo')]);

    const result = await fetchMarkdownPreview('https://example.com/a.md');

    expect(result).toEqual({ status: 'ready', text: '# Héllo' });
  });

  it('should stop a streamed body that exceeds the limit', async () => {
    const { cancel } = mockStreamedResponse([
      new Uint8Array(600),
      new Uint8Array(600),
    ]);

    const result = await fetchMarkdownPreview('https://example.com/a.md', {
      maxBytes: 1000,
    });

    expect(result).toEqual({ status: 'tooLarge' });
    expect(cancel).toHaveBeenCalled();
  });
});
