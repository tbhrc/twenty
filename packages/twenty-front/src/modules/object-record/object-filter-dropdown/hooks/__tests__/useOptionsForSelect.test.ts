import { useOptionsForSelect } from '@/object-record/object-filter-dropdown/hooks/useOptionsForSelect';
import { renderHook } from '@testing-library/react';

const stageOptions = [
  { id: 'shortlisted', value: 'SHORTLISTED', label: 'Shortlisted' },
];
const jobOptions = [{ id: 'open', value: 'OPEN', label: 'Open' }];
let mockReadableFields = [{ id: 'application-stage', options: stageOptions }];
jest.mock('@/object-record/record-index/contexts/RecordIndexContext', () => ({
  useRecordIndexContextOrThrow: () => ({
    objectMetadataItem: {
      readableFields: mockReadableFields,
      fields: [{ id: 'unreadable-stage', options: stageOptions }],
    },
  }),
}));

it('reads Application options in the embedded index without consulting the Job route', () => {
  const { result } = renderHook(() => useOptionsForSelect('application-stage'));
  expect(result.current.selectOptions).toEqual(stageOptions);
});
it('retains native options for an ordinary Job index', () => {
  mockReadableFields = [{ id: 'job-status', options: jobOptions }];
  const { result } = renderHook(() => useOptionsForSelect('job-status'));
  expect(result.current.selectOptions).toEqual(jobOptions);
});
it('does not expose options of an unreadable field', () => {
  const { result } = renderHook(() => useOptionsForSelect('unreadable-stage'));
  expect(result.current.selectOptions).toBeUndefined();
});
