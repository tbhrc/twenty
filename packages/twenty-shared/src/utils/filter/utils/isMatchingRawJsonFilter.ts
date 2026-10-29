import { type RawJsonFilter } from '@/types';
import { convertLikePatternToRegexOrThrow } from '@/utils/filter/utils/convertLikePatternToRegexOrThrow';

export const isMatchingRawJsonFilter = ({
  rawJsonFilter,
  value,
}: {
  rawJsonFilter: RawJsonFilter;
  value: unknown;
}) => {
  switch (true) {
    case rawJsonFilter.like !== undefined: {
      const regexCaseSensitive = convertLikePatternToRegexOrThrow({
        pattern: rawJsonFilter.like,
      });

      const stringValue = JSON.stringify(value, null, 1);

      return regexCaseSensitive.test(stringValue);
    }
    case rawJsonFilter.ilike !== undefined: {
      const regexCaseInsensitive = convertLikePatternToRegexOrThrow({
        pattern: rawJsonFilter.ilike,
        isCaseInsensitive: true,
      });

      return regexCaseInsensitive.test(JSON.stringify(value, null, 1));
    }
    case rawJsonFilter.is !== undefined: {
      if (rawJsonFilter.is === 'NULL') {
        return value === null;
      } else {
        return value !== null;
      }
    }
    default: {
      throw new Error(
        `Unexpected value for string filter : ${JSON.stringify(rawJsonFilter)}`,
      );
    }
  }
};
