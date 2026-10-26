import { MarkdownPreviewContent } from '@/activities/files/components/MarkdownPreviewContent';
import { UnavailableFilePreview } from '@/activities/files/components/UnavailableFilePreview';
import {
  fetchMarkdownPreview,
  type MarkdownPreviewData,
} from '@/activities/files/utils/fetchMarkdownPreview';
import { styled } from '@linaria/react';
import { Trans } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

const StyledContainer = styled.div`
  background: ${themeCssVariables.background.primary};
  flex: 1;
  min-height: 0;
  overflow: auto;
  width: 100%;
`;

const StyledMessage = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[4]};
`;

type MarkdownPreviewProps = {
  fileName: string;
  fileUrl: string;
};

type MarkdownPreviewState =
  | { status: 'loading' }
  | { status: 'error' }
  | MarkdownPreviewData;

// Render with key={fileUrl} so a different file starts from the loading state.
export const MarkdownPreview = ({
  fileName,
  fileUrl,
}: MarkdownPreviewProps) => {
  const [state, setState] = useState<MarkdownPreviewState>({
    status: 'loading',
  });

  useEffect(() => {
    const abortController = new AbortController();

    fetchMarkdownPreview(fileUrl, { signal: abortController.signal })
      .then(setState)
      .catch(() => {
        if (!abortController.signal.aborted) {
          setState({ status: 'error' });
        }
      });

    return () => abortController.abort();
  }, [fileUrl]);

  if (state.status === 'loading') {
    return (
      <StyledContainer>
        <StyledMessage>
          <Trans>Loading preview...</Trans>
        </StyledMessage>
      </StyledContainer>
    );
  }

  if (state.status === 'error') {
    return (
      <UnavailableFilePreview
        fileName={fileName}
        fileUrl={fileUrl}
        message={
          <Trans>
            This file could not be loaded for preview. Please download the file
            to view it.
          </Trans>
        }
      />
    );
  }

  if (state.status === 'tooLarge') {
    return (
      <UnavailableFilePreview
        fileName={fileName}
        fileUrl={fileUrl}
        message={
          <Trans>
            This file is too large to preview. Please download the file to view
            it.
          </Trans>
        }
      />
    );
  }

  if (state.text.trim().length === 0) {
    return (
      <StyledContainer>
        <StyledMessage>
          <Trans>This file is empty.</Trans>
        </StyledMessage>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      <MarkdownPreviewContent text={state.text} />
    </StyledContainer>
  );
};
