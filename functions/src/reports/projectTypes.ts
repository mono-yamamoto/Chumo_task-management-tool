/**
 * プロジェクトタイプの固定値
 * タスクの種類として使用される
 */
export const PROJECT_TYPES = [
  'REG2017',
  'BRGREG',
  'MONO',
  'MONO_ADMIN',
  'DES_FIRE',
  'DesignSystem',
  'DMREG2',
  'monosus',
  'PRREG',
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

/**
 * BRGREGプロジェクトかどうかを判定
 * レポートの集計先が異なるため、この判定が必要
 */
export function isBRGREGProject(projectType: string): boolean {
  return projectType === 'BRGREG';
}
