import { type RecordGqlOperationFilter } from 'twenty-shared/types';
import { ContextStoreComponentInstanceContext } from '@/context-store/states/contexts/ContextStoreComponentInstanceContext';
import { type RecordFilterGroup } from '@/object-record/record-filter-group/types/RecordFilterGroup';
import { type RecordFilter } from '@/object-record/record-filter/types/RecordFilter';
import { type RecordSort } from '@/object-record/record-sort/types/RecordSort';
import { createAtomComponentState } from '@/ui/utilities/state/jotai/utils/createAtomComponentState';

type RecordShowParentViewComponentState = {
  parentViewComponentId: string;
  parentViewObjectNameSingular: string;
  parentViewFilterGroups: RecordFilterGroup[];
  parentViewFilters: RecordFilter[];
  // Resolve contextual scope before leaving its source record surface.
  parentViewScopeFilter?: RecordGqlOperationFilter;
  parentViewAnyFieldFilterValue?: string;
  parentViewSorts: RecordSort[];
};

export const contextStoreRecordShowParentViewComponentState =
  createAtomComponentState<
    RecordShowParentViewComponentState | undefined | null
  >({
    key: 'contextStoreRecordShowParentViewComponentState',
    defaultValue: undefined,
    componentInstanceContext: ContextStoreComponentInstanceContext,
  });
