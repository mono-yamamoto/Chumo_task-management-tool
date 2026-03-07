import { describe, it, expect } from 'vitest';
import { PROJECT_TYPES, isBRGREGProject } from '../projectTypes';

describe('PROJECT_TYPES', () => {
  it('全9プロジェクトタイプが定義されている', () => {
    expect(PROJECT_TYPES).toHaveLength(9);
  });

  it('固定値として定義されている', () => {
    expect(PROJECT_TYPES).toContain('REG2017');
    expect(PROJECT_TYPES).toContain('BRGREG');
    expect(PROJECT_TYPES).toContain('MONO');
    expect(PROJECT_TYPES).toContain('MONO_ADMIN');
    expect(PROJECT_TYPES).toContain('DES_FIRE');
    expect(PROJECT_TYPES).toContain('DesignSystem');
    expect(PROJECT_TYPES).toContain('DMREG2');
    expect(PROJECT_TYPES).toContain('monosus');
    expect(PROJECT_TYPES).toContain('PRREG');
  });
});

describe('isBRGREGProject', () => {
  it('BRGREGの場合trueを返す', () => {
    expect(isBRGREGProject('BRGREG')).toBe(true);
  });

  it('BRGREG以外の場合falseを返す', () => {
    expect(isBRGREGProject('REG2017')).toBe(false);
    expect(isBRGREGProject('MONO')).toBe(false);
    expect(isBRGREGProject('')).toBe(false);
    expect(isBRGREGProject('brgreg')).toBe(false);
  });
});
