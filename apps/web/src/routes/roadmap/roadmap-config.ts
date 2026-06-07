/**
 * ロードマップ／マイルストーン定義（★ここを編集して運用）。
 * 管理者が「これが出来ているか・成果物がどうか」を確認するための一覧。
 * GitHub Copilot に「roadmap-config にマイルストーンを追加して」等と頼めます。
 */
export type MilestoneStatus = 'done' | 'in_progress' | 'planned';

export interface Deliverable {
  label: string;
  done: boolean;
}
export interface Milestone {
  id: string;
  title: string;
  status: MilestoneStatus;
  period?: string;
  summary: string;
  deliverables: Deliverable[];
}

export const STATUS_LABEL: Record<MilestoneStatus, string> = {
  done: '完了',
  in_progress: '進行中',
  planned: '予定',
};

export const ROADMAP: Milestone[] = [
  {
    id: 'm0',
    title: 'M0–M1：基盤・共有スキーマ',
    status: 'done',
    summary: 'モノレポ・型/Zod/enum/ポリシーの共有基盤。',
    deliverables: [
      { label: 'pnpm モノレポ / TS / Docker(LocalStack)', done: true },
      { label: '共有 Zod スキーマ・enum・ポリシー(§6,§7)', done: true },
    ],
  },
  {
    id: 'm2',
    title: 'M2–M3：バックエンド（API/DB/認証/RBAC/集計）',
    status: 'done',
    summary: 'Hono(Lambda互換)・DynamoDB単一テーブル・S3・モック認証・RBAC・ポリシー・集計。',
    deliverables: [
      { label: '提出 CRUD / 提出・承認・差戻し', done: true },
      { label: '証跡 presigned URL（upload/confirm/download）', done: true },
      { label: 'RBAC・運用モード/ポリシー配線', done: true },
      { label: '管理集計 stats', done: true },
    ],
  },
  {
    id: 'm4',
    title: 'M4–M5：フロント（全11画面）',
    status: 'done',
    summary: 'React+Vite SPA・全画面・柔らかいUI文言。',
    deliverables: [
      { label: 'ログイン〜入力〜提出〜承認〜マスタの11画面(§11.1)', done: true },
      { label: 'ロール切替・i18n文言集約', done: true },
    ],
  },
  {
    id: 'm6',
    title: 'M6–M7：監査Agent / エクスポート',
    status: 'done',
    summary: '監査Agent（参考判定・ファイル単位＋サマリー）と CSV/JSON(§16.2) 出力。',
    deliverables: [
      { label: '監査Agent（読取/タイプ整合/LLM任意）', done: true },
      { label: 'JSON(schemaVersion 1.0) / CSV エクスポート', done: true },
    ],
  },
  {
    id: 'm8',
    title: 'M8–M9：検証 / インフラ雛形',
    status: 'done',
    summary: 'ローカル自動テストと AWS CDK 雛形。',
    deliverables: [
      { label: 'pnpm verify（型→ユニット→統合E2E・Docker不要）', done: true },
      { label: 'CDK 雛形（S3/DynamoDB/Lambda/APIGW/Cognito/CloudFront/監査）', done: true },
      { label: 'AWS構成コスト比較・デプロイ図解(Mermaid)', done: true },
    ],
  },
  {
    id: 'ops',
    title: '運用導線：Dockerレス / Copilot / 監査対応',
    status: 'done',
    summary: '会社環境での起動性とメンテナンス性。',
    deliverables: [
      { label: 'Dockerレス最小モード（STORAGE_DRIVER=local）', done: true },
      { label: '状態判定バッチ（pnpm doctor / setup / setup:local）', done: true },
      { label: 'Copilot 指示書・Dev Container', done: true },
      { label: '全体監査の指摘修正（HIGH/LOW/HMAC）', done: true },
    ],
  },
  {
    id: 'bi',
    title: 'BI ダッシュボード（ポートフォリオ可視化）',
    status: 'in_progress',
    summary: '必要経費(¥対数)×展開性(到達数)×事業価値×領域のバブル＋詳細パネル。',
    deliverables: [
      { label: 'バブルチャート（クリックで詳細・経費/一回性/効果/時期）', done: true },
      { label: '必要経費=¥対数・展開性=到達数 へ軸を実態化', done: true },
      { label: '必要経費・事業価値・一回性 を提出フォームの実入力に昇格', done: false },
    ],
  },
  {
    id: 'aws',
    title: 'AWS 本番デプロイ',
    status: 'planned',
    summary: '雛形を本番化（要 aws configure）。',
    deliverables: [
      { label: 'cdk deploy（pnpm deploy:aws）', done: false },
      { label: 'Cognito verify() 実装（モック→本番認証）', done: false },
      { label: 'CloudFront 配信のCORS等を本番値に確定', done: false },
    ],
  },
  {
    id: 'future',
    title: '今後の検討',
    status: 'planned',
    summary: '必要に応じて。',
    deliverables: [
      { label: 'CI（GitHub Actions）※現状はローカル verify 運用', done: false },
      { label: '監査Agentのリッチ抽出（PDF/XLSX/PPTX）', done: false },
      { label: 'Claim 分解（影響度/貢献度ごとの根拠紐づけ）', done: false },
    ],
  },
];
