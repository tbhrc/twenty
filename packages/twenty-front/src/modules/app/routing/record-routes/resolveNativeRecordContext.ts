import { isValidUuid } from 'twenty-shared/utils';

import { type RecordContextRouteDefinition } from './recordContextRoutes';
import {
  parseRecordRouteIdentifier,
  type RecordRouteDefinition,
} from './recordRouteDefinitions';

export type RecordContextTarget =
  | { recordId: string }
  | { identifiers: Record<string, number> };
export type RecordContextResult =
  | { status: 'ready'; recordId: string; path: string }
  | { status: 'denied' | 'missing' | 'duplicate' | 'error' };
export type NativeContextRead = (
  objectNameSingular: string,
  fields: string[],
  filter: Record<string, unknown>,
) => Promise<Record<string, unknown>[]>;

export const resolveNativeRecordContext = async (
  definition: RecordContextRouteDefinition,
  target: RecordContextTarget,
  {
    endpoints,
    read,
  }: { endpoints: RecordRouteDefinition[]; read: NativeContextRead },
): Promise<RecordContextResult> => {
  const exactlyOne = (rows: Record<string, unknown>[]) => {
    if (rows.length !== 1)
      throw new Error(rows.length ? 'duplicate' : 'missing');
    if (typeof rows[0].id !== 'string' || !isValidUuid(rows[0].id))
      throw new Error('error');
    return rows[0];
  };
  try {
    const fields = [
      'id',
      ...definition.relations.map((relation) => `${relation.field}Id`),
    ];
    let native: Record<string, unknown> | undefined;
    if ('recordId' in target) {
      if (!isValidUuid(target.recordId)) return { status: 'missing' };
      native = exactlyOne(
        await read(definition.objectNameSingular, fields, {
          id: { eq: target.recordId },
        }),
      );
      if (native.id !== target.recordId) return { status: 'denied' };
    } else if (
      Object.keys(target.identifiers).length !== definition.relations.length
    )
      return { status: 'missing' };
    const filter: Record<string, unknown> = {};
    const identifiers: Record<string, number> = {};
    for (const relation of definition.relations) {
      const endpoint = endpoints.find(
        (item) => item.objectNameSingular === relation.objectNameSingular,
      );
      if (!endpoint) return { status: 'denied' };
      const number =
        'identifiers' in target
          ? parseRecordRouteIdentifier(target.identifiers[relation.parameter])
          : null;
      const id = native?.[`${relation.field}Id`];
      if (
        ('identifiers' in target && number === null) ||
        (native && (typeof id !== 'string' || !isValidUuid(id)))
      )
        return { status: 'missing' };
      const row = exactlyOne(
        await read(
          endpoint.objectNameSingular,
          ['id', endpoint.recordIdentifierField],
          native
            ? { id: { eq: id } }
            : { [endpoint.recordIdentifierField]: { eq: number } },
        ),
      );
      const resolvedNumber = parseRecordRouteIdentifier(
        row[endpoint.recordIdentifierField],
      );
      if (
        resolvedNumber === null ||
        (native && row.id !== id) ||
        (!native && resolvedNumber !== number)
      )
        return { status: 'denied' };
      identifiers[relation.parameter] = resolvedNumber;
      filter[`${relation.field}Id`] = { eq: row.id };
    }
    // Even a UUID deep link must prove that the current relationship is unique.
    const current = exactlyOne(
      await read(definition.objectNameSingular, fields, filter),
    );
    if (
      (native && current.id !== native.id) ||
      definition.relations.some((relation) => {
        const binding = filter[`${relation.field}Id`] as { eq: unknown };
        return current[`${relation.field}Id`] !== binding.eq;
      })
    )
      return { status: 'denied' };
    return {
      status: 'ready',
      recordId: current.id as string,
      path: definition.path.replace(
        /:([A-Za-z][A-Za-z0-9_]*)/g,
        (_match, parameter: string) => String(identifiers[parameter]),
      ),
    };
  } catch (error) {
    return {
      status:
        error instanceof Error &&
        ['missing', 'duplicate'].includes(error.message)
          ? (error.message as 'missing' | 'duplicate')
          : 'error',
    };
  }
};
