import { isValidUuid } from 'twenty-shared/utils';

import { type RecordContextRouteDefinition } from './recordContextRoutes';
import { type RecordContextRelationPaths } from './recordContextRouteReadPlan';
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
    relationPaths,
  }: {
    endpoints: RecordRouteDefinition[];
    read: NativeContextRead;
    relationPaths?: RecordContextRelationPaths;
  },
): Promise<RecordContextResult> => {
  const exactlyOne = (rows: Record<string, unknown>[]) => {
    if (rows.length !== 1)
      throw new Error(rows.length ? 'duplicate' : 'missing');
    if (typeof rows[0].id !== 'string' || !isValidUuid(rows[0].id))
      throw new Error('error');
    return rows[0];
  };
  try {
    if (definition.recordIdentifier) {
      const identifier = definition.recordIdentifier;
      const parameters = [
        identifier.parameter,
        ...definition.relations.map((relation) => relation.parameter),
      ];
      if (
        'identifiers' in target &&
        (Object.keys(target.identifiers).length !== parameters.length ||
          parameters.some(
            (parameter) =>
              parseRecordRouteIdentifier(target.identifiers[parameter]) ===
              null,
          ))
      )
        return { status: 'missing' };
      if ('recordId' in target && !isValidUuid(target.recordId))
        return { status: 'missing' };
      const paths: RecordContextRelationPaths = {};
      for (const relation of definition.relations) {
        const steps =
          relationPaths?.[relation.parameter] ??
          (relation.field
            ? [
                {
                  field: relation.field,
                  objectNameSingular: relation.objectNameSingular,
                },
              ]
            : null);
        const configuredFields = relation.fieldPath ?? [relation.field];
        if (
          !steps ||
          steps.length !== configuredFields.length ||
          steps.some((step, index) => step.field !== configuredFields[index]) ||
          steps.at(-1)?.objectNameSingular !== relation.objectNameSingular
        )
          return { status: 'denied' };
        paths[relation.parameter] = steps;
        if (relation.verifyFieldPath) {
          const verification = relationPaths?.[`${relation.parameter}:verify`];
          if (
            !verification ||
            verification.length !== relation.verifyFieldPath.length ||
            verification.some(
              (step, index) => step.field !== relation.verifyFieldPath![index],
            ) ||
            verification.at(-1)?.objectNameSingular !==
              relation.objectNameSingular
          )
            return { status: 'denied' };
          paths[`${relation.parameter}:verify`] = verification;
        }
      }
      const fields = [
        'id',
        identifier.field,
        ...new Set(Object.values(paths).map((steps) => `${steps[0].field}Id`)),
      ];
      const native = exactlyOne(
        await read(
          definition.objectNameSingular,
          fields,
          'recordId' in target
            ? { id: { eq: target.recordId } }
            : {
                [identifier.field]: {
                  eq: target.identifiers[identifier.parameter],
                },
              },
        ),
      );
      const number = parseRecordRouteIdentifier(native[identifier.field]);
      if (
        number === null ||
        ('recordId' in target
          ? native.id !== target.recordId
          : number !== target.identifiers[identifier.parameter])
      )
        return { status: 'denied' };
      const identifiers: Record<string, number> = {
        [identifier.parameter]: number,
      };
      const snapshots: {
        objectNameSingular: string;
        fields: string[];
        record: Record<string, unknown>;
      }[] = [];
      for (const relation of definition.relations) {
        const endpoint = endpoints.find(
          (entry) => entry.objectNameSingular === relation.objectNameSingular,
        );
        if (!endpoint) return { status: 'denied' };
        const readLinked = async (
          steps: RecordContextRelationPaths[string],
        ) => {
          let parent = native;
          for (const [index, step] of steps.entries()) {
            const linkedId = parent[`${step.field}Id`];
            if (typeof linkedId !== 'string' || !isValidUuid(linkedId))
              throw new Error('missing');
            const last = index === steps.length - 1;
            const selectedFields = [
              'id',
              last
                ? endpoint.recordIdentifierField
                : `${steps[index + 1].field}Id`,
            ];
            const linked = exactlyOne(
              await read(step.objectNameSingular, selectedFields, {
                id: { eq: linkedId },
              }),
            );
            if (linked.id !== linkedId) throw new Error('denied');
            snapshots.push({
              objectNameSingular: step.objectNameSingular,
              fields: selectedFields,
              record: linked,
            });
            parent = linked;
          }
          return parent;
        };
        const parent = await readLinked(paths[relation.parameter]);
        if (relation.verifyFieldPath) {
          const verified = await readLinked(
            paths[`${relation.parameter}:verify`],
          );
          if (verified.id !== parent.id) return { status: 'denied' };
        }
        const endpointNumber = parseRecordRouteIdentifier(
          parent[endpoint.recordIdentifierField],
        );
        if (
          endpointNumber === null ||
          ('identifiers' in target &&
            endpointNumber !== target.identifiers[relation.parameter])
        )
          return { status: 'denied' };
        const uniqueEndpoint = exactlyOne(
          await read(
            endpoint.objectNameSingular,
            ['id', endpoint.recordIdentifierField],
            { [endpoint.recordIdentifierField]: { eq: endpointNumber } },
          ),
        );
        if (
          uniqueEndpoint.id !== parent.id ||
          uniqueEndpoint[endpoint.recordIdentifierField] !== endpointNumber
        )
          return { status: 'denied' };
        identifiers[relation.parameter] = endpointNumber;
      }
      // Recheck the target and links so reparenting during resolution cannot
      // bind a cached path to the previously observed Person.
      const current = exactlyOne(
        await read(definition.objectNameSingular, fields, {
          [identifier.field]: { eq: number },
        }),
      );
      if (fields.some((field) => current[field] !== native[field]))
        return { status: 'denied' };
      for (const snapshot of snapshots) {
        const currentLink = exactlyOne(
          await read(snapshot.objectNameSingular, snapshot.fields, {
            id: { eq: snapshot.record.id },
          }),
        );
        if (
          snapshot.fields.some(
            (field) => currentLink[field] !== snapshot.record[field],
          )
        )
          return { status: 'denied' };
      }
      return {
        status: 'ready',
        recordId: String(native.id),
        path: definition.path.replace(
          /:([A-Za-z][A-Za-z0-9_]*)/g,
          (_match, parameter: string) => String(identifiers[parameter]),
        ),
      };
    }
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
        ['missing', 'duplicate', 'denied'].includes(error.message)
          ? (error.message as 'missing' | 'duplicate' | 'denied')
          : 'error',
    };
  }
};
