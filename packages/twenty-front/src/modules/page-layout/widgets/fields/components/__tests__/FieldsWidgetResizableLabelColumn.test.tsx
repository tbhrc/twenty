import { RecordInlineCellLabelWidthContext } from '@/object-record/record-inline-cell/components/RecordInlineCellLabelWidthContext';
import { FieldsWidgetResizableLabelColumn } from '@/page-layout/widgets/fields/components/FieldsWidgetResizableLabelColumn';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { useContext } from 'react';

jest.mock('@/ui/theme/utils/getUiZoom', () => ({ getUiZoom: () => 2 }));

const Width = () => (
  <output data-testid="width">
    {useContext(RecordInlineCellLabelWidthContext)}
  </output>
);
let containerWidth = 900;
let resize: () => void;
const renderColumn = (scopeKey: string) =>
  render(
    <Provider store={createStore()}>
      <FieldsWidgetResizableLabelColumn scopeKey={scopeKey}>
        <Width />
      </FieldsWidgetResizableLabelColumn>
    </Provider>,
  );

beforeEach(() => {
  window.PointerEvent = MouseEvent as typeof PointerEvent;
  localStorage.clear();
  containerWidth = 900;
  jest
    .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
    .mockImplementation(() => containerWidth);
  global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
    observe: () => {
      resize = callback;
    },
    disconnect: jest.fn(),
    unobserve: jest.fn(),
  }));
  HTMLElement.prototype.setPointerCapture = jest.fn();
  HTMLElement.prototype.releasePointerCapture = jest.fn();
});
afterEach(() => jest.restoreAllMocks());

test('field name width is adjustable by keyboard and persists across remount', async () => {
  const view = renderColumn('keyboard');
  const handle = screen.getByRole('separator', {
    name: 'Resize field name column',
  });
  expect(screen.getByTestId('width')).toHaveTextContent('220');
  handle.focus();
  await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowRight}{/Shift}');
  expect(screen.getByTestId('width')).toHaveTextContent('270');
  view.unmount();
  renderColumn('keyboard');
  expect(screen.getByTestId('width')).toHaveTextContent('270');
});

test('Home, ATS and CRM widgets share the preference and another scope remains independent', async () => {
  render(
    <Provider store={createStore()}>
      {[0, 1, 2].map((i) => (
        <FieldsWidgetResizableLabelColumn key={i} scopeKey="person:main">
          <Width />
        </FieldsWidgetResizableLabelColumn>
      ))}
    </Provider>,
  );
  screen.getAllByRole('separator')[0].focus();
  await userEvent.keyboard('{ArrowRight}');
  for (const output of screen.getAllByTestId('width'))
    expect(output).toHaveTextContent('230');
  renderColumn('company:main');
  expect(screen.getAllByTestId('width')[3]).toHaveTextContent('220');
});

test('width clamps to available space and restores the saved preference when widened', async () => {
  renderColumn('responsive');
  screen.getByRole('separator').focus();
  await userEvent.keyboard('{End}');
  expect(screen.getByTestId('width')).toHaveTextContent('480');
  containerWidth = 300;
  act(() => resize());
  expect(screen.getByTestId('width')).toHaveTextContent('140');
  containerWidth = 900;
  act(() => resize());
  expect(screen.getByTestId('width')).toHaveTextContent('480');
  await userEvent.keyboard('{Home}');
  expect(screen.getByTestId('width')).toHaveTextContent('80');
  fireEvent.doubleClick(screen.getByRole('separator'));
  expect(screen.getByTestId('width')).toHaveTextContent('220');
});

test('pointer drag respects UI zoom and cancellation does not save a partial drag', () => {
  renderColumn('pointer');
  const handle = screen.getByRole('separator');
  fireEvent.pointerDown(handle, { button: 0, clientX: 250, pointerId: 1 });
  fireEvent.pointerMove(handle, { clientX: 450, pointerId: 1 });
  expect(screen.getByTestId('width')).toHaveTextContent('320');
  fireEvent.pointerCancel(handle, { pointerId: 1 });
  expect(screen.getByTestId('width')).toHaveTextContent('220');
  fireEvent.pointerDown(handle, { button: 0, clientX: 250, pointerId: 1 });
  fireEvent.pointerUp(handle, { clientX: 450, pointerId: 1 });
  expect(screen.getByTestId('width')).toHaveTextContent('320');
});
