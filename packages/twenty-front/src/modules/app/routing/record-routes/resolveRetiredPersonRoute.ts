import { FieldMetadataType, RelationType } from 'twenty-shared/types';
import { isValidUuid } from 'twenty-shared/utils';

import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type FieldMetadataItemRelation } from '@/object-metadata/types/FieldMetadataItemRelation';

import { type RecordRouteLookupResult } from './recordRouteCache';
import {
  parseRecordRouteIdentifier,
  type RecordRouteDefinition,
} from './recordRouteDefinitions';

type RetirementAliasField = Pick<
  FieldMetadataItem,
  'name' | 'type' | 'isActive'
> & {
  relation?: Pick<
    FieldMetadataItemRelation,
    'type' | 'targetObjectMetadata'
  > | null;
};

export type RetirementAliasObject = Pick<
  EnrichedObjectMetadataItem,
  'id' | 'nameSingular' | 'namePlural' | 'isActive'
> & {
  canReadObjectRecords: boolean;
  readableFields: RetirementAliasField[];
};

export type RetirementAliasRead = (
  objectNameSingular: string,
  fields: string[],
  filter: Record<string, unknown>,
) => Promise<{ records: Record<string, unknown>[]; complete: boolean }>;

const hasReadableField = (
  object: RetirementAliasObject,
  name: string,
  type: FieldMetadataType,
) => {
  const fields = object.readableFields.filter((field) => field.name === name);
  return fields.length === 1 && fields[0].isActive && fields[0].type === type;
};

// The caller invokes this only after a fresh ordinary Person lookup is empty.
export const resolveRetiredPersonRoute = async (
  definition: RecordRouteDefinition,
  target: { recordId: string } | { recordIdentifier: number },
  {
    objects,
    read,
  }: { objects: RetirementAliasObject[]; read: RetirementAliasRead },
): Promise<RecordRouteLookupResult> => {
  if (
    definition.objectNameSingular !== 'person' ||
    definition.objectNamePlural !== 'people' ||
    definition.recordIdentifierField !== 'candidateNumber'
  )
    return { status: 'missing' };

  const personObjects = objects.filter(
    (object) =>
      object.nameSingular === 'person' && object.namePlural === 'people',
  );
  const aliasObjects = objects.filter(
    (object) =>
      object.nameSingular === 'identityAlias' &&
      object.namePlural === 'identityAliases',
  );
  if (personObjects.length !== 1 || aliasObjects.length !== 1)
    return { status: 'denied' };
  const person = personObjects[0];
  const alias = aliasObjects[0];
  if (
    !person.isActive ||
    !alias.isActive ||
    !person.canReadObjectRecords ||
    !alias.canReadObjectRecords ||
    !hasReadableField(person, 'id', FieldMetadataType.UUID) ||
    !hasReadableField(person, 'candidateNumber', FieldMetadataType.NUMBER) ||
    !hasReadableField(person, 'deletedAt', FieldMetadataType.DATE_TIME) ||
    !hasReadableField(alias, 'id', FieldMetadataType.UUID) ||
    !hasReadableField(alias, 'aliasType', FieldMetadataType.TEXT) ||
    !hasReadableField(alias, 'aliasValue', FieldMetadataType.TEXT) ||
    !hasReadableField(alias, 'deletedAt', FieldMetadataType.DATE_TIME) ||
    !hasReadableField(alias, 'person', FieldMetadataType.RELATION)
  )
    return { status: 'denied' };
  const relation = alias.readableFields.find(
    (field) => field.name === 'person',
  )?.relation;
  if (
    relation?.type !== RelationType.MANY_TO_ONE ||
    relation.targetObjectMetadata.id !== person.id ||
    relation.targetObjectMetadata.nameSingular !== 'person' ||
    relation.targetObjectMetadata.namePlural !== 'people'
  )
    return { status: 'denied' };

  const aliasType =
    'recordId' in target ? 'retired_person_uuid' : 'retired_person_number';
  const aliasValue =
    'recordId' in target ? target.recordId : String(target.recordIdentifier);
  if (
    'recordId' in target
      ? !isValidUuid(target.recordId)
      : parseRecordRouteIdentifier(target.recordIdentifier) === null
  )
    return { status: 'missing' };

  try {
    const aliases = await read(
      'identityAlias',
      ['id', 'aliasType', 'aliasValue', 'deletedAt', 'personId'],
      {
        and: [
          { aliasType: { eq: aliasType } },
          { aliasValue: { eq: aliasValue } },
        ],
      },
    );
    if (aliases.records.length > 1) return { status: 'duplicate' };
    if (!aliases.complete) return { status: 'error' };
    if (aliases.records.length === 0) return { status: 'missing' };
    const match = aliases.records[0];
    if (
      typeof match.id !== 'string' ||
      !isValidUuid(match.id) ||
      match.aliasType !== aliasType ||
      match.aliasValue !== aliasValue ||
      match.deletedAt !== null ||
      typeof match.personId !== 'string' ||
      !isValidUuid(match.personId) ||
      ('recordId' in target && match.personId === target.recordId)
    )
      return { status: 'error' };

    const canonical = await read(
      'person',
      ['id', 'candidateNumber', 'deletedAt'],
      {
        id: { eq: match.personId },
      },
    );
    if (canonical.records.length > 1) return { status: 'duplicate' };
    if (!canonical.complete) return { status: 'error' };
    if (canonical.records.length === 0) return { status: 'missing' };
    const record = canonical.records[0];
    const number = parseRecordRouteIdentifier(record.candidateNumber);
    if (
      record.id !== match.personId ||
      record.deletedAt !== null ||
      number === null ||
      ('recordIdentifier' in target && number === target.recordIdentifier)
    )
      return { status: 'error' };
    return {
      status: 'ready',
      recordId: match.personId,
      recordIdentifier: number,
    };
  } catch {
    return { status: 'error' };
  }
};
