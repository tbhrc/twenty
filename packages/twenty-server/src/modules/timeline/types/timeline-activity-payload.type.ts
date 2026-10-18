import { type ObjectRecordBaseEvent } from 'twenty-shared/database-events';
import { type TimelineActivityTypeSnapshot } from 'twenty-shared/timeline';
import { type ActorMetadata } from 'twenty-shared/types';

export type TimelineActivityPayload = {
  happensAt: Date;
  properties: ObjectRecordBaseEvent['properties'] & { actor?: ActorMetadata };
  linkedObjectMetadataId?: string;
  linkedRecordId?: string;
  linkedRecordCachedName?: string;
  workspaceMemberId?: string;
  timelineActivityTypeId: string;
  timelineActivityTypeSnapshot: TimelineActivityTypeSnapshot;
  recordId: string;
  objectSingularName?: string;
};
