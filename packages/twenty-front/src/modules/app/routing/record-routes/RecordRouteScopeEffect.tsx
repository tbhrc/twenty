import { useLayoutEffect, useEffect } from 'react';
import { FieldMetadataType } from 'twenty-shared/types';
import { isValidUuid } from 'twenty-shared/utils';

import { useIsLogged } from '@/auth/hooks/useIsLogged';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { currentUserWorkspaceState } from '@/auth/states/currentUserWorkspaceState';
import { currentUserState } from '@/auth/states/currentUserState';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { getObjectPermissionsForObject } from '@/object-metadata/utils/getObjectPermissionsForObject';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { generateFindManyRecordsQuery } from '@/object-record/utils/generateFindManyRecordsQuery';
import { type RecordGqlOperationFindManyResult } from '@/object-record/graphql/types/RecordGqlOperationFindManyResult';
import { getRecordsFromRecordConnection } from '@/object-record/cache/utils/getRecordsFromRecordConnection';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

import {
  beginRecordRouteScope,
  configureRecordRouteScope,
  type RecordRouteLookupResult,
} from './recordRouteCache';
import {
  getRecordRouteDefinitions,
  parseRecordRouteIdentifier,
} from './recordRouteDefinitions';

export const getRecordRouteLookupResult = (
  records: Record<string, unknown>[],
  identifierField: string,
): RecordRouteLookupResult => {
  if (records.length === 0) return { status: 'missing' };
  if (records.length !== 1) return { status: 'duplicate' };
  const record = records[0];
  const number = parseRecordRouteIdentifier(record[identifierField]);
  if (
    typeof record.id !== 'string' ||
    !isValidUuid(record.id) ||
    number === null
  )
    return { status: 'error' };
  return { status: 'ready', recordId: record.id, recordIdentifier: number };
};

export const RecordRouteScopeEffect = () => {
  const isLogged = useIsLogged();
  const workspace = useAtomStateValue(currentWorkspaceState);
  const userWorkspace = useAtomStateValue(currentUserWorkspaceState);
  const user = useAtomStateValue(currentUserState);
  const { objectMetadataItems } = useObjectMetadataItems();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const client = useApolloCoreClient();
  const definitions = getRecordRouteDefinitions();
  const readableDefinitions = definitions.filter((definition) => {
    const object = objectMetadataItems.find(
      (item) =>
        item.nameSingular === definition.objectNameSingular &&
        item.namePlural === definition.objectNamePlural,
    );
    return (
      object &&
      getObjectPermissionsForObject(
        objectPermissionsByObjectMetadataId,
        object.id,
      ).canReadObjectRecords &&
      object.readableFields.some(
        (field) =>
          field.isActive &&
          field.name === definition.recordIdentifierField &&
          field.type === FieldMetadataType.NUMBER,
      )
    );
  });
  const scopeKey =
    isLogged && workspace?.id && user?.id && userWorkspace
      ? JSON.stringify([
          workspace.id,
          user.id,
          userWorkspace.isImpersonating,
          readableDefinitions,
          objectPermissionsByObjectMetadataId,
        ])
      : null;

  // Clear prior identity before descendants render on a new session/workspace.
  // Subscriber notification is deferred; no React state is set during render.
  beginRecordRouteScope(scopeKey);

  useLayoutEffect(() => {
    configureRecordRouteScope(
      scopeKey,
      readableDefinitions.map((definition) => definition.objectNameSingular),
      scopeKey
        ? async (definition, target) => {
            const object = objectMetadataItems.find(
              (item) => item.nameSingular === definition.objectNameSingular,
            );
            if (
              !object ||
              !readableDefinitions.some(
                (item) =>
                  item.objectNameSingular === definition.objectNameSingular,
              )
            )
              return { status: 'denied' };
            const result = await client.query<RecordGqlOperationFindManyResult>(
              {
                query: generateFindManyRecordsQuery({
                  objectMetadataItem: object,
                  objectMetadataItems,
                  recordGqlFields: {
                    id: true,
                    [definition.recordIdentifierField]: true,
                  },
                  objectPermissionsByObjectMetadataId,
                }),
                variables: {
                  filter:
                    'recordId' in target
                      ? { id: { eq: target.recordId } }
                      : {
                          [definition.recordIdentifierField]: {
                            eq: target.recordIdentifier,
                          },
                        },
                  limit: 2,
                },
                fetchPolicy: 'network-only',
                errorPolicy: 'none',
              },
            );
            const connection = result.data?.[object.namePlural];
            if (!connection) return { status: 'error' };
            const records = getRecordsFromRecordConnection({
              recordConnection: connection,
            });
            return getRecordRouteLookupResult(
              records,
              definition.recordIdentifierField,
            );
          }
        : null,
    );
  }, [
    client,
    scopeKey,
    objectMetadataItems,
    objectPermissionsByObjectMetadataId,
  ]);

  useEffect(() => () => configureRecordRouteScope(null, [], null), []);
  return null;
};
