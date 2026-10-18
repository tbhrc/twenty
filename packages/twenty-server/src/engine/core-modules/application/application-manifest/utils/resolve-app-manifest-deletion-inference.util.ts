import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { type InferDeletionFromMissingEntities } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/types/infer-deletion-from-missing-entities.type';

export const resolveAppManifestDeletionInference = ({
  inferDeletionFromMissingEntities,
  inferRolePermissionFlagDeletion = false,
}: {
  inferDeletionFromMissingEntities: boolean;
  inferRolePermissionFlagDeletion?: boolean;
}): InferDeletionFromMissingEntities => {
  if (inferRolePermissionFlagDeletion) {
    if (inferDeletionFromMissingEntities !== false) {
      throw new ApplicationException(
        'Role permission flag deletion requires general deletion inference to be explicitly disabled',
        ApplicationExceptionCode.INVALID_INPUT,
      );
    }

    // Partial exports omit executable metadata. Only the existing App-owned
    // role permission flags participate in this explicitly requested inverse.
    return { rolePermissionFlag: true };
  }

  return inferDeletionFromMissingEntities ? true : undefined;
};
