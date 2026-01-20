# Phase 2: 解答機能 実装計画

## 概要

問題投稿後に解答を自動投稿する機能を実装する。
リアクション集計は Bot Token がある場合のみ動作（オプション）。

---

## 既存コードの確認

以下は Phase 1 で実装済み：

| ファイル | 実装済み機能 |
|----------|-------------|
| `src/quiz/types.ts` | `QuizPost`, `ReactionStats`, `EMOJI_TO_INDEX` |
| `src/discord/formatter.ts` | `formatAnswerEmbed()`, `formatAnswerEmbedWithStats()` |
| `src/discord/client.ts` | `postAnswer()` |
| `data/current/post.json` | `message_id`, `channel_id` が保存される |

---

## 実装タスク

### 1. `src/discord/reactions.ts`（新規作成）

Discord Bot Token を使ってメッセージのリアクションを取得する。

```typescript
// 主要な関数
export async function getReactions(
  channelId: string,
  messageId: string,
  botToken: string
): Promise<ReactionStats>
```

**実装詳細:**
- Discord REST API を直接呼び出し（`discord.js` の Client は不要）
- エンドポイント: `GET /channels/{channel_id}/messages/{message_id}`
- 🅰️🅱️🇨🇩 のリアクション数をカウント
- Bot Token がない場合は `{ a: 0, b: 0, c: 0, d: 0 }` を返す

### 2. `src/scripts/post-answer.ts`（新規作成）

解答投稿のエントリーポイント。

**処理フロー:**
1. `data/current/post.json` を読み込む
2. （オプション）Bot Token があればリアクションを集計
3. 解答 Embed を Discord に投稿
4. `--dry-run` オプション対応

**環境変数:**
- `DISCORD_WEBHOOK_URL` - 必須
- `DISCORD_BOT_TOKEN` - オプション（統計表示用）

### 3. `.github/workflows/post-answer.yml`（新規作成）

問題投稿の15分後に解答を投稿するワークフロー。

**スケジュール:**
- `cron: "15 0 * * *"` (UTC 0:15 = JST 9:15)

**依存関係:**
- `data/current/` ディレクトリの quiz.json と post.json を使用
- post-quiz.yml が先に実行される前提

---

## ファイル一覧

| ファイル | 操作 |
|----------|------|
| `src/discord/reactions.ts` | 新規作成 |
| `src/scripts/post-answer.ts` | 新規作成 |
| `.github/workflows/post-answer.yml` | 新規作成 |

---

## 検証方法

### ローカルテスト（Bot Token なし）

```bash
DISCORD_WEBHOOK_URL=xxx npm run post-answer -- --dry-run
```

### ローカルテスト（Bot Token あり）

```bash
DISCORD_WEBHOOK_URL=xxx DISCORD_BOT_TOKEN=xxx npm run post-answer
```

### 動作確認項目

1. `post.json` から quiz データが正しく読み込まれる
2. 解答 Embed が Discord に投稿される
3. Bot Token がある場合、リアクション統計が表示される
4. Bot Token がない場合でも、解答のみが投稿される
