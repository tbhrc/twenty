export const MARKDOWN_EXTENSIONS = ['md', 'markdown'];

// Markdown is fetched and parsed in the browser, so the preview is bounded.
// Larger files fall back to the download action.
export const MARKDOWN_PREVIEW_MAX_BYTES = 1024 * 1024;

// Only these schemes may be linked from a previewed document.
export const MARKDOWN_SAFE_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:'];
