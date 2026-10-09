import { FieldMetadataType, RelationType } from 'twenty-shared/types';

import { type RecordContextRouteDefinition } from './recordContextRoutes';
import { type RecordRouteDefinition } from './recordRouteDefinitions';

export type RecordContextRelationHop = {
  field: string;
  objectNameSingular: string;
};
export type RecordContextRelationPaths = Record<
  string,
  RecordContextRelationHop[]
>;
export type RecordContextReadableObject = {
  nameSingular: string;
  namePlural: string;
  canRead: boolean;
  fields: {
    name: string;
    isActive?: boolean | null;
    type: string;
    relation?: {
      type: string;
      targetObjectMetadata: { nameSingular: string };
    } | null;
  }[];
};

// Metadata proves each intermediate relation before any record lookup is allowed.
export const getRecordContextRouteReadPlan = (
  definition: RecordContextRouteDefinition,
  objects: RecordContextReadableObject[],
  endpoints: RecordRouteDefinition[],
): RecordContextRelationPaths | null => {
  const target = objects.find(
    (object) =>
      object.nameSingular === definition.objectNameSingular &&
      object.namePlural === definition.objectNamePlural &&
      object.canRead,
  );
  if (!target) return null;
  if (
    definition.recordIdentifier &&
    !target.fields.some(
      (field) =>
        field.isActive &&
        field.name === definition.recordIdentifier!.field &&
        field.type === FieldMetadataType.NUMBER,
    )
  )
    return null;
  const paths: RecordContextRelationPaths = {};
  for (const relation of definition.relations) {
    const endpoint = endpoints.find(
      (entry) => entry.objectNameSingular === relation.objectNameSingular,
    );
    if (!endpoint) return null;
    for (const [key, fields] of [
      [relation.parameter, relation.fieldPath ?? [relation.field]],
      ...(relation.verifyFieldPath
        ? [[`${relation.parameter}:verify`, relation.verifyFieldPath]]
        : []),
    ] as [string, (string | undefined)[]][]) {
      let current = target;
      const steps: RecordContextRelationHop[] = [];
      for (const fieldName of fields) {
        const field = current.fields.find(
          (entry) =>
            entry.isActive &&
            entry.name === fieldName &&
            entry.type === FieldMetadataType.RELATION &&
            entry.relation?.type === RelationType.MANY_TO_ONE,
        );
        const next = objects.find(
          (entry) =>
            entry.canRead &&
            entry.nameSingular ===
              field?.relation?.targetObjectMetadata.nameSingular,
        );
        if (!field || !next) return null;
        steps.push({
          field: field.name,
          objectNameSingular: next.nameSingular,
        });
        current = next;
      }
      if (
        current.nameSingular !== endpoint.objectNameSingular ||
        current.namePlural !== endpoint.objectNamePlural ||
        !current.fields.some(
          (field) =>
            field.isActive &&
            field.name === endpoint.recordIdentifierField &&
            field.type === FieldMetadataType.NUMBER,
        )
      )
        return null;
      paths[key] = steps;
    }
  }
  return paths;
};
