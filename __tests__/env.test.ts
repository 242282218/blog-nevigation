import { describe, it, expect } from 'vitest';

describe('Test Environment', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support TypeScript', () => {
    const greeting: string = 'Hello, World!';
    expect(greeting).toBe('Hello, World!');
  });
});
