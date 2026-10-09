import { useParams } from '@/app/routing/record-routes/router';
import { WorkspaceRouteUnavailable } from '@/app/routing/components/WorkspaceRouteUnavailable';
import { contextStoreCurrentObjectMetadataItemIdComponentState } from '@/context-store/states/contextStoreCurrentObjectMetadataItemIdComponentState';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { RecordIndexContainerGater } from '@/object-record/record-index/components/RecordIndexContainerGater';
import { isCoreWorkflowsIndexEnabled } from '@/object-core/workflows/utils/isCoreWorkflowsIndexEnabled';
import { isWorkspaceWorkflowVersionRouteHidden } from '@/object-core/workflows/utils/isWorkspaceWorkflowVersionRouteHidden';
import { RecordIndexSkeletonLoader } from '@/object-record/record-index/components/RecordIndexSkeletonLoader';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { PageContainer } from '@/ui/layout/page/components/PageContainer';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { metadataStoreState } from '@/metadata-store/states/metadataStoreState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { isUndefined } from '@sniptt/guards';
import { lazy, Suspense, useEffect } from 'react';
import { createPath, useLocation, useNavigate } from 'react-router-dom';
import { getFriendlyRecordPath } from '@/app/routing/record-routes/getAppPath';

import { FeatureFlagKey } from 'twenty-shared/types';

const WorkflowCoreIndexPage = lazy(() =>
  import('~/pages/object-core/WorkflowCoreIndexPage').then((module) => ({
    default: module.WorkflowCoreIndexPage,
  })),
);

export const RecordIndexPage = () => {
  const actualLocation = useLocation();
  const navigate = useNavigate();
  const currentPath = createPath(actualLocation);
  const canonicalPath = getFriendlyRecordPath(currentPath);
  useEffect(() => {
    if (canonicalPath !== currentPath)
      navigate(canonicalPath, { replace: true, state: actualLocation.state });
  }, [canonicalPath, currentPath, navigate, actualLocation.state]);
  const workspaceSurface = useWorkspaceSurface();
  const { objectNamePlural } = useParams<{ objectNamePlural: string }>();

  const contextStoreCurrentObjectMetadataItemId = useAtomComponentStateValue(
    contextStoreCurrentObjectMetadataItemIdComponentState,
  );

  const { objectMetadataItems } = useObjectMetadataItems();
  const metadataStore = useAtomFamilyStateValue(
    metadataStoreState,
    'objectMetadataItems',
  );

  const isWorkflowCoreIndexPageEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_WORKFLOW_CORE_INDEX_PAGE_ENABLED,
  );

  const routeObjectMetadataItem = objectMetadataItems.find(
    (objectMetadataItem) => objectMetadataItem.namePlural === objectNamePlural,
  );

  if (
    workspaceSurface.type === 'side-panel' &&
    metadataStore.status === 'empty'
  ) {
    return <RecordIndexSkeletonLoader />;
  }

  if (
    workspaceSurface.type === 'side-panel' &&
    !isUndefined(objectNamePlural) &&
    isUndefined(routeObjectMetadataItem)
  ) {
    return <WorkspaceRouteUnavailable />;
  }

  if (isUndefined(contextStoreCurrentObjectMetadataItemId)) {
    return <RecordIndexSkeletonLoader />;
  }

  const objectMetadataItem = objectMetadataItems.find(
    (objectMetadataItem) =>
      objectMetadataItem.id === contextStoreCurrentObjectMetadataItemId,
  );

  if (isUndefined(objectMetadataItem)) {
    return <RecordIndexSkeletonLoader />;
  }

  if (
    isWorkspaceWorkflowVersionRouteHidden({
      objectNameSingular: routeObjectMetadataItem?.nameSingular,
      isWorkflowCoreIndexPageEnabled,
    })
  ) {
    return <WorkspaceRouteUnavailable />;
  }

  if (
    isCoreWorkflowsIndexEnabled({
      objectNameSingular: objectMetadataItem.nameSingular,
      isWorkflowCoreIndexPageEnabled,
    })
  ) {
    return (
      <Suspense fallback={<RecordIndexSkeletonLoader />}>
        <WorkflowCoreIndexPage />
      </Suspense>
    );
  }

  if (workspaceSurface.type === 'side-panel') {
    return <RecordIndexContainerGater />;
  }

  return (
    <PageContainer>
      <RecordIndexContainerGater />
    </PageContainer>
  );
};
