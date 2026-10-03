import { useLayoutEffect, useEffect, useMemo } from 'react';
import { FieldMetadataType, RelationType } from 'twenty-shared/types';
import { getRecordContextRouteDefinitions } from './recordContextRoutes';
import { resolveNativeRecordContext } from './resolveNativeRecordContext';
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
  allowUnidentifiedRecords = false,
): RecordRouteLookupResult => {
  if (records.length === 0) return { status: 'missing' };
  if (records.length !== 1) return { status: 'duplicate' };
  const record = records[0];
  if (typeof record.id !== 'string' || !isValidUuid(record.id))
    return { status: 'error' };
  if (allowUnidentifiedRecords && record[identifierField] === null)
    return { status: 'unidentified', recordId: record.id };
  const number = parseRecordRouteIdentifier(record[identifierField]);
  if (number === null) return { status: 'error' };
  return { status: 'ready', recordId: record.id, recordIdentifier: number };
};

export const RecordRouteScopeEffect = () => {
  const isLogged = useIsLogged();
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const currentUserWorkspace = useAtomStateValue(currentUserWorkspaceState);
  const currentUser = useAtomStateValue(currentUserState);
  const { objectMetadataItems } = useObjectMetadataItems();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const client = useApolloCoreClient();
  const definitions = useMemo(getRecordRouteDefinitions, []);
  const contextDefinitions = useMemo(getRecordContextRouteDefinitions, []);
  const readableDefinitions = useMemo(
    () =>
      definitions.filter((definition) => {
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
      }),
    [definitions, objectMetadataItems, objectPermissionsByObjectMetadataId],
  );
  const readableContextDefinitions = useMemo(
    () =>
      contextDefinitions.filter((definition) => {
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
          definition.relations.every(
            (relation) =>
              readableDefinitions.some(
                (endpoint) =>
                  endpoint.objectNameSingular === relation.objectNameSingular,
              ) &&
              object.readableFields.some(
                (field) =>
                  field.isActive &&
                  field.name === relation.field &&
                  field.type === FieldMetadataType.RELATION &&
                  field.relation?.type === RelationType.MANY_TO_ONE &&
                  field.relation.targetObjectMetadata.nameSingular ===
                    relation.objectNameSingular,
              ),
          )
        );
      }),
    [
      contextDefinitions,
      readableDefinitions,
      objectMetadataItems,
      objectPermissionsByObjectMetadataId,
    ],
  );
  const scopeKey =
    isLogged && currentWorkspace?.id && currentUser?.id && currentUserWorkspace
      ? JSON.stringify([
          currentWorkspace.id,
          currentUser.id,
          currentUserWorkspace.isImpersonating,
          readableDefinitions,
          readableContextDefinitions,
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
              'recordId' in target && definition.allowUnidentifiedRecords,
            );
          }
        : null,
      readableContextDefinitions.map(
        (definition) => definition.objectNameSingular,
      ),
      scopeKey
        ? async (definition, target) => {
            if (
              !readableContextDefinitions.some(
                (item) =>
                  item.objectNameSingular === definition.objectNameSingular,
              )
            )
              return { status: 'denied' };
            return resolveNativeRecordContext(definition, target, {
              endpoints: readableDefinitions,
              read: async (objectNameSingular, fields, filter) => {
                const object = objectMetadataItems.find(
                  (item) => item.nameSingular === objectNameSingular,
                );
                if (
                  !object ||
                  !getObjectPermissionsForObject(
                    objectPermissionsByObjectMetadataId,
                    object.id,
                  ).canReadObjectRecords
                )
                  throw new Error('denied');
                const result =
                  await client.query<RecordGqlOperationFindManyResult>({
                    query: generateFindManyRecordsQuery({
                      objectMetadataItem: object,
                      objectMetadataItems,
                      recordGqlFields: Object.fromEntries(
                        fields.map((field) => [field, true]),
                      ),
                      objectPermissionsByObjectMetadataId,
                    }),
                    variables: { filter, limit: 2 },
                    fetchPolicy: 'network-only',
                    errorPolicy: 'none',
                  });
                const connection = result.data?.[object.namePlural];
                if (!connection) throw new Error('error');
                return getRecordsFromRecordConnection({
                  recordConnection: connection,
                });
              },
            });
          }
        : null,
    );
  }, [
    client,
    scopeKey,
    objectMetadataItems,
    objectPermissionsByObjectMetadataId,
    readableDefinitions,
    readableContextDefinitions,
  ]);

  useEffect(() => () => configureRecordRouteScope(null, [], null), []);
  return null;
};
