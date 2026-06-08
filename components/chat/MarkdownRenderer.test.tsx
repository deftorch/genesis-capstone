import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownRenderer } from './MarkdownRenderer';

describe('MarkdownRenderer component', () => {
  it('should render plain markdown text correctly', () => {
    render(<MarkdownRenderer content="Hello **world** from markdown!" />);
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
    expect(screen.getByText(/world/)).toBeInTheDocument();
  });

  it('should render headings', () => {
    render(<MarkdownRenderer content={`# Heading 1
## Heading 2`} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading 1');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Heading 2');
  });

  it('should render links with correct target attributes', () => {
    render(<MarkdownRenderer content="Check [Google](https://google.com)" />);
    const link = screen.getByRole('link', { name: 'Google' });
    expect(link).toHaveAttribute('href', 'https://google.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('should render block code segments', () => {
    const { container } = render(
      <MarkdownRenderer content={`\`\`\`javascript
const a = 10;
\`\`\``} />
    );
    const code = container.querySelector('pre code');
    expect(code).toBeInTheDocument();
    expect(code).toHaveClass('language-javascript');
  });

  it('should render inline code segments', () => {
    const { container } = render(
      <MarkdownRenderer content="Use the `generateId` utility function." />
    );
    const code = container.querySelector('code');
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent('generateId');
  });
});
