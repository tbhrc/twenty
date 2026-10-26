import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'twenty-ui/theme';

import { MarkdownPreview } from '@/activities/files/components/MarkdownPreview';
import { fetchMarkdownPreview } from '@/activities/files/utils/fetchMarkdownPreview';

jest.mock('@/activities/files/utils/fetchMarkdownPreview');

jest.mock('@/activities/files/components/MarkdownPreviewContent', () => ({
  MarkdownPreviewContent: ({ text }: { text: string }) => (
    <div data-testid="markdown-content">{text}</div>
  ),
}));

const mockFetchMarkdownPreview = jest.mocked(fetchMarkdownPreview);

const renderPreview = () =>
  render(
    <ThemeProvider colorScheme="light">
      <I18nProvider i18n={i18n}>
        <MarkdownPreview
          fileName="notes.md"
          fileUrl="https://example.com/notes.md"
        />
      </I18nProvider>
    </ThemeProvider>,
  );

describe('MarkdownPreview', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should show a loading state first, then the rendered markdown', async () => {
    mockFetchMarkdownPreview.mockResolvedValue({
      status: 'ready',
      text: '# Hello',
    });

    renderPreview();

    expect(screen.getByText('Loading preview...')).toBeInTheDocument();
    expect(await screen.findByTestId('markdown-content')).toHaveTextContent(
      '# Hello',
    );
    expect(mockFetchMarkdownPreview).toHaveBeenCalledWith(
      'https://example.com/notes.md',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('should show an empty state for a blank file', async () => {
    mockFetchMarkdownPreview.mockResolvedValue({
      status: 'ready',
      text: '  \n\n ',
    });

    renderPreview();

    expect(await screen.findByText('This file is empty.')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
  });

  it('should fall back to the download action when the file is too large', async () => {
    mockFetchMarkdownPreview.mockResolvedValue({ status: 'tooLarge' });

    renderPreview();

    expect(
      await screen.findByText(/too large to preview/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Download File' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
  });

  it('should show an error state with the download action when loading fails', async () => {
    mockFetchMarkdownPreview.mockRejectedValue(new Error('boom'));

    renderPreview();

    expect(
      await screen.findByText(/could not be loaded for preview/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Download File' }),
    ).toBeInTheDocument();
  });
});
