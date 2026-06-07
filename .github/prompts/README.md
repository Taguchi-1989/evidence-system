# Copilot プロンプト集

このフォルダの `*.prompt.md` は、本リポジトリを拡張するための**再利用プロンプト**です。
GitHub Copilot Chat（VS Code）で `/` から prompt ファイルを選ぶ、または内容をコピーして
チャットに貼り付けて使います（リポジトリの規約は [`.github/copilot-instructions.md`](../copilot-instructions.md) を自動参照）。

| ファイル | 用途 |
| --- | --- |
| `add-submission-field.prompt.md` | 提出(Submission)に新しい入力項目を端から端まで追加 |
| `add-evidence-extractor.prompt.md` | 証跡の抽出器（PDF/PPTX 等）を監査Agentに追加 |
| `add-llm-provider.prompt.md` | 監査の LLM プロバイダ（例: AWS Bedrock）を追加 |
| `add-api-endpoint.prompt.md` | RBAC 付きの新規 API エンドポイントを追加 |
| `import-from-excel.prompt.md` | Excel から成果データを一括取り込みする機能を追加 |

> どのプロンプトも最後に「`pnpm verify` が緑になるまで直す」ことを要求します。
