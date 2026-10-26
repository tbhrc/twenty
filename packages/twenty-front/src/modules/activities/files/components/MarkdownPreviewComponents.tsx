import { getSafeMarkdownUrl } from '@/activities/files/utils/getSafeMarkdownUrl';
import { StyledTableScrollContainer } from '@/ai/components/LazyMarkdownRendererStyledComponents';
import { MarkdownCodeBlock } from '@/ai/components/MarkdownCodeBlock';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';

// Previewed files can be untrusted and private. Raw HTML is never rendered,
// links are limited to safe schemes, and images are never loaded (a remote or
// relative image URL would leak the viewer's context to another server), so
// each image is replaced by its alt text.
const MarkdownPreviewLink = ({
  children,
  href,
  title,
}: {
  children?: ReactNode;
  href?: string;
  title?: string;
}) => {
  const safeHref = getSafeMarkdownUrl(href);

  if (safeHref === undefined) {
    return <span>{children}</span>;
  }

  return (
    <a
      className="markdown-link"
      href={safeHref}
      title={title}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
};

const MarkdownPreviewImage = ({ alt }: { alt?: string }) => {
  const { t } = useLingui();

  return <span>{alt?.trim() || t`Image`}</span>;
};

// The shared markdown container resets list styles for chat; a document needs
// bullets back, except on GFM task lists whose checkboxes are the marker.
const MarkdownPreviewList = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <ul
    className={className}
    style={
      className?.includes('contains-task-list')
        ? undefined
        : { listStyleType: 'disc', paddingLeft: 20 }
    }
  >
    {children}
  </ul>
);

export const MARKDOWN_PREVIEW_COMPONENTS = {
  a: MarkdownPreviewLink,
  ul: MarkdownPreviewList,
  img: MarkdownPreviewImage,
  table: ({ children }: { children?: ReactNode }) => (
    <StyledTableScrollContainer>
      <table>{children}</table>
    </StyledTableScrollContainer>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <MarkdownCodeBlock>{children}</MarkdownCodeBlock>
  ),
};
