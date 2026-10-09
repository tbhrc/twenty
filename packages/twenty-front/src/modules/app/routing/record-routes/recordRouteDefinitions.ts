import { isValidUuid } from 'twenty-shared/utils';

export type RecordRouteDefinition = {
  path: string;
  aliases?: string[];
  views?: Record<string, string>;
  objectNameSingular: string;
  objectNamePlural: string;
  recordIdentifierField: string;
  indexRoute?: boolean;
  allowUnidentifiedRecords?: boolean;
  recordType?: { field: string; paths: Record<string, string> };
};

const RESERVED_SEGMENTS = new Set([
  'object',
  'objects',
  'settings',
  'developers',
  'welcome',
  'verify',
  'verify-email',
  'reset-password',
  'invite',
  'create',
  'sync',
  'chat',
  'home',
  'page',
  'workflow-core',
  'authorize',
  'dpa',
  'not-found',
  'workspace-activation',
  'install-apps',
  'invite-team',
  'plan-required',
  'book-call',
]);

export const getRecordRoutePaths = (definition: RecordRouteDefinition) => [
  definition.path,
  ...(definition.aliases ?? []),
  ...Object.values(definition.recordType?.paths ?? {}).filter(
    (path) => path !== definition.path,
  ),
];

const isRecordRoutePath = (path: unknown): path is string =>
  typeof path === 'string' &&
  /^\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/.test(path) &&
  !path
    .slice(1)
    .split('/')
    .some((segment) => RESERVED_SEGMENTS.has(segment));

// Deployment-owned configuration is independent of the generated environment
// file. No product names or UUID aliases are part of the platform source.
export const getRecordRouteDefinitions = (): RecordRouteDefinition[] => {
  const configured =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & { __TWENTY_RECORD_ROUTES__?: unknown })
          .__TWENTY_RECORD_ROUTES__;
  if (!Array.isArray(configured)) return [];

  const definitions: RecordRouteDefinition[] = [];
  const paths = new Set<string>();
  const names = new Set<string>();
  for (const candidate of configured) {
    if (!candidate || typeof candidate !== 'object') continue;
    const {
      path,
      aliases,
      views,
      objectNameSingular,
      objectNamePlural,
      recordIdentifierField,
      indexRoute,
      allowUnidentifiedRecords,
      recordType,
    } = candidate;
    if (
      candidate.indexOnly === true ||
      !isRecordRoutePath(path) ||
      (aliases !== undefined &&
        (!Array.isArray(aliases) || !aliases.every(isRecordRoutePath))) ||
      (views !== undefined &&
        (views === null ||
          typeof views !== 'object' ||
          Array.isArray(views) ||
          Object.entries(views).some(
            ([name, tabId]) =>
              !/^[a-z][a-z0-9-]*$/.test(name) ||
              typeof tabId !== 'string' ||
              !isValidUuid(tabId),
          ) ||
          new Set(Object.values(views)).size !== Object.keys(views).length)) ||
      typeof objectNameSingular !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(objectNameSingular) ||
      typeof objectNamePlural !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(objectNamePlural) ||
      typeof recordIdentifierField !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(recordIdentifierField) ||
      (indexRoute !== undefined && typeof indexRoute !== 'boolean') ||
      (allowUnidentifiedRecords !== undefined &&
        typeof allowUnidentifiedRecords !== 'boolean') ||
      (recordType !== undefined &&
        (!recordType ||
          typeof recordType !== 'object' ||
          Array.isArray(recordType) ||
          typeof recordType.field !== 'string' ||
          !/^[A-Za-z][A-Za-z0-9_]*$/.test(recordType.field) ||
          !recordType.paths ||
          typeof recordType.paths !== 'object' ||
          Array.isArray(recordType.paths) ||
          Object.keys(recordType.paths).length < 2 ||
          Object.entries(recordType.paths).some(
            ([value, typePath]) =>
              !/^[A-Z][A-Z0-9_]*$/.test(value) || !isRecordRoutePath(typePath),
          ) ||
          new Set(Object.values(recordType.paths)).size !==
            Object.keys(recordType.paths).length ||
          !Object.values(recordType.paths).includes(path) ||
          indexRoute !== false ||
          aliases !== undefined ||
          allowUnidentifiedRecords === true)) ||
      names.has(objectNameSingular) ||
      names.has(objectNamePlural)
    )
      continue;
    const candidatePaths: string[] = recordType
      ? Object.values(recordType.paths)
      : [path, ...(aliases ?? [])];
    if (
      new Set(candidatePaths).size !== candidatePaths.length ||
      candidatePaths.some((candidatePath) => paths.has(candidatePath))
    )
      continue;
    candidatePaths.forEach((candidatePath) => paths.add(candidatePath));
    names.add(objectNameSingular);
    names.add(objectNamePlural);
    definitions.push({
      path,
      ...(aliases === undefined ? {} : { aliases: [...aliases] }),
      ...(views === undefined ? {} : { views: { ...views } }),
      objectNameSingular,
      objectNamePlural,
      recordIdentifierField,
      ...(recordType === undefined
        ? {}
        : {
            recordType: {
              field: recordType.field,
              paths: { ...recordType.paths },
            },
          }),
      ...(indexRoute === undefined ? {} : { indexRoute }),
      ...(allowUnidentifiedRecords === undefined
        ? {}
        : { allowUnidentifiedRecords }),
    });
  }
  return definitions;
};

export const getRecordTypePath = (
  definition: RecordRouteDefinition,
  record: Record<string, unknown>,
): string | null => {
  if (!definition.recordType) return definition.path;
  const value = record[definition.recordType.field];
  return typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(definition.recordType.paths, value)
    ? definition.recordType.paths[value]
    : null;
};

export const parseRecordRouteIdentifier = (value: unknown): number | null => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^[1-9][0-9]*$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

export type IndexRouteDefinition = {
  path: string;
  indexOnly: true;
  objectNameSingular: string;
  objectNamePlural: string;
};

// Collection aliases do not pretend that their source has a public record
// number. Native views, permissions and record opening remain authoritative.
export const getIndexRouteDefinitions = (): IndexRouteDefinition[] => {
  const configured =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & { __TWENTY_RECORD_ROUTES__?: unknown })
          .__TWENTY_RECORD_ROUTES__;
  if (!Array.isArray(configured)) return [];
  const records = getRecordRouteDefinitions();
  const paths = new Set(records.flatMap(getRecordRoutePaths));
  const names = new Set(
    records.flatMap((r) => [r.objectNameSingular, r.objectNamePlural]),
  );
  const definitions: IndexRouteDefinition[] = [];
  for (const candidate of configured) {
    if (!candidate || typeof candidate !== 'object') continue;
    const { path, indexOnly, objectNameSingular, objectNamePlural } = candidate;
    if (
      indexOnly !== true ||
      typeof path !== 'string' ||
      !/^\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*){0,2}$/.test(path) ||
      RESERVED_SEGMENTS.has(path.split('/')[1]) ||
      paths.has(path) ||
      typeof objectNameSingular !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(objectNameSingular) ||
      typeof objectNamePlural !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(objectNamePlural) ||
      names.has(objectNameSingular) ||
      names.has(objectNamePlural) ||
      candidate.recordIdentifierField !== undefined ||
      candidate.views !== undefined ||
      candidate.aliases !== undefined
    )
      continue;
    paths.add(path);
    names.add(objectNameSingular);
    names.add(objectNamePlural);
    definitions.push({
      path,
      indexOnly: true,
      objectNameSingular,
      objectNamePlural,
    });
  }
  return definitions;
};

export const getIndexRouteForPath = (pathname: string) =>
  getIndexRouteDefinitions().find(
    (r) => r.path === pathname.replace(/\/$/, ''),
  );
