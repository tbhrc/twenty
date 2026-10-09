import { type RecordTableWidgetContextValue } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { isDefined } from 'twenty-shared/utils';

// Structural view changes belong to the layout draft. Column widths are shared
// display preferences and may also be saved from a live widget.
export type ViewPersistTarget =
  | { target: 'api' }
  | { target: 'none' }
  | { target: 'pageLayoutDraft'; widgetContext: RecordTableWidgetContextValue };

export const getViewPersistTarget = (
  widgetContext: RecordTableWidgetContextValue | null,
  { persistLiveColumnWidth = false }: { persistLiveColumnWidth?: boolean } = {},
): ViewPersistTarget => {
  if (!isDefined(widgetContext)) {
    return { target: 'api' };
  }

  if (
    widgetContext.isPageLayoutInEditMode &&
    isDefined(widgetContext.pageLayoutId)
  ) {
    return { target: 'pageLayoutDraft', widgetContext };
  }

  if (persistLiveColumnWidth && !widgetContext.isPageLayoutInEditMode) {
    return { target: 'api' };
  }

  return { target: 'none' };
};
