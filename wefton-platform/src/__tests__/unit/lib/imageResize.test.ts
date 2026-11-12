import { describe, it, expect } from 'vitest';
import { fitWithin, renameForType, MAX_EDGE } from '@/lib/imageResize';

describe('fitWithin', () => {
  it('scales the long side of a large portrait photo down to MAX_EDGE', () => {
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: MAX_EDGE });
  });

  it('scales a large landscape photo by its width', () => {
    expect(fitWithin(4800, 2400)).toEqual({ width: MAX_EDGE, height: 800 });
  });

  it('never enlarges a small photo', () => {
    expect(fitWithin(800, 1000)).toEqual({ width: 800, height: 1000 });
  });
});

describe('renameForType', () => {
  it('swaps the extension to match the new type', () => {
    expect(renameForType('navy-front.PNG', 'image/webp')).toBe('navy-front.webp');
    expect(renameForType('navy.front.png', 'image/jpeg')).toBe('navy.front.jpg');
  });

  it('adds an extension to a name without one', () => {
    expect(renameForType('photo', 'image/webp')).toBe('photo.webp');
  });
});
