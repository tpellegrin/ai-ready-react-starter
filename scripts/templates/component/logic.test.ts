import { renderHook } from '@testing-library/react';

import { use__Name__ } from './logic';

describe('use__Name__', () => {
  it('derives the accessible title from the label', () => {
    const { result } = renderHook(() => use__Name__('  Summary  '));
    expect(result.current.title).toBe('Summary');
  });
});
