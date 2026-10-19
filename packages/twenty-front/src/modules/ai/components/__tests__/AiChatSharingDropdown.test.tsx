import { render, screen } from '@testing-library/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { type ReactNode } from 'react';

import { AiChatSharingDropdown } from '@/ai/components/AiChatSharingDropdown';

const mockUseIsFeatureEnabled = jest.fn();
const mockUseObjectMetadataItems = jest.fn();

jest.mock('@/workspace/hooks/useIsFeatureEnabled', () => ({
  useIsFeatureEnabled: () => mockUseIsFeatureEnabled(),
}));
jest.mock('@/object-metadata/hooks/useObjectMetadataItems', () => ({
  useObjectMetadataItems: () => mockUseObjectMetadataItems(),
}));
jest.mock(
  '@/object-record/record-sharing/components/RecordSharingDropdown',
  () => ({
    RecordSharingDropdown: ({ target }: { target: { recordId: string } }) => (
      <button>{`Share ${target.recordId}`}</button>
    ),
  }),
);

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

describe('AiChatSharingDropdown', () => {
  it.each([false, true])(
    'keeps conversations usable without sharing metadata (enabled: %s)',
    (enabled) => {
      mockUseIsFeatureEnabled.mockReturnValue(enabled);
      mockUseObjectMetadataItems.mockReturnValue({ objectMetadataItems: [] });
      const { container } = render(
        <AiChatSharingDropdown threadId="thread" />,
        { wrapper },
      );
      expect(container).toBeEmptyDOMElement();
    },
  );

  it('renders sharing when enabled and its metadata is available', () => {
    mockUseIsFeatureEnabled.mockReturnValue(true);
    mockUseObjectMetadataItems.mockReturnValue({
      objectMetadataItems: [
        { id: 'metadata', nameSingular: 'agentChatThread' },
      ],
    });
    render(<AiChatSharingDropdown threadId="thread" />, { wrapper });
    expect(
      screen.getByRole('button', { name: 'Share thread' }),
    ).toBeInTheDocument();
  });

  it('keeps sharing hidden when disabled even if metadata is available', () => {
    mockUseIsFeatureEnabled.mockReturnValue(false);
    mockUseObjectMetadataItems.mockReturnValue({
      objectMetadataItems: [
        { id: 'metadata', nameSingular: 'agentChatThread' },
      ],
    });
    const { container } = render(<AiChatSharingDropdown threadId="thread" />, {
      wrapper,
    });
    expect(container).toBeEmptyDOMElement();
  });
});
