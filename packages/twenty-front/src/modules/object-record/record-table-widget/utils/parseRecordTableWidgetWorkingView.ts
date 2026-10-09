import { isDefined } from 'twenty-shared/utils';
import { type RecordFilterGroup } from '@/object-record/record-filter-group/types/RecordFilterGroup';
import { type RecordFilter } from '@/object-record/record-filter/types/RecordFilter';
import { type RecordSort } from '@/object-record/record-sort/types/RecordSort';

export type RecordTableWidgetWorkingView = {
  filters: RecordFilter[];
  filterGroups: RecordFilterGroup[];
  sorts: RecordSort[];
  search: string;
};

export const parseRecordTableWidgetWorkingView = (
  value: string | boolean | null,
): RecordTableWidgetWorkingView | null => {
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    if (
      !Array.isArray(parsed.filters) ||
      !Array.isArray(parsed.filterGroups) ||
      !Array.isArray(parsed.sorts) ||
      typeof parsed.search !== 'string' ||
      !parsed.filters.every(
        (filter: RecordFilter) =>
          isDefined(filter) &&
          typeof filter.id === 'string' &&
          typeof filter.fieldMetadataId === 'string' &&
          typeof filter.value === 'string' &&
          typeof filter.operand === 'string',
      ) ||
      !parsed.filterGroups.every(
        (group: RecordFilterGroup) =>
          isDefined(group) &&
          typeof group.id === 'string' &&
          ['AND', 'OR'].includes(group.logicalOperator),
      ) ||
      !parsed.sorts.every(
        (sort: RecordSort) =>
          isDefined(sort) &&
          typeof sort.id === 'string' &&
          typeof sort.fieldMetadataId === 'string' &&
          ['ASC', 'DESC'].includes(sort.direction),
      )
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
};
