import { getPublishedJobPostUrl } from '../getPublishedJobPostUrl';
const job = {
  publicationState: 'PUBLISHED',
  businessContext: 'TALENT_BRIDGE',
  publicSlug: 'facility-engineer',
};
it('uses the native branded publication and stable slug', () => {
  expect(getPublishedJobPostUrl(job)).toBe(
    'https://jobs.talentbridgedubai.com/jobs/facility-engineer',
  );
  expect(
    getPublishedJobPostUrl({ ...job, businessContext: 'IMPLEMENTAI' }),
  ).toBe('https://implementai.ae/jobs/facility-engineer');
});
it.each([
  undefined,
  { ...job, publicationState: 'UNPUBLISHED' },
  { ...job, businessContext: 'UNKNOWN' },
  { ...job, businessContext: 'toString' },
  { ...job, publicSlug: '../private' },
  { ...job, publicSlug: 'https://evil.test' },
  { ...job, publicSlug: '' },
])(
  'does not invent a link for unavailable or invalid publication data',
  (value) => {
    expect(getPublishedJobPostUrl(value)).toBeUndefined();
  },
);
