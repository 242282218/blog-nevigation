import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Design Token System', () => {
  const tokenPath = path.join(process.cwd(), 'app', 'styles', 'design-tokens.css');

  it('should have design-tokens.css file', () => {
    expect(fs.existsSync(tokenPath)).toBe(true);
  });

  it('should define color tokens', () => {
    const content = fs.readFileSync(tokenPath, 'utf-8');
    expect(content).toContain('--color-accent:');
    expect(content).toContain('--color-success:');
    expect(content).toContain('--color-link:');
    expect(content).toContain('--color-mac-red:');
    expect(content).toContain('--color-mac-yellow:');
    expect(content).toContain('--color-mac-green:');
  });

  it('should define spacing tokens', () => {
    const content = fs.readFileSync(tokenPath, 'utf-8');
    expect(content).toContain('--space-xs:');
    expect(content).toContain('--space-sm:');
    expect(content).toContain('--space-md:');
    expect(content).toContain('--space-lg:');
    expect(content).toContain('--space-xl:');
  });

  it('should define radius tokens', () => {
    const content = fs.readFileSync(tokenPath, 'utf-8');
    expect(content).toContain('--radius-sm:');
    expect(content).toContain('--radius-md:');
    expect(content).toContain('--radius-lg:');
    expect(content).toContain('--radius-xl:');
    expect(content).toContain('--radius-2xl:');
  });

  it('should define shadow tokens', () => {
    const content = fs.readFileSync(tokenPath, 'utf-8');
    expect(content).toContain('--shadow-sm:');
    expect(content).toContain('--shadow-md:');
    expect(content).toContain('--shadow-lg:');
  });
});
