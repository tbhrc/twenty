import {
  getRecordRouteDefinitions,
  parseRecordRouteIdentifier,
  type RecordRouteDefinition,
} from './recordRouteDefinitions';
import { isValidUuid } from 'twenty-shared/utils';
import { type RecordContextRouteDefinition } from './recordContextRoutes';
import {
  type RecordContextResult,
  type RecordContextTarget,
} from './resolveNativeRecordContext';

export type RecordContextLookup = (
  definition: RecordContextRouteDefinition,
  target: RecordContextTarget,
) => Promise<RecordContextResult>;

export type RecordRouteLookupResult =
  | { status: 'ready'; recordId: string; recordIdentifier: number }
  | { status: 'unidentified'; recordId: string }
  | { status: 'missing' | 'duplicate' | 'denied' | 'error' };
export type RecordRouteLookup = (
  definition: RecordRouteDefinition,
  target: { recordId: string } | { recordIdentifier: number },
) => Promise<RecordRouteLookupResult>;

let scope: string | null = null;
let generation = 0;
let version = 0;
let lookup: RecordRouteLookup | null = null;
let readableObjects = new Set<string>();
let readableContextObjects = new Set<string>();
let contextLookup: RecordContextLookup | null = null;
const contextIds = new Map<string, string>();
const contextPaths = new Map<string, string>();
const pendingContexts = new Map<string, Promise<RecordContextResult>>();
const ids = new Map<string, number>();
const numbers = new Map<string, string>();
const duplicates = new Set<string>();
const pending = new Map<string, Promise<RecordRouteLookupResult>>();
const requestedHrefs = new Set<string>();
const listeners = new Set<() => void>();
let notificationPending = false;

const notify = () => {
  version += 1;
  if (notificationPending) return;
  notificationPending = true;
  queueMicrotask(() => {
    notificationPending = false;
    listeners.forEach((listener) => listener());
  });
};

export const subscribeRecordRoutes = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getRecordRouteVersion = () => version;
export const getRecordRouteGeneration = () => generation;
export const isRecordRouteReadable = (objectNameSingular: string) =>
  Boolean(scope && readableObjects.has(objectNameSingular));

export const beginRecordRouteScope = (nextScope: string | null) => {
  if (scope !== nextScope) {
    scope = nextScope;
    generation += 1;
    ids.clear();
    numbers.clear();
    duplicates.clear();
    pending.clear();
    requestedHrefs.clear();
    readableObjects.clear();
    readableContextObjects.clear();
    contextIds.clear();
    contextPaths.clear();
    pendingContexts.clear();
    contextLookup = null;
    lookup = null;
    notify();
  }
};

export const configureRecordRouteScope = (
  nextScope: string | null,
  allowedObjects: string[],
  nextLookup: RecordRouteLookup | null,
  allowedContextObjects: string[] = [],
  nextContextLookup: RecordContextLookup | null = null,
) => {
  beginRecordRouteScope(nextScope);
  readableObjects = new Set(allowedObjects);
  lookup = nextLookup;
  readableContextObjects = new Set(allowedContextObjects);
  contextLookup = nextContextLookup;
};

export const getCachedContextRecordId = (
  objectNameSingular: string,
  path: string,
) =>
  scope && readableContextObjects.has(objectNameSingular)
    ? contextIds.get(`${objectNameSingular}:${path.replace(/\/$/, '')}`)
    : undefined;

export const isRecordContextRouteReadable = (objectNameSingular: string) =>
  Boolean(scope && readableContextObjects.has(objectNameSingular));

export const getCachedContextRecordPath = (
  objectNameSingular: string,
  recordId: string,
) =>
  scope && readableContextObjects.has(objectNameSingular)
    ? contextPaths.get(`${objectNameSingular}:${recordId}`)
    : undefined;

export const resolveRecordContextRoute = (
  definition: RecordContextRouteDefinition,
  target: RecordContextTarget,
): Promise<RecordContextResult> => {
  if (
    !scope ||
    !contextLookup ||
    !readableContextObjects.has(definition.objectNameSingular)
  )
    return Promise.resolve({ status: 'denied' });
  const key = `${definition.objectNameSingular}:${JSON.stringify(target)}`;
  const existing = pendingContexts.get(key);
  if (existing) return existing;
  const expectedGeneration = generation;
  const promise = contextLookup(definition, target)
    .catch((): RecordContextResult => ({ status: 'error' }))
    .then((result): RecordContextResult => {
      if (expectedGeneration !== generation) return { status: 'denied' };
      if (result.status === 'ready') {
        if (
          !isValidUuid(result.recordId) ||
          ('recordId' in target && result.recordId !== target.recordId)
        )
          return { status: 'error' };
        const idKey = `${definition.objectNameSingular}:${result.recordId}`;
        const previousRecordId = contextIds.get(
          `${definition.objectNameSingular}:${result.path}`,
        );
        if (previousRecordId && previousRecordId !== result.recordId)
          contextPaths.delete(
            `${definition.objectNameSingular}:${previousRecordId}`,
          );
        const previous = contextPaths.get(idKey);
        if (previous)
          contextIds.delete(`${definition.objectNameSingular}:${previous}`);
        contextIds.set(
          `${definition.objectNameSingular}:${result.path}`,
          result.recordId,
        );
        contextPaths.set(idKey, result.path);
        notify();
      } else {
        // A failed current read must revoke an earlier successful location.
        const path =
          'recordId' in target
            ? contextPaths.get(
                `${definition.objectNameSingular}:${target.recordId}`,
              )
            : definition.path.replace(
                /:([A-Za-z][A-Za-z0-9_]*)/g,
                (_match, parameter: string) =>
                  String(target.identifiers[parameter]),
              );
        const recordId = path
          ? contextIds.get(`${definition.objectNameSingular}:${path}`)
          : undefined;
        if (path) contextIds.delete(`${definition.objectNameSingular}:${path}`);
        if (recordId)
          contextPaths.delete(`${definition.objectNameSingular}:${recordId}`);
        notify();
      }
      return result;
    })
    .finally(() => {
      if (expectedGeneration === generation) pendingContexts.delete(key);
    });
  pendingContexts.set(key, promise);
  return promise;
};

export const requestRecordContextHref = (
  definition: RecordContextRouteDefinition,
  recordId: string,
) => {
  if (
    !scope ||
    !isValidUuid(recordId) ||
    !readableContextObjects.has(definition.objectNameSingular) ||
    getCachedContextRecordPath(definition.objectNameSingular, recordId)
  )
    return;
  const key = `context:${definition.objectNameSingular}:${recordId}`;
  if (requestedHrefs.has(key)) return;
  requestedHrefs.add(key);
  const expectedGeneration = generation;
  queueMicrotask(() => {
    if (expectedGeneration === generation)
      void resolveRecordContextRoute(definition, { recordId });
  });
};

export const getCachedRecordIdentifier = (
  objectNameSingular: string,
  recordId: string,
) =>
  scope && readableObjects.has(objectNameSingular)
    ? ids.get(`${objectNameSingular}:${recordId}`)
    : undefined;
export const getCachedRecordId = (
  objectNameSingular: string,
  recordIdentifier: number,
) =>
  scope && readableObjects.has(objectNameSingular)
    ? numbers.get(`${objectNameSingular}:${recordIdentifier}`)
    : undefined;

export const rememberRecordRoute = (
  objectNameSingular: string,
  record: Record<string, unknown>,
  expectedGeneration = generation,
) => {
  if (
    !scope ||
    expectedGeneration !== generation ||
    !readableObjects.has(objectNameSingular)
  )
    return;
  const definition = getRecordRouteDefinitions().find(
    (item) => item.objectNameSingular === objectNameSingular,
  );
  if (!definition || typeof record.id !== 'string' || !isValidUuid(record.id))
    return;
  const number = parseRecordRouteIdentifier(
    record[definition.recordIdentifierField],
  );
  if (number === null) return;
  const idKey = `${objectNameSingular}:${record.id}`;
  const numberKey = `${objectNameSingular}:${number}`;
  const previousId = numbers.get(numberKey);
  if (duplicates.has(numberKey)) return;
  if (previousId && previousId !== record.id) {
    numbers.delete(numberKey);
    ids.delete(`${objectNameSingular}:${previousId}`);
    ids.delete(idKey);
    duplicates.add(numberKey);
    notify();
    return;
  }
  if (ids.get(idKey) === number) return;
  const previousNumber = ids.get(idKey);
  if (previousNumber !== undefined)
    numbers.delete(`${objectNameSingular}:${previousNumber}`);
  ids.set(idKey, number);
  numbers.set(numberKey, record.id);
  notify();
};

// Cached identifiers aid href creation; opening a route always rechecks it
// through the authenticated client. Results from an old session are discarded.
export const resolveRecordRoute = (
  definition: RecordRouteDefinition,
  target: { recordId: string } | { recordIdentifier: number },
): Promise<RecordRouteLookupResult> => {
  if ('recordId' in target && !isValidUuid(target.recordId))
    return Promise.resolve({ status: 'missing' });
  if (!scope || !lookup || !readableObjects.has(definition.objectNameSingular))
    return Promise.resolve({ status: 'denied' });
  const key = `${definition.objectNameSingular}:${'recordId' in target ? `id:${target.recordId}` : `number:${target.recordIdentifier}`}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const expectedGeneration = generation;
  const promise = lookup(definition, target)
    .catch((): RecordRouteLookupResult => ({ status: 'error' }))
    .then((result): RecordRouteLookupResult => {
      if (expectedGeneration !== generation) return { status: 'denied' };
      if (
        result.status === 'unidentified' &&
        (!definition.allowUnidentifiedRecords ||
          !('recordId' in target) ||
          result.recordId !== target.recordId)
      )
        result = { status: 'error' };
      if (result.status === 'ready') {
        // Only a matching integer read proves a previous collision was reconciled.
        if (
          'recordIdentifier' in target &&
          target.recordIdentifier === result.recordIdentifier &&
          isValidUuid(result.recordId)
        )
          duplicates.delete(
            `${definition.objectNameSingular}:${target.recordIdentifier}`,
          );
        rememberRecordRoute(
          definition.objectNameSingular,
          {
            id: result.recordId,
            [definition.recordIdentifierField]: result.recordIdentifier,
          },
          expectedGeneration,
        );
        if (
          getCachedRecordId(
            definition.objectNameSingular,
            result.recordIdentifier,
          ) !== result.recordId
        )
          return { status: 'duplicate' };
      } else {
        const number =
          'recordIdentifier' in target
            ? target.recordIdentifier
            : ids.get(`${definition.objectNameSingular}:${target.recordId}`);
        const recordId =
          'recordId' in target
            ? target.recordId
            : number === undefined
              ? undefined
              : numbers.get(`${definition.objectNameSingular}:${number}`);
        if (number !== undefined)
          numbers.delete(`${definition.objectNameSingular}:${number}`);
        if (recordId)
          ids.delete(`${definition.objectNameSingular}:${recordId}`);
        notify();
      }
      return result;
    })
    .finally(() => {
      if (expectedGeneration === generation) pending.delete(key);
    });
  pending.set(key, promise);
  return promise;
};

export const requestRecordRouteHref = (
  definition: RecordRouteDefinition,
  recordId: string,
) => {
  if (
    getCachedRecordIdentifier(definition.objectNameSingular, recordId) !==
    undefined
  )
    return;
  if (!scope || !lookup || !readableObjects.has(definition.objectNameSingular))
    return;
  const key = `${definition.objectNameSingular}:${recordId}`;
  if (requestedHrefs.has(key)) return;
  requestedHrefs.add(key);
  const expectedGeneration = generation;
  // Avoid mutating React state during href computation. Failures are never
  // remembered as successful aliases and do not produce unhandled rejections.
  queueMicrotask(() => {
    if (expectedGeneration === generation)
      void resolveRecordRoute(definition, { recordId });
  });
};
