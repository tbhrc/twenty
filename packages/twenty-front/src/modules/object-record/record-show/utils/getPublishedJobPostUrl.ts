// Same canonical branded origins as the native ATS publicJobUrl utility.
const JOB_ORIGINS: Record<string, string> = {
  TALENT_BRIDGE: 'https://jobs.talentbridgedubai.com',
  IMPLEMENTAI: 'https://implementai.ae',
};
export const getPublishedJobPostUrl = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as {
    publicationState?: unknown;
    publicSlug?: unknown;
    businessContext?: unknown;
  };
  if (
    record?.publicationState !== 'PUBLISHED' ||
    typeof record.publicSlug !== 'string' ||
    record.publicSlug.length > 160 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.publicSlug) ||
    typeof record.businessContext !== 'string' ||
    !Object.hasOwn(JOB_ORIGINS, record.businessContext)
  )
    return undefined;
  return JOB_ORIGINS[record.businessContext] + '/jobs/' + record.publicSlug;
};
