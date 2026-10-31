import { type ObjectPermissions } from 'twenty-shared/types';

export const canReadJobPublication = (
  objectNameSingular: string,
  fields: { id: string; name: string }[],
  permissions:
    | Pick<ObjectPermissions, 'canReadObjectRecords' | 'restrictedFields'>
    | undefined,
): boolean =>
  objectNameSingular === 'vacancy' &&
  permissions?.canReadObjectRecords === true &&
  [
    'publicPortals',
    'publicSlug',
    'publicationState',
    'status',
    'businessContext',
  ].every((name) => {
    const field = fields.find((item) => item.name === name);
    return (
      field !== undefined &&
      permissions.restrictedFields?.[field.id]?.canRead !== false
    );
  });

export const PUBLIC_JOB_PORTALS = {
  TALENT_BRIDGE: {
    label: 'Talent Bridge',
    origin: 'https://jobs.talentbridgedubai.com',
  },
  IMPLEMENTAI: { label: 'iMPLEMENTAi', origin: 'https://implementai.ae' },
} as const;
export type JobPortal = keyof typeof PUBLIC_JOB_PORTALS;
export type JobPublication = {
  state: 'published' | 'unpublished' | 'unknown';
  portals: { portal: JobPortal; label: string; url: string }[];
};
export const getJobPublication = (
  record: Record<string, unknown>,
): JobPublication => {
  if (record.publicationState !== 'PUBLISHED' || record.status !== 'OPEN') {
    return {
      state:
        (typeof record.publicationState === 'string' &&
          ['DRAFT', 'UNPUBLISHED', 'ARCHIVED'].includes(
            record.publicationState,
          )) ||
        (typeof record.status === 'string' && record.status !== 'OPEN')
          ? 'unpublished'
          : 'unknown',
      portals: [],
    };
  }
  if (
    typeof record.publicSlug !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.publicSlug)
  )
    return { state: 'unknown', portals: [] };
  const selection =
    record.publicPortals === null ||
    (Array.isArray(record.publicPortals) && record.publicPortals.length === 0)
      ? [record.businessContext]
      : record.publicPortals;
  if (
    !Array.isArray(selection) ||
    selection.length === 0 ||
    selection.some(
      (portal) => portal !== 'TALENT_BRIDGE' && portal !== 'IMPLEMENTAI',
    )
  )
    return { state: 'unknown', portals: [] };
  const portals = [...new Set(selection as JobPortal[])].map((portal) => ({
    portal,
    label: PUBLIC_JOB_PORTALS[portal].label,
    url: PUBLIC_JOB_PORTALS[portal].origin + '/jobs/' + record.publicSlug,
  }));
  return { state: 'published', portals };
};
