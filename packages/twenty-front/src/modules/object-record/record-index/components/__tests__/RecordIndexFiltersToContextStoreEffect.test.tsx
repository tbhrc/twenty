import { render } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { RecordIndexFiltersToContextStoreEffect } from '@/object-record/record-index/components/RecordIndexFiltersToContextStoreEffect';
import { contextStoreTargetedRecordsRuleComponentState } from '@/context-store/states/contextStoreTargetedRecordsRuleComponentState';
import { ContextStoreComponentInstanceContext } from '@/context-store/states/contexts/ContextStoreComponentInstanceContext';
import { hasUserSelectedAllRowsComponentState } from '@/object-record/record-table/record-table-row/states/hasUserSelectedAllRowsFamilyState';
import { recordIndexRecordIdsByGroupComponentFamilyState } from '@/object-record/record-index/states/recordIndexRecordIdsByGroupComponentFamilyState';
import { NO_RECORD_GROUP_FAMILY_KEY } from '@/object-record/record-index/states/selectors/recordIndexAllRecordIdsComponentSelector';
import { isRowSelectedComponentFamilyState } from '@/object-record/record-table/record-table-row/states/isRowSelectedComponentFamilyState';

jest.mock('@/object-record/record-index/contexts/RecordIndexContext', () => ({
  useRecordIndexContextOrThrow: () => ({ recordIndexId: 'job-7' }),
}));

it.each([true, false])(
  'limits embedded select-all to exact IDs (%s)',
  (forceExplicitSelection) => {
    const store = createStore();
    store.set(
      recordIndexRecordIdsByGroupComponentFamilyState.atomFamily({
        instanceId: 'job-7',
        familyKey: NO_RECORD_GROUP_FAMILY_KEY,
      }),
      ['candidate-a', 'candidate-b'],
    );
    store.set(
      hasUserSelectedAllRowsComponentState.atomFamily({ instanceId: 'job-7' }),
      true,
    );
    for (const id of ['candidate-a', 'candidate-b'])
      store.set(
        isRowSelectedComponentFamilyState.atomFamily({
          instanceId: 'job-7',
          familyKey: id,
        }),
        true,
      );
    const rule = contextStoreTargetedRecordsRuleComponentState.atomFamily({
      instanceId: 'widget-job-7',
    });
    const view = render(
      <Provider store={store}>
        <ContextStoreComponentInstanceContext.Provider
          value={{ instanceId: 'widget-job-7' }}
        >
          <RecordIndexFiltersToContextStoreEffect
            forceExplicitSelection={forceExplicitSelection}
          />
        </ContextStoreComponentInstanceContext.Provider>
      </Provider>,
    );
    expect(store.get(rule)).toEqual(
      forceExplicitSelection
        ? {
            mode: 'selection',
            selectedRecordIds: ['candidate-a', 'candidate-b'],
          }
        : { mode: 'exclusion', excludedRecordIds: [] },
    );
    view.unmount();
    expect(store.get(rule)).toEqual({
      mode: 'selection',
      selectedRecordIds: [],
    });
  },
);
