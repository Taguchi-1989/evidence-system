---
mode: agent
description: 監査Agentに証跡の抽出器（PDF/PPTX等）を追加する
---

監査Agentが「{{拡張子（例: pdf, pptx）}}」の証跡からテキストを抽出できるようにしてください。

1. ライブラリ選定（メンテされ、ライセンス安全なもの）を `apps/api` に追加。
2. `apps/api/src/audit/extract.ts`
   - 対象拡張子のとき `getObjectBytes(ev.s3Key)` でバイト列を取得し、テキスト抽出して
     `{ readable:true, text, kind:'text' }` を返す。失敗時は `kind:'binary'` にフォールバック。
   - 既存の CSV/XLSX と同じ方針（先頭2万字に丸める）に合わせる。
3. ストレージは抽象（`storage/objects.ts` の `getObjectBytes`）経由のみ。生の AWS SDK を直書きしない。
4. 抽出が監査の関連度判定（`audit/agent.ts` → `scoreWithLLM`）に渡ることを確認。

最後に `pnpm verify` が緑になるまで修正し、可能なら抽出のユニットテストを追加してください。
