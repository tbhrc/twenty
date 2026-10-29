import { FieldMetadataType } from 'twenty-shared/types';

import { computeWhereConditionParts } from 'src/engine/api/graphql/graphql-query-runner/utils/compute-where-condition-parts';
import { RawJsonFilterType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/input/raw-json-filter.input-type';

describe('RAW_JSON pattern filters', () => {
  it('exposes both pattern operators without removing the null filter', () => {
    expect(Object.keys(RawJsonFilterType.getFields())).toEqual([
      'is',
      'like',
      'ilike',
    ]);
  });

  it.each(['like', 'ilike'] as const)(
    'binds %s patterns without changing literal escapes or interpolating SQL',
    (operator) => {
      const pattern = String.raw`%a\_b\%c' OR true --%`;
      const result = computeWhereConditionParts({
        operator,
        objectNameSingular: 'person',
        key: 'emailsAdditionalEmails',
        value: pattern,
        fieldMetadataType: FieldMetadataType.RAW_JSON,
      });

      expect(result.sql).toMatch(
        new RegExp(
          `^"person"\\."emailsAdditionalEmails"::text ${operator.toUpperCase()} :emailsAdditionalEmails[a-f0-9]+$`,
        ),
      );
      expect(Object.values(result.params)).toEqual([pattern]);
      expect(result.sql).not.toContain(pattern);
    },
  );
});
