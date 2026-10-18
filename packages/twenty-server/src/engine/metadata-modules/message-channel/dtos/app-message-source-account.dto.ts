import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('AppMessageSourceAccount')
export class AppMessageSourceAccountDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field()
  sourceIdentifier: string;

  @Field()
  handle: string;

  @Field(() => String, { nullable: true })
  displayName: string | null;

  @Field()
  visibility: 'user' | 'workspace';

  @Field(() => UUIDScalarType)
  userWorkspaceId: string;

  @Field(() => UUIDScalarType)
  applicationId: string;
}
