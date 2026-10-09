import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SendEmailOutput')
export class SendEmailOutputDTO {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => String, { nullable: true })
  messageThreadId?: string;

  @Field(() => String, { nullable: true })
  providerMessageId?: string;

  @Field(() => String, { nullable: true })
  internetMessageId?: string;
}
