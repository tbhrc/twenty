import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { MARKDOWN_PREVIEW_COMPONENTS } from '@/activities/files/components/MarkdownPreviewComponents';

jest.mock('@/ai/components/MarkdownCodeBlock', () => ({
  MarkdownCodeBlock: ({ children }: { children: ReactNode }) => (
    <pre data-testid="code-block">{children}</pre>
  ),
}));

const {
  a: Link,
  img: Image,
  table: Table,
  pre: Pre,
  ul: List,
} = MARKDOWN_PREVIEW_COMPONENTS;

const renderWithI18n = (children: ReactNode) =>
  render(<I18nProvider i18n={i18n}>{children}</I18nProvider>);

describe('MarkdownPreviewComponents', () => {
  describe('links', () => {
    it('should open safe links in a new tab with noopener noreferrer', () => {
      renderWithI18n(<Link href="https://example.com/a">Example</Link>);

      const link = screen.getByRole('link', { name: 'Example' });

      expect(link).toHaveAttribute('href', 'https://example.com/a');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should allow mailto links', () => {
      renderWithI18n(<Link href="mailto:a@example.com">Mail</Link>);

      expect(screen.getByRole('link', { name: 'Mail' })).toHaveAttribute(
        'href',
        'mailto:a@example.com',
      );
    });

    it.each([
      'javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      './relative.md',
      '#anchor',
      undefined,
    ])('should render %p as plain text instead of a link', (href) => {
      renderWithI18n(<Link href={href}>Label</Link>);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('Label')).toBeInTheDocument();
    });
  });

  describe('images', () => {
    it('should never render an image element for a remote image', () => {
      const { container } = renderWithI18n(<Image alt="Diagram" />);

      expect(container.querySelector('img')).toBeNull();
      expect(screen.getByText('Diagram')).toBeInTheDocument();
    });

    it('should fall back to a generic label when there is no alt text', () => {
      const { container } = renderWithI18n(<Image alt="  " />);

      expect(container.querySelector('img')).toBeNull();
      expect(screen.getByText('Image')).toBeInTheDocument();
    });
  });

  describe('lists', () => {
    it('should restore bullets on ordinary unordered lists', () => {
      renderWithI18n(
        <List>
          <li>one</li>
        </List>,
      );

      expect(screen.getByRole('list')).toHaveStyle({ listStyleType: 'disc' });
    });

    it('should leave GFM task lists without bullets', () => {
      renderWithI18n(
        <List className="contains-task-list">
          <li>task</li>
        </List>,
      );

      // jsdom's default stylesheet already bullets a ul, so assert that no
      // inline override is applied instead of the computed style.
      expect(screen.getByRole('list')).not.toHaveAttribute('style');
    });
  });

  it('should wrap tables in a locally scrolling container', () => {
    const { container } = renderWithI18n(
      <Table>
        <tbody>
          <tr>
            <td>Cell</td>
          </tr>
        </tbody>
      </Table>,
    );

    const table = container.querySelector('table');

    expect(table).toBeInTheDocument();
    expect(table?.parentElement).toBe(container.firstElementChild);
    expect(screen.getByText('Cell')).toBeInTheDocument();
  });

  it('should render fenced code through the shared code block', () => {
    renderWithI18n(
      <Pre>
        <code>const a = 1;</code>
      </Pre>,
    );

    expect(screen.getByTestId('code-block')).toHaveTextContent('const a = 1;');
  });
});
