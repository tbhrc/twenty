import { useFindManyRecordIndexTableParams } from '@/object-record/record-index/hooks/useFindManyRecordIndexTableParams';
import { RecordFilterGroupLogicalOperator } from 'twenty-shared/types';
import {
  RecordTableWidgetContext,
  type RecordTableWidgetContextValue,
} from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { useRecordTableWidgetScopeFilter } from '@/object-record/record-table-widget/hooks/useRecordTableWidgetScopeFilter';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import {
  combineFilters,
  computeRecordGqlOperationFilter,
} from 'twenty-shared/utils';
import { type View } from '@/views/types/View';

const recordA = '11111111-1111-4111-8111-111111111111';
const recordB = '22222222-2222-4222-8222-222222222222';
let mockRecordId: string | undefined = recordA;
let mockFields = [
  {
    id: 'job',
    name: 'job',
    label: 'Job',
    type: 'RELATION',
    objectMetadataId: 'application',
  },
  {
    id: 'stage',
    name: 'stage',
    label: 'Stage',
    type: 'SELECT',
    objectMetadataId: 'application',
  },
];

jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => mockFields,
}));
jest.mock(
  '@/object-record/record-filter/hooks/useFilterValueDependencies',
  () => ({
    useFilterValueDependencies: () => ({
      filterValueDependencies: {
        currentRecord: mockRecordId
          ? { id: mockRecordId, objectMetadataNameSingular: 'job' }
          : undefined,
        timeZone: 'UTC',
      },
    }),
  }),
);

const scopeView = {
  objectMetadataId: 'application',
  viewFilters: [
    {
      id: 'scope',
      fieldMetadataId: 'job',
      operand: 'IS',
      value: JSON.stringify({
        selectedRecordIds: [],
        isCurrentRecordSelected: true,
      }),
    },
  ],
  viewFilterGroups: [],
} as unknown as View;

const wrapper = ({ children }: { children: ReactNode }) => (
  <RecordTableWidgetContext.Provider
    value={{ scopeView } as RecordTableWidgetContextValue}
  >
    {children}
  </RecordTableWidgetContext.Provider>
);

afterEach(() => {
  mockRecordId = recordA;
});

it('keeps current-record scope outside optional OR rules and follows current record navigation', () => {
  const { result, rerender } = renderHook(useRecordTableWidgetScopeFilter, {
    wrapper,
  });
  expect(result.current).toEqual({ jobId: { in: [recordA] } });
  const optionalRules = computeRecordGqlOperationFilter({
    fieldMetadataItems: mockFields as never,
    filterValueDependencies: { timeZone: 'UTC' },
    recordFilterGroups: [
      { id: 'optional', logicalOperator: RecordFilterGroupLogicalOperator.OR },
    ],
    recordFilters: ['NEW', 'SCREEN'].map((stage) => ({
      fieldMetadataId: 'stage',
      operand: 'IS',
      value: JSON.stringify([stage]),
      type: 'SELECT',
      recordFilterGroupId: 'optional',
    })) as never,
  });
  const query = combineFilters([result.current, optionalRules]);
  expect(query).toEqual({
    and: [
      { jobId: { in: [recordA] } },
      { or: [{ stage: { in: ['NEW'] } }, { stage: { in: ['SCREEN'] } }] },
    ],
  });
  // Removing every optional rule leaves the relation scope in force.
  expect(combineFilters([result.current, {}])).toEqual(result.current);
  mockRecordId = recordB;
  rerender();
  expect(result.current).toEqual({ jobId: { in: [recordB] } });
});

it('denies rows while current-record context or scope metadata is unresolved', () => {
  mockRecordId = undefined;
  const { result, rerender } = renderHook(useRecordTableWidgetScopeFilter, {
    wrapper,
  });
  expect(result.current).toEqual({ id: { in: [] } });
  mockRecordId = recordA;
  const fields = mockFields;
  mockFields = fields.filter((field) => field.id !== 'job');
  rerender();
  expect(result.current).toEqual({ id: { in: [] } });
  mockFields = fields;
});

const mockOptionalFilters: unknown[] = [];
const mockOptionalGroups: unknown[] = [];
jest.mock('@/object-metadata/hooks/useObjectMetadataItem', () => ({
  useObjectMetadataItem: () => ({
    objectMetadataItem: {
      id: 'application',
      nameSingular: 'application',
      fields: mockFields,
    },
  }),
}));
jest.mock('@/object-metadata/hooks/useObjectMetadataItems', () => ({
  useObjectMetadataItems: () => ({ objectMetadataItems: [] }),
}));
jest.mock('@/object-record/record-group/hooks/useRecordGroupFilter', () => ({
  useRecordGroupFilter: () => ({ recordGroupFilter: {} }),
}));
jest.mock(
  '@/object-record/record-group/hooks/useCurrentRecordGroupDefinition',
  () => ({ useCurrentRecordGroupDefinition: () => undefined }),
);
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue',
  () => ({
    useAtomComponentStateValue: ({ key }: { key: string }) =>
      key === 'currentRecordFiltersComponentState'
        ? mockOptionalFilters
        : key === 'currentRecordFilterGroupsComponentState'
          ? mockOptionalGroups
          : key === 'anyFieldFilterValueComponentState'
            ? ''
            : [],
  }),
);

it('native List queries load 100 rows with scope AND optional rules, and reset retains scope', () => {
  mockOptionalFilters.push(
    ...['NEW', 'SCREEN'].map((stage) => ({
      fieldMetadataId: 'stage',
      operand: 'IS',
      value: JSON.stringify([stage]),
      type: 'SELECT',
      recordFilterGroupId: 'optional',
    })),
  );
  mockOptionalGroups.push({
    id: 'optional',
    logicalOperator: RecordFilterGroupLogicalOperator.OR,
  });
  const { result, rerender } = renderHook(
    () => useFindManyRecordIndexTableParams('application'),
    { wrapper },
  );
  expect(result.current.limit).toBe(100);
  expect(result.current.filter).toEqual({
    and: [
      { jobId: { in: [recordA] } },
      { or: [{ stage: { in: ['NEW'] } }, { stage: { in: ['SCREEN'] } }] },
    ],
  });
  mockOptionalFilters.length = 0;
  mockOptionalGroups.length = 0;
  rerender();
  expect(result.current.filter).toEqual({ jobId: { in: [recordA] } });
});

it('denies native List queries before the required saved scope view loads', () => {
  const requiredScopeWrapper = ({ children }: { children: ReactNode }) => (
    <RecordTableWidgetContext.Provider
      value={{ isScopeRequired: true } as RecordTableWidgetContextValue}
    >
      {children}
    </RecordTableWidgetContext.Provider>
  );
  const { result } = renderHook(
    () => useFindManyRecordIndexTableParams('application'),
    { wrapper: requiredScopeWrapper },
  );
  expect(result.current.filter).toEqual({ id: { in: [] } });
});
