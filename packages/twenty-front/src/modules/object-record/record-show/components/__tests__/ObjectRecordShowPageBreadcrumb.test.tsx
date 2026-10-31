import { ObjectRecordShowPageBreadcrumb } from '@/object-record/record-show/components/ObjectRecordShowPageBreadcrumb';
import { render, screen } from '@testing-library/react';

const mockUseFindOneRecord = jest.fn();
const mockUsePagination = jest.fn();
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

describe('record header identity and view position', () => {
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
      rankInView: 2,
      totalCount: 235,
      isLoadingPagination: false,
      hasPaginationError: false,
    });
  });

  it('separates permanent Job8 from position3 and the real count235', () => {
    renderBreadcrumb();
    expect(screen.getByText('Job 8')).toBeVisible();
    expect(screen.getByText('Position 3 of 235 in current view')).toBeVisible();
    expect(screen.queryByText('(3/235)')).not.toBeInTheDocument();
    expect(mockUseFindOneRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        recordGqlFields: { name: true, jobNumber: true },
      }),
    );
  });

  it('keeps the permanent identity on mobile while omitting navigation counts', () => {
    mockIsMobile = true;
    renderBreadcrumb();
    expect(screen.getByText('Job 8')).toBeVisible();
    expect(screen.queryByText(/Position/)).not.toBeInTheDocument();
  });

  it.each([
    { isLoadingPagination: true, hasPaginationError: false },
    { isLoadingPagination: false, hasPaginationError: true },
  ])('does not present old or failed counts: %p', (state) => {
    mockUsePagination.mockReturnValue({
      rankInView: 2,
      totalCount: 235,
      ...state,
    });
    renderBreadcrumb();
    expect(screen.getByText('Job 8')).toBeVisible();
    expect(screen.queryByText(/Position/)).not.toBeInTheDocument();
  });

  it('does not infer a permanent number from an ordinal or URL', () => {
    mockUseFindOneRecord.mockReturnValue({
      loading: false,
      record: { id: 'job-8' },
    });
    renderBreadcrumb();
    expect(screen.queryByText('Job 8')).not.toBeInTheDocument();
    expect(screen.getByText('Position 3 of 235 in current view')).toBeVisible();
  });

  it('updates the view position/count independently of permanent identity', () => {
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
    expect(screen.getByText('Job 8')).toBeVisible();
    expect(screen.getByText('Position 1 of 4 in current view')).toBeVisible();
    expect(screen.queryByText(/235/)).not.toBeInTheDocument();
  });
});
