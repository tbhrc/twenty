import { useLatestAllocatedJobNumber } from '@/object-record/hooks/useLatestAllocatedJobNumber';
import { useRefetchJobNumberAllocation } from '@/object-record/hooks/useRefetchJobNumberAllocation';
import { LATEST_ALLOCATED_JOB_NUMBER } from '@/object-record/graphql/queries/latestAllocatedJobNumber';
import { renderHook } from '@testing-library/react';

const mockUseQuery = jest.fn();
const mockRefetchQueries = jest.fn().mockResolvedValue([]);
jest.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useApolloClient: () => ({ refetchQueries: mockRefetchQueries }),
}));

describe('live allocation number', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: { latestAllocatedJobNumber: 241 },
      loading: false,
    });
    mockRefetchQueries.mockClear();
  });

  it('reads the native allocator on entry and refreshes allocations without record events', () => {
    const { result, rerender } = renderHook(() =>
      useLatestAllocatedJobNumber(),
    );
    expect(result.current.latestAllocatedJobNumber).toBe(241);
    expect(mockUseQuery).toHaveBeenCalledWith(LATEST_ALLOCATED_JOB_NUMBER, {
      skip: false,
      fetchPolicy: 'network-only',
      notifyOnNetworkStatusChange: true,
      pollInterval: 30_000,
    });
    mockUseQuery.mockReturnValue({
      data: { latestAllocatedJobNumber: 242 },
      loading: false,
    });
    rerender();
    expect(result.current.latestAllocatedJobNumber).toBe(242);
  });

  it.each([{ loading: true }, { error: new Error('Unavailable') }])(
    'hides an unverified cached allocation: %p',
    (state) => {
      mockUseQuery.mockReturnValue({
        data: { latestAllocatedJobNumber: 241 },
        ...state,
      });
      expect(
        renderHook(() => useLatestAllocatedJobNumber()).result.current
          .latestAllocatedJobNumber,
      ).toBeUndefined();
    },
  );

  it('skips the Job query on other objects', () => {
    renderHook(() => useLatestAllocatedJobNumber({ skip: true }));
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      LATEST_ALLOCATED_JOB_NUMBER,
      expect.objectContaining({ skip: true }),
    );
  });

  it('invalidates the active allocation read on Job events only', async () => {
    const { result } = renderHook(useRefetchJobNumberAllocation);
    await result.current('vacancies');
    expect(mockRefetchQueries).toHaveBeenCalledWith({
      include: [LATEST_ALLOCATED_JOB_NUMBER],
    });
    mockRefetchQueries.mockClear();
    await result.current('people');
    expect(mockRefetchQueries).not.toHaveBeenCalled();
  });
});
