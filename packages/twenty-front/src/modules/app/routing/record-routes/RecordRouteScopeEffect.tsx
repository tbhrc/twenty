import { useLayoutEffect, useEffect, useMemo } from 'react';
import { FieldMetadataType } from 'twenty-shared/types';
import { getRecordContextRouteDefinitions } from './recordContextRoutes';
import { getRecordContextRouteReadPlan } from './recordContextRouteReadPlan';
import { resolveNativeRecordContext } from './resolveNativeRecordContext';
import { resolveRetiredPersonRoute } from './resolveRetiredPersonRoute';
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
  getRecordTypePath,
  type RecordRouteDefinition,
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

export const getTypedRecordRouteLookupResult = (
  records: Record<string, unknown>[],
  definition: RecordRouteDefinition,
): RecordRouteLookupResult => {
  const result = getRecordRouteLookupResult(
    records,
    definition.recordIdentifierField,
  );
  if (result.status !== 'ready' || !definition.recordType) return result;
  const recordPath = getRecordTypePath(definition, records[0]);
  return recordPath ? { ...result, recordPath } : { status: 'missing' };
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
          ) &&
          (!definition.recordType ||
            object.readableFields.some(
              (field) =>
                field.isActive &&
                field.name === definition.recordType!.field &&
                field.type === FieldMetadataType.SELECT &&
                objectPermissionsByObjectMetadataId[object.id]
                  ?.restrictedFields[field.id]?.canRead !== false,
            ))
        );
      }),
    [definitions, objectMetadataItems, objectPermissionsByObjectMetadataId],
  );
  const contextReadPlans = useMemo(
    () =>
      new Map(
        contextDefinitions.map((definition) => [
          definition.path,
          getRecordContextRouteReadPlan(
            definition,
            objectMetadataItems.map((object) => ({
              nameSingular: object.nameSingular,
              namePlural: object.namePlural,
              canRead:
                object.isActive &&
                getObjectPermissionsForObject(
                  objectPermissionsByObjectMetadataId,
                  object.id,
                ).canReadObjectRecords,
              fields: object.readableFields.filter(
                (field) =>
                  objectPermissionsByObjectMetadataId[object.id]
                    ?.restrictedFields[field.id]?.canRead !== false,
              ),
            })),
            readableDefinitions,
          ),
        ]),
      ),
    [
      contextDefinitions,
      readableDefinitions,
      objectMetadataItems,
      objectPermissionsByObjectMetadataId,
    ],
  );
  const readableContextDefinitions = useMemo(
    () =>
      contextDefinitions.filter(
        (definition) => contextReadPlans.get(definition.path) !== null,
      ),
    [contextDefinitions, contextReadPlans],
  );
  const retirementAliasObjects = useMemo(
    () =>
      objectMetadataItems
        .filter((object) =>
          ['person', 'identityAlias'].includes(object.nameSingular),
        )
        .map((object) => {
          const permissions = objectPermissionsByObjectMetadataId[object.id];
          return {
            id: object.id,
            nameSingular: object.nameSingular,
            namePlural: object.namePlural,
            isActive: object.isActive,
            // Alias fallback requires affirmative caller rights, including metadata.
            canReadObjectRecords:
              permissions?.objectMetadataId === object.id &&
              permissions.canReadObjectRecords === true,
            readableFields: object.readableFields.filter(
              (field) =>
                permissions?.restrictedFields[field.id]?.canRead !== false,
            ),
          };
        }),
    [objectMetadataItems, objectPermissionsByObjectMetadataId],
  );
  const scopeKey =
    isLogged && currentWorkspace?.id && currentUser?.id && currentUserWorkspace
      ? JSON.stringify([
          currentWorkspace.id,
          currentUser.id,
          currentUserWorkspace.isImpersonating,
          readableDefinitions,
          readableContextDefinitions,
          [...contextReadPlans],
          retirementAliasObjects,
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
                    ...(definition.recordType
                      ? { [definition.recordType.field]: true }
                      : {}),
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
            if (
              records.length === 0 &&
              definition.objectNameSingular === 'person'
            ) {
              if (connection.pageInfo?.hasNextPage !== false)
                return { status: 'error' };
              return resolveRetiredPersonRoute(definition, target, {
                objects: retirementAliasObjects,
                read: async (objectNameSingular, fields, filter) => {
                  const aliasObject = objectMetadataItems.find(
                    (item) => item.nameSingular === objectNameSingular,
                  );
                  if (!aliasObject) throw new Error('denied');
                  const aliasResult =
                    await client.query<RecordGqlOperationFindManyResult>({
                      query: generateFindManyRecordsQuery({
                        objectMetadataItem: aliasObject,
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
                  const aliasConnection =
                    aliasResult.data?.[aliasObject.namePlural];
                  if (!aliasConnection) throw new Error('error');
                  return {
                    records: getRecordsFromRecordConnection({
                      recordConnection: aliasConnection,
                    }),
                    complete:
                      aliasConnection.pageInfo?.hasNextPage === false &&
                      aliasConnection.pageInfo?.hasPreviousPage === false,
                  };
                },
              });
            }
            if (definition.recordType)
              return getTypedRecordRouteLookupResult(records, definition);
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
                  item.path === definition.path &&
                  item.objectNameSingular === definition.objectNameSingular,
              )
            )
              return { status: 'denied' };
            return resolveNativeRecordContext(definition, target, {
              endpoints: readableDefinitions,
              relationPaths: contextReadPlans.get(definition.path) ?? undefined,
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
      readableContextDefinitions.map((definition) => definition.path),
    );
  }, [
    client,
    scopeKey,
    objectMetadataItems,
    objectPermissionsByObjectMetadataId,
    readableDefinitions,
    readableContextDefinitions,
    contextReadPlans,
    retirementAliasObjects,
  ]);

  useEffect(() => () => configureRecordRouteScope(null, [], null), []);
  return null;
};
