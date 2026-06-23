import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCanvasRenderer } from './useCanvasRenderer';

describe('useCanvasRenderer hook', () => {
  it('should return nulls if messageContent is null or empty', () => {
    const { result } = renderHook(() => useCanvasRenderer(null));
    expect(result.current.code).toBeNull();
    expect(result.current.renderer).toBeNull();
  });

  it('should return nulls if no code block is found', () => {
    const { result } = renderHook(() => useCanvasRenderer('Just some text, no code.'));
    expect(result.current.code).toBeNull();
    expect(result.current.renderer).toBeNull();
  });

  it('should extract p5 code and detect default renderer', () => {
    const content = 'Here is p5:\n```javascript\nfunction setup() {}\n```';
    const { result } = renderHook(() => useCanvasRenderer(content));
    expect(result.current.code).toBe('function setup() {}');
    expect(result.current.renderer).toBe('p5');
  });

  it('should extract d3 code and detect d3 renderer', () => {
    const content = '```js\n// renderer: d3\nconst svg = d3.select("svg");\n```';
    const { result } = renderHook(() => useCanvasRenderer(content));
    expect(result.current.code).toBe('// renderer: d3\nconst svg = d3.select("svg");');
    expect(result.current.renderer).toBe('d3');
  });

  it('should extract mermaid code and detect mermaid renderer', () => {
    const content = '```javascript\n// renderer: mermaid\ngraph TD;\n```';
    const { result } = renderHook(() => useCanvasRenderer(content));
    expect(result.current.renderer).toBe('mermaid');
  });
});
