import { MARKDOWN_PREVIEW_COMPONENTS } from '@/activities/files/components/MarkdownPreviewComponents';
import { getSafeMarkdownUrl } from '@/activities/files/utils/getSafeMarkdownUrl';
import { StyledMarkdownContainer } from '@/ai/components/LazyMarkdownRendererStyledComponents';
import { styled } from '@linaria/react';
import { Trans } from '@lingui/react/macro';
import { lazy, Suspense } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

const StyledMarkdownPreviewContent = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  overflow-wrap: anywhere;
  padding: ${themeCssVariables.spacing[4]};

  p {
    margin-block: ${themeCssVariables.spacing[2]};
  }

  ul,
  ol {
    margin-block: ${themeCssVariables.spacing[2]};
    padding-inline-start: ${themeCssVariables.spacing[6]};
  }

  ul {
    list-style: disc;
  }

  ol {
    list-style: decimal;
  }

  ul.contains-task-list {
    list-style: none;
    padding-inline-start: ${themeCssVariables.spacing[1]};
  }

  blockquote {
    border-inline-start: 3px solid ${themeCssVariables.border.color.medium};
    color: ${themeCssVariables.font.color.secondary};
    margin: ${themeCssVariables.spacing[2]} 0;
    padding-inline-start: ${themeCssVariables.spacing[3]};
  }

  pre {
    white-space: pre;
  }

  code {
    overflow-wrap: normal;
  }
`;

// react-markdown and remark-gfm are ESM-only and heavy, so they are loaded on
// first use. react-markdown does not render raw HTML unless rehype-raw is
// added, which is intentionally not the case here.
const MarkdownRenderer = lazy(async () => {
  const [{ default: Markdown }, { default: remarkGfm }] = await Promise.all([
    import('react-markdown'),
    import('remark-gfm'),
  ]);

  const remarkPlugins = [remarkGfm];

  return {
    default: ({ children }: { children: string }) => (
      <Markdown
        remarkPlugins={remarkPlugins}
        components={MARKDOWN_PREVIEW_COMPONENTS}
        urlTransform={getSafeMarkdownUrl}
      >
        {children}
      </Markdown>
    ),
  };
});

export const MarkdownPreviewContent = ({ text }: { text: string }) => (
  <StyledMarkdownPreviewContent>
    <StyledMarkdownContainer>
      <Suspense fallback={<Trans>Loading preview...</Trans>}>
        <MarkdownRenderer>{text}</MarkdownRenderer>
      </Suspense>
    </StyledMarkdownContainer>
  </StyledMarkdownPreviewContent>
);
