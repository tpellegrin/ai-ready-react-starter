import { CSRF_HEADER, createCsrfToken } from './csrf';

describe('createCsrfToken', () => {
  it('adds the token to unsafe methods only, once set', () => {
    const csrf = createCsrfToken();
    expect(csrf.headers({ method: 'POST' })).toEqual({});

    csrf.set('abc');
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      expect(csrf.headers({ method })).toEqual({ [CSRF_HEADER]: 'abc' });
    }
    expect(csrf.headers({ method: 'GET' })).toEqual({});

    csrf.set(null);
    expect(csrf.headers({ method: 'POST' })).toEqual({});
  });
});
