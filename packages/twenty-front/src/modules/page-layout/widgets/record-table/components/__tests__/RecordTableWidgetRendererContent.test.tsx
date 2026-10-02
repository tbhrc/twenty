jest.mock(
  '@/object-record/record-table-widget/components/RecordTableWidgetToolbar',
  () => ({ RecordTableWidgetToolbar: () => <div>widget toolbar</div> }),
);
import type * as ReactModule from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';

import { RecordTableWidgetRendererContent } from '@/page-layout/widgets/record-table/components/RecordTableWidgetRendererContent';
import {
  FieldMetadataType,
  ViewCalendarLayout,
  ViewType,
} from '~/generated-metadata/graphql';

const mockProviderProps = jest.fn();
const mockUseViewById = jest.fn();
const mockIsPageLayoutInEditMode = jest.fn();

jest.mock('@/object-metadata/hooks/useObjectMetadataItemById', () => ({
  useObjectMetadataItemById: jest.fn(() => ({
    objectMetadataItem: {
      nameSingular: 'company',
      fields: [{ id: 'stage', type: FieldMetadataType.SELECT, isActive: true }],
    },
  })),
}));
jest.mock('@/page-layout/hooks/useIsPageLayoutInEditMode', () => ({
  useIsPageLayoutInEditMode: () => mockIsPageLayoutInEditMode(),
}));
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilySelectorValue',
  () => ({ useAtomComponentFamilySelectorValue: jest.fn(() => undefined) }),
);
jest.mock('@/views/hooks/useViewById', () => ({
  useViewById: () => mockUseViewById(),
}));
jest.mock(
  '@/object-record/record-table-widget/components/RecordTableWidgetProvider',
  () => ({
    RecordTableWidgetProvider: (props: { children: React.ReactNode }) => {
      mockProviderProps(props);
      return props.children;
    },
  }),
);
jest.mock(
  '@/object-record/record-table-widget/components/RecordTableWidget',
  () => ({
    RecordTableWidget: ({ isUIEditable }: { isUIEditable: boolean }) => (
      <div>
        record table widget
        <button disabled={!isUIEditable}>Edit table record</button>
      </div>
    ),
  }),
);
jest.mock(
  '@/object-record/record-board-widget/components/RecordBoardWidget',
  () => ({
    RecordBoardWidget: ({ isUIEditable }: { isUIEditable: boolean }) => (
      <div>
        record board widget
        <button disabled={!isUIEditable}>Edit board record</button>
      </div>
    ),
  }),
);
jest.mock(
  '@/object-record/record-list-widget/components/RecordListWidget',
  () => ({
    RecordListWidget: () => <div>record list widget</div>,
  }),
);
jest.mock(
  '@/object-record/record-calendar-widget/components/RecordCalendarWidget',
  () => ({
    RecordCalendarWidget: ({ isReadOnly }: { isReadOnly: boolean }) => (
      <div>
        record calendar widget
        <button disabled={isReadOnly}>Create calendar record</button>
      </div>
    ),
  }),
);

jest.mock('@/page-layout/hooks/usePageLayoutPersonalPreference', () => ({
  usePageLayoutPersonalPreference: () => {
    const { useState } = jest.requireActual<typeof ReactModule>('react');
    const [value, setValue] = useState<string | boolean | null>(null);
    return { value, setValue };
  },
}));

jest.mock('twenty-ui/primitives/input', () => ({
  SegmentedControl: ({
    options,
    onChange,
    value,
  }: {
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    value: string;
  }) => (
    <div>
      {options.map((option) => (
        <button
          key={option.value}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

const renderWidgetForViewType = (viewType: ViewType | undefined) => {
  mockUseViewById.mockReturnValue({
    view:
      viewType === undefined ? undefined : { id: 'view-id', type: viewType },
  });

  render(
    <RecordTableWidgetRendererContent
      objectMetadataId="object-metadata-id"
      viewId="view-id"
      widgetId="widget-id"
    />,
  );
};

describe('RecordTableWidgetRendererContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPageLayoutInEditMode.mockReturnValue(false);
  });

  it.each([
    [ViewCalendarLayout.DAY, false, false],
    [ViewCalendarLayout.WEEK, false, false],
    [ViewCalendarLayout.MONTH, false, true],
    [ViewCalendarLayout.DAY, true, true],
    [ViewCalendarLayout.WEEK, true, true],
  ])(
    'renders %s with edit mode %s as read-only %s',
    (calendarLayout, isEditMode, isReadOnly) => {
      mockIsPageLayoutInEditMode.mockReturnValue(isEditMode);
      mockUseViewById.mockReturnValue({
        view: { id: 'view-id', type: ViewType.CALENDAR_WIDGET, calendarLayout },
      });

      render(
        <RecordTableWidgetRendererContent
          objectMetadataId="object-metadata-id"
          viewId="view-id"
          widgetId="widget-id"
        />,
      );

      const createButton = screen.getByRole('button', {
        name: 'Create calendar record',
      });

      if (isReadOnly) {
        expect(createButton).toBeDisabled();
      } else {
        expect(createButton).toBeEnabled();
      }
    },
  );

  // A layout that fell through to the table renderer was the bug this widget
  // type set out to fix, so every layout has to claim its own renderer.
  it.each([
    [ViewType.TABLE_WIDGET, 'record table widget'],
    [ViewType.KANBAN_WIDGET, 'record board widget'],
    [ViewType.LIST_WIDGET, 'record list widget'],
    [ViewType.CALENDAR_WIDGET, 'record calendar widget'],
  ])('should render %s with its own widget', (viewType, expectedWidget) => {
    renderWidgetForViewType(viewType);

    expect(screen.getByText(expectedWidget)).toBeVisible();
  });

  // A widget can be backed by a plain view, which keeps that view's layout.
  it('should render a non-widget list view as a list', () => {
    renderWidgetForViewType(ViewType.LIST);

    expect(screen.getByText('record list widget')).toBeVisible();
  });

  it('should render a widget with no view as a table', () => {
    renderWidgetForViewType(undefined);

    expect(screen.getByText('record table widget')).toBeVisible();
  });
});

describe('personal relation layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPageLayoutInEditMode.mockReturnValue(false);
    mockUseViewById.mockReturnValue({
      view: {
        id: 'job-view',
        type: ViewType.KANBAN_WIDGET,
        mainGroupByFieldMetadataId: 'stage',
      },
    });
  });

  it('switches editable Board and List without selecting another view or record scope', async () => {
    const user = userEvent.setup();
    render(
      <RecordTableWidgetRendererContent
        objectMetadataId="applications"
        viewId="job-view"
        widgetId="candidates"
        instanceIdSuffix="vacancy-a"
        isLayoutSwitchEnabled
        isUIEditable
      />,
    );
    expect(screen.getByText('record board widget')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Edit board record' }),
    ).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByText('record table widget')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Edit table record' }),
    ).toBeEnabled();
    expect(mockProviderProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        viewId: 'job-view',
        widgetId: 'candidates',
        instanceIdSuffix: 'vacancy-a',
        presentationViewType: ViewType.TABLE_WIDGET,
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Board' }));
    expect(screen.getByText('record board widget')).toBeVisible();
    expect(mockProviderProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        viewId: 'job-view',
        instanceIdSuffix: 'vacancy-a',
        presentationViewType: ViewType.KANBAN_WIDGET,
      }),
    );
  });

  it('uses saved layout while editing and restores the personal choice afterwards', async () => {
    const user = userEvent.setup();
    const widget = () => (
      <RecordTableWidgetRendererContent
        objectMetadataId="applications"
        viewId="job-view"
        widgetId="candidates"
        isLayoutSwitchEnabled
      />
    );
    const { rerender } = render(widget());
    await user.click(screen.getByRole('button', { name: 'List' }));
    mockIsPageLayoutInEditMode.mockReturnValue(true);
    rerender(widget());
    expect(
      screen.queryByRole('button', { name: 'List' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('record board widget')).toBeVisible();
    mockIsPageLayoutInEditMode.mockReturnValue(false);
    rerender(widget());
    expect(screen.getByText('record table widget')).toBeVisible();
  });

  it('does not offer Board for a view without a configured Select grouping', () => {
    mockUseViewById.mockReturnValue({
      view: { id: 'job-view', type: ViewType.TABLE_WIDGET },
    });
    render(
      <RecordTableWidgetRendererContent
        objectMetadataId="applications"
        viewId="job-view"
        widgetId="candidates"
        isLayoutSwitchEnabled
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Board' }),
    ).not.toBeInTheDocument();
  });
});

it('keeps read-only relation widgets read-only after a personal layout switch', async () => {
  mockIsPageLayoutInEditMode.mockReturnValue(false);
  mockUseViewById.mockReturnValue({
    view: {
      id: 'view',
      type: ViewType.KANBAN_WIDGET,
      mainGroupByFieldMetadataId: 'stage',
    },
  });
  const user = userEvent.setup();
  render(
    <RecordTableWidgetRendererContent
      objectMetadataId="applications"
      viewId="view"
      widgetId="read-only"
      isLayoutSwitchEnabled
      isUIEditable={false}
    />,
  );
  expect(
    screen.getByRole('button', { name: 'Edit board record' }),
  ).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'List' }));
  expect(
    screen.getByRole('button', { name: 'Edit table record' }),
  ).toBeDisabled();
});

it('requires immutable scope before a live relation view becomes available', () => {
  mockUseViewById.mockReturnValue({ view: undefined });
  render(
    <RecordTableWidgetRendererContent
      objectMetadataId="applications"
      viewId="view"
      widgetId="related-records"
      isLayoutSwitchEnabled
    />,
  );
  expect(mockProviderProps.mock.lastCall[0].isScopeRequired).toBe(true);
  expect(mockProviderProps.mock.lastCall[0].scopeView).toBeUndefined();
});
