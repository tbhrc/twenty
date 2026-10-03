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
];

const isRecordRoutePath = (path: unknown): path is string =>
  typeof path === 'string' &&
  /^\/[a-z][a-z0-9-]*$/.test(path) &&
  !RESERVED_SEGMENTS.has(path.slice(1));

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
    } = candidate;
    if (
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
      names.has(objectNameSingular) ||
      names.has(objectNamePlural)
    )
      continue;
    const candidatePaths: string[] = [path, ...(aliases ?? [])];
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
      ...(indexRoute === undefined ? {} : { indexRoute }),
      ...(allowUnidentifiedRecords === undefined
        ? {}
        : { allowUnidentifiedRecords }),
    });
  }
  return definitions;
};

export const parseRecordRouteIdentifier = (value: unknown): number | null => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^[1-9][0-9]*$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};
