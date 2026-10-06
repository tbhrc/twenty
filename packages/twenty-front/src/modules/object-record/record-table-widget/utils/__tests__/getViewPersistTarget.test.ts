import { type RecordTableWidgetContextValue } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { getViewPersistTarget } from '@/object-record/record-table-widget/utils/getViewPersistTarget';

const getWidgetContext = (
  overrides: Partial<RecordTableWidgetContextValue> = {},
): RecordTableWidgetContextValue => ({
  isPageLayoutInEditMode: false,
  pageLayoutId: 'page-layout-id',
  widgetId: 'widget-id',
  updateViewDraftField: jest.fn(),
  updateViewDraft: jest.fn(),
  ...overrides,
});

describe('getViewPersistTarget', () => {
  it('persists to the API outside a widget', () => {
    expect(getViewPersistTarget(null)).toEqual({ target: 'api' });
  });

  it('persists to the page-layout draft in a widget editor', () => {
    const widgetContext = getWidgetContext({ isPageLayoutInEditMode: true });

    expect(getViewPersistTarget(widgetContext)).toEqual({
      target: 'pageLayoutDraft',
      widgetContext,
    });
  });

  it('does not persist from a live widget', () => {
    expect(getViewPersistTarget(getWidgetContext())).toEqual({
      target: 'none',
    });
  });

  it('saves shared column widths from a live widget', () => {
    expect(
      getViewPersistTarget(getWidgetContext(), {
        persistLiveColumnWidth: true,
      }),
    ).toEqual({ target: 'api' });
  });

  it('keeps resized columns in the draft while editing a layout', () => {
    const widgetContext = getWidgetContext({ isPageLayoutInEditMode: true });

    expect(
      getViewPersistTarget(widgetContext, { persistLiveColumnWidth: true }),
    ).toEqual({ target: 'pageLayoutDraft', widgetContext });
  });

  it('does not save column widths from an editor missing its layout id', () => {
    expect(
      getViewPersistTarget(
        getWidgetContext({
          isPageLayoutInEditMode: true,
          pageLayoutId: undefined,
        }),
        { persistLiveColumnWidth: true },
      ),
    ).toEqual({ target: 'none' });
  });

  it('does not persist from a widget editor missing its page layout id', () => {
    const widgetContext = getWidgetContext({
      isPageLayoutInEditMode: true,
      pageLayoutId: undefined,
    });

    expect(getViewPersistTarget(widgetContext)).toEqual({ target: 'none' });
  });
});
