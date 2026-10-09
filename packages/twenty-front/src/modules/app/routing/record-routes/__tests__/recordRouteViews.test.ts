import { getRecordRouteDefinitions } from '@/app/routing/record-routes/recordRouteDefinitions';
import {
  getRecordRouteMatch,
  getRecordRouteTabId,
  getRecordRouteTabLocation,
} from '@/app/routing/record-routes/recordRouteViews';
import {
  getRecordContextRouteDefinitions,
  getRecordContextRouteMatch,
} from '@/app/routing/record-routes/recordContextRoutes';

const historyTab = '11111111-1111-4111-8111-111111111111';
const notesTab = '22222222-2222-4222-8222-222222222222';
const setDefinitions = (value: unknown) => {
  (
    window as Window & { __TWENTY_RECORD_ROUTES__?: unknown }
  ).__TWENTY_RECORD_ROUTES__ = value;
};
const definition = {
  path: '/tickets',
  aliases: ['/legacy-tickets'],
  objectNameSingular: 'ticket',
  objectNamePlural: 'tickets',
  recordIdentifierField: 'ticketNumber',
  views: { history: historyTab, notes: notesTab },
};

describe('configured native record views', () => {
  beforeEach(() => setDefinitions([definition]));
  afterEach(() => setDefinitions(undefined));

  it('selects only configured native tab identities from exact record views', () => {
    expect(getRecordRouteTabId('/tickets/1/history/')).toBe(historyTab);
    expect(getRecordRouteTabId('/legacy-tickets/1/notes')).toBe(notesTab);
    expect(getRecordRouteTabId('/tickets/1')).toBeUndefined();
    expect(getRecordRouteMatch('/tickets/1/unknown')).toBeNull();
    expect(getRecordRouteMatch('/tickets/1/history/extra')).toBeNull();
  });

  it('switches named views without losing record identity and removes stale view paths for unmapped tabs', () => {
    expect(
      getRecordRouteTabLocation('/legacy-tickets/1/history', notesTab),
    ).toEqual({ pathname: '/tickets/1/notes', hash: '' });
    expect(
      getRecordRouteTabLocation('/tickets/1/history', 'other-tab'),
    ).toEqual({ pathname: '/tickets/1', hash: '#other-tab' });
    expect(getRecordRouteTabLocation('/native-page', historyTab)).toEqual({
      hash: `#${historyTab}`,
    });
  });

  it.each([
    null,
    [],
    { history: 'not-a-uuid' },
    { 'bad/view': historyTab },
    { history: historyTab, notes: historyTab },
  ])('rejects malformed or ambiguous native view mappings: %p', (views) => {
    setDefinitions([{ ...definition, views }]);
    expect(getRecordRouteDefinitions()).toEqual([]);
  });
});

describe('named relationship record tabs', () => {
  const setContext = (
    views: unknown = { screening: historyTab, notes: notesTab },
  ) => {
    (
      window as Window & { __TWENTY_RECORD_CONTEXT_ROUTES__?: unknown }
    ).__TWENTY_RECORD_CONTEXT_ROUTES__ = [
      {
        path: '/projects/:projectNumber/contacts/:contactNumber',
        objectNameSingular: 'participation',
        objectNamePlural: 'participations',
        relations: [
          {
            parameter: 'projectNumber',
            objectNameSingular: 'project',
            field: 'project',
          },
          {
            parameter: 'contactNumber',
            objectNameSingular: 'contact',
            field: 'contact',
          },
        ],
        views,
      },
    ];
  };
  beforeEach(() => setContext());
  afterEach(() => {
    (
      window as Window & { __TWENTY_RECORD_CONTEXT_ROUTES__?: unknown }
    ).__TWENTY_RECORD_CONTEXT_ROUTES__ = undefined;
  });
  it('resolves named relationship tabs and retains the base identity for API cache lookup', () => {
    expect(getRecordRouteTabId('/projects/1/contacts/367/screening/')).toBe(
      historyTab,
    );
    expect(
      getRecordContextRouteMatch('/projects/1/contacts/367/screening')?.path,
    ).toBe('/projects/1/contacts/367');
    expect(
      getRecordRouteTabLocation('/projects/1/contacts/367/screening', notesTab),
    ).toEqual({ pathname: '/projects/1/contacts/367/notes', hash: '' });
    expect(
      getRecordContextRouteMatch('/projects/1/contacts/367/unknown'),
    ).toBeNull();
    expect(
      getRecordContextRouteMatch('/projects/1/contacts/367/screening/extra'),
    ).toBeNull();
  });
  it.each([
    null,
    [],
    { screening: 'invalid' },
    { 'bad/path': historyTab },
    { screening: historyTab, notes: historyTab },
  ])('rejects malformed or ambiguous tab mappings: %p', (views) => {
    setContext(views);
    expect(getRecordContextRouteDefinitions()).toEqual([]);
  });
});
