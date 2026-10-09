import { render } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { RecordTableWidgetStatesEffect } from '@/object-record/record-table-widget/components/RecordTableWidgetStatesEffect';
import { isRecordTableCheckboxColumnHiddenComponentState } from '@/object-record/record-table/states/isRecordTableCheckboxColumnHiddenComponentState';
import { isRecordTableCellsNonEditableComponentState } from '@/object-record/record-table/states/isRecordTableCellsNonEditableComponentState';

describe('embedded table row selection', () => {
  it.each([false, true])(
    'shows live checkboxes regardless of cell editing permission (%s)',
    (isUIEditable) => {
      const store = createStore();
      const checkbox =
        isRecordTableCheckboxColumnHiddenComponentState.atomFamily({
          instanceId: 'job-7',
        });
      const cells = isRecordTableCellsNonEditableComponentState.atomFamily({
        instanceId: 'job-7',
      });
      render(
        <Provider store={store}>
          <RecordTableWidgetStatesEffect
            recordTableId="job-7"
            isUIEditable={isUIEditable}
          />
        </Provider>,
      );
      expect(store.get(checkbox)).toBe(false);
      expect(store.get(cells)).toBe(!isUIEditable);
    },
  );
  it('hides selection while editing a layout and cleans up when leaving', () => {
    const store = createStore();
    const checkbox = isRecordTableCheckboxColumnHiddenComponentState.atomFamily(
      { instanceId: 'job-7' },
    );
    const view = render(
      <Provider store={store}>
        <RecordTableWidgetStatesEffect
          recordTableId="job-7"
          isPageLayoutInEditMode
        />
      </Provider>,
    );
    expect(store.get(checkbox)).toBe(true);
    view.unmount();
    expect(store.get(checkbox)).toBe(false);
  });
});
