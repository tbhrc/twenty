import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { WorkspaceRouteUnavailable } from '@/app/routing/components/WorkspaceRouteUnavailable';
import { RecordIndexSkeletonLoader } from '@/object-record/record-index/components/RecordIndexSkeletonLoader';

import {
  getRecordContextRouteDefinitions,
  type RecordContextRouteDefinition,
} from './recordContextRoutes';
import {
  getRecordRouteGeneration,
  isRecordContextRouteReadable,
  resolveRecordContextRoute,
} from './recordRouteCache';
import { parseRecordRouteIdentifier } from './recordRouteDefinitions';
import { type RecordContextResult } from './resolveNativeRecordContext';
import { useRecordRouteVersion } from './router';

export const RecordContextRouteGate = ({
  definition: configuredDefinition,
  children,
}: {
  definition?: RecordContextRouteDefinition;
  children: ReactNode;
}) => {
  useRecordRouteVersion();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const definition = useMemo(
    () =>
      configuredDefinition ??
      getRecordContextRouteDefinitions().find(
        (item) => item.objectNameSingular === params.objectNameSingular,
      ),
    [configuredDefinition, params.objectNameSingular],
  );
  const generation = getRecordRouteGeneration();
  // Optional public endpoint fields must not narrow ordinary UUID page access.
  // The native page retains its own record permissions; context URLs still fail closed.
  const retainNativePermissions =
    !configuredDefinition &&
    definition &&
    !isRecordContextRouteReadable(definition.objectNameSingular);
  const targetKey = configuredDefinition
    ? JSON.stringify(
        definition?.relations.map((relation) => [
          relation.parameter,
          params[relation.parameter],
        ]),
      )
    : params.objectRecordId;
  const [resolved, setResolved] = useState<{
    generation: number;
    targetKey: string | undefined;
    result: RecordContextResult;
  } | null>(null);
  useEffect(() => {
    if (!definition || retainNativePermissions) return;
    let cancelled = false;
    const resolve = async () => {
      if (configuredDefinition) {
        const identifiers: Record<string, number> = {};
        for (const relation of definition.relations) {
          const number = parseRecordRouteIdentifier(params[relation.parameter]);
          if (number === null) return { status: 'missing' } as const;
          identifiers[relation.parameter] = number;
        }
        return resolveRecordContextRoute(definition, { identifiers });
      }
      return params.objectRecordId
        ? resolveRecordContextRoute(definition, {
            recordId: params.objectRecordId,
          })
        : ({ status: 'missing' } as const);
    };
    void resolve().then((result) => {
      if (!cancelled) setResolved({ generation, targetKey, result });
    });
    return () => {
      cancelled = true;
    };
    // targetKey contains every endpoint token and changes independently of
    // query/tab updates. Old reads cannot render under a newer context.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [
    definition,
    configuredDefinition,
    generation,
    targetKey,
    retainNativePermissions,
  ]);
  const result =
    resolved?.generation === generation && resolved.targetKey === targetKey
      ? resolved.result
      : null;
  useEffect(() => {
    if (
      result?.status === 'ready' &&
      location.pathname.replace(/\/$/, '') !== result.path
    ) {
      navigate(
        { pathname: result.path, search: location.search, hash: location.hash },
        { replace: true, state: location.state },
      );
    }
  }, [
    result,
    navigate,
    location.pathname,
    location.search,
    location.hash,
    location.state,
  ]);
  if (!definition || retainNativePermissions) return children;
  if (!result) return <RecordIndexSkeletonLoader />;
  if (result.status !== 'ready') return <WorkspaceRouteUnavailable />;
  return children;
};
