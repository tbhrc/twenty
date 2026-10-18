import { type TimelineActivity } from '@/activities/timeline-activities/types/TimelineActivity';
import { type CurrentWorkspaceMember } from '@/auth/states/currentWorkspaceMemberState';
import { isDefined, isPlainObject } from 'twenty-shared/utils';

export const getTimelineActivityAuthorFullName = (
  event: TimelineActivity,
  _currentWorkspaceMember: CurrentWorkspaceMember,
) => {
  const actor = event.properties?.actor;
  const actorName =
    isPlainObject(actor) && typeof actor.name === 'string'
      ? actor.name.trim()
      : '';
  const context =
    isPlainObject(actor) && isPlainObject(actor.context) ? actor.context : {};
  const executingClient =
    typeof context.executingClient === 'string'
      ? context.executingClient.trim()
      : '';

  if (isDefined(event.workspaceMember)) {
    const fullName =
      `${event.workspaceMember.name.firstName} ${event.workspaceMember.name.lastName}`.trim();
    const executor =
      executingClient || (actorName !== fullName ? actorName : '');

    return executor ? `${fullName} (via ${executor})` : fullName;
  }

  return executingClient || actorName || 'System';
};
