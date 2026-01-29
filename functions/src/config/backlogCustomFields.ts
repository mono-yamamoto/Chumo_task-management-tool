import { ProjectType } from '../reports/projectTypes';

/**
 * Backlogカスタムフィールドの設定
 * IT予定日と本番リリース予定日のフィールドIDを定義
 */
interface BacklogCustomFieldConfig {
  /** ＩＴ予定日のカスタムフィールドID */
  itUpDate?: number;
  /** 本番リリース予定日のカスタムフィールドID */
  releaseDate?: number;
}

/**
 * プロジェクトタイプごとのBacklogカスタムフィールドID設定
 *
 * 各プロジェクトのカスタムフィールドIDはBacklog管理画面から確認:
 * プロジェクト設定 > カスタム属性 > 各フィールドのID
 */
export const BACKLOG_CUSTOM_FIELDS: Record<ProjectType, BacklogCustomFieldConfig> = {
  REG2017: {
    itUpDate: 1073783169,
    releaseDate: 1073783170,
  },
  BRGREG: {
    itUpDate: 1073754985,
    releaseDate: 1073754988,
  },
  PRREG: {
    itUpDate: 1073748055,
    releaseDate: 1073747940,
  },
  MONO: {},
  MONO_ADMIN: {},
  DES_FIRE: {},
  DesignSystem: {},
  DMREG2: {
    itUpDate: 1073767877,
    releaseDate: 1073767878,
  },
  monosus: {},
};

/**
 * プロジェクトタイプに対応するカスタムフィールド設定を取得
 * @param projectType プロジェクトタイプ
 * @returns カスタムフィールド設定（存在しない場合は空オブジェクト）
 */
export function getCustomFieldConfig(projectType: ProjectType): BacklogCustomFieldConfig {
  return BACKLOG_CUSTOM_FIELDS[projectType] ?? {};
}
