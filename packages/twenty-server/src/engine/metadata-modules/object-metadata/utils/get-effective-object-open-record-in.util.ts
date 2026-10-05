import { ObjectOpenRecordIn } from 'twenty-shared/types';

import { type OverrideAuthorReadContext } from 'src/engine/metadata-modules/overrides/types/override-author-context.type';
import { readAuthoredOverrideProperty } from 'src/engine/metadata-modules/overrides/utils/read-authored-override-property.util';

type OpenRecordInResolvableObjectMetadata = {
  overrides?: unknown;
  openRecordIn: ObjectOpenRecordIn;
};

export const getEffectiveObjectOpenRecordIn = (
  objectMetadata: OpenRecordInResolvableObjectMetadata,
  authorContext: OverrideAuthorReadContext,
): ObjectOpenRecordIn => {
  const overrideValue = readAuthoredOverrideProperty({
    metadataName: 'objectMetadata',
    overrides: objectMetadata.overrides,
    path: ['openRecordIn'],
    authorContext,
  });

  if (
    overrideValue === ObjectOpenRecordIn.RECORD_PAGE ||
    overrideValue === ObjectOpenRecordIn.SIDE_PANEL ||
    overrideValue === ObjectOpenRecordIn.USER_CHOICE
  ) {
    return overrideValue;
  }

  return objectMetadata.openRecordIn;
};
