import { ObjectFilterDropdownComponentInstanceContext } from '@/object-record/object-filter-dropdown/states/contexts/ObjectFilterDropdownComponentInstanceContext';
import { ObjectSortDropdownButton } from '@/object-record/object-sort-dropdown/components/ObjectSortDropdownButton';
import { ObjectSortDropdownComponentInstanceContext } from '@/object-record/object-sort-dropdown/states/context/ObjectSortDropdownComponentInstanceContext';
import { getObjectSortDropdownId } from '@/object-record/object-sort-dropdown/utils/getObjectSortDropdownId';
import { currentRecordFilterGroupsComponentState } from '@/object-record/record-filter-group/states/currentRecordFilterGroupsComponentState';
import { anyFieldFilterValueComponentState } from '@/object-record/record-filter/states/anyFieldFilterValueComponentState';
import { currentRecordFiltersComponentState } from '@/object-record/record-filter/states/currentRecordFiltersComponentState';
import { isRecordFilterConsideredEmpty } from '@/object-record/record-filter/utils/isRecordFilterConsideredEmpty';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { currentRecordSortsComponentState } from '@/object-record/record-sort/states/currentRecordSortsComponentState';
import { RecordTableWidgetContext } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { usePageLayoutPersonalPreference } from '@/page-layout/hooks/usePageLayoutPersonalPreference';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { AdvancedFilterDropdownButton } from '@/views/advanced-filter-chip/components/AdvancedFilterDropdownButton';
import { AnyFieldSearchDropdownButton } from '@/views/components/AnyFieldSearchDropdownButton';
import { ViewBarFilterDropdown } from '@/views/components/ViewBarFilterDropdown';
import { EditableFilterDropdownButton } from '@/views/editable-chip/components/EditableFilterDropdownButton';
import { EditableSortChip } from '@/views/editable-chip/components/EditableSortChip';
import { getEditableChipObjectFilterDropdownComponentInstanceId } from '@/views/editable-chip/utils/getEditableChipObjectFilterDropdownComponentInstanceId';
import { getViewBarFilterDropdownId } from '@/views/utils/getViewBarFilterDropdownId';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useContext } from 'react';
import { LightButton } from 'twenty-ui/components';
import { themeCssVariables } from 'twenty-ui/theme';

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
  @media print {
    display: none;
  }
`;

export const RecordTableWidgetToolbar = () => {
  const { recordIndexId } = useRecordIndexContextOrThrow();
  const widgetContext = useContext(RecordTableWidgetContext);
  const [currentRecordFilters, setCurrentRecordFilters] = useAtomComponentState(
    currentRecordFiltersComponentState,
  );
  const [currentRecordFilterGroups, setCurrentRecordFilterGroups] =
    useAtomComponentState(currentRecordFilterGroupsComponentState);
  const [currentRecordSorts, setCurrentRecordSorts] = useAtomComponentState(
    currentRecordSortsComponentState,
  );
  const [anyFieldFilterValue, setAnyFieldFilterValue] = useAtomComponentState(
    anyFieldFilterValueComponentState,
  );
  const { value: saved, setValue: save } = usePageLayoutPersonalPreference(
    widgetContext?.personalPreferenceKey ?? 'widget-working',
  );
  const workingView = JSON.stringify({
    filters: currentRecordFilters,
    filterGroups: currentRecordFilterGroups,
    sorts: currentRecordSorts,
    search: anyFieldFilterValue,
  });
  const filterCount =
    currentRecordFilters.filter(
      (filter) => !isRecordFilterConsideredEmpty(filter),
    ).length + (anyFieldFilterValue ? 1 : 0);

  const reset = () => {
    setCurrentRecordFilters([]);
    setCurrentRecordFilterGroups([]);
    setAnyFieldFilterValue('');
    setCurrentRecordSorts(widgetContext?.scopeView?.viewSorts ?? []);
    // Saving a reset replaces a previous personal working view as well.
    save(
      JSON.stringify({
        filters: [],
        filterGroups: [],
        sorts: widgetContext?.scopeView?.viewSorts ?? [],
        search: '',
      }),
    );
  };

  return (
    <ObjectSortDropdownComponentInstanceContext.Provider
      value={{ instanceId: getObjectSortDropdownId(recordIndexId) }}
    >
      <StyledToolbar>
        <ObjectFilterDropdownComponentInstanceContext.Provider
          value={{ instanceId: getViewBarFilterDropdownId(recordIndexId) }}
        >
          <ViewBarFilterDropdown />
        </ObjectFilterDropdownComponentInstanceContext.Provider>
        <span aria-live="polite">{t`${filterCount} active filters`}</span>
        <ObjectSortDropdownButton />
        {currentRecordSorts.map((sort) => (
          <EditableSortChip key={sort.id} recordSort={sort} />
        ))}
        {anyFieldFilterValue && <AnyFieldSearchDropdownButton />}
        {currentRecordFilterGroups.length > 0 && (
          <AdvancedFilterDropdownButton />
        )}
        {currentRecordFilters
          .filter((filter) => !filter.recordFilterGroupId)
          .map((filter) => (
            <ObjectFilterDropdownComponentInstanceContext.Provider
              key={filter.id}
              value={{
                instanceId:
                  getEditableChipObjectFilterDropdownComponentInstanceId({
                    recordFilterId: filter.id,
                  }),
              }}
            >
              <EditableFilterDropdownButton recordFilter={filter} />
            </ObjectFilterDropdownComponentInstanceContext.Provider>
          ))}
        <LightButton
          onClick={() => save(workingView)}
          disabled={saved === workingView}
        >{t`Save for me`}</LightButton>
        <LightButton onClick={reset}>{t`Reset`}</LightButton>
      </StyledToolbar>
    </ObjectSortDropdownComponentInstanceContext.Provider>
  );
};
