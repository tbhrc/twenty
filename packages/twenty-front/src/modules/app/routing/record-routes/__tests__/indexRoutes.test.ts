import { matchRoutes } from 'react-router-dom';
import {
  getIndexRouteDefinitions,
  getIndexRouteForPath,
  getRecordRouteDefinitions,
} from '../recordRouteDefinitions';
import { getFriendlyRecordPath } from '../getAppPath';
import { getFriendlyRouteParameters, getLogicalRecordPath } from '../router';
import { getPageRouteDefinitions } from '../pageRouteDefinitions';
import { createWorkspaceRouteObjects } from '@/app/routing/utils/createWorkspaceRouteObjects';

const config = window as Window & {
  __TWENTY_RECORD_ROUTES__?: unknown;
  __TWENTY_PAGE_ROUTES__?: unknown;
};
const definition = {
  path: '/tickets/activity',
  indexOnly: true,
  objectNameSingular: 'activity',
  objectNamePlural: 'activities',
};
const record = {
  path: '/tickets',
  objectNameSingular: 'ticket',
  objectNamePlural: 'tickets',
  recordIdentifierField: 'ticketNumber',
};
beforeEach(() => {
  config.__TWENTY_RECORD_ROUTES__ = [record, definition];
});
afterEach(() => {
  delete config.__TWENTY_RECORD_ROUTES__;
  delete config.__TWENTY_PAGE_ROUTES__;
});

it('collection-only aliases preserve native saved view selection, search and hash', () => {
  expect(
    getFriendlyRecordPath('/objects/activities?viewId=saved&filter=x#anchor'),
  ).toBe('/tickets/activity?viewId=saved&filter=x#anchor');
  expect(
    getLogicalRecordPath('/tickets/activity?viewId=saved&filter=x#anchor'),
  ).toBe('/objects/activities?viewId=saved&filter=x#anchor');
  expect(getFriendlyRouteParameters('/tickets/activity/')).toEqual({
    objectNamePlural: 'activities',
    objectNameSingular: undefined,
    objectRecordId: undefined,
  });
});

it('static collection paths win against the parent record identifier without inventing record identity', () => {
  const routes = createWorkspaceRouteObjects({});
  expect(matchRoutes(routes, '/tickets/activity')?.at(-1)?.route.path).toBe(
    '/tickets/activity',
  );
  expect(matchRoutes(routes, '/tickets/42')?.at(-1)?.route.path).toBe(
    '/tickets/:recordIdentifier',
  );
  expect(
    routes.some((r) => r.path === '/tickets/activity/:recordIdentifier'),
  ).toBe(false);
  expect(getRecordRouteDefinitions()).toEqual([record]);
  expect(getIndexRouteForPath('/tickets/activity/extra')).toBeUndefined();
  expect(getFriendlyRouteParameters('/tickets/activity/42')).toBeNull();
});

it('does not generate a numeric record URL when the source lacks a public number', () => {
  expect(
    getFriendlyRecordPath(
      '/object/activity/11111111-1111-4111-8111-111111111111',
    ),
  ).toBe('/object/activity/11111111-1111-4111-8111-111111111111');
  expect(getFriendlyRecordPath('/objects/unregistered?viewId=saved')).toBe(
    '/objects/unregistered?viewId=saved',
  );
});

it('rejects reserved, malformed, duplicated and ambiguous route configuration', () => {
  config.__TWENTY_RECORD_ROUTES__ = [
    record,
    { ...definition, path: '/settings/activity' },
    { ...definition, path: '//outside' },
    { ...definition, path: '/tickets/:recordIdentifier' },
    { ...definition, path: '/tickets' },
    { ...definition, recordIdentifierField: 'number' },
    { ...definition, views: {} },
    definition,
    { ...definition, path: '/other' },
    { ...definition, objectNameSingular: 'other', objectNamePlural: 'others' },
  ];
  expect(getIndexRouteDefinitions()).toEqual([definition]);
});

it('keeps named-page registration disjoint from configured native collections', () => {
  config.__TWENTY_PAGE_ROUTES__ = [
    {
      path: '/tickets/activity',
      pageLayoutId: '11111111-1111-4111-8111-111111111111',
    },
  ];
  expect(getPageRouteDefinitions()).toEqual([]);
});

it('missing or invalid collection configuration leaves native routing usable', () => {
  for (const value of [undefined, {}, null]) {
    config.__TWENTY_RECORD_ROUTES__ = value;
    expect(getIndexRouteDefinitions()).toEqual([]);
    expect(getLogicalRecordPath('/objects/activities?viewId=saved')).toBe(
      '/objects/activities?viewId=saved',
    );
  }
});
