import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { TriggerWorkflowVersionEngineCommand } from '../TriggerWorkflowVersionEngineCommand';
const mockRun = jest.fn();
const mockFetch = jest.fn();
const mockOpen = jest.fn();
const mockClose = jest.fn();
const mockGet = jest.fn(() => []);
let mockContext: any;
jest.mock(
  '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi',
  () => ({
    useHeadlessCommandContextApi: () => mockContext,
  }),
);
jest.mock('@/object-record/hooks/useLazyFetchAllRecords', () => ({
  useLazyFetchAllRecords: () => ({ fetchAllRecords: mockFetch }),
}));
jest.mock('@/workflow/hooks/useRunWorkflowVersion', () => ({
  useRunWorkflowVersion: () => ({ runWorkflowVersion: mockRun }),
}));
jest.mock('@/object-metadata/states/objectMetadataItemsSelector', () => ({
  objectMetadataItemsSelector: { atom: 'metadata' },
}));
jest.mock('jotai', () => ({ useStore: () => ({ get: mockGet }) }));
jest.mock(
  '@/command-menu-item/engine-command/utils/buildTriggerWorkflowVersionPayloads',
  () => ({
    buildTriggerWorkflowVersionPayloads: () => [],
  }),
);
jest.mock('@/ui/layout/dialog/hooks/useDialog', () => ({
  useDialog: () => ({ openDialog: mockOpen, closeDialog: mockClose }),
}));
jest.mock('@/ui/layout/dialog/components/ConfirmationDialog', () => ({
  ConfirmationDialog: ({
    title,
    subtitle,
    onConfirmClick,
    onClose,
    confirmButtonText,
    cancelButtonText,
  }: any) => (
    <div
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {subtitle}
      <button onClick={onClose}>{cancelButtonText}</button>
      <button onClick={onConfirmClick}>{confirmButtonText}</button>
      <button onClick={onClose}>Dismiss</button>
    </div>
  ),
}));
jest.mock(
  '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect',
  () => ({
    HeadlessEngineCommandWrapperEffect: ({ execute, ready = true }: any) => {
      const { useEffect, useRef } = jest.requireActual('react');
      const initialized = useRef(false);
      useEffect(() => {
        if (ready && !initialized.current) {
          initialized.current = true;
          void execute();
        }
      }, [ready, execute]);
      return null;
    },
  }),
);
const rows = [
  [
    '3e668e6d-c3b6-4600-834f-468c0d90341f',
    'b9cc3831-f6de-46af-9d98-51a6364b3638',
    'info@talentbridgedubai.com',
  ],
  [
    '10cc72e5-f7fe-4fae-99ed-6e8cf850fbba',
    '43942c07-bd75-4c52-be77-77cdf63e3709',
    'careers@talentbridgedubai.com',
  ],
];
beforeEach(() => {
  jest.clearAllMocks();
  mockRun.mockResolvedValue(undefined);
  mockContext = {
    workflowId: rows[0][0],
    workflowVersionId: rows[0][1],
    targetedRecordsRule: { mode: 'selection' },
    selectedRecords: [],
    trigger: {},
    availabilityType: 'GLOBAL',
  };
});
describe.each(rows)(
  '%s mailbox confirmation',
  (workflowId, workflowVersionId, mailbox) => {
    beforeEach(() => {
      mockContext = { ...mockContext, workflowId, workflowVersionId };
    });
    it('mounts one accurate confirmation and performs no initial execution or record fetch', () => {
      render(<TriggerWorkflowVersionEngineCommand />);
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      expect(screen.getByText(new RegExp(mailbox))).toHaveTextContent(
        'past 7 days',
      );
      expect(mockRun).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });
    it.each(['No', 'Escape', 'Dismiss'])(
      '%s has no workflow or record-fetch effect',
      async (action) => {
        render(<TriggerWorkflowVersionEngineCommand />);
        if (action === 'Escape')
          fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        else fireEvent.click(screen.getByRole('button', { name: action }));
        await act(async () => {});
        expect(mockRun).not.toHaveBeenCalled();
        expect(mockFetch).not.toHaveBeenCalled();
      },
    );
    it('Yes dispatches exactly the matching existing workflow once even after duplicate clicks', async () => {
      render(<TriggerWorkflowVersionEngineCommand />);
      const yes = screen.getByRole('button', { name: 'Yes' });
      act(() => {
        fireEvent.click(yes);
        fireEvent.click(yes);
      });
      await waitFor(() => expect(mockRun).toHaveBeenCalledTimes(1));
      expect(mockRun).toHaveBeenCalledWith({ workflowId, workflowVersionId });
    });
  },
);
it('keeps other existing workflows on their ordinary execution path', async () => {
  mockContext = { ...mockContext, workflowId: 'another-workflow' };
  render(<TriggerWorkflowVersionEngineCommand />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await waitFor(() => expect(mockRun).toHaveBeenCalledTimes(1));
});
