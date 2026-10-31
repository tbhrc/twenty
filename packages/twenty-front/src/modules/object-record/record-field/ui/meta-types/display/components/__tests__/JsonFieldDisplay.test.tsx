import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { JsonFieldDisplay } from '@/object-record/record-field/ui/meta-types/display/components/JsonFieldDisplay';
jest.mock(
  '@/object-record/record-field/ui/meta-types/hooks/useJsonFieldDisplay',
  () => ({
    useJsonFieldDisplay: () => ({
      fieldValue: {
        documents: [{ name: 'Original.pdf', sha256: 'private-hash' }],
      },
      isRecordFieldReadOnly: true,
    }),
  }),
);
jest.mock(
  '@/ui/layout/expandable-list/components/ExpandedFieldDisplay',
  () => ({
    ExpandedFieldDisplay: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
  }),
);
describe('JsonFieldDisplay', () => {
  it('opens readable compact details from the keyboard and restores focus on Escape', async () => {
    const { container } = render(
      <I18nProvider i18n={i18n}>
        <JsonFieldDisplay compact />
      </I18nProvider>,
    );
    const button = screen.getByRole('button', { name: 'View details' });
    expect(screen.queryByText('private-hash')).toBeNull();
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('Original.pdf')).toBeVisible();
    expect(container.textContent).not.toMatch(/[{}]/);
    button.focus();
    await userEvent.keyboard('{Escape}');
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
  it('renders detail fields readably with all source values preserved', () => {
    render(
      <I18nProvider i18n={i18n}>
        <JsonFieldDisplay compact={false} />
      </I18nProvider>,
    );
    expect(screen.getByText('Documents')).toBeVisible();
    expect(screen.getByText('private-hash')).toBeVisible();
  });
});
