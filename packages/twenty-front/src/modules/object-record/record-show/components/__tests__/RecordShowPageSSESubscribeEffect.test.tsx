import { RecordShowPageSSESubscribeEffect } from '@/object-record/record-show/components/RecordShowPageSSESubscribeEffect';
import { render } from '@testing-library/react';

const mockListen = jest.fn();
const mockRefetch = jest.fn();
jest.mock('@/sse-db-event/hooks/useListenToEventsForQuery', () => ({
  useListenToEventsForQuery: (...args: unknown[]) => mockListen(...args),
}));
jest.mock('@/object-metadata/hooks/useObjectMetadataItem', () => ({
  useObjectMetadataItem: () => ({
    objectMetadataItem: { namePlural: 'vacancies' },
  }),
}));
jest.mock('@/object-record/hooks/useRefetchAggregateQueries', () => ({
  useRefetchAggregateQueries: () => ({ refetchAggregateQueries: mockRefetch }),
}));
jest.mock(
  '@/ui/layout/hooks/useWorkspaceSurfaceScopedComponentInstanceId',
  () => ({ useWorkspaceSurfaceScopedComponentInstanceId: (id: string) => id }),
);

describe('Job header total update subscription', () => {
  beforeEach(() => {
    mockListen.mockClear();
    mockRefetch.mockClear();
  });

  it('listens for changes to Jobs beyond the open Job so native aggregate invalidation can run', async () => {
    render(
      <RecordShowPageSSESubscribeEffect
        objectNameSingular="vacancy"
        recordId="job-8"
      />,
    );
    const options = mockListen.mock.calls[0][0];
    expect(options.operationSignature.variables.filter).toBeUndefined();
    await options.onSseReconnected();
    expect(mockRefetch).toHaveBeenCalledWith({
      objectMetadataNamePlural: 'vacancies',
    });
  });

  it('retains the existing single-record subscription for other objects', () => {
    render(
      <RecordShowPageSSESubscribeEffect
        objectNameSingular="note"
        recordId="note-1"
      />,
    );
    expect(
      mockListen.mock.calls[0][0].operationSignature.variables.filter,
    ).toEqual({ id: { eq: 'note-1' } });
    expect(mockListen.mock.calls[0][0].onSseReconnected).toBeUndefined();
  });
});
