import { describe, expect, it } from 'vitest';

import { findLocaleProblems, placeholdersOf } from './i18n.mjs';

const source = {
  name: 'en-US',
  messages: {
    greeting: 'Hello, {name}!',
    items: { count: '{count} items in {list}', empty: 'Nothing here' },
  },
};

describe('findLocaleProblems', () => {
  it('accepts a complete translation with the same placeholders in any order', () => {
    const pt = {
      name: 'pt-BR',
      messages: {
        greeting: 'Olá, {name}!',
        items: { count: 'Em {list}: {count} itens', empty: 'Nada aqui' },
      },
    };
    expect(findLocaleProblems(source, [pt])).toEqual([]);
  });

  it('reports missing and extra keys', () => {
    const es = {
      name: 'es-ES',
      messages: { greeting: 'Hola, {name}', items: { total: '{count}' } },
    };
    expect(findLocaleProblems(source, [es])).toEqual([
      'es-ES: missing keys items.count, items.empty',
      'es-ES: keys not in en-US items.total',
    ]);
  });

  it('reports translated, missing or extra placeholders', () => {
    const pt = {
      name: 'pt-BR',
      messages: {
        greeting: 'Olá, {nome}!',
        items: { count: '{count} itens', empty: 'Nada aqui {count}' },
      },
    };
    const problems = findLocaleProblems(source, [pt]);
    expect(problems).toHaveLength(3);
    expect(problems[0]).toBe(
      'pt-BR › greeting: placeholders must match en-US (expected {name}, found {nome}); translate the text around them, never the names',
    );
    expect(problems[1]).toContain('expected {count} {list}, found {count}');
    expect(problems[2]).toContain('expected none, found {count}');
  });
});

describe('placeholdersOf', () => {
  it('lists each placeholder once, sorted', () => {
    expect(placeholdersOf('{b} {a} {b}')).toEqual(['a', 'b']);
    expect(placeholdersOf(42)).toEqual([]);
  });
});
