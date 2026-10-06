jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));
jest.mock(
  'src/modules/match-participant/participant-target-reconciliation.service',
  () => ({ ParticipantTargetReconciliationService: class {} }),
);
jest.mock('src/engine/twenty-orm/utils/build-system-auth-context.util', () => ({
  buildSystemAuthContext: () => ({}),
}));
import { MatchParticipantService } from 'src/modules/match-participant/match-participant.service';

describe('native participant rematching', () => {
  const setup = (
    personId: string | null,
    memberId: string | null,
    people: any[] = [],
  ) => {
    const participant = {
      id: 'participant',
      messageId: 'message',
      handle: 'alias@example.com',
      personId,
      workspaceMemberId: memberId,
    };
    const participantRepository = {
      find: jest.fn().mockResolvedValue([participant]),
      updateMany: jest.fn().mockResolvedValue(undefined),
    };
    const query: any = { getMany: jest.fn().mockResolvedValue(people) };
    for (const method of [
      'where',
      'orWhere',
      'andWhere',
      'withDeleted',
      'orderBy',
    ])
      query[method] = () => query;
    const repositories: any = {
      messageParticipant: participantRepository,
      person: { createQueryBuilder: () => query },
      workspaceMember: { find: jest.fn().mockResolvedValue([]) },
    };
    const transaction = { getRepository: (name: string) => repositories[name] };
    const orm: any = {
      getRepository: transaction.getRepository,
      executeInWorkspaceContext: (callback: any) => callback(),
      runInWorkspaceTransaction: (callback: any) => callback(transaction),
    };
    const targets: any = { reconcileParticipantTargets: jest.fn() };
    return {
      service: new MatchParticipantService(orm, targets),
      participantRepository,
      targets,
    };
  };
  it('persists removal of a former Person email and reconciles its thread', async () => {
    const { service, participantRepository, targets } = setup(
      'former-person',
      null,
    );
    await service.matchParticipantsForPeople({
      participantMatching: { personIds: ['former-person'], personEmails: [] },
      objectMetadataName: 'messageParticipant',
      workspaceId: 'workspace',
    });
    expect(participantRepository.updateMany).toHaveBeenCalledWith([
      {
        criteria: 'participant',
        partialEntity: { personId: null, workspaceMemberId: null },
      },
    ]);
    expect(targets.reconcileParticipantTargets).toHaveBeenCalledTimes(1);
  });
  it('links existing history when a new Person adds an alias', async () => {
    const { service, participantRepository } = setup(null, null, [
      {
        id: 'new-person',
        emails: {
          primaryEmail: 'main@example.com',
          additionalEmails: ['alias@example.com'],
        },
      },
    ]);
    await service.matchParticipantsForPeople({
      participantMatching: {
        personIds: [],
        personEmails: ['alias@example.com'],
      },
      objectMetadataName: 'messageParticipant',
      workspaceId: 'workspace',
    });
    expect(participantRepository.updateMany).toHaveBeenCalledWith([
      {
        criteria: 'participant',
        partialEntity: { personId: 'new-person', workspaceMemberId: null },
      },
    ]);
  });
  it('persists removal of a former workspace member email', async () => {
    const { service, participantRepository, targets } = setup(
      'person',
      'former-member',
    );
    await service.matchParticipantsForWorkspaceMembers({
      participantMatching: { workspaceMemberIds: ['former-member'] },
      objectMetadataName: 'messageParticipant',
      workspaceId: 'workspace',
    });
    expect(participantRepository.updateMany).toHaveBeenCalledWith([
      {
        criteria: 'participant',
        partialEntity: { personId: 'person', workspaceMemberId: null },
      },
    ]);
    expect(targets.reconcileParticipantTargets).not.toHaveBeenCalled();
  });
});
