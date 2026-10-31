import {
  canReadJobPublication,
  getJobPublication,
} from '@/page-layout/widgets/fields/utils/getJobPublication';
const base = {
  publicationState: 'PUBLISHED',
  status: 'OPEN',
  publicSlug: 'vibe-coder-ai-developer-claude-code-expert-dubai',
  publicPortals: ['TALENT_BRIDGE', 'IMPLEMENTAI'],
  businessContext: 'IMPLEMENTAI',
};
describe('Job publication', () => {
  it('links both branded placements to the same slug without changing the record', () => {
    const original = JSON.stringify(base);
    expect(getJobPublication(base).portals.map((item) => item.url)).toEqual([
      'https://jobs.talentbridgedubai.com/jobs/' + base.publicSlug,
      'https://implementai.ae/jobs/' + base.publicSlug,
    ]);
    expect(JSON.stringify(base)).toBe(original);
  });
  it('supports one portal and deduplicates', () => {
    expect(
      getJobPublication({
        ...base,
        publicPortals: ['IMPLEMENTAI', 'IMPLEMENTAI'],
      }).portals,
    ).toHaveLength(1);
  });
  it.each([null, []])(
    'preserves legacy business portal fallback %s',
    (publicPortals) => {
      expect(
        getJobPublication({ ...base, publicPortals }).portals[0].label,
      ).toBe('iMPLEMENTAi');
    },
  );
  it.each([
    undefined,
    ['UNKNOWN'],
    ['TALENT_BRIDGE', 'UNKNOWN'],
    'IMPLEMENTAI',
  ])('holds unknown selection %s', (publicPortals) => {
    expect(getJobPublication({ ...base, publicPortals }).state).toBe('unknown');
  });
  it.each(['DRAFT', 'UNPUBLISHED', 'ARCHIVED'])(
    'does not link unpublished %s',
    (publicationState) => {
      expect(getJobPublication({ ...base, publicationState })).toEqual({
        state: 'unpublished',
        portals: [],
      });
    },
  );
  it('does not link closed jobs', () => {
    expect(getJobPublication({ ...base, status: 'CLOSED' }).state).toBe(
      'unpublished',
    );
  });
  it('reports unavailable fields honestly', () => {
    expect(getJobPublication({}).state).toBe('unknown');
  });
  it.each(['../elsewhere', 'https://evil.test', '', 'a?x=y'])(
    'rejects unsafe slugs %s',
    (publicSlug) => {
      expect(getJobPublication({ ...base, publicSlug }).portals).toHaveLength(
        0,
      );
    },
  );
});

describe('publication visibility', () => {
  const fields = [
    'publicPortals',
    'publicSlug',
    'publicationState',
    'status',
    'businessContext',
  ].map((name) => ({ id: name, name }));
  const permissions = { canReadObjectRecords: true, restrictedFields: {} };
  it('only exposes placements on readable Jobs', () => {
    expect(canReadJobPublication('vacancy', fields, permissions)).toBe(true);
    expect(canReadJobPublication('person', fields, permissions)).toBe(false);
  });
  it('does not expose cached values when source fields are restricted', () => {
    expect(
      canReadJobPublication('vacancy', fields, {
        ...permissions,
        restrictedFields: { publicPortals: { canRead: false } },
      }),
    ).toBe(false);
  });
  it('holds until metadata and permissions are available', () => {
    expect(canReadJobPublication('vacancy', [], permissions)).toBe(false);
    expect(canReadJobPublication('vacancy', fields, undefined)).toBe(false);
    expect(
      canReadJobPublication('vacancy', fields, {
        ...permissions,
        canReadObjectRecords: false,
      }),
    ).toBe(false);
  });
});
