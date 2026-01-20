# クイズ生成改善計画

## 概要

以下の3つの改善を実施:
1. **トピックローテーション改善** - 時間帯ごとに異なるトピックを選択
2. **問題タイプの導入** - 概念・ベストプラクティス・トラブルシューティングなど
3. **Gemini CLI + MCP サーバー統合** - 公式ドキュメントを参照して問題生成

---

## 1. トピックローテーション改善

**ファイル:** `src/rotation/index.ts`

```typescript
export function selectTopicByDate(
  topics: FlattenedTopic[],
  date: Date = new Date()
): FlattenedTopic {
  const dayOfYear = getDayOfYear(date);
  const hour = date.getUTCHours();

  // 時間帯を判定 (UTC: 0, 4, 9 → slot: 0, 1, 2)
  let slot = 0;
  if (hour >= 9) slot = 2;
  else if (hour >= 4) slot = 1;

  const index = (dayOfYear * 3 + slot) % topics.length;
  return topics[index];
}
```

---

## 2. 問題タイプの導入

| タイプ | 説明 | 時間帯 (UTC) |
|--------|------|--------------|
| `concept` | 概念・定義の理解を問う | 0:00 (JST 9:00) |
| `best-practice` | ベストプラクティス・推奨設定 | 4:00 (JST 13:00) |
| `troubleshooting` | 問題解決・トラブルシューティング | 9:00 (JST 18:00) |

**ファイル:** `src/quiz/types.ts` に型追加

```typescript
export type QuestionType = "concept" | "best-practice" | "troubleshooting";
```

**ファイル:** `src/rotation/index.ts` に関数追加

```typescript
export function selectQuestionType(date: Date = new Date()): QuestionType {
  const hour = date.getUTCHours();
  if (hour >= 9) return "troubleshooting";
  if (hour >= 4) return "best-practice";
  return "concept";
}
```

---

## 3. Gemini CLI + MCP サーバー統合

### アーキテクチャ

```
GitHub Actions
     │
     ├─ 1. MCP サーバーをセットアップ (uv)
     │
     ├─ 2. Gemini CLI 設定ファイルを生成
     │
     └─ 3. gemini -p "プロンプト" --output-format json
            │
            ↓ MCP
     Google Cloud Documentation MCP
            │
            ↓
     cloud.google.com (公式ドキュメント)
```

### Gemini CLI の実行方法

```bash
# non-interactive モードで実行
gemini -p "プロンプト" --output-format json --yolo
```

- `-p`: non-interactive モード
- `--output-format json`: JSON 出力
- `--yolo`: 確認なしでツール実行

### MCP サーバー設定 (Docker)

**Docker イメージ:** `axelaspor2/gcp-document-mcp`

**ファイル:** `gemini-settings.json` (新規作成)

```json
{
  "mcpServers": {
    "gcp-docs": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "axelaspor2/gcp-document-mcp"],
      "timeout": 60000,
      "trust": true
    }
  }
}
```

### プロンプト改善

**ファイル:** `prompts/generate-quiz.md` (更新)

```markdown
# クイズ生成リクエスト

## 手順

1. まず `search_documentation` ツールで「{{topic}}」を検索
2. 検索結果から最も関連性の高い URL を選択
3. `read_documentation` ツールでドキュメントを取得
4. ドキュメント内容に基づいて問題を作成

## 問題タイプ: {{question_type}}

{{question_type_instruction}}

## 出力形式
...
```

---

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|----------|------|------|
| `src/rotation/index.ts` | 修正 | `selectTopicByDate` 修正、`selectQuestionType` 追加 |
| `src/quiz/types.ts` | 修正 | `QuestionType` 型を追加 |
| `prompts/generate-quiz.md` | 修正 | MCP ツール使用指示、問題タイプ対応 |
| `src/scripts/post-quiz.ts` | 修正 | Gemini CLI 呼び出しに変更 |
| `gemini-settings.json` | 新規 | MCP サーバー設定 |
| `.github/workflows/post-quiz.yml` | 修正 | Gemini CLI + MCP セットアップ |

---

## GitHub Actions ワークフロー（キャッシュ対応）

```yaml
jobs:
  post-quiz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      # Docker イメージのキャッシュ
      - name: Cache Docker images
        uses: actions/cache@v4
        with:
          path: /tmp/docker-cache
          key: docker-gcp-mcp-${{ hashFiles('gemini-settings.json') }}
          restore-keys: |
            docker-gcp-mcp-

      - name: Load Docker cache
        run: |
          if [ -f /tmp/docker-cache/gcp-mcp.tar ]; then
            docker load < /tmp/docker-cache/gcp-mcp.tar
            echo "Docker cache loaded"
          fi

      - name: Pull MCP server image
        run: |
          if ! docker image inspect axelaspor2/gcp-document-mcp > /dev/null 2>&1; then
            docker pull axelaspor2/gcp-document-mcp
          fi

      - name: Save Docker cache
        run: |
          mkdir -p /tmp/docker-cache
          docker save axelaspor2/gcp-document-mcp > /tmp/docker-cache/gcp-mcp.tar

      # Gemini CLI キャッシュ
      - name: Cache Gemini CLI
        uses: actions/cache@v4
        with:
          path: ~/.npm/_npx
          key: gemini-cli-${{ runner.os }}

      - name: Install Gemini CLI
        run: npm install -g @google/gemini-cli

      # Gemini 設定
      - name: Configure Gemini
        run: |
          mkdir -p ~/.gemini
          cp gemini-settings.json ~/.gemini/settings.json

      # クイズ生成
      - name: Generate and post quiz
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
        run: npm run post-quiz
```

### キャッシュ内容

| キャッシュ | 対象 | キー |
|-----------|------|-----|
| npm | `node_modules` | package-lock.json のハッシュ |
| Docker | MCP サーバーイメージ | `docker-gcp-mcp-*` |
| Gemini CLI | グローバルインストール | `gemini-cli-{OS}` |

---

## 検証方法

### ローカルテスト

```bash
# MCP サーバー (Docker) 単体テスト
docker run --rm -i axelaspor2/gcp-document-mcp

# Gemini CLI 設定
mkdir -p ~/.gemini
cp gemini-settings.json ~/.gemini/settings.json

# Gemini CLI + MCP テスト
gemini -p "BigQueryのパーティショニングについて検索して概要を教えて"

# クイズ生成テスト
npm run post-quiz -- --dry-run
```

### 確認項目

1. Docker イメージが正常に動作する
2. Gemini CLI から MCP ツールが呼び出される
3. 各時間帯で異なるトピック・問題タイプが選択される
4. 生成された問題がドキュメント内容を反映している
