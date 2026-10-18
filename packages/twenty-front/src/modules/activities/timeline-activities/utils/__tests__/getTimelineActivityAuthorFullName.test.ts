import { type TimelineActivity } from '@/activities/timeline-activities/types/TimelineActivity';
import { getTimelineActivityAuthorFullName } from '@/activities/timeline-activities/utils/getTimelineActivityAuthorFullName';
import { type CurrentWorkspaceMember } from '@/auth/states/currentWorkspaceMemberState';

describe('getTimelineActivityAuthorFullName', () => {
  it('names the actual author even when they are the current member', () => {
    const event = {
      workspaceMember: {
        id: '123',
        name: {
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    };
    const currentWorkspaceMember = {
      id: '123',
    };

    const result = getTimelineActivityAuthorFullName(
      event as TimelineActivity,
      currentWorkspaceMember as CurrentWorkspaceMember,
    );

    expect(result).toBe('John Doe');
  });

  it('should return the full name of the workspace member if they are not the current workspace member', () => {
    const event = {
      workspaceMember: {
        id: '456',
        name: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
      },
    };
    const currentWorkspaceMember = {
      id: '123',
    };

    const result = getTimelineActivityAuthorFullName(
      event as TimelineActivity,
      currentWorkspaceMember as CurrentWorkspaceMember,
    );

    expect(result).toBe('Jane Smith');
  });

  it('uses a neutral system label when attribution is unknown', () => {
    const event = {};
    const currentWorkspaceMember = {
      id: '123',
    };

    const result = getTimelineActivityAuthorFullName(
      event as TimelineActivity,
      currentWorkspaceMember as CurrentWorkspaceMember,
    );

    expect(result).toBe('System');
  });

  it('preserves an identified executor alongside the human authority', () => {
    const event = {
      workspaceMember: {
        id: '123',
        name: { firstName: 'David', lastName: 'Potgieter' },
      },
      properties: {
        actor: {
          name: 'David Potgieter',
          source: 'AGENT',
          context: { executingClient: 'Codex', runId: 'run-1' },
        },
      },
    };
    expect(
      getTimelineActivityAuthorFullName(
        event as unknown as TimelineActivity,
        {} as CurrentWorkspaceMember,
      ),
    ).toBe('David Potgieter (via Codex)');
  });

  it('retains named API and import provenance without inventing an agent', () => {
    const event = {
      workspaceMember: {
        id: '123',
        name: { firstName: 'David', lastName: 'Potgieter' },
      },
      properties: {
        actor: { name: 'Google Contacts source import', source: 'IMPORT' },
      },
    };
    expect(
      getTimelineActivityAuthorFullName(
        event as unknown as TimelineActivity,
        {} as CurrentWorkspaceMember,
      ),
    ).toBe('David Potgieter (via Google Contacts source import)');
  });

  it('shows a known machine actor without assigning it to the viewer', () => {
    const event = {
      properties: { actor: { name: 'Ingestion worker', source: 'API' } },
    };
    expect(
      getTimelineActivityAuthorFullName(
        event as unknown as TimelineActivity,
        { id: 'other-user' } as CurrentWorkspaceMember,
      ),
    ).toBe('Ingestion worker');
  });
});
