import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme';

import { formatNoteTimestamp } from '@/activities/notes/utils/formatNoteTimestamp';
import { type Note } from '@/activities/types/Note';

const StyledTimestamps = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  line-height: 1.5;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const NoteTimestamps = ({
  note,
}: {
  note: Pick<Note, 'createdAt' | 'updatedAt' | 'createdBy'>;
}) => {
  const createdAt = formatNoteTimestamp(note.createdAt);
  const updatedAt = formatNoteTimestamp(note.updatedAt);
  const isImported = note.createdBy?.source === 'IMPORT';

  return (
    <StyledTimestamps aria-label={t`Note timestamps in FolderDesk OS`}>
      <div>
        {isImported ? t`Created (FDOS record)` : t`Created`}:{' '}
        {createdAt ? (
          <time dateTime={note.createdAt}>{createdAt}</time>
        ) : (
          t`Unknown`
        )}
      </div>
      <div>
        {isImported ? t`Updated (FDOS record)` : t`Updated`}:{' '}
        {updatedAt ? (
          <time dateTime={note.updatedAt}>{updatedAt}</time>
        ) : (
          t`Unknown`
        )}
      </div>
      {isImported && (
        <div>{t`Original source timestamps and import time: Unknown. See source evidence.`}</div>
      )}
    </StyledTimestamps>
  );
};
