import { useEffect, useRef } from 'react';

import { useHasFiltersInQueryParams } from '@/views/hooks/internal/useHasFiltersInQueryParams';
import { useAreViewFilterGroupsDifferentFromRecordFilterGroups } from '@/views/hooks/useAreViewFilterGroupsDifferentFromRecordFilterGroups';
import { useAreViewFiltersDifferentFromRecordFilters } from '@/views/hooks/useAreViewFiltersDifferentFromRecordFilters';
import { useAreViewSortsDifferentFromRecordSorts } from '@/views/hooks/useAreViewSortsDifferentFromRecordSorts';
import { useCanPersistViewChanges } from '@/views/hooks/useCanPersistViewChanges';
import { useGetCurrentViewOnly } from '@/views/hooks/useGetCurrentViewOnly';
import { useIsViewAnyFieldFilterDifferentFromCurrentAnyFieldFilter } from '@/views/hooks/useIsViewAnyFieldFilterDifferentFromCurrentAnyFieldFilter';
import { useSaveCurrentViewFiltersAndSorts } from '@/views/hooks/useSaveCurrentViewFiltersAndSorts';

const AUTO_SAVE_DEBOUNCE_MS = 600;

// Spreadsheet behaviour: sorts and filters changed on a saved view persist
// automatically, like column order, visibility and width already do.
export const ViewBarAutoSaveEffect = () => {
  const { currentView } = useGetCurrentViewOnly();
  const { canPersistChanges } = useCanPersistViewChanges();
  const { saveCurrentViewFilterAndSorts } = useSaveCurrentViewFiltersAndSorts();
  const { hasFiltersQueryParams } = useHasFiltersInQueryParams();

  const { viewFilterGroupsAreDifferentFromRecordFilterGroups } =
    useAreViewFilterGroupsDifferentFromRecordFilterGroups();
  const { viewFiltersAreDifferentFromRecordFilters } =
    useAreViewFiltersDifferentFromRecordFilters();
  const { viewSortsAreDifferentFromRecordSorts } =
    useAreViewSortsDifferentFromRecordSorts();
  const { viewAnyFieldFilterDifferentFromCurrentAnyFieldFilter } =
    useIsViewAnyFieldFilterDifferentFromCurrentAnyFieldFilter();

  const isSavingRef = useRef(false);
  const saveRef = useRef(saveCurrentViewFilterAndSorts);
  saveRef.current = saveCurrentViewFilterAndSorts;

  const hasPendingChanges =
    viewFiltersAreDifferentFromRecordFilters ||
    viewSortsAreDifferentFromRecordSorts ||
    viewFilterGroupsAreDifferentFromRecordFilterGroups ||
    viewAnyFieldFilterDifferentFromCurrentAnyFieldFilter;

  const isSaveable =
    hasPendingChanges &&
    canPersistChanges &&
    !hasFiltersQueryParams &&
    currentView?.key !== 'INDEX';

  useEffect(() => {
    if (!isSaveable) {
      return;
    }

    const timeout = setTimeout(async () => {
      if (isSavingRef.current) {
        return;
      }
      isSavingRef.current = true;
      try {
        await saveRef.current();
      } finally {
        isSavingRef.current = false;
      }
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [
    isSaveable,
    viewFiltersAreDifferentFromRecordFilters,
    viewSortsAreDifferentFromRecordSorts,
    viewFilterGroupsAreDifferentFromRecordFilterGroups,
    viewAnyFieldFilterDifferentFromCurrentAnyFieldFilter,
    currentView?.id,
  ]);

  return null;
};
