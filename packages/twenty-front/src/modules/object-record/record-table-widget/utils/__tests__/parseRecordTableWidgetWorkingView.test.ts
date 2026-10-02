import { parseRecordTableWidgetWorkingView } from '@/object-record/record-table-widget/utils/parseRecordTableWidgetWorkingView';

it('round-trips optional rules, combined groups, sorts and search', () => {
  const view = {
    filters: [
      {
        id: 'stage',
        fieldMetadataId: 'stage',
        operand: 'IS',
        value: '["SCREEN"]',
        recordFilterGroupId: 'rules',
      },
    ],
    filterGroups: [{ id: 'rules', logicalOperator: 'AND' }],
    sorts: [{ id: 'created', fieldMetadataId: 'createdAt', direction: 'DESC' }],
    search: 'Ada',
  };
  expect(parseRecordTableWidgetWorkingView(JSON.stringify(view))).toEqual(view);
});

it.each([
  null,
  true,
  '',
  '{',
  '{"filters":[]}',
  '{"filters":[null],"filterGroups":[],"sorts":[],"search":""}',
])('ignores malformed personal storage %p', (value) => {
  expect(parseRecordTableWidgetWorkingView(value)).toBeNull();
});
