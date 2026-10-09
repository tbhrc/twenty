import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

import { JsonFieldDisplay } from '@/object-record/record-field/ui/meta-types/display/components/JsonFieldDisplay';

jest.mock('@/object-record/record-field/ui/meta-types/hooks/useJsonFieldDisplay', () => ({
  useJsonFieldDisplay: () => ({ fieldValue: { documents: [{ name: 'Original.pdf', sha256: 'private-hash' }] }, isRecordFieldReadOnly: true }),
}));
jest.mock('~/hooks/useCopyToClipboard', () => ({ useCopyToClipboard: () => ({ copyToClipboard: jest.fn() }) }));
jest.mock('@/ui/field/display/components/JsonDisplay/JsonDisplay', () => ({ JsonDisplay: ({ text }: { text: string }) => <span>{text}</span> }));
jest.mock('@/ui/layout/expandable-list/components/ExpandedFieldDisplay', () => ({
  ExpandedFieldDisplay: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('twenty-ui/components', () => ({ JsonTree: ({ value }: { value: unknown }) => <pre>{JSON.stringify(value)}</pre> }));

describe('JsonFieldDisplay', () => {
  it('keeps timeline JSON compact until the user opens the original details', async () => {
    render(<I18nProvider i18n={i18n}><JsonFieldDisplay compact /></I18nProvider>);
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.queryByText(/private-hash/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Details'));
    expect(screen.getByText(/private-hash/)).toBeInTheDocument();
    expect(screen.getByText(/Original.pdf/)).toBeInTheDocument();
  });

  it('preserves the existing JSON presentation outside the timeline', () => {
    render(<I18nProvider i18n={i18n}><JsonFieldDisplay /></I18nProvider>);
    expect(screen.getByText(/private-hash/)).toBeInTheDocument();
    expect(screen.queryByText('Details')).not.toBeInTheDocument();
  });
});
