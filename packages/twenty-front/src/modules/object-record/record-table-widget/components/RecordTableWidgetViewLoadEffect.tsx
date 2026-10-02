import { RecordTableWidgetContext } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { currentRecordFiltersComponentState } from '@/object-record/record-filter/states/currentRecordFiltersComponentState';
import { currentRecordFilterGroupsComponentState } from '@/object-record/record-filter-group/states/currentRecordFilterGroupsComponentState';
import { currentRecordSortsComponentState } from '@/object-record/record-sort/states/currentRecordSortsComponentState';
import { anyFieldFilterValueComponentState } from '@/object-record/record-filter/states/anyFieldFilterValueComponentState';
import { parseRecordTableWidgetWorkingView } from '@/object-record/record-table-widget/utils/RecordTableWidgetWorkingView';
import { usePageLayoutPersonalPreference } from '@/page-layout/hooks/usePageLayoutPersonalPreference';
import { useStore } from 'jotai';
import { ViewType } from '~/generated-metadata/graphql';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useLoadRecordIndexStates } from '@/object-record/record-index/hooks/useLoadRecordIndexStates';
import { lastLoadedRecordTableWidgetViewIdComponentState } from '@/object-record/record-table-widget/states/lastLoadedRecordTableWidgetViewIdComponentState';
import { computeRecordTableWidgetViewLoadContentSignature } from '@/object-record/record-table-widget/utils/computeRecordTableWidgetViewLoadContentSignature';
import { useIsPageLayoutInEditMode } from '@/page-layout/hooks/useIsPageLayoutInEditMode';
import { recordTableWidgetViewDraftByWidgetIdComponentFamilySelector } from '@/page-layout/states/selectors/recordTableWidgetViewDraftByWidgetIdComponentFamilySelector';
import { constructViewFromRecordTableWidgetViewSnapshot } from '@/page-layout/widgets/record-table/utils/constructViewFromRecordTableWidgetViewSnapshot';
import { useAtomComponentFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilySelectorValue';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { viewFromViewIdFamilySelector } from '@/views/states/selectors/viewFromViewIdFamilySelector';
import { useContext, useEffect, useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';

type RecordTableWidgetViewLoadEffectProps = {
  viewId: string;
  widgetId: string;
  objectMetadataItem: EnrichedObjectMetadataItem;
  presentationViewType?: ViewType;
};

export const RecordTableWidgetViewLoadEffect = ({
  viewId,
  widgetId,
  objectMetadataItem,
  presentationViewType,
}: RecordTableWidgetViewLoadEffectProps) => {
  const store = useStore();
  const widgetContext = useContext(RecordTableWidgetContext);
  const isWorkingViewEnabled = isDefined(widgetContext?.scopeView);
  const { value: savedWorkingView } = usePageLayoutPersonalPreference(
    widgetContext?.personalPreferenceKey ?? `widget-working:${widgetId}`,
  );
  const { loadRecordIndexStates } = useLoadRecordIndexStates();

  const { recordIndexId } = useRecordIndexContextOrThrow();

  const [
    lastLoadedRecordTableWidgetViewId,
    setLastLoadedRecordTableWidgetViewId,
  ] = useAtomComponentState(lastLoadedRecordTableWidgetViewIdComponentState);

  const isPageLayoutInEditMode = useIsPageLayoutInEditMode();

  const draftSnapshot = useAtomComponentFamilySelectorValue(
    recordTableWidgetViewDraftByWidgetIdComponentFamilySelector,
    { widgetId },
  );

  const viewFromDraft =
    isPageLayoutInEditMode && isDefined(draftSnapshot)
      ? constructViewFromRecordTableWidgetViewSnapshot(draftSnapshot)
      : undefined;

  const viewFromSelector = useAtomFamilySelectorValue(
    viewFromViewIdFamilySelector,
    { viewId },
  );

  const sourceView = viewFromDraft ?? viewFromSelector;
  // Presentation is personal; the saved filters and relation context remain
  // authoritative even when metadata reloads while another layout is selected.
  const currentView = useMemo(
    () =>
      !isPageLayoutInEditMode &&
      isDefined(sourceView) &&
      isDefined(presentationViewType)
        ? {
            ...sourceView,
            type: presentationViewType,
            // Only List presentation is flat. The saved Board remains intact.
            ...(presentationViewType === ViewType.TABLE_WIDGET
              ? {
                  mainGroupByFieldMetadataId: undefined,
                  viewGroups: [],
                  viewFields: sourceView.viewFields.map((field) => ({
                    ...field,
                    size: Math.max(field.size ?? 180, 180),
                  })),
                }
              : {}),
            ...(isWorkingViewEnabled
              ? {
                  viewFilters: [],
                  viewFilterGroups: [],
                  anyFieldFilterValue: '',
                }
              : {}),
          }
        : sourceView,
    [
      sourceView,
      presentationViewType,
      isPageLayoutInEditMode,
      isWorkingViewEnabled,
    ],
  );

  const viewHasFields =
    isDefined(currentView) && currentView.viewFields.length > 0;

  useEffect(() => {
    if (!isDefined(currentView)) {
      return;
    }

    if (!viewHasFields) {
      return;
    }

    const contentSignature =
      computeRecordTableWidgetViewLoadContentSignature(currentView);

    const lastLoadedMatches =
      viewId === lastLoadedRecordTableWidgetViewId?.viewId &&
      objectMetadataItem.updatedAt ===
        lastLoadedRecordTableWidgetViewId?.objectMetadataItemUpdatedAt &&
      contentSignature ===
        lastLoadedRecordTableWidgetViewId?.loadedViewContentSignature;

    if (lastLoadedMatches) {
      return;
    }

    const filterAtom = currentRecordFiltersComponentState.atomFamily({
      instanceId: recordIndexId,
    });
    const groupsAtom = currentRecordFilterGroupsComponentState.atomFamily({
      instanceId: recordIndexId,
    });
    const sortsAtom = currentRecordSortsComponentState.atomFamily({
      instanceId: recordIndexId,
    });
    const searchAtom = anyFieldFilterValueComponentState.atomFamily({
      instanceId: recordIndexId,
    });
    const workingView = isWorkingViewEnabled
      ? lastLoadedRecordTableWidgetViewId?.viewId === viewId
        ? {
            filters: store.get(filterAtom),
            filterGroups: store.get(groupsAtom),
            sorts: store.get(sortsAtom),
            search: store.get(searchAtom),
          }
        : parseRecordTableWidgetWorkingView(savedWorkingView)
      : null;

    loadRecordIndexStates(currentView, objectMetadataItem, {
      recordIndexId,
    });

    if (isDefined(workingView)) {
      store.set(filterAtom, workingView.filters);
      store.set(groupsAtom, workingView.filterGroups);
      store.set(sortsAtom, workingView.sorts);
      store.set(searchAtom, workingView.search);
    }

    setLastLoadedRecordTableWidgetViewId({
      viewId,
      objectMetadataItemUpdatedAt: objectMetadataItem.updatedAt,
      loadedViewContentSignature: contentSignature,
    });
  }, [
    store,
    isWorkingViewEnabled,
    savedWorkingView,
    viewId,
    lastLoadedRecordTableWidgetViewId,
    setLastLoadedRecordTableWidgetViewId,
    currentView,
    viewHasFields,
    objectMetadataItem,
    loadRecordIndexStates,
    recordIndexId,
  ]);

  return null;
};
