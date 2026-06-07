/**
 * UI 文言の集中管理（要件 §11.2 推奨表現 / §22 導入メッセージ / §17.4 保守性）。
 * 監査色を出す表現（「不備」「証跡不足」等）は使わない。文言変更はここだけ。
 */
export const messages = {
  appName: '成果・証跡管理システム',
  appTagline: '成果と関連資料を、後から振り返れる形で記録します',

  nav: {
    dashboard: 'ダッシュボード',
    newSubmission: '達成内容を入力',
    mySubmissions: '自分の提出',
    team: '部門一覧',
    admin: '管理ダッシュボード',
    bi: 'BI ダッシュボード',
    pending: '未提出・要確認',
    audit: '監査結果',
    exports: 'エクスポート',
    masters: 'マスタ管理',
    logout: 'ログアウト',
  },

  // 入力画面（柔らかい表現）
  evidence: {
    attachHint: 'この成果を説明する資料があれば添付してください。',
    optionalNote: '現時点では、該当資料がない場合も登録できます。',
    futureNote: '次回以降、根拠資料の添付を段階的に標準化していく予定です。',
    noEvidenceReasonLabel: '資料がない場合の状況（任意）',
    confidentialNote: '機密資料のため添付できない場合は、理由と所在を記録してください。',
  },

  // 導入メッセージ（§22）
  introMessage: `今年度は、成果内容と関連資料を後から振り返れる形で記録するための試行運用を行います。
初年度は、証跡資料の完全性を求めるものではありません。まずは、どのような成果に対して、どのような関連資料が残っているかを把握することを目的とします。
資料がある場合は添付してください。ない場合・準備中の場合・機密上添付できない場合は、その旨を入力してください。`,

  fields: {
    fiscalYear: '年度',
    department: '部署',
    userName: '氏名',
    title: 'テーマ名',
    achievement: '達成内容',
    impactLevel: '影響度（自己評価）',
    impactReason: '影響度の説明',
    contributionLevel: '貢献度（自己評価）',
    contributionReason: '貢献度の説明',
    evidencePresence: '証跡資料の有無',
    evidenceType: '証跡タイプ',
    relatedAxis: '関係する評価軸',
    description: '資料の説明',
    supplementaryComment: '補足コメント',
    noEvidenceReason: '証跡なし理由',
    status: '状態',
    reviewComment: 'コメント',
  },

  actions: {
    save: '下書き保存',
    submit: '提出する',
    edit: '編集',
    confirm: '提出内容を確認',
    approve: '承認',
    reject: '差戻し',
    comment: 'コメントを保存',
    upload: '資料をアップロード',
    download: 'ダウンロード',
    delete: '削除',
    runAudit: '監査Agentを実行',
    export: 'エクスポート作成',
    login: 'ログイン',
  },

  toast: {
    saved: '保存しました',
    submitted: '提出しました',
    approved: '承認しました',
    rejected: '差戻しました',
    uploaded: '資料をアップロードしました',
    deleted: '削除しました',
    exported: 'エクスポートを作成しました',
    auditDone: '監査Agentを実行しました',
    error: 'エラーが発生しました',
  },
} as const;
