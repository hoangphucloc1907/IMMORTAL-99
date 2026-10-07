import { describe, it, expect } from 'vitest';
import { generateEvalCurvePath } from '../src/ui/Scrubber';

describe('Scrubber Eval Curve Generation (Group B - Tactical Visualizations)', () => {
  it('generates valid SVG area and line path strings with 88 points', () => {
    const { areaPath, linePath, sacrificePos } = generateEvalCurvePath(1000, 24);

    expect(areaPath).toContain('M 0');
    expect(areaPath).toContain('Z');
    expect(linePath).toContain('M 0');
    expect(areaPath).not.toContain('NaN');
    expect(linePath).not.toContain('NaN');

    // Sacrifice position at ply 47
    expect(sacrificePos.x).toBeCloseTo((47 / 87) * 1000, 1);
    expect(sacrificePos.y).toBeGreaterThanOrEqual(0);
    expect(sacrificePos.y).toBeLessThanOrEqual(24);
  });
});
