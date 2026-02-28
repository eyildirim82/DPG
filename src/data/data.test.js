/**
 * Data Files — program.js & timeline.js Tests
 */
import { describe, it, expect } from 'vitest';
import { programItems } from './program';
import { timelineNodes } from './timeline';

describe('program.js', () => {
  it('programItems array export eder', () => {
    expect(Array.isArray(programItems)).toBe(true);
  });

  it('en az 1 program item içerir', () => {
    expect(programItems.length).toBeGreaterThan(0);
  });

  it('her item time, title, desc alanlarına sahiptir', () => {
    programItems.forEach((item) => {
      expect(item).toHaveProperty('time');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('desc');
      expect(typeof item.time).toBe('string');
      expect(typeof item.title).toBe('string');
      expect(typeof item.desc).toBe('string');
    });
  });

  it('time alanları boş değildir', () => {
    programItems.forEach((item) => {
      expect(item.time.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('timeline.js', () => {
  it('timelineNodes array export eder', () => {
    expect(Array.isArray(timelineNodes)).toBe(true);
  });

  it('en az 1 timeline node içerir', () => {
    expect(timelineNodes.length).toBeGreaterThan(0);
  });

  it('her node year, label, desc, active alanlarına sahiptir', () => {
    timelineNodes.forEach((node) => {
      expect(node).toHaveProperty('year');
      expect(node).toHaveProperty('label');
      expect(node).toHaveProperty('desc');
      expect(node).toHaveProperty('active');
      expect(typeof node.active).toBe('boolean');
    });
  });

  it('en az bir aktif node bulunur', () => {
    const activeNodes = timelineNodes.filter((n) => n.active);
    expect(activeNodes.length).toBeGreaterThan(0);
  });
});
