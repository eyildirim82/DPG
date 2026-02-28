/**
 * Theme — Unit Tests
 */
import { describe, it, expect } from 'vitest';
import { theme } from './theme';

describe('theme', () => {
  it('theme objesi export eder', () => {
    expect(theme).toBeDefined();
    expect(typeof theme).toBe('object');
  });

  it('colors objesi içerir', () => {
    expect(theme.colors).toBeDefined();
    expect(theme.colors.gold).toBe('#E6C275');
    expect(theme.colors.bg).toBe('#051424');
    expect(theme.colors.silver).toBe('#C4CCD4');
    expect(theme.colors.text).toBe('#F0F4F8');
  });

  it('fonts objesi içerir', () => {
    expect(theme.fonts).toBeDefined();
    expect(theme.fonts.heading).toContain('Cormorant Garamond');
    expect(theme.fonts.body).toContain('Inter');
  });

  it('cssVars objesi içerir ve renklerle eşleşir', () => {
    expect(theme.cssVars).toBeDefined();
    expect(theme.cssVars['--color-gold']).toBe(theme.colors.gold);
    expect(theme.cssVars['--color-bg']).toBe(theme.colors.bg);
  });

  it('bgEtching SVG data URI döndürür', () => {
    expect(typeof theme.bgEtching).toBe('string');
    expect(theme.bgEtching).toContain('data:image/svg+xml');
  });

  it('heroBackground gradient ve URL içerir', () => {
    expect(typeof theme.heroBackground).toBe('string');
    expect(theme.heroBackground).toContain('radial-gradient');
  });

  it('default export theme ile aynıdır', async () => {
    const { default: defaultTheme } = await import('./theme');
    expect(defaultTheme).toEqual(theme);
  });
});
