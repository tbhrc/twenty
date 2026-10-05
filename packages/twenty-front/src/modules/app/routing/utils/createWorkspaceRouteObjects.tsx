import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { AppPath, SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';

import { LazyRoute } from '@/app/components/LazyRoute';
import {
  createSettingsRouteObjects,
  SettingsRouteOutlet,
} from '@/app/components/SettingsRoutes';
import { type WorkspaceRouteObject } from '@/app/routing/types/WorkspaceRouteObject';
import { RecordIndexSkeletonLoader } from '@/object-record/record-index/components/RecordIndexSkeletonLoader';
import {
  getRecordRouteDefinitions,
  getRecordRoutePaths,
} from '@/app/routing/record-routes/recordRouteDefinitions';
import { RecordRouteGate } from '@/app/routing/record-routes/RecordRouteGate';
import { RecordContextRouteGate } from '@/app/routing/record-routes/RecordContextRouteGate';
import { getRecordContextRouteDefinitions } from '@/app/routing/record-routes/recordContextRoutes';

const WorkflowCoreIndexPage = lazy(() =>
  import('~/pages/object-core/WorkflowCoreIndexPage').then((module) => ({
    default: module.WorkflowCoreIndexPage,
  })),
);

const RecordIndexPage = lazy(() =>
  import('~/pages/object-record/RecordIndexPage').then((module) => ({
    default: module.RecordIndexPage,
  })),
);

const RecordShowPage = lazy(() =>
  import('~/pages/object-record/RecordShowPage').then((module) => ({
    default: module.RecordShowPage,
  })),
);

const StandalonePageLayoutPage = lazy(() =>
  import('~/pages/page-layout/StandalonePageLayoutPage').then((module) => ({
    default: module.StandalonePageLayoutPage,
  })),
);

const AiChatPage = lazy(() =>
  import('~/pages/ai-chat/AiChatPage').then((module) => ({
    default: module.AiChatPage,
  })),
);

const MobileHomePage = lazy(() =>
  import('~/pages/mobile-home/MobileHomePage').then((module) => ({
    default: module.MobileHomePage,
  })),
);

const NotFound = lazy(() =>
  import('~/pages/not-found/NotFound').then((module) => ({
    default: module.NotFound,
  })),
);

type CreateWorkspaceRouteObjectsArgs = {
  isAdminPageEnabled?: boolean;
  isWorkflowCoreIndexPageEnabled?: boolean;
};

const MAIN_AND_SIDE_PANEL = ['main', 'side-panel'] as const;
const SETTINGS_ROOT_PATH = AppPath.SettingsCatchAll.replace('/*', '');

export const createWorkspaceRouteObjects = ({
  isAdminPageEnabled,
  isWorkflowCoreIndexPageEnabled,
}: CreateWorkspaceRouteObjectsArgs): WorkspaceRouteObject[] => {
  const settingsRouteObjects = createSettingsRouteObjects({
    isAdminPageEnabled,
  });

  return [
    ...getRecordContextRouteDefinitions().flatMap((definition) =>
      [undefined, ...Object.keys(definition.views ?? {})].map((view) => ({
        path: `${definition.path}${view ? `/${view}` : ''}`,
        element: (
          <RecordContextRouteGate definition={definition}>
            <LazyRoute>
              <RecordShowPage />
            </LazyRoute>
          </RecordContextRouteGate>
        ),
        handle: { workspaceSurfaces: MAIN_AND_SIDE_PANEL },
      })),
    ),
    ...getRecordRouteDefinitions().flatMap(
      (definition): WorkspaceRouteObject[] =>
        getRecordRoutePaths(definition).flatMap((path) => [
          ...(definition.indexRoute === false
            ? []
            : [
                {
                  path,
                  element: (
                    <LazyRoute fallback={<RecordIndexSkeletonLoader />}>
                      <RecordIndexPage />
                    </LazyRoute>
                  ),
                  handle: {
                    workspaceSurfaces: MAIN_AND_SIDE_PANEL,
                    isLocationExpandableFromSidePanel: true,
                  },
                },
              ]),
          ...[undefined, ...Object.keys(definition.views ?? {})].map(
            (view) => ({
              path: `${path}/:recordIdentifier${view ? `/${view}` : ''}`,
              element: (
                <RecordRouteGate definition={definition}>
                  <LazyRoute>
                    <RecordShowPage />
                  </LazyRoute>
                </RecordRouteGate>
              ),
              handle: { workspaceSurfaces: MAIN_AND_SIDE_PANEL },
            }),
          ),
        ]),
    ),
    ...(isWorkflowCoreIndexPageEnabled
      ? [
          {
            path: AppPath.WorkflowCoreIndexPage,
            element: (
              <LazyRoute>
                <WorkflowCoreIndexPage />
              </LazyRoute>
            ),
            handle: {
              workspaceSurfaces: MAIN_AND_SIDE_PANEL,
              isLocationExpandableFromSidePanel: true,
            },
          } satisfies WorkspaceRouteObject,
        ]
      : []),
    {
      path: AppPath.Index,
      element: <RecordIndexSkeletonLoader />,
    },
    {
      path: AppPath.RecordIndexPage,
      element: (
        <LazyRoute fallback={<RecordIndexSkeletonLoader />}>
          <RecordIndexPage />
        </LazyRoute>
      ),
      handle: {
        workspaceSurfaces: MAIN_AND_SIDE_PANEL,
        isLocationExpandableFromSidePanel: true,
      },
    },
    {
      path: AppPath.RecordShowPage,
      element: (
        <RecordContextRouteGate>
          <RecordRouteGate>
            <LazyRoute>
              <RecordShowPage />
            </LazyRoute>
          </RecordRouteGate>
        </RecordContextRouteGate>
      ),
      handle: { workspaceSurfaces: MAIN_AND_SIDE_PANEL },
    },
    {
      path: AppPath.PageLayoutPage,
      element: (
        <LazyRoute>
          <StandalonePageLayoutPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.AiChat,
      element: (
        <LazyRoute>
          <AiChatPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.Home,
      element: (
        <LazyRoute>
          <MobileHomePage />
        </LazyRoute>
      ),
    },
    {
      path: SETTINGS_ROOT_PATH,
      element: <SettingsRouteOutlet />,
      children: settingsRouteObjects,
    },
    {
      path: AppPath.Dpa,
      element: <Navigate to={getSettingsPath(SettingsPath.LegalDpa)} replace />,
    },
    {
      path: AppPath.NotFoundWildcard,
      element: (
        <LazyRoute>
          <NotFound />
        </LazyRoute>
      ),
    },
  ];
};
