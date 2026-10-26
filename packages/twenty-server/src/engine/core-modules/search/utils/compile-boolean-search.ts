import { GraphQLError } from 'graphql';

type SearchToken =
  | { kind: 'TERM' | 'PHRASE'; value: string }
  | { kind: 'AND' | 'OR' | 'NOT' | 'LEFT' | 'RIGHT' };

const OPERATORS: Partial<Record<string, 'LEFT' | 'RIGHT' | 'AND' | 'OR' | 'NOT'>> = {
  '(': 'LEFT', ')': 'RIGHT', '&': 'AND', '|': 'OR', ',': 'OR', '!': 'NOT', '-': 'NOT',
};

const invalidSearch = (message: string): never => {
  throw new GraphQLError(`Invalid Boolean search: ${message}`, {
    extensions: { code: 'BAD_USER_INPUT' },
  });
};

export const isBooleanSearch = (input: string) =>
  /\b(?:AND|OR|NOT)\b|["(),&|!*]|(?:^|\s)-\S/i.test(input);

const tokenize = (input: string): SearchToken[] => {
  const tokens: SearchToken[] = [];
  let offset = 0;

  while (offset < input.length) {
    const character = input[offset];
    if (/\s/.test(character)) {
      offset++;
      continue;
    }
    if (tokens.length >= 256) invalidSearch('Use at most 256 terms and operators.');
    if (character === '"') {
      offset++;
      let phrase = '';
      while (offset < input.length && input[offset] !== '"') {
        if (input[offset] === '\\' && offset + 1 < input.length) offset++;
        phrase += input[offset++];
      }
      if (offset === input.length) invalidSearch('Close the quoted phrase.');
      if (!phrase.trim()) invalidSearch('Quoted phrases cannot be empty.');
      tokens.push({ kind: 'PHRASE', value: phrase });
      offset++;
      continue;
    }
    const operator = OPERATORS[character];
    if (operator) {
      tokens.push({ kind: operator });
      offset++;
      if ((character === '&' || character === '|') && input[offset] === character) offset++;
      continue;
    }
    let value = '';
    while (offset < input.length && !/[\s"(),&|!]/.test(input[offset])) {
      if (input[offset] === '\\' && offset + 1 < input.length) offset++;
      value += input[offset++];
    }
    const keyword = value.toUpperCase();
    tokens.push(
      keyword === 'AND' || keyword === 'OR' || keyword === 'NOT'
        ? { kind: keyword }
        : { kind: 'TERM', value },
    );
  }
  return tokens;
};

// Quoting is for the tsquery grammar; SQL still receives a bound parameter.
const lexeme = (value: string, prefix: boolean) => {
  const word = prefix && value.endsWith('*') ? value.slice(0, -1) : value;
  if (!word || word.includes('*')) {
    invalidSearch('Use * only at the end of an unquoted word, such as recruit*.');
  }
  return `'${word.replace(/[\\']/g, '\\$&')}'${prefix ? ':*' : ''}`;
};

export const compileBooleanSearch = (input: string): string => {
  const tokens = tokenize(input);
  let position = 0;
  let depth = 0;
  const current = () => tokens[position];

  const parseUnary = (): string => {
    const token = current();
    if (!token) return invalidSearch('Add a term after the operator.');
    if (++depth > 32) invalidSearch('Use at most 32 nested groups or NOT operators.');
    let result: string;
    if (token.kind === 'NOT') {
      position++;
      result = `!(${parseUnary()})`;
    } else if (token.kind === 'LEFT') {
      position++;
      result = parseOr();
      if (current()?.kind !== 'RIGHT') invalidSearch('Close the parenthesis.');
      position++;
      result = `(${result})`;
    } else if (token.kind === 'TERM' || token.kind === 'PHRASE') {
      position++;
      result = token.kind === 'TERM'
        ? lexeme(token.value, true)
        : `(${token.value.trim().split(/\s+/).map((word) => lexeme(word, false)).join(' <-> ')})`;
    } else {
      return invalidSearch('Expected a word, quoted phrase or parenthesized group.');
    }
    depth--;
    return result;
  };

  const parseAnd = (): string => {
    let result = parseUnary();
    while (current() && current().kind !== 'OR' && current().kind !== 'RIGHT') {
      if (current().kind === 'AND') position++;
      result = `(${result} & ${parseUnary()})`;
    }
    return result;
  };

  const parseOr = (): string => {
    let result = parseAnd();
    while (current()?.kind === 'OR') {
      position++;
      result = `(${result} | ${parseAnd()})`;
    }
    return result;
  };

  if (tokens.length === 0) return '';
  const result = parseOr();
  if (position !== tokens.length) invalidSearch('Remove the unexpected closing parenthesis.');
  return result;
};
