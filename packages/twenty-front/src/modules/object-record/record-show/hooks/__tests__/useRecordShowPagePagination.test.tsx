import { useRecordShowPagePagination } from '@/object-record/record-show/hooks/useRecordShowPagePagination';
import { renderHook } from '@testing-library/react';

const mockUseFindManyRecords = jest.fn();
let mockBefore = 2;
let mockAfter = 232;
let mockMembership = 1;
let mockLoading = false;
let mockError: Error | undefined;

jest.mock('@/app/routing/record-routes/router', () => ({
  useLocation: () => ({ hash: '' }),
  useNavigate: () => jest.fn(),
  useParams: () => ({}),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => [new URLSearchParams()],
}));
jest.mock('@/object-metadata/hooks/useObjectMetadataItem', () => ({
  useObjectMetadataItem: () => ({
    objectMetadataItem: { namePlural: 'vacancies' },
  }),
}));
jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: (...args: unknown[]) => mockUseFindManyRecords(...args),
}));
jest.mock('@/side-panel/hooks/useSidePanelHistory', () => ({
  useSidePanelHistory: () => ({}),
}));
jest.mock('@/side-panel/routing/hooks/useOpenRoutedPageInSidePanel', () => ({
  useOpenRoutedPageInSidePanel: () => ({}),
}));
jest.mock('@/ui/layout/hooks/useWorkspaceSurface', () => ({
  useWorkspaceSurface: () => ({ type: 'main' }),
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useSetAtomComponentState', () => ({
  useSetAtomComponentState: () => jest.fn(),
}));
jest.mock('@/views/hooks/useQueryVariablesFromParentView', () => ({
  useQueryVariablesFromParentView: () => ({
    filter: { status: { eq: 'OPEN' } },
    orderBy: [{ position: 'AscNullsFirst' }],
    isSoftDeleteFilterActive: false,
  }),
}));

describe('record header navigation counts', () => {
  beforeEach(() => {
    mockBefore = 2;
    mockAfter = 232;
    mockMembership = 1;
    mockLoading = false;
    mockError = undefined;
    mockUseFindManyRecords.mockReset();
    mockUseFindManyRecords.mockImplementation((options) => {
      if (options.recordGqlFields?.deletedAt)
        return {
          loading: false,
          records: [{ id: 'job-8', position: 8, deletedAt: null }],
        };
      const filter = JSON.stringify(options.filter);
      const totalCount = filter.includes('"lt"')
        ? mockBefore
        : filter.includes('"gt"')
          ? mockAfter
          : filter.includes('"eq":"job-8"')
            ? mockMembership
            : 235;
      return {
        loading: mockLoading,
        error: mockError,
        totalCount,
        records: [{ id: 'neighbor' }],
      };
    });
  });

  it('uses filtered native counts, not the permanent job number or maximum', () => {
    const { result } = renderHook(() =>
      useRecordShowPagePagination('vacancy', 'job-8'),
    );
    expect(result.current.rankInView).toBe(2);
    expect(result.current.totalCount).toBe(235);
    expect(result.current.hasPaginationError).toBe(false);
    const calls = mockUseFindManyRecords.mock.calls.map(([options]) => options);
    expect(
      calls
        .filter((options) => !options.skip)
        .every((options) => options.limit === 1),
    ).toBe(true);
    expect(
      calls
        .slice(0, 4)
        .every((options) => options.fetchPolicy === 'network-only'),
    ).toBe(true);
  });

  it('refreshes counts after loading rather than retaining a previous count', () => {
    const { result, rerender } = renderHook(() =>
      useRecordShowPagePagination('vacancy', 'job-8'),
    );
    mockLoading = true;
    rerender();
    expect(result.current.isLoadingPagination).toBe(true);
    mockBefore = 0;
    mockAfter = 3;
    mockLoading = false;
    rerender();
    expect(result.current.rankInView).toBe(0);
    expect(result.current.totalCount).toBe(4);
  });

  it('does not add the open record when it is outside the filtered view', () => {
    mockMembership = 0;
    const { result } = renderHook(() =>
      useRecordShowPagePagination('vacancy', 'job-8'),
    );
    expect(result.current.rankInView).toBe(-1);
    expect(result.current.totalCount).toBe(234);
  });

  it('reports a failed count instead of claiming a valid total', () => {
    mockError = new Error('Count query failed');
    const { result } = renderHook(() =>
      useRecordShowPagePagination('vacancy', 'job-8'),
    );
    expect(result.current.hasPaginationError).toBe(true);
  });
});
