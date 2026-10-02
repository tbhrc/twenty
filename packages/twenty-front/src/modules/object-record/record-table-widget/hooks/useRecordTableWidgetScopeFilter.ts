import { flattenedFieldMetadataItemsSelector } from '@/object-metadata/states/flattenedFieldMetadataItemsSelector';
import { useFilterValueDependencies } from '@/object-record/record-filter/hooks/useFilterValueDependencies';
import { RecordTableWidgetContext } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { mapViewFilterGroupsToRecordFilterGroups } from '@/views/utils/mapViewFilterGroupsToRecordFilterGroups';
import { mapViewFiltersToFilters } from '@/views/utils/mapViewFiltersToFilters';
import { useContext } from 'react';
import {
  combineFilters,
  computeRecordGqlOperationFilter,
  turnAnyFieldFilterIntoRecordGqlFilter,
} from 'twenty-shared/utils';

export const useRecordTableWidgetScopeFilter = () => {
  const widgetContext = useContext(RecordTableWidgetContext);
  const fields = useAtomStateValue(flattenedFieldMetadataItemsSelector);
  const { filterValueDependencies } = useFilterValueDependencies();
  const scopeView = widgetContext?.scopeView;
  if (widgetContext?.isScopeRequired && !scopeView) {
    return { id: { in: [] } };
  }
  if (!scopeView) return {};

  const recordFilters = mapViewFiltersToFilters(
    scopeView?.viewFilters ?? [],
    fields,
  );
  // Metadata and current-record context can arrive separately. A missing
  // scope dependency must yield no rows during that gap.
  if (recordFilters.length !== (scopeView?.viewFilters.length ?? 0)) {
    return { id: { in: [] } };
  }
  for (const filter of recordFilters) {
    let isCurrentRecordScope = false;
    try {
      isCurrentRecordScope =
        JSON.parse(filter.value)?.isCurrentRecordSelected === true;
    } catch {
      /* Non-relation values need no dynamic record context. */
    }
    if (isCurrentRecordScope) {
      const resolved = computeRecordGqlOperationFilter({
        fieldMetadataItems: fields,
        filterValueDependencies,
        recordFilters: [{ ...filter, recordFilterGroupId: undefined }],
        recordFilterGroups: [],
      });
      if (Object.keys(resolved).length === 0) return { id: { in: [] } };
    }
  }
  const scopeFilter = computeRecordGqlOperationFilter({
    fieldMetadataItems: fields,
    filterValueDependencies,
    recordFilters,
    recordFilterGroups: mapViewFilterGroupsToRecordFilterGroups(
      scopeView?.viewFilterGroups ?? [],
    ),
  });
  const { recordGqlOperationFilter: scopeSearch } =
    turnAnyFieldFilterIntoRecordGqlFilter({
      fields: fields.filter(
        (field) => field.objectMetadataId === scopeView?.objectMetadataId,
      ),
      filterValue: scopeView?.anyFieldFilterValue ?? '',
    });
  return combineFilters([scopeFilter, scopeSearch]);
};
