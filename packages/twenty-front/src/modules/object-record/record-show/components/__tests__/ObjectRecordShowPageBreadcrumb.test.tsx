import { ObjectRecordShowPageBreadcrumb } from '@/object-record/record-show/components/ObjectRecordShowPageBreadcrumb';
import { render, screen } from '@testing-library/react';
import { FIELD_FOR_TOTAL_COUNT_AGGREGATE_OPERATION } from 'twenty-shared/constants';

const mockUseFindOneRecord = jest.fn();
const mockUsePagination = jest.fn();
const mockUseAggregateRecords = jest.fn();
let mockIsMobile = false;

jest.mock('@/localization/hooks/useNumberFormat', () => ({
  useNumberFormat: () => ({ formatNumber: String }),
}));
jest.mock('@/object-metadata/components/ObjectMetadataIcon', () => ({
  ObjectMetadataIcon: () => null,
}));
jest.mock('@/object-metadata/hooks/useObjectMetadataItem', () => ({
  useObjectMetadataItem: () => ({
    objectMetadataItem: {
      id: 'job-object',
      labelSingular: 'Job',
      fields: [{ name: 'jobNumber' }],
    },
  }),
}));
jest.mock('@/object-record/hooks/useFindOneRecord', () => ({
  useFindOneRecord: (...args: unknown[]) => mockUseFindOneRecord(...args),
}));
jest.mock('@/object-record/hooks/useAggregateRecords', () => ({
  useAggregateRecords: (...args: unknown[]) => mockUseAggregateRecords(...args),
}));
jest.mock('@/object-record/read-only/hooks/useIsRecordFieldReadOnly', () => ({
  useIsRecordFieldReadOnly: () => true,
}));
jest.mock(
  '@/object-record/record-show/hooks/useRecordShowContainerActions',
  () => ({
    useRecordShowContainerActions: () => ({}),
  }),
);
jest.mock(
  '@/object-record/record-show/hooks/useRecordShowPagePagination',
  () => ({
    useRecordShowPagePagination: () => mockUsePagination(),
  }),
);
jest.mock(
  '@/object-record/record-show/hooks/useRecordShowPageGroupByBreadcrumbInfo',
  () => ({
    useRecordShowPageGroupByBreadcrumbInfo: () => ({
      isGroupByActive: false,
      isGroupValueLoading: false,
    }),
  }),
);
jest.mock(
  '@/object-record/record-title-cell/components/RecordTitleCell',
  () => ({
    RecordTitleCell: () => (
      <span>Vibe Coder / AI Developer / Claude Code Expert</span>
    ),
  }),
);
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue',
  () => ({
    useAtomFamilySelectorValue: () => undefined,
  }),
);
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => false,
}));
jest.mock('twenty-ui/utilities', () => ({
  ...jest.requireActual('twenty-ui/utilities'),
  useIsMobile: () => mockIsMobile,
}));

const renderBreadcrumb = () =>
  render(
    <ObjectRecordShowPageBreadcrumb
      objectNameSingular="vacancy"
      objectRecordId="job-8"
      objectLabel="Jobs"
    />,
  );

describe('compact permanent Job number and unfiltered total', () => {
  beforeEach(() => {
    mockIsMobile = false;
    Object.assign(window, {
      __TWENTY_RECORD_ROUTES__: [
        {
          path: '/jobs',
          objectNameSingular: 'vacancy',
          objectNamePlural: 'vacancies',
          recordIdentifierField: 'jobNumber',
        },
      ],
    });
    mockUseFindOneRecord.mockReturnValue({
      loading: false,
      record: { id: 'job-8', jobNumber: 8 },
    });
    mockUsePagination.mockReturnValue({
      rankInView: 187,
      totalCount: 4,
      isLoadingPagination: false,
      hasPaginationError: false,
    });
    mockUseAggregateRecords.mockReturnValue({
      data: { [FIELD_FOR_TOTAL_COUNT_AGGREGATE_OPERATION]: { COUNT: 235 } },
      loading: false,
      error: undefined,
    });
  });

  it('uses permanent8 and all-jobs235, never view rank188 or filtered4', () => {
    renderBreadcrumb();
    expect(screen.getByText('(8/235)')).toBeVisible();
    expect(
      screen.queryByText(/Position|current view|Job 8/),
    ).not.toBeInTheDocument();
    expect(mockUseAggregateRecords).toHaveBeenCalledWith({
      objectNameSingular: 'vacancy',
      recordGqlFieldsAggregate: {
        [FIELD_FOR_TOTAL_COUNT_AGGREGATE_OPERATION]: ['COUNT'],
      },
      skip: false,
      fetchPolicy: 'network-only',
    });
    expect(mockUseFindOneRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        recordGqlFields: { name: true, jobNumber: true },
      }),
    );
  });

  it('retains the same compact counter on mobile', () => {
    mockIsMobile = true;
    renderBreadcrumb();
    expect(screen.getByText('(8/235)')).toBeVisible();
    expect(
      screen.queryByText('Vibe Coder / AI Developer / Claude Code Expert'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Position/)).not.toBeInTheDocument();
  });

  it.each([
    { loading: true, error: undefined, expected: '(8/…)' },
    {
      loading: false,
      error: new Error('Count unavailable'),
      expected: '(8/?)',
    },
  ])('does not present an unverified cached count: %p', (state) => {
    mockUseAggregateRecords.mockReturnValue({
      data: { [FIELD_FOR_TOTAL_COUNT_AGGREGATE_OPERATION]: { COUNT: 235 } },
      ...state,
    });
    renderBreadcrumb();
    expect(screen.getByText(state.expected)).toBeVisible();
    expect(screen.queryByText('(8/235)')).not.toBeInTheDocument();
    expect(screen.queryByText(/Position/)).not.toBeInTheDocument();
  });

  it('does not infer a permanent number from an ordinal or URL', () => {
    mockUseFindOneRecord.mockReturnValue({
      loading: false,
      record: { id: 'job-8' },
    });
    renderBreadcrumb();
    expect(screen.queryByText(/\(.*\/.*\)/)).not.toBeInTheDocument();
  });

  it('keeps the all-jobs denominator across view changes and refreshes it independently', () => {
    const { rerender } = renderBreadcrumb();
    mockUsePagination.mockReturnValue({
      rankInView: 0,
      totalCount: 4,
      isLoadingPagination: false,
      hasPaginationError: false,
    });
    rerender(
      <ObjectRecordShowPageBreadcrumb
        objectNameSingular="vacancy"
        objectRecordId="job-8"
        objectLabel="Jobs"
      />,
    );
    expect(screen.getByText('(8/235)')).toBeVisible();
    mockUseAggregateRecords.mockReturnValue({
      data: { [FIELD_FOR_TOTAL_COUNT_AGGREGATE_OPERATION]: { COUNT: 236 } },
      loading: false,
    });
    rerender(
      <ObjectRecordShowPageBreadcrumb
        objectNameSingular="vacancy"
        objectRecordId="job-8"
        objectLabel="Jobs"
      />,
    );
    expect(screen.getByText('(8/236)')).toBeVisible();
    expect(screen.queryByText('(8/235)')).not.toBeInTheDocument();
  });
});
