import { type FindOptionsWhere } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';

// SQL counterpart of isConnectedAccountUsableByCaller; keep the two in sync.
export const buildConnectedAccountUsableByCallerWhere = ({
  baseWhere,
  userWorkspaceId,
}: {
  baseWhere: FindOptionsWhere<ConnectedAccountEntity>;
  userWorkspaceId?: string;
}): FindOptionsWhere<ConnectedAccountEntity>[] => [
  { ...baseWhere, visibility: 'workspace' },
  // An undefined owner predicate can be omitted by TypeORM, exposing private accounts.
  ...(isDefined(userWorkspaceId) ? [{ ...baseWhere, userWorkspaceId }] : []),
];
