import { type Request } from 'express';
import { GraphQLError, parse } from 'graphql';

import { DirectExecutionService } from 'src/engine/api/graphql/direct-execution/direct-execution.service';

// No database, credential, resolver factory or server is attached to this service.
describe('DirectExecutionService skipped mutations', () => {
  it.each([
    ['mutation { createPerson @skip(if: true) { id } }', {}],
    ['mutation { alias: createPerson @include(if: false) { id } }', {}],
    [
      'mutation($skip: Boolean! = true) { createPerson @skip(if: $skip) { id } }',
      {},
    ],
    [
      'mutation($include: Boolean!) { createPerson @include(if: $include) { id } }',
      { include: false },
    ],
    [
      'mutation { ...Root @skip(if: true) } fragment Root on Mutation { createPerson { id } }',
      {},
    ],
  ])(
    'returns empty data without resolving or touching metadata: %s',
    async (query, variables) => {
      const executeField = jest.fn(() => {
        throw new Error('Unexpected resolver invocation');
      });
      const getOrRecompute = jest.fn(() => {
        throw new Error('Unexpected metadata access');
      });
      const service = Object.assign(
        Object.create(DirectExecutionService.prototype),
        {
          executeField,
          workspaceCacheService: { getOrRecompute },
          checkRootResolverLimitsOrThrow: jest.fn(),
          formatError: (error: Error) =>
            new GraphQLError(error.message).toJSON(),
        },
      ) as DirectExecutionService;
      const request = {
        workspace: { id: 'synthetic-workspace' },
        body: { query, variables },
      } as unknown as Request;

      expect(
        await service.execute(request, parse(query as string), false, true),
      ).toEqual({ data: {} });
      expect(executeField).not.toHaveBeenCalled();
      expect(getOrRecompute).not.toHaveBeenCalled();
    },
  );
});
