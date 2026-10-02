export type RecordRouteDefinition = {
  path: string;
  objectNameSingular: string;
  objectNamePlural: string;
  recordIdentifierField: string;
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
      objectNameSingular,
      objectNamePlural,
      recordIdentifierField,
    } = candidate;
    if (
      typeof path !== 'string' ||
      !/^\/[a-z][a-z0-9-]*$/.test(path) ||
      RESERVED_SEGMENTS.has(path.slice(1)) ||
      paths.has(path) ||
      typeof objectNameSingular !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(objectNameSingular) ||
      typeof objectNamePlural !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(objectNamePlural) ||
      typeof recordIdentifierField !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(recordIdentifierField) ||
      names.has(objectNameSingular) ||
      names.has(objectNamePlural)
    )
      continue;
    paths.add(path);
    names.add(objectNameSingular);
    names.add(objectNamePlural);
    definitions.push({
      path,
      objectNameSingular,
      objectNamePlural,
      recordIdentifierField,
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
