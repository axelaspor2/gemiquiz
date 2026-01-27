# GemiQuiz

Google Gemini AI を使用して GCP 認定試験の学習クイズを自動生成し、Discord に投稿するツールです。

## 特徴

- **自動クイズ生成**: Google Gemini API を使用して、GCP 認定試験に基づいたクイズを自動生成
- **Discord 連携**: Webhook 経由でクイズを Discord チャンネルに投稿
- **トピックローテーション**: 試験ドメインを網羅的にカバーする自動トピック選択
- **難易度調整**: 曜日に応じた難易度設定（月〜水: Easy、木〜金: Medium、週末: Hard）
- **投票統計**: Discord のリアクションを集計し、正答率を表示

## 対応試験

- **PMLE**: Professional Machine Learning Engineer
- **PDE**: Professional Data Engineer

## 技術スタック

- **言語**: TypeScript 5.7
- **ランタイム**: Node.js (≥20.0.0)
- **AI/LLM**: Google Generative AI (Gemini API)
- **Discord**: discord.js 14

## セットアップ

### 必要条件

- Node.js 20.0.0 以上
- npm

### インストール

```bash
npm install
```

### 環境変数

以下の環境変数を設定してください：

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GEMINI_API_KEY` | ✅ | Gemini API キー（または `GOOGLE_API_KEY`） |
| `DISCORD_WEBHOOK_URL` | ✅ | Discord Webhook URL |
| `DISCORD_BOT_TOKEN` | - | リアクション収集用の Bot トークン |
| `GEMINI_MODEL` | - | 使用するモデル（デフォルト: `gemini-2.5-flash`） |

## 使い方

### ビルド

```bash
npm run build
```

### クイズを投稿

```bash
npm run post-quiz
```

ドライランモード（投稿せずにプレビュー）：

```bash
npm run post-quiz -- --dry-run
```

### 解答を投稿

```bash
npm run post-answer
```

### 型チェック

```bash
npm run typecheck
```

## プロジェクト構造

```
gemiquiz/
├── src/
│   ├── discord/           # Discord 連携
│   │   ├── client.ts      # Webhook 投稿
│   │   ├── formatter.ts   # Embed フォーマット
│   │   └── reactions.ts   # リアクション収集
│   ├── quiz/              # クイズ生成
│   │   ├── generator.ts   # Gemini API 連携
│   │   ├── parser.ts      # レスポンス解析
│   │   └── types.ts       # 型定義・スキーマ
│   ├── rotation/          # トピックローテーション
│   │   ├── domains.ts     # 試験ドメインスキーマ
│   │   └── index.ts       # トピック選択ロジック
│   └── scripts/           # CLI エントリーポイント
│       ├── post-quiz.ts   # クイズ投稿スクリプト
│       └── post-answer.ts # 解答投稿スクリプト
├── data/
│   ├── current/           # 現在のクイズデータ
│   └── exam-domains/      # 試験ドメイン定義（YAML）
├── prompts/               # LLM プロンプトテンプレート
└── .github/workflows/     # GitHub Actions 自動化
```

## 自動化

GitHub Actions により、以下のスケジュールでクイズが自動投稿されます：

- **クイズ投稿**: 毎日 9:00、13:00、18:00（JST）
- **解答投稿**: クイズ投稿の 15 分後

## ライセンス

MIT
