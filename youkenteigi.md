# 成果・証跡管理システム 要件定義書

## 1. 背景

期末・年度末などの評価・振り返りにおいて、個人または部門が実施した成果について、達成内容、影響度、貢献度、関連資料を整理して残す必要がある。

従来は、口頭説明、Excel、PowerPoint、メール、会議資料などに分散しており、後から確認する際に以下の課題がある。

* 達成内容と根拠資料の紐づきが分かりにくい
* 影響度と貢献度が混在しやすい
* 証跡資料の有無や所在が属人的になる
* 上長や事務局が確認する際の負荷が高い
* 将来的に他システムへ引き継ぎにくい

本システムでは、初期段階では過度に厳密な監査を行うのではなく、まずは成果内容と関連資料を後から振り返れる形で収集・整理する。

一方で、内部設計としては、将来的な証跡必須化、主張と証跡の紐づけ、夜間監査Agent、JSONエクスポート、他システム連携に対応できる構造を持たせる。

---

## 2. システムの目的

本システムの目的は、以下のとおりである。

1. 達成内容、影響度、貢献度をWeb画面から入力できるようにする
2. PDF、PPTX、XLSX、画像などの関連資料を証跡として添付できるようにする
3. 証跡資料の有無、種類、対象軸を記録できるようにする
4. 管理者が提出状況、証跡状況、監査状況を一覧で確認できるようにする
5. 将来的に、主張と証跡の紐づけ、監査Agent、JSONエクスポートに発展できるようにする
6. 他システムに吸収されてもよいように、データを移行可能な構造で保持する

---

## 3. 基本方針

本システムは、以下の方針で設計する。

```text
利用者向け：
  初期段階ではMVP版として軽く見せる。
  証跡の完全性や厳密な紐づけは強制しない。

管理者向け：
  成果内容、証跡有無、証跡タイプ、提出状況を確認できるようにする。

内部設計：
  将来の証跡必須化、主張単位の紐づけ、監査Agent、JSONエクスポートに備える。

運用方針：
  初回は試行運用。
  次回または3か月後などのタイミングで、証跡提出や紐づけを段階的に強化する。
```

キーワードは以下である。

```text
UIはMVP
内部は本番相当
段階的に要求水準を上げる
データは最初から移行可能にする
```

---

## 4. 対象範囲

### 4.1 対象とする業務

* 期末・年度末の達成内容入力
* 影響度・貢献度の自己申告
* 関連資料・証跡資料の添付
* 証跡資料の有無・種類の登録
* 提出状況の確認
* 上長・管理者による確認
* 夜間バッチによる証跡確認
* JSON / CSV エクスポート

### 4.2 初期段階で対象外とするもの

* AI判定による評価確定
* 証跡不足による自動NG
* 人事評価点の自動算出
* 全ファイルの完全な内容監査
* 厳密なClaim単位の必須紐づけ
* 既存人事システムとの完全統合

ただし、将来的に対応できるよう、データ構造と内部処理は拡張可能にする。

---

## 5. フェーズ設計

## 5.1 Phase 0：試行・棚卸し段階

目的は、現場に「成果と根拠資料を残す」文化を作ることである。

この段階では、証跡資料の完全性は求めない。

### 主な内容

* 成果内容を入力する
* 影響度・貢献度を自己申告する
* 証跡資料がある場合は添付する
* 証跡資料がない場合は、その旨を登録できる
* 証跡タイプを選択する
* 管理者が提出状況を確認する
* CSV / JSON で出力できる

### 利用者向け説明

```text
今年度は、成果内容と関連資料を後から振り返れる形で記録する試行運用です。

証跡資料がある場合は添付してください。
現時点では、証跡資料がない場合も登録可能です。

次回以降、必要に応じて、成果内容と根拠資料の紐づけを段階的に標準化していく予定です。
```

---

## 5.2 Phase 1：MVP版

MVP版では、Webアプリとして以下を実装する。

* ログイン
* 自分の提出内容入力
* 影響度・貢献度の自己申告
* 証跡資料の添付
* 証跡資料の有無登録
* 証跡タイプの選択
* 証跡なし理由の入力
* 提出状態の管理
* 管理者一覧
* エクスポート

この段階では、表向きは軽量な入力システムとして扱う。

ただし、内部では以下も実装しておく。

* 証跡必須化の設定
* 監査Agent実行可否の設定
* 監査結果の保存
* JSONエクスポート
* 将来のClaim分解に備えたデータ構造
* モード切り替え用のポリシー設定

---

## 5.3 Phase 2：移行期

MVP運用後、次回または3か月後などのタイミングで、段階的に要求水準を上げる。

### 追加する運用

* 影響度を主張する場合は、根拠資料の添付を推奨または準必須にする
* 貢献度を主張する場合は、本人の関与が分かる説明または資料を求める
* 証跡がない場合は理由入力を必須にする
* 重要な成果については、主張と証跡の対応を明確にする
* 監査Agentの結果を管理者確認に利用する

この段階でも、AI判定は最終評価には使わない。
人間の確認を補助する位置づけとする。

---

## 5.4 Phase 3：本格運用

本格運用では、証跡提出と監査を強化する。

### 主な内容

* 証跡提出を原則必須にする
* Claim単位で証跡を紐づける
* 影響度・貢献度それぞれに根拠を求める
* 夜間監査Agentで根拠確認を行う
* 要確認項目を管理者・監査者に提示する
* 監査結果を台帳として保存する
* JSON / CSV で外部連携可能にする

---

## 6. 運用モード

本システムは、運用フェーズに応じて設定で動作を切り替えられるようにする。

| モード             | 位置づけ | 利用者への見せ方    | 内部処理              |
| --------------- | ---- | ----------- | ----------------- |
| Trial Mode      | 初期試行 | 証跡は任意       | 裏側で構造化保存          |
| MVP Mode        | 軽量運用 | 証跡有無・種類を登録  | 監査Agentは参考判定      |
| Transition Mode | 移行期  | 一部証跡を推奨・準必須 | Claim紐づけを段階導入     |
| Strict Mode     | 本格運用 | 証跡提出を原則必須   | 監査Agentと人手確認を正式運用 |

---

## 7. ポリシー設定

以下の設定により、システムの動作を切り替えられるようにする。

```text
evidenceRequired:
  証跡提出を必須にするか

claimLinkRequired:
  証跡を成果主張ごとに紐づけることを必須にするか

allowNoEvidenceReason:
  証跡なし理由の入力を許可するか

auditAgentEnabled:
  夜間監査Agentを実行するか

auditResultVisibleToUser:
  監査Agent結果を利用者に表示するか

auditResultVisibleToManager:
  監査Agent結果を管理者に表示するか

strictSubmissionValidation:
  提出時に証跡・入力不足をブロックするか

exportJsonEnabled:
  JSONエクスポートを有効にするか

exportCsvEnabled:
  CSVエクスポートを有効にするか
```

### 初期値

```text
evidenceRequired: false
claimLinkRequired: false
allowNoEvidenceReason: true
auditAgentEnabled: true
auditResultVisibleToUser: false
auditResultVisibleToManager: true
strictSubmissionValidation: false
exportJsonEnabled: true
exportCsvEnabled: true
```

---

## 8. 評価軸

本システムでは、成果を以下の2軸で扱う。

## 8.1 影響度

影響度は、その成果が組織、業務、品質、コスト、売上、効率、標準化などにどの程度影響したかを見る軸である。

### 初期段階の選択肢

```text
1. 自分の作業改善
2. チーム内改善
3. 部署内改善
4. 複数部署への影響
5. 全社・事業への影響
```

### 影響度の証跡例

* Before / After資料
* KPI資料
* コスト削減資料
* 作業時間記録
* 品質指標
* 展開資料
* 報告書
* 会議資料
* 承認資料
* システムログ

---

## 8.2 貢献度

貢献度は、その成果に対して本人がどの程度主体的に関与したかを見る軸である。

### 初期段階の選択肢

```text
1. 一部参加
2. 一部担当
3. 主要担当
4. 主導
5. 全体責任者
```

### 貢献度の証跡例

* 本人作成資料
* 設計書
* 企画書
* Issue / チケット
* 会議体での担当記録
* 承認履歴
* 実装記録
* 展開記録
* 上長コメント
* メール・チャット記録

---

## 9. 証跡の扱い

## 9.1 初期段階の考え方

初期段階では、証跡は厳密な監査対象ではなく、棚卸し対象として扱う。

目的は以下である。

* どの成果に対して資料が残っているかを見る
* どの種類の資料が多いかを見る
* どの部署・業務で証跡が残りにくいかを見る
* 次回以降、どの証跡を必須化すべきか検討する

---

## 9.2 証跡有無の選択肢

```text
資料あり
資料なし
資料準備中
資料は別システムに存在
機密資料のため添付不可
口頭・現場対応中心で資料化されていない
その他
```

「機密資料のため添付不可」の場合は、ファイル添付を強制しない。
その代わり、理由を記録する。

---

## 9.3 証跡タイプ

初期段階では、以下の選択式とする。

```text
報告書
会議資料
設計書
手順書
議事録
Excel集計
KPI資料
システムログ
メール・チャット記録
画像・写真
顧客・現場フィードバック
その他
```

---

## 9.4 証跡と評価軸の関係

証跡ごとに、どの評価軸に関係するかを選択する。

```text
影響度に関係
貢献度に関係
両方に関係
参考資料
未分類
```

初期段階では「未分類」を許容する。
ただし、将来はClaim単位での紐づけに移行できるようにする。

---

## 10. 機能要件

## 10.1 利用者機能

### 達成内容入力

利用者は、以下を入力できる。

```text
年度
部署
氏名
テーマ名
達成内容
影響度自己評価
影響度の説明
貢献度自己評価
貢献度の説明
証跡資料の有無
証跡なし理由
補足コメント
```

---

### 証跡資料添付

利用者は、以下のファイルを証跡として添付できる。

```text
PDF
PPTX
XLSX
CSV
画像
その他許可されたファイル
```

ファイル本体はS3に保存する。
アプリケーション側では、ファイルのメタデータのみをDynamoDBに保存する。

---

### 提出

利用者は入力内容を提出できる。

MVP段階では、証跡がなくても提出できる。
ただし、証跡なし理由を入力できるようにする。

Strict Modeでは、設定に応じて証跡なし提出を制限できるようにする。

---

## 10.2 管理者機能

管理者は、以下を確認できる。

```text
提出済み人数
未提出人数
証跡あり件数
証跡なし件数
証跡準備中件数
機密のため未添付件数
影響度別件数
貢献度別件数
部署別提出状況
証跡タイプ別件数
監査Agent結果
```

---

## 10.3 承認・確認機能

上長または管理者は、以下を行える。

```text
提出内容の確認
コメント入力
差戻し
承認
証跡確認
監査結果確認
人手確認ステータス更新
```

---

## 10.4 エクスポート機能

管理者は、以下の形式でデータを出力できる。

```text
CSV
JSON
```

JSONは、他システムへの移行・連携を前提に設計する。

---

## 10.5 夜間監査Agent機能

夜間バッチにより、以下を確認する。

```text
証跡ファイルが存在するか
ファイルが読めるか
証跡タイプと内容が大きく矛盾していないか
影響度の説明と資料が関係していそうか
貢献度の説明と資料が関係していそうか
資料なし理由が記録されているか
機密のため未添付とされたものに理由があるか
```

Agentの出力は、評価確定ではなく参考判定とする。

---

## 11. 画面要件

## 11.1 画面一覧

| 画面        | 利用者     | 目的                  |
| --------- | ------- | ------------------- |
| ログイン画面    | 全員      | 認証                  |
| ダッシュボード   | 全員      | 自分または部門の提出状況確認      |
| 達成内容入力画面  | 一般利用者   | 達成内容、影響度、貢献度の入力     |
| 証跡添付画面    | 一般利用者   | 関連資料の添付             |
| 提出確認画面    | 一般利用者   | 提出前確認               |
| 部門一覧画面    | 上長      | 部下・部門の提出状況確認        |
| 承認・差戻し画面  | 上長      | コメント、承認、差戻し         |
| 監査結果画面    | 管理者・監査者 | Agent判定結果の確認        |
| 未提出・要確認一覧 | 管理者     | 督促・確認対象の抽出          |
| エクスポート画面  | 管理者     | CSV / JSON出力        |
| マスタ管理画面   | システム管理者 | 年度、部署、テーマ、権限、ポリシー設定 |

---

## 11.2 入力画面の表現方針

初期段階では、監査色を強く出さない。

### 推奨表現

```text
この成果を説明する資料があれば添付してください。
現時点では、該当資料がない場合も登録できます。
次回以降、根拠資料の添付を段階的に標準化していく予定です。
```

### 避ける表現

```text
証跡が不足しています。
根拠不足です。
評価対象外です。
不備です。
```

---

## 12. 帳簿・データ設計

## 12.1 基本構造

初期段階では、以下の構造で保持する。

```text
Submission
  └── EvidenceFile
        └── AuditResult
```

将来的には以下に拡張する。

```text
Submission
  └── Claim
        └── EvidenceFile
              └── AuditResult
```

---

## 12.2 Submissions

提出本体を管理する。

```text
submissionId
fiscalYear
userId
departmentId
title
achievementText
impactLevelSelf
impactReason
contributionLevelSelf
contributionReason
hasEvidence
noEvidenceReason
status
createdAt
updatedAt
submittedAt
approvedAt
approverId
```

---

## 12.3 EvidenceFiles

証跡ファイルのメタデータを管理する。

```text
evidenceId
submissionId
s3Bucket
s3Key
originalFileName
contentType
fileSize
checksum
evidenceType
relatedAxis
description
uploadedBy
uploadedAt
isConfidential
storageStatus
```

---

## 12.4 AuditResults

夜間監査Agentの結果を管理する。

```text
auditId
auditRunId
submissionId
evidenceId
result
reason
confidence
relatedScore
impactSupportScore
contributionSupportScore
extractedSummary
citedLocation
checkedAt
modelName
modelVersion
```

### resultの候補

```text
OK
REFERENCE_AVAILABLE
NEED_REVIEW
WEAK_EVIDENCE
NO_EVIDENCE
PREPARING
CONFIDENTIAL_NOT_ATTACHED
UNREADABLE
```

---

## 12.5 ActivityLogs

操作ログを管理する。

```text
eventId
actorUserId
actorRole
action
targetType
targetId
beforeStatus
afterStatus
timestamp
ipAddress
userAgent
```

---

## 12.6 ExportJobs

エクスポート処理を管理する。

```text
exportJobId
fiscalYear
exportType
format
requestedBy
status
s3Key
createdAt
completedAt
```

---

## 12.7 将来拡張：Claims

本格運用時には、成果主張をClaimとして分解する。

```text
claimId
submissionId
claimType
axis
claimText
expectedEvidenceType
createdAt
updatedAt
```

---

## 12.8 将来拡張：ClaimEvidenceLinks

ClaimとEvidenceの紐づけを管理する。

```text
claimId
evidenceId
linkStrength
userComment
auditResult
```

---

## 13. IAM・権限設計

## 13.1 基本方針

AWS IAMとアプリ内権限を分ける。

```text
AWS IAM：
  Lambda、S3、DynamoDB、Step Functionsなどの実行権限を管理する。

アプリ内権限：
  誰がどの提出データを見られるか、編集できるかを管理する。
```

人間に広いAWS権限を渡さない。
ユーザーはWeb画面から操作する。
S3アクセスはpresigned URL経由を基本とする。

---

## 13.2 アプリ内ロール

| ロール      | 権限                            |
| -------- | ----------------------------- |
| 一般入力者    | 自分の提出内容の作成、編集、証跡添付、提出         |
| 上長・部門管理者 | 部下・部門の提出内容確認、コメント、差戻し、承認      |
| 事務局      | 全体進捗確認、締切管理、CSV/JSON出力、監査結果確認 |
| 監査者      | 証跡と監査結果の確認。原則編集不可             |
| システム管理者  | マスタ設定、年度設定、権限設定、ポリシー設定        |
| 監査Agent  | 夜間バッチで証跡確認、監査結果を書き込み          |

---

## 13.3 アクセス制御単位

以下の単位でアクセス制御する。

```text
fiscalYear
departmentId
userId
submissionId
role
```

---

## 13.4 権限例

```text
一般入力者：
  自分のSubmissionのみread/write

上長：
  自部署または配下組織のSubmissionをread
  コメント、差戻し、承認をwrite

事務局：
  全社read
  締切、マスタ、エクスポートをwrite

監査者：
  Submission、EvidenceFile、AuditResultをread
  人手確認コメントをwrite

監査Agent：
  EvidenceFiles read
  Submissions read
  AuditResults write
```

---

## 14. S3設計

## 14.1 保存方針

ファイル本体はS3に保存する。
Lambdaにファイル本体を通さず、presigned URLでブラウザからS3へ直接アップロードする。

```text
ブラウザ
  ↓
LambdaにアップロードURLを要求
  ↓
Lambdaがpresigned URLを発行
  ↓
ブラウザがS3へ直接アップロード
  ↓
メタデータをDynamoDBに保存
```

---

## 14.2 S3キー設計

```text
s3://evidence-bucket/
  fiscalYear=2026/
    departmentId=dept-001/
      userId=user-123/
        submissionId=sub-abc/
          evidenceId=file-xyz/
            original.pdf
```

この構造により、以下を追跡できる。

```text
年度
部署
ユーザー
提出データ
証跡ID
元ファイル
```

---

## 14.3 S3セキュリティ設定

```text
Block Public Access: ON
暗号化: ON
Versioning: ON
Lifecycle設定: ON
削除は原則論理削除
presigned URLの有効期限は短くする
アップロード可能な拡張子を制限する
```

---

## 15. 夜間監査Agent設計

## 15.1 実行方式

夜間バッチとして実行する。

```text
EventBridge Scheduler
  ↓
Step Functions
  ↓
監査対象のSubmission / EvidenceFileを列挙
  ↓
ファイル確認・テキスト抽出
  ↓
LLM判定
  ↓
AuditResults保存
```

小規模な段階では、Step Functionsを使わずLambda単体で開始してもよい。
ただし、将来的な拡張に備え、Step Functions化しやすい構成とする。

---

## 15.2 Agentの役割

Agentは評価者ではない。
あくまで一次チェック、確認補助、要確認抽出を行う。

### 確認項目

```text
証跡ファイルが存在するか
ファイルが読めるか
証跡タイプと内容が大きく矛盾していないか
達成内容と証跡が関連していそうか
影響度の説明と証跡が対応していそうか
貢献度の説明と証跡が対応していそうか
資料なし理由が記録されているか
機密資料のため未添付とされた場合、理由があるか
```

---

## 15.3 LLM判定項目

LLMは、以下のような参考値を出力する。

```text
関連度: 0〜100%
根拠の強さ: 0〜100%
影響度との対応: 0〜100%
貢献度との対応: 0〜100%
要確認理由
抽出された根拠文
対象ページ・スライド・シート
```

これらは最終評価ではない。
人間の確認を補助する情報として扱う。

---

## 16. JSONエクスポート設計

## 16.1 基本方針

本システムは、将来的に他システムへ吸収される可能性を前提とする。
そのため、MVP段階からJSONエクスポート機能を持つ。

### 連携先候補

```text
人事評価システム
文書管理システム
SharePoint
Box
社内DWH
Power BI
監査システム
別の内製アプリ
```

---

## 16.2 JSON構造例

```json
{
  "schemaVersion": "1.0",
  "exportedAt": "2026-06-07T00:00:00+09:00",
  "fiscalYear": "2026",
  "submissions": [
    {
      "submissionId": "sub-001",
      "userId": "user-001",
      "departmentId": "dept-001",
      "title": "集計作業の自動化",
      "achievementText": "月次集計作業を自動化し、作業時間を削減した。",
      "impact": {
        "selfLevel": 3,
        "label": "部署内改善",
        "reason": "部署内の月次作業に適用されたため"
      },
      "contribution": {
        "selfLevel": 4,
        "label": "主導",
        "reason": "要件整理から実装、運用説明まで担当したため"
      },
      "evidenceStatus": {
        "hasEvidence": true,
        "noEvidenceReason": null
      },
      "evidenceFiles": [
        {
          "evidenceId": "ev-001",
          "evidenceType": "Excel集計",
          "relatedAxis": "impact",
          "fileName": "before_after.xlsx",
          "s3Key": "fiscalYear=2026/departmentId=dept-001/userId=user-001/submissionId=sub-001/evidenceId=ev-001/before_after.xlsx",
          "description": "改善前後の作業時間を比較した資料"
        }
      ],
      "auditResults": [
        {
          "auditId": "audit-001",
          "result": "REFERENCE_AVAILABLE",
          "relatedScore": 82,
          "impactSupportScore": 76,
          "contributionSupportScore": 45,
          "reason": "影響度に関する資料は確認できるが、本人の貢献度を示す資料は弱い可能性がある。"
        }
      ],
      "status": "submitted"
    }
  ]
}
```

---

## 16.3 JSON設計上の必須項目

```text
schemaVersion
exportedAt
fiscalYear
userId
departmentId
submissionId
achievementText
impact
contribution
evidenceStatus
evidenceFiles
auditResults
status
```

---

## 17. 非機能要件

## 17.1 セキュリティ

```text
認証必須
ロールベースアクセス制御
S3 Block Public Access
S3暗号化
DynamoDB暗号化
操作ログ保存
証跡ファイルの直接公開禁止
presigned URLの短時間有効化
機密資料未添付の理由記録
```

---

## 17.2 可用性

小規模な社内システムであるため、常時高負荷を想定しない。

ただし、期末入力時にアクセスが集中する可能性があるため、サーバーレス構成により一時的な増加に対応する。

---

## 17.3 性能

初期段階では、以下を許容する。

```text
初回起動に多少時間がかかることを許容する
夜間バッチは即時性を求めない
ファイル解析は非同期で実行する
監査結果は翌日確認できればよい
```

---

## 17.4 保守性

```text
設定で運用モードを切り替えられる
UI文言を変更しやすくする
証跡タイプをマスタ管理できる
影響度・貢献度の選択肢を変更できる
JSONスキーマにschemaVersionを持つ
他システム移行を前提にする
```

---

## 18. 技術スタック

## 18.1 フロントエンド

```text
React + Vite
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
TanStack Table
React Hook Form
Zod
```

Next.jsを使う場合は以下とする。

```text
Next.js static export
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
TanStack Table
React Hook Form
Zod
```

ただし、Next.jsのサーバー機能は原則使わず、APIはAWS側に分離する。

---

## 18.2 AWS

```text
S3
CloudFront
API Gateway HTTP API
Lambda
DynamoDB
EventBridge Scheduler
Step Functions
CloudWatch Logs
KMS
Cognito or IAM Identity Center
```

---

## 18.3 監査処理

```text
Lambda
Step Functions
S3
DynamoDB
Textract optional
LLM API / Bedrock optional
```

---

## 19. MVPで必須とする機能

```text
ログイン
達成内容入力
影響度自己申告
貢献度自己申告
証跡有無登録
証跡ファイル添付
証跡タイプ選択
証跡なし理由入力
提出
管理者一覧
証跡一覧
CSVエクスポート
JSONエクスポート
S3保存
DynamoDB保存
基本的な権限制御
操作ログ
```

---

## 20. MVPで内部実装しておく機能

表向きには見せなくても、以下は内部的に実装しておく。

```text
運用モード切り替え
証跡必須化フラグ
Claim紐づけ必須化フラグ
監査Agent有効化フラグ
監査結果保存
監査結果の表示制御
JSONスキーマバージョン管理
証跡なし理由の構造化
機密未添付理由の構造化
将来Claim分解できるデータ設計
```

---

## 21. 初期段階ではやらないこと

```text
証跡必須化
証跡不足による提出ブロック
AI判定による評価確定
Claim単位の入力強制
全ファイルの完全監査
ページ番号・スライド番号の必須指定
厳密な評価点の自動算出
```

---

## 22. 導入メッセージ案

初期導入時には、以下のように説明する。

```text
今年度は、成果内容と関連資料を後から振り返れる形で記録するための試行運用を行います。

初年度は、証跡資料の完全性を求めるものではありません。
まずは、どのような成果に対して、どのような関連資料が残っているかを把握することを目的とします。

証跡資料がある場合は添付してください。
資料がない場合、準備中の場合、または機密上添付できない場合は、その旨を入力してください。

次回以降は、影響度・貢献度の説明や根拠資料の紐づけを段階的に標準化していく予定です。
```

---

## 23. 将来の本格運用メッセージ案

次回以降の運用強化時には、以下のように説明する。

```text
前回の試行運用を踏まえ、今回から成果内容と根拠資料の紐づけを段階的に強化します。

影響度を主張する場合は、できる限り定量的または第三者が確認可能な資料を添付してください。

貢献度を主張する場合は、本人の関与範囲が分かる資料、説明、または上長確認コメントを記録してください。

証跡がない場合は、その理由を入力してください。
機密上添付できない資料については、添付不可の理由と資料の所在を記録してください。

監査Agentの結果は最終評価ではなく、人間が確認すべき箇所を把握するための参考情報として利用します。
```

---

## 24. 最終的な到達イメージ

本システムの最終的な到達イメージは以下である。

```text
本人が成果を入力する
  ↓
影響度・貢献度を分けて説明する
  ↓
関連資料を証跡として添付する
  ↓
必要に応じて主張と証跡を紐づける
  ↓
夜間監査Agentが一次確認する
  ↓
管理者・上長・監査者が要確認箇所を見る
  ↓
承認・差戻し・コメントを行う
  ↓
JSON / CSVで他システムへ移行・連携できる
```

---

## 25. まとめ

本システムは、単なる期末入力フォームではなく、成果・影響度・貢献度・証跡資料を段階的に構造化していくための軽量な基盤である。

初期段階では、利用者に対して厳密な証跡提出を求めない。
ただし、内部的には本格運用に切り替えられる構造を持つ。

最も重要な設計方針は以下である。

```text
利用者には軽く見せる
管理者には状況を見せる
内部では構造化して残す
次回以降は証跡提出を段階的に強化する
最終的には他システムへ移行・連携できる形にする
```

以上をもって、MVP版から本格運用版へ段階的に移行可能な成果・証跡管理システムとして設計する。
