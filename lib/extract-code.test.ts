import { describe, it, expect } from 'vitest';
import { extractCode } from './extract-code';

describe('extract-code.ts', () => {
  it('should return null when no code block is present', () => {
    const content = 'This is just some text response from AI with no code blocks.';
    expect(extractCode(content)).toBeNull();
  });

  it('should return null when code block is not javascript or js', () => {
    const content = 'Here is some python code:\n```python\nprint("hello")\n```';
    expect(extractCode(content)).toBeNull();
  });

  it('should extract code block successfully with javascript type', () => {
    const content = 'Sure! Here is the javascript code:\n```javascript\nconsole.log("hello");\n```\nHope this helps!';
    const result = extractCode(content);
    expect(result).not.toBeNull();
    expect(result?.code).toBe('console.log("hello");');
    expect(result?.renderer).toBe('p5'); // default
  });

  it('should extract code block successfully with js type', () => {
    const content = 'Sure! Here is the js code:\n```js\nconsole.log("hello");\n```';
    const result = extractCode(content);
    expect(result).not.toBeNull();
    expect(result?.code).toBe('console.log("hello");');
    expect(result?.renderer).toBe('p5');
  });

  it('should detect D3 renderer comment', () => {
    const content = '```javascript\n// renderer: d3\nconst svg = d3.select("body");\n```';
    const result = extractCode(content);
    expect(result).not.toBeNull();
    expect(result?.renderer).toBe('d3');
    expect(result?.code).toBe('// renderer: d3\nconst svg = d3.select("body");');
  });

  it('should detect SVG renderer comment', () => {
    const content = '```javascript\n// renderer: svg\nconst rect = "<rect />";\n```';
    const result = extractCode(content);
    expect(result).not.toBeNull();
    expect(result?.renderer).toBe('svg');
  });

  it('should detect Mermaid renderer comment', () => {
    const content = '```javascript\n// renderer: mermaid\ngraph TD\n  A --> B\n```';
    const result = extractCode(content);
    expect(result).not.toBeNull();
    expect(result?.renderer).toBe('mermaid');
  });

  it('should default to P5 renderer when no renderer comment matches', () => {
    const content = '```javascript\n// renderer: unknown\nfunction draw() {}\n```';
    const result = extractCode(content);
    expect(result).not.toBeNull();
    expect(result?.renderer).toBe('p5');
  });
});
