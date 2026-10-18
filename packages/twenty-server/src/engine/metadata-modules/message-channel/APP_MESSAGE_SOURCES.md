# Tokenless App message sources

`registerAppMessageSource` registers a native storage binding for an external
message source whose authentication remains outside Twenty. It does not perform
OAuth, create a credential, authenticate the external provider or dispatch a
message. The existing App channel and ingestion APIs remain the storage owner.

The mutation requires an APPLICATION_ACCESS context with an original user. The
service checks existing APPLICATIONS administration permission in the original
user/application intersection. Background callers and ordinary message-ingest
permissions cannot register sources. No new permission flag is introduced.
Registration has its own `ApplicationMessageSourceResolver`; the existing App
channel resolver and its queries/mutations do not acquire new behavior.

Input contains only `sourceIdentifier`, provider `handle`, optional `displayName`
and explicit `visibility: user | workspace`. Application, workspace and owner are
derived from auth. The deterministic workspace/application/handle primary key
closes concurrent first-registration races. An exact replay returns the existing
account without a write. Changed source, owner, visibility, name, archived state,
OAuth provider or credentials are rejected rather than overwritten.

The APP ConnectedAccount has no access token, refresh token, connection provider,
OIDC claims or connection parameters. Its single scope marker identifies this
storage source; it is not a provider authorization grant. Native App OAuth token
APIs intentionally do not return this providerless account. Use the returned
account ID with `createAppMessageChannel`, then the existing `ingestAppMessages`
path. Keep the actual external authentication and finite message operations with
their source owner.

Choose channel visibility explicitly. METADATA preserves native owner body
visibility without publishing content to every workspace viewer; the original
user and account visibility must be retained when reading or ingesting. Do not
replace a denied original-user read with a memberless application request.

This is a service/resolver extension; it adds no database entity/column or new
message store. Deploy and verify native schema plus original-caller permissions
before provisioning a source. Roll back ingestion by disabling its channel and
source adapter while preserving populated Message/Thread records. Deleting a
source account/channel may trigger native cleanup and is not an appropriate
rollback after messages have been ingested.
