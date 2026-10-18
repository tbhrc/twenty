import { Field, InputType } from '@nestjs/graphql';

import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

@InputType('RegisterAppMessageSourceInput')
export class RegisterAppMessageSourceInput {
  @Field()
  @IsString()
  @Matches(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/)
  @MaxLength(100)
  sourceIdentifier: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  handle: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @Field()
  @IsIn(['user', 'workspace'])
  visibility: 'user' | 'workspace';
}
