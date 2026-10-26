import { MARKDOWN_SAFE_LINK_PROTOCOLS } from '@/activities/files/const/markdown-preview.const';

// Absolute http(s) and mailto URLs only. Relative, protocol-relative and
// script-capable URLs (javascript:, data:, vbscript:, ...) are dropped.
export const getSafeMarkdownUrl = (
  url: string | null | undefined,
): string | undefined => {
  if (typeof url !== 'string') {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url.trim());

    return MARKDOWN_SAFE_LINK_PROTOCOLS.includes(parsedUrl.protocol)
      ? parsedUrl.href
      : undefined;
  } catch {
    return undefined;
  }
};
