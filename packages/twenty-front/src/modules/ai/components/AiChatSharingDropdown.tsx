import { useLingui } from '@lingui/react/macro';
import { AppPath } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';

import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { RecordSharingDropdown } from '@/object-record/record-sharing/components/RecordSharingDropdown';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { FeatureFlagKey } from '~/generated-metadata/graphql';

type AiChatSharingDropdownProps = { threadId: string };

export const AiChatSharingDropdown = ({
  threadId,
}: AiChatSharingDropdownProps) => {
  const { t } = useLingui();
  const isAiChatSharingDropdownEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_AI_CHAT_SHARING_DROPDOWN_ENABLED,
  );
  const { objectMetadataItems } = useObjectMetadataItems();
  const objectMetadataItem = objectMetadataItems.find(
    (item) => item.nameSingular === 'agentChatThread',
  );

  if (!isAiChatSharingDropdownEnabled || !isDefined(objectMetadataItem)) {
    return null;
  }

  return (
    <RecordSharingDropdown
      target={{ objectMetadataId: objectMetadataItem.id, recordId: threadId }}
      title={t`Share conversation`}
      recordUrl={
        new URL(
          getAppPath(AppPath.AiChat, { threadId }),
          window.location.origin,
        ).href
      }
    />
  );
};
