import { parse } from 'graphql';

import { graphQLExtractTopLevelFields } from 'src/engine/api/graphql/direct-execution/utils/graphql-extract-top-level-fields.util';

describe('direct execution root directives', () => {
  const collect = (query: string, variables: Record<string, unknown> = {}) =>
    graphQLExtractTopLevelFields(parse(query), undefined, variables);

  it.each(['@skip(if: true)', '@include(if: false)'])(
    'never invokes a mutation for %s, including aliases',
    (directive) => {
      const resolver = jest.fn();
      const fields = collect(
        `mutation { alias: createPerson ${directive} { id } }`,
      );
      fields.forEach(resolver);
      expect(fields).toEqual([]);
      expect(resolver).not.toHaveBeenCalled();
    },
  );

  it.each(['@skip(if: false)', '@include(if: true)', ''])(
    'preserves ordinary execution for %s',
    (directive) => {
      const fields = collect(
        `mutation { alias: createPerson ${directive} { id } }`,
      );
      expect(fields.map((field) => field.alias?.value)).toEqual(['alias']);
    },
  );

  it('honors variables and defaults', () => {
    const query =
      'mutation($skip: Boolean! = true) { createPerson @skip(if: $skip) { id } }';
    expect(collect(query)).toEqual([]);
    expect(collect(query, { skip: true })).toEqual([]);
    expect(collect(query, { skip: false })).toHaveLength(1);
  });

  it.each([null, 'true', 1, undefined])(
    'rejects invalid condition %p before any root executes',
    (skip) => {
      const resolver = jest.fn();
      expect(() =>
        collect(
          'mutation($skip: Boolean!) { first: createPerson { id } second: createPerson @skip(if: $skip) { id } }',
          { skip },
        ).forEach(resolver),
      ).toThrow();
      expect(resolver).not.toHaveBeenCalled();
    },
  );

  it('honors directives on nested fragment spreads and inline fragments', () => {
    expect(
      collect(
        'mutation { ...Outer @include(if: false) } fragment Outer on Mutation { ...Inner } fragment Inner on Mutation { createPerson { id } }',
      ),
    ).toEqual([]);
    expect(
      collect(
        'mutation { ...Outer } fragment Outer on Mutation { ...Inner @skip(if: true) } fragment Inner on Mutation { createPerson { id } }',
      ),
    ).toEqual([]);
    expect(
      collect(
        'mutation { ... on Mutation @skip(if: true) { createPerson { id } } }',
      ),
    ).toEqual([]);
    expect(
      collect(
        'mutation { ...Outer } fragment Outer on Mutation { ...Inner } fragment Inner on Mutation { createPerson { id } }',
      ),
    ).toHaveLength(1);
  });

  it('keeps skipped fields visible to routing without execution variables', () => {
    expect(
      graphQLExtractTopLevelFields(
        parse('mutation { createPerson @skip(if: true) { id } }'),
        undefined,
      ),
    ).toHaveLength(1);
  });

  it('does not loop or duplicate a repeated fragment', () => {
    expect(
      collect(
        'mutation { ...A ...A } fragment A on Mutation { createPerson { id } ...A }',
      ),
    ).toHaveLength(1);
  });
});
