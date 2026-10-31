import { act, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';

import { NoteRecordTimestamps } from '@/activities/notes/components/NoteRecordTimestamps';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';

describe('NoteRecordTimestamps', () => {
  it('follows server/cache updates and navigation to another note', () => {
    const firstNote = {
      id: 'synthetic-note-first',
      __typename: 'Note',
      createdAt: '2026-10-30T11:00:00Z',
      updatedAt: '2026-10-30T11:01:00Z',
    };
    jotaiStore.set(recordStoreFamilyState.atomFamily(firstNote.id), firstNote);
    jotaiStore.set(recordStoreFamilyState.atomFamily('synthetic-note-second'), {
      id: 'synthetic-note-second',
      __typename: 'Note',
      createdAt: '2026-10-31T20:00:00Z',
      updatedAt: '2026-10-31T20:00:00Z',
    });
    const { rerender } = render(
      <NoteRecordTimestamps noteId={firstNote.id} />,
      {
        wrapper: ({ children }) => (
          <Provider store={jotaiStore}>{children}</Provider>
        ),
      },
    );
    expect(screen.getByText(/Created:/)).toHaveTextContent(
      '30 Oct 2026, 15:00:00',
    );

    act(() => {
      jotaiStore.set(recordStoreFamilyState.atomFamily(firstNote.id), {
        ...firstNote,
        updatedAt: '2026-10-31T11:10:00Z',
      });
    });
    expect(screen.getByText(/Created:/)).toHaveTextContent(
      '30 Oct 2026, 15:00:00',
    );
    expect(screen.getByText(/Updated:/)).toHaveTextContent(
      '31 Oct 2026, 15:10:00',
    );

    rerender(<NoteRecordTimestamps noteId="synthetic-note-second" />);
    expect(screen.getByText(/Created:/)).toHaveTextContent(
      '01 Nov 2026, 00:00:00',
    );
  });
});
