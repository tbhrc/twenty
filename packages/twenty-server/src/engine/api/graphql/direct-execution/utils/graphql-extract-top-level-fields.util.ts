import {
  type DocumentNode,
  type FieldNode,
  type SelectionNode,
  type SelectionSetNode,
  GraphQLBoolean,
  GraphQLIncludeDirective,
  GraphQLSkipDirective,
  Kind,
  getDirectiveValues,
  valueFromASTUntyped,
} from 'graphql';

import { findOperationDefinition } from 'src/engine/api/graphql/direct-execution/utils/find-operation-definition.util';
import { graphQLBuildFragmentMap } from 'src/engine/api/graphql/direct-execution/utils/graphql-build-fragment-map.util';

export const graphQLExtractTopLevelFields = (
  document: DocumentNode,
  operationName: string | undefined,
  executionVariables?: Record<string, unknown>,
): FieldNode[] => {
  const operationDefinition = findOperationDefinition(document, operationName);

  if (!operationDefinition) {
    return [];
  }

  const variables = { ...executionVariables };

  for (const definition of operationDefinition.variableDefinitions ?? []) {
    const name = definition.variable.name.value;

    if (
      !Object.prototype.hasOwnProperty.call(variables, name) &&
      definition.defaultValue
    ) {
      variables[name] = valueFromASTUntyped(definition.defaultValue);
    }
  }

  const shouldInclude = (selection: SelectionNode): boolean => {
    // Routing needs the declared fields even when every workspace field is skipped.
    if (executionVariables === undefined) {
      return true;
    }

    const skip = getDirectiveValues(GraphQLSkipDirective, selection, variables);
    const include = getDirectiveValues(
      GraphQLIncludeDirective,
      selection,
      variables,
    );
    const shouldSkip = skip ? GraphQLBoolean.parseValue(skip.if) : false;
    const shouldSelect = include ? GraphQLBoolean.parseValue(include.if) : true;

    return !shouldSkip && shouldSelect;
  };

  const fragmentMap = graphQLBuildFragmentMap(document);
  const visitedFragments = new Set<string>();
  const fields: FieldNode[] = [];
  const collect = (selectionSet: SelectionSetNode): void => {
    for (const selection of selectionSet.selections) {
      if (!shouldInclude(selection)) {
        continue;
      }

      if (selection.kind === Kind.FIELD) {
        fields.push(selection);
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        collect(selection.selectionSet);
      } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
        const name = selection.name.value;
        const fragment = fragmentMap.get(name);

        if (fragment && !visitedFragments.has(name)) {
          visitedFragments.add(name);
          collect(fragment.selectionSet);
        }
      }
    }
  };

  collect(operationDefinition.selectionSet);

  return fields;
};
