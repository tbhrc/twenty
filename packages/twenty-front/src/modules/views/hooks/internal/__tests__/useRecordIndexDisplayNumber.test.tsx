import { useRecordIndexDisplayNumber } from '@/views/hooks/internal/useRecordIndexDisplayNumber';
import { renderHook } from '@testing-library/react';

let mockObjectName = 'vacancy';
let mockTrueCount = 235;
let mockAllocation: number | undefined = 241;
const mockUseAllocation = jest.fn();
jest.mock(
  '@/context-store/hooks/useContextStoreObjectMetadataItemOrThrow',
  () => ({
    useContextStoreObjectMetadataItemOrThrow: () => ({
      objectMetadataItem: { nameSingular: mockObjectName },
    }),
  }),
);
jest.mock('@/views/hooks/internal/useGetRecordIndexTotalCount', () => ({
  useGetRecordIndexTotalCount: () => ({ totalCount: mockTrueCount }),
}));
jest.mock('@/object-record/hooks/useLatestAllocatedJobNumber', () => ({
  useLatestAllocatedJobNumber: (...args: unknown[]) => {
    mockUseAllocation(...args);
    return { latestAllocatedJobNumber: mockAllocation };
  },
}));

describe('Jobs visible allocation indicator', () => {
  beforeEach(() => {
    mockObjectName = 'vacancy';
    mockTrueCount = 235;
    mockAllocation = 241;
  });

  it('retains the allocation across filters, deletion of the highest row and lower gap reuse', () => {
    const { result, rerender } = renderHook(useRecordIndexDisplayNumber);
    expect(result.current).toBe(241);
    for (const count of [1, 234, 236]) {
      mockTrueCount = count;
      rerender();
      expect(result.current).toBe(241);
      expect(mockTrueCount).toBe(count);
    }
    mockAllocation = 242;
    rerender();
    expect(result.current).toBe(242);
  });

  it('leaves other objects using their true view counts', () => {
    mockObjectName = 'person';
    expect(renderHook(useRecordIndexDisplayNumber).result.current).toBe(235);
    expect(mockUseAllocation).toHaveBeenLastCalledWith({ skip: true });
  });

  it('does not substitute a row count when the allocator is unavailable', () => {
    mockAllocation = undefined;
    expect(
      renderHook(useRecordIndexDisplayNumber).result.current,
    ).toBeUndefined();
  });
});
