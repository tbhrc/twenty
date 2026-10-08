import { ApplicationRegistrationVariableService } from './application-registration-variable.service';

describe('ApplicationRegistrationVariableService schema preservation', () => {
  const createService = (variables: { id: string; key: string; encryptedValue: string }[]) => {
    const repository = {
      find: jest.fn().mockResolvedValue(variables),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((value) => value),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const encryption = {
      decryptVersionedOrThrow: jest.fn((value: string) => value),
      encryptVersioned: jest.fn((value: string) => value),
    };
    const service = new ApplicationRegistrationVariableService(
      repository as never,
      {} as never,
      {} as never,
      encryption as never,
    );
    return { service, repository };
  };

  it.each([{}, { MARKETING_INQUIRY_SOURCE_KEY: { isSecret: true } }])(
    'rejects a manifest that omits a configured integration before any mutation',
    async (manifest) => {
      const { service, repository } = createService([
        { id: 'fd0', key: 'FD0_MCP_TOKEN', encryptedValue: 'fixture-credential' },
      ]);
      await expect(service.syncVariableSchemas('registration', manifest)).rejects.toThrow(
        'Manifest omits configured server variables: FD0_MCP_TOKEN',
      );
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
    },
  );

  it('preserves configured values when their declarations are retained', async () => {
    const { service, repository } = createService([
      { id: 'fd0', key: 'FD0_MCP_TOKEN', encryptedValue: 'fixture-credential' },
    ]);
    await service.syncVariableSchemas('registration', { FD0_MCP_TOKEN: { isSecret: true } });
    expect(repository.update).toHaveBeenCalledWith('fd0', expect.not.objectContaining({
      encryptedValue: expect.anything(),
    }));
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('permits removal after an existing variable has been explicitly reset', async () => {
    const { service, repository } = createService([
      { id: 'fd0', key: 'FD0_MCP_TOKEN', encryptedValue: '' },
    ]);
    await service.syncVariableSchemas('registration', {});
    expect(repository.delete).toHaveBeenCalledWith({ applicationRegistrationId: 'registration' });
  });
});
