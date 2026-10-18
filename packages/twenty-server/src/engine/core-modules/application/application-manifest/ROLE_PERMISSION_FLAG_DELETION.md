# App-owned role permission flag cleanup

`syncApplication` accepts optional `inferRolePermissionFlagDeletion: true` only with explicit `inferDeletionFromMissingEntities: false`. Existing defaults, Boolean general-deletion behavior, APPLICATIONS settings guard, actual App/workspace registration ownership and serialized apply path are unchanged. The new request option is not authorization.

The migration builder receives its existing `{ rolePermissionFlag: true }` inference map. Omitted executable/configuration entities are preserved. The general-deletion Boolean passed to App reference synchronization stays false; default role and other reference semantics are unchanged. The source account registration permission intersection is untouched.

This explicitly infers removal of App-owned permission flags missing from the supplied role declarations. Preserve every intended role/flag and inspect the dry-run before apply; it is not a request to delete a named arbitrary entity. Another App/workspace's roles remain outside the existing owner scope/validators.

For a temporary grant, take the current native export, preserve installed server-variable schemas, and dry-run the no-delete grant. The inverse uses the original role declarations, general deletion false and narrow deletion true. Require one exact expected flag deletion and no unrelated actions. The original partial export with general deletion true is unsafe if it omits executable metadata.

Tests exercise legacy defaults/conflicts, actual App ownership denial, existing serialized apply, lower builder grant/inverse and preservation of all 118 omitted resources. A private captured native dry-run fixture can be supplied through `APP_MANIFEST_DELETION_PROOF` to verify that same lower builder against the exact installed metadata snapshot offline. This fixture is not committed and these tests perform no native/provider mutation. A live narrow zero-change plan remains an installation acceptance gate; a real post-grant inverse must be checked before revocation without a blind retry.
