import { act, renderHook } from '@testing-library/react';
import { CoreObjectNameSingular } from 'twenty-shared/types';

import { useUpsertActivity } from '@/activities/hooks/useUpsertActivity';
import { type Note } from '@/activities/types/Note';

const mockUpdateOneRecord = jest.fn();

jest.mock('@/object-record/hooks/useUpdateOneRecord', () => ({
  useUpdateOneRecord: () => ({ updateOneRecord: mockUpdateOneRecord }),
}));
jest.mock('@/activities/hooks/useCreateActivityInDB', () => ({
  useCreateActivityInDB: () => ({ createActivityInDB: jest.fn() }),
}));
jest.mock(
  '@/activities/hooks/useRefreshShowPageFindManyActivitiesQueries',
  () => ({
    useRefreshShowPageFindManyActivitiesQueries: () => ({
      refreshShowPageFindManyActivitiesQueries: jest.fn(),
    }),
  }),
);
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomState', () => ({
  useAtomState: () => [false, jest.fn()],
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => undefined,
}));

describe('useUpsertActivity note timestamps', () => {
  it('sends only the edited body, preserving original creation time and server-owned update time', async () => {
    const note: Note = {
      id: 'synthetic-note',
      __typename: 'Note',
      title: 'Call attempt',
      createdAt: '2026-10-30T11:00:00Z',
      updatedAt: '2026-10-30T11:01:00Z',
    };
    const before = { ...note };
    const input = { bodyV2: { blocknote: '[]', markdown: null } };
    const { result } = renderHook(() =>
      useUpsertActivity({
        activityObjectNameSingular: CoreObjectNameSingular.Note,
      }),
    );

    await act(() => result.current.upsertActivity({ activity: note, input }));

    expect(mockUpdateOneRecord).toHaveBeenCalledWith({
      objectNameSingular: CoreObjectNameSingular.Note,
      idToUpdate: note.id,
      updateOneRecordInput: input,
    });
    expect(note).toEqual(before);
    expect(
      mockUpdateOneRecord.mock.calls[0][0].updateOneRecordInput,
    ).not.toHaveProperty('createdAt');
    expect(
      mockUpdateOneRecord.mock.calls[0][0].updateOneRecordInput,
    ).not.toHaveProperty('updatedAt');
  });
});
