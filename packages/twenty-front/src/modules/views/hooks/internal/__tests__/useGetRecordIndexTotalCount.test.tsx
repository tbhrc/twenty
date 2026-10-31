import { useGetRecordIndexTotalCount } from '@/views/hooks/internal/useGetRecordIndexTotalCount';
import { renderHook } from '@testing-library/react';

const mockUseAggregateRecords = jest.fn();
const mockStructuredFilter = {
  or: [{ status: { eq: 'OPEN' } }, { status: { eq: 'ON_HOLD' } }],
};
const mockTextFilter = {
  or: [{ name: { ilike: '%Vibe%' } }, { publicTitle: { ilike: '%Vibe%' } }],
};

jest.mock(
  '@/context-store/hooks/useContextStoreObjectMetadataItemOrThrow',
  () => ({
    useContextStoreObjectMetadataItemOrThrow: () => ({
      objectMetadataItem: { nameSingular: 'vacancy', readableFields: [] },
    }),
  }),
);
jest.mock('@/object-record/hooks/useAggregateRecords', () => ({
  useAggregateRecords: (...args: unknown[]) => mockUseAggregateRecords(...args),
}));
jest.mock(
  '@/object-record/record-filter/hooks/useFilterValueDependencies',
  () => ({
    useFilterValueDependencies: () => ({ filterValueDependencies: {} }),
  }),
);
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue',
  () => ({
    useAtomComponentStateValue: () => [],
  }),
);
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => [],
}));
jest.mock('@/views/hooks/useGetRecordGroupVisibilityFilters', () => ({
  useGetRecordGroupVisibilityFilters: () => ({ recordFilters: [] }),
}));
jest.mock('twenty-shared/utils', () => ({
  ...jest.requireActual('twenty-shared/utils'),
  computeRecordGqlOperationFilter: () => mockStructuredFilter,
  turnAnyFieldFilterIntoRecordGqlFilter: () => ({
    recordGqlOperationFilter: mockTextFilter,
  }),
}));

describe('Jobs list count freshness and filters', () => {
  beforeEach(() =>
    mockUseAggregateRecords.mockReturnValue({
      data: { id: { COUNT: 235 } },
      loading: false,
    }),
  );

  it('queries the native count on the network and intersects search with existing filters', () => {
    const { result } = renderHook(useGetRecordIndexTotalCount);
    expect(result.current.totalCount).toBe(235);
    expect(mockUseAggregateRecords).toHaveBeenCalledWith({
      objectNameSingular: 'vacancy',
      filter: { and: [mockStructuredFilter, mockTextFilter] },
      recordGqlFieldsAggregate: { id: ['COUNT'] },
      fetchPolicy: 'network-only',
    });
  });

  it('reflects a refreshed aggregate instead of retaining an earlier count', () => {
    const { result, rerender } = renderHook(useGetRecordIndexTotalCount);
    mockUseAggregateRecords.mockReturnValue({
      data: { id: { COUNT: 1 } },
      loading: false,
    });
    rerender();
    expect(result.current.totalCount).toBe(1);
  });

  it.each([
    { loading: true },
    { loading: false, error: new Error('Read failed') },
  ])('does not expose cached data during an unverified read: %p', (state) => {
    mockUseAggregateRecords.mockReturnValue({
      data: { id: { COUNT: 235 } },
      ...state,
    });
    const { result } = renderHook(useGetRecordIndexTotalCount);
    expect(result.current.totalCount).toBeUndefined();
  });
});
