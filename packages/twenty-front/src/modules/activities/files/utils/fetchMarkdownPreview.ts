import { MARKDOWN_PREVIEW_MAX_BYTES } from '@/activities/files/const/markdown-preview.const';
import { isDefined } from 'twenty-shared/utils';

export type MarkdownPreviewData =
  | { status: 'ready'; text: string }
  | { status: 'tooLarge' };

const TOO_LARGE: MarkdownPreviewData = { status: 'tooLarge' };

export const fetchMarkdownPreview = async (
  url: string,
  {
    maxBytes = MARKDOWN_PREVIEW_MAX_BYTES,
    signal,
  }: { maxBytes?: number; signal?: AbortSignal } = {},
): Promise<MarkdownPreviewData> => {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Failed fetching markdown file (${response.status})`);
  }

  const declaredLength = Number(response.headers.get('content-length'));

  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel();

    return TOO_LARGE;
  }

  const reader = response.body?.getReader();

  if (!isDefined(reader)) {
    const text = await response.text();

    return new TextEncoder().encode(text).length > maxBytes
      ? TOO_LARGE
      : { status: 'ready', text };
  }

  // The declared length can be missing or wrong, so the bytes actually read
  // are counted and the download is stopped at the limit.
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    receivedBytes += value.byteLength;

    if (receivedBytes > maxBytes) {
      await reader.cancel();

      return TOO_LARGE;
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(receivedBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { status: 'ready', text: new TextDecoder('utf-8').decode(bytes) };
};
