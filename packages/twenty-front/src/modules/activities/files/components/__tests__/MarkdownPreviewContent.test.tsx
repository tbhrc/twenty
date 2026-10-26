import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { MarkdownPreviewContent } from '@/activities/files/components/MarkdownPreviewContent';
import { MARKDOWN_PREVIEW_COMPONENTS } from '@/activities/files/components/MarkdownPreviewComponents';
import { getSafeMarkdownUrl } from '@/activities/files/utils/getSafeMarkdownUrl';

// react-markdown and remark-gfm are ESM-only and are not transformed by jest,
// so only the way MarkdownPreviewContent configures them is asserted here.
const mockMarkdown = jest.fn();

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: (props: { children: string }) => {
    mockMarkdown(props);

    return <div data-testid="markdown">{props.children}</div>;
  },
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: 'remark-gfm-plugin',
}));

jest.mock('@/ai/components/MarkdownCodeBlock', () => ({
  MarkdownCodeBlock: ({ children }: { children: ReactNode }) => (
    <pre>{children}</pre>
  ),
}));

describe('MarkdownPreviewContent', () => {
  beforeEach(() => {
    mockMarkdown.mockClear();
  });

  it('should render the text through react-markdown with GFM and the safe components', async () => {
    render(
      <I18nProvider i18n={i18n}>
        <MarkdownPreviewContent text={'# Title'} />
      </I18nProvider>,
    );

    expect(await screen.findByTestId('markdown')).toHaveTextContent('# Title');

    const props = mockMarkdown.mock.calls[0][0];

    expect(props.remarkPlugins).toEqual(['remark-gfm-plugin']);
    expect(props.components).toBe(MARKDOWN_PREVIEW_COMPONENTS);
    expect(props.urlTransform).toBe(getSafeMarkdownUrl);
  });

  it('should not enable raw HTML rendering', async () => {
    render(
      <I18nProvider i18n={i18n}>
        <MarkdownPreviewContent text={'<script>alert(1)</script>'} />
      </I18nProvider>,
    );

    await screen.findByTestId('markdown');

    const props = mockMarkdown.mock.calls[0][0];

    expect(props.rehypePlugins).toBeUndefined();
    expect(props.allowDangerousHtml).toBeUndefined();
  });
});
