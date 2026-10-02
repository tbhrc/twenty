import { CoreObjectNameSingular } from 'twenty-shared/types';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getAvatarShape } from '@/object-metadata/utils/getAvatarShape';
import { getRecordRoutePath } from '@/app/routing/record-routes/getAppPath';
import { type ObjectRecordIdentifier } from '@/object-record/types/ObjectRecordIdentifier';
import { isDefined } from 'twenty-shared/utils';

type RecordIdentifierDTO = {
  id: string;
  labelIdentifier: string;
  imageIdentifier?: string | null;
};

export const recordIdentifierToObjectRecordIdentifier = ({
  recordIdentifier,
  objectMetadataItem,
}: {
  recordIdentifier: RecordIdentifierDTO;
  objectMetadataItem: EnrichedObjectMetadataItem;
}): ObjectRecordIdentifier => {
  const avatarShape = getAvatarShape(objectMetadataItem);

  const isWorkspaceMemberObjectMetadata =
    objectMetadataItem.nameSingular === CoreObjectNameSingular.WorkspaceMember;

  let linkToShowPage = '';

  if (
    objectMetadataItem.nameSingular === CoreObjectNameSingular.NoteTarget ||
    objectMetadataItem.nameSingular === CoreObjectNameSingular.TaskTarget
  ) {
    linkToShowPage = '';
  } else if (
    !isWorkspaceMemberObjectMetadata &&
    isDefined(recordIdentifier.id)
  ) {
    linkToShowPage = getRecordRoutePath({
      objectNameSingular: objectMetadataItem.nameSingular,
      recordId: recordIdentifier.id,
    });
  }

  return {
    id: recordIdentifier.id,
    name: recordIdentifier.labelIdentifier,
    avatarUrl: recordIdentifier.imageIdentifier ?? undefined,
    avatarShape,
    linkToShowPage,
  };
};
