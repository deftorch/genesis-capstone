import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TypingIndicator } from './TypingIndicator';

describe('TypingIndicator component', () => {
  it('should render typing indicator dot elements', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.animate-typing');
    expect(dots.length).toBe(3);
  });
});
