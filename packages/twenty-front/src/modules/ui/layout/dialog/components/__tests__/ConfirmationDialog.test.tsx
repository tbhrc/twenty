import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { ConfirmationDialog } from '@/ui/layout/dialog/components/ConfirmationDialog';
const mockClose = jest.fn();
jest.mock('@/ui/layout/dialog/hooks/useDialog', () => ({
  useDialog: () => ({ closeDialog: mockClose }),
}));
jest.mock('@/ui/layout/dialog/components/DialogInstance', () => ({
  DialogInstance: ({
    children,
  }: {
    children: (props: object) => ReactNode;
  }) => <div role="dialog">{children({})}</div>,
}));
jest.mock('@/ui/input/components/SettingsTextInput', () => ({
  SettingsTextInput: () => null,
}));
jest.mock('twenty-ui/components', () => ({
  Section: {
    Root: ({ children }: { children: ReactNode }) => (
      <section>{children}</section>
    ),
  },
}));
jest.mock('twenty-ui/primitives/input', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    color,
    variant,
    ...props
  }: {
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    color?: string;
    variant?: string;
    'data-testid'?: string;
  }) => (
    <button
      data-testid={props['data-testid']}
      data-color={color}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));
jest.mock('twenty-ui/primitives/surfaces', () => ({
  Dialog: {
    Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Title: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
    Description: ({ children }: { children: ReactNode }) => (
      <div data-testid="description">{children}</div>
    ),
  },
}));
const base = {
  dialogId: 'test',
  title: 'Run CV ingestion?',
  subtitle:
    'Run this task? Existing items are reused. A saved checkpoint resumes its original window.',
  onConfirmClick: jest.fn(),
  onClose: jest.fn(),
  confirmButtonText: 'Yes',
  cancelButtonText: 'No',
};
beforeEach(() => jest.clearAllMocks());
describe('confirmation presentation', () => {
  it('places the opt-in primary Yes first, keeps No second, and waits for a decision', async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ConfirmationDialog
          dialogId={base.dialogId}
          title={base.title}
          subtitle={base.subtitle}
          onConfirmClick={base.onConfirmClick}
          onClose={base.onClose}
          confirmButtonText={base.confirmButtonText}
          cancelButtonText={base.cancelButtonText}
          confirmButtonFirst
          confirmButtonColor="accent"
        />
      </I18nProvider>,
    );
    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Yes', 'No']);
    expect(screen.getByRole('button', { name: 'Yes' })).toHaveAttribute(
      'data-color',
      'accent',
    );
    expect(screen.getByRole('button', { name: 'Yes' })).toHaveAttribute(
      'data-variant',
      'solid',
    );
    expect(base.onConfirmClick).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(base.onClose).toHaveBeenCalledTimes(1);
    expect(base.onConfirmClick).not.toHaveBeenCalled();
  });
  it('retains default destructive action order and color', () => {
    render(
      <I18nProvider i18n={i18n}>
        <ConfirmationDialog
          dialogId={base.dialogId}
          title={base.title}
          subtitle={base.subtitle}
          onConfirmClick={base.onConfirmClick}
          onClose={base.onClose}
          confirmButtonText={base.confirmButtonText}
          cancelButtonText={base.cancelButtonText}
        />
      </I18nProvider>,
    );
    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['No', 'Yes']);
    expect(screen.getByRole('button', { name: 'Yes' })).toHaveAttribute(
      'data-color',
      'danger',
    );
  });
  it('breaks application-authored sentences into spaced paragraphs', () => {
    render(
      <I18nProvider i18n={i18n}>
        <ConfirmationDialog
          dialogId={base.dialogId}
          title={base.title}
          subtitle={base.subtitle}
          onConfirmClick={base.onConfirmClick}
          onClose={base.onClose}
          confirmButtonText={base.confirmButtonText}
          cancelButtonText={base.cancelButtonText}
        />
      </I18nProvider>,
    );
    expect(screen.getByTestId('description').textContent).toBe(
      'Run this task?\n\nExisting items are reused.\n\nA saved checkpoint resumes its original window.',
    );
  });
  it('preserves existing source newlines without rewriting them', () => {
    const subtitle =
      'First source line\nSecond source line\n\nThird paragraph.';
    render(
      <I18nProvider i18n={i18n}>
        <ConfirmationDialog
          dialogId={base.dialogId}
          title={base.title}
          subtitle={subtitle}
          onConfirmClick={base.onConfirmClick}
          onClose={base.onClose}
          confirmButtonText={base.confirmButtonText}
          cancelButtonText={base.cancelButtonText}
        />
      </I18nProvider>,
    );
    expect(screen.getByTestId('description').textContent).toBe(subtitle);
  });
  it('retains loading and typed-confirmation guards', () => {
    render(
      <I18nProvider i18n={i18n}>
        <ConfirmationDialog
          dialogId={base.dialogId}
          title={base.title}
          subtitle={base.subtitle}
          onConfirmClick={base.onConfirmClick}
          onClose={base.onClose}
          confirmButtonText={base.confirmButtonText}
          cancelButtonText={base.cancelButtonText}
          confirmButtonFirst
          loading
        />
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: 'Yes' })).toBeDisabled();
  });
  it('dispatches only after a primary click', async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ConfirmationDialog
          dialogId={base.dialogId}
          title={base.title}
          subtitle={base.subtitle}
          onConfirmClick={base.onConfirmClick}
          onClose={base.onClose}
          confirmButtonText={base.confirmButtonText}
          cancelButtonText={base.cancelButtonText}
          confirmButtonFirst
        />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(base.onConfirmClick).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledWith('test');
  });
});
