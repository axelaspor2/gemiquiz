# gemiquiz 実装計画

> **Claudeへ:** REQUIRED SUB-SKILL: この計画をタスクごとに実行するために superpowers:executing-plans を使用してください。

**目標:** Google Cloud資格勉強のための4択クイズCLIアプリ。Gemini APIで問題を動的生成し、スコア記録、Discord連携、GitHub Actions定期実行をサポート。

**アーキテクチャ:** services層でビジネスロジックを分離し、commands層からCLI経由で呼び出す構成。データはローカルJSONファイルで永続化。Discord連携はdiscord.jsを使用。

**技術スタック:** TypeScript, Node.js, @google/generative-ai, commander, @inquirer/prompts, discord.js, zod, vitest

---

## プロジェクト構成

```
gemiquiz/
├── src/
│   ├── index.ts                 # CLIエントリーポイント
│   ├── commands/                # CLIコマンド
│   │   ├── quiz.ts              # クイズ実行コマンド
│   │   ├── history.ts           # 履歴表示コマンド
│   │   └── discord.ts           # Discord送信コマンド
│   ├── services/                # ビジネスロジック
│   │   ├── gemini.ts            # Gemini API連携
│   │   ├── quiz.ts              # クイズロジック
│   │   ├── score.ts             # スコア管理
│   │   └── discord.ts           # Discord連携
│   ├── types/                   # 型定義
│   │   └── index.ts
│   └── utils/                   # ユーティリティ
│       ├── prompt.ts            # CLIプロンプト
│       └── storage.ts           # データ永続化
├── tests/                       # テスト
├── .github/workflows/           # GitHub Actions
├── data/                        # スコア・履歴データ
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## CLIコマンド設計

```bash
gemiquiz quiz [topic] -n <問題数>  # クイズ実行
gemiquiz history -l <件数>         # 履歴表示
gemiquiz stats                     # 統計表示
gemiquiz discord                   # Discordに問題送信
```

---

## タスク一覧

### Phase 1: プロジェクト基盤

#### タスク 1.1: package.json作成

**ファイル:**
- 作成: `package.json`

**ステップ 1: package.json作成**

```bash
npm init -y
```

**ステップ 2: 基本情報を編集**

```json
{
  "name": "gemiquiz",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "gemiquiz": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

**ステップ 3: コミット**

```bash
git add package.json
git commit -m "chore: initialize package.json"
```

---

#### タスク 1.2: TypeScript設定

**ファイル:**
- 作成: `tsconfig.json`

**ステップ 1: tsconfig.json作成**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**ステップ 2: コミット**

```bash
git add tsconfig.json
git commit -m "chore: add TypeScript configuration"
```

---

#### タスク 1.3: Vitest設定

**ファイル:**
- 作成: `vitest.config.ts`

**ステップ 1: vitest.config.ts作成**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

**ステップ 2: コミット**

```bash
git add vitest.config.ts
git commit -m "chore: add Vitest configuration"
```

---

#### タスク 1.4: 依存パッケージインストール

**ステップ 1: 本番依存インストール**

```bash
npm install @google/generative-ai commander @inquirer/prompts chalk zod
```

**ステップ 2: 開発依存インストール**

```bash
npm install -D typescript vitest tsx @types/node
```

**ステップ 3: コミット**

```bash
git add package.json package-lock.json
git commit -m "chore: install dependencies"
```

---

#### タスク 1.5: 型定義ファイル作成

**ファイル:**
- 作成: `src/types/index.ts`

**ステップ 1: 型定義を作成**

```typescript
/** クイズ問題 */
export interface QuizQuestion {
  id: string;
  question: string;
  choices: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/** ユーザーの回答 */
export interface UserAnswer {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  answeredAt: Date;
}

/** クイズ結果 */
export interface QuizResult {
  id: string;
  topic: string;
  questions: QuizQuestion[];
  answers: UserAnswer[];
  score: number;
  totalQuestions: number;
  percentage: number;
  startedAt: Date;
  completedAt: Date;
}

/** スコア統計 */
export interface ScoreStats {
  totalQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
  averagePercentage: number;
}
```

**ステップ 2: TypeScriptコンパイルチェック**

```bash
npx tsc --noEmit
```

**ステップ 3: コミット**

```bash
git add src/types/index.ts
git commit -m "feat: add type definitions"
```

---

### Phase 2: Gemini API連携

#### タスク 2.1: GeminiServiceスケルトン

**ファイル:**
- 作成: `src/services/gemini.ts`
- テスト: `tests/services/gemini.test.ts`

**ステップ 1: 失敗するテストを書く**

```typescript
// tests/services/gemini.test.ts
import { describe, it, expect } from 'vitest';
import { GeminiService } from '../../src/services/gemini';

describe('GeminiService', () => {
  it('インスタンスを生成できる', () => {
    const service = new GeminiService('dummy-api-key');
    expect(service).toBeInstanceOf(GeminiService);
  });
});
```

**ステップ 2: テスト実行（FAIL確認）**

```bash
npm run test:run
```

期待: FAIL - `Cannot find module`

**ステップ 3: 最小限の実装**

```typescript
// src/services/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private model;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
}
```

**ステップ 4: テスト実行（PASS確認）**

```bash
npm run test:run
```

期待: PASS

**ステップ 5: コミット**

```bash
git add src/services/gemini.ts tests/services/gemini.test.ts
git commit -m "feat: add GeminiService skeleton"
```

---

#### タスク 2.2: Zodスキーマ定義

**ファイル:**
- 作成: `src/types/schemas.ts`
- テスト: `tests/types/schemas.test.ts`

**ステップ 1: 失敗するテストを書く**

```typescript
// tests/types/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { QuizQuestionSchema, GeminiResponseSchema } from '../../src/types/schemas';

describe('QuizQuestionSchema', () => {
  it('正常なデータをパースできる', () => {
    const validData = {
      id: 'q1',
      question: 'GCPとは何ですか？',
      choices: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      explanation: '解説',
      topic: 'gcp-ace',
      difficulty: 'medium',
    };
    expect(() => QuizQuestionSchema.parse(validData)).not.toThrow();
  });

  it('不正なcorrectIndexでエラーになる', () => {
    const invalidData = {
      id: 'q1',
      question: 'GCPとは何ですか？',
      choices: ['A', 'B', 'C', 'D'],
      correctIndex: 5, // 不正
      explanation: '解説',
      topic: 'gcp-ace',
      difficulty: 'medium',
    };
    expect(() => QuizQuestionSchema.parse(invalidData)).toThrow();
  });
});
```

**ステップ 2: テスト実行（FAIL確認）**

```bash
npm run test:run
```

**ステップ 3: 最小限の実装**

```typescript
// src/types/schemas.ts
import { z } from 'zod';

export const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctIndex: z.number().min(0).max(3),
  explanation: z.string(),
  topic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const GeminiResponseSchema = z.object({
  questions: z.array(QuizQuestionSchema),
});

export type QuizQuestionFromSchema = z.infer<typeof QuizQuestionSchema>;
```

**ステップ 4: テスト実行（PASS確認）**

```bash
npm run test:run
```

**ステップ 5: コミット**

```bash
git add src/types/schemas.ts tests/types/schemas.test.ts
git commit -m "feat: add Zod schemas for API response validation"
```

---

#### タスク 2.3: buildPromptメソッド実装

**ファイル:**
- 修正: `src/services/gemini.ts`
- 修正: `tests/services/gemini.test.ts`

**ステップ 1: 失敗するテストを追加**

```typescript
// tests/services/gemini.test.ts に追加
describe('buildPrompt', () => {
  it('トピックと問題数がプロンプトに含まれる', () => {
    const service = new GeminiService('dummy-key');
    const prompt = (service as any).buildPrompt('gcp-ace', 5);

    expect(prompt).toContain('gcp-ace');
    expect(prompt).toContain('5');
    expect(prompt).toContain('JSON');
  });
});
```

**ステップ 2: テスト実行（FAIL確認）**

**ステップ 3: 実装**

```typescript
// src/services/gemini.ts に追加
private buildPrompt(topic: string, count: number): string {
  return `
あなたはGoogle Cloud認定試験の問題作成者です。
以下の条件で${count}問の4択クイズを作成してください。

トピック: ${topic}
形式: JSON

出力形式:
{
  "questions": [
    {
      "id": "q1",
      "question": "問題文",
      "choices": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "correctIndex": 0,
      "explanation": "解説",
      "topic": "${topic}",
      "difficulty": "medium"
    }
  ]
}

JSONのみを出力し、他のテキストは含めないでください。
`.trim();
}
```

**ステップ 4: テスト実行（PASS確認）**

**ステップ 5: コミット**

```bash
git add src/services/gemini.ts tests/services/gemini.test.ts
git commit -m "feat: implement buildPrompt method"
```

---

#### タスク 2.4: parseResponseメソッド実装

**ファイル:**
- 修正: `src/services/gemini.ts`
- 修正: `tests/services/gemini.test.ts`

**ステップ 1: 失敗するテストを追加**

```typescript
describe('parseResponse', () => {
  it('JSON文字列をQuizQuestion配列に変換する', () => {
    const service = new GeminiService('dummy-key');
    const json = JSON.stringify({
      questions: [{
        id: 'q1',
        question: 'テスト',
        choices: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        explanation: '解説',
        topic: 'test',
        difficulty: 'medium',
      }]
    });

    const result = (service as any).parseResponse(json);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('q1');
  });

  it('不正なJSONでエラーをスローする', () => {
    const service = new GeminiService('dummy-key');
    expect(() => (service as any).parseResponse('invalid')).toThrow();
  });
});
```

**ステップ 2: テスト実行（FAIL確認）**

**ステップ 3: 実装**

```typescript
// src/services/gemini.ts に追加
import { GeminiResponseSchema } from '../types/schemas';
import type { QuizQuestion } from '../types';

private parseResponse(text: string): QuizQuestion[] {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const validated = GeminiResponseSchema.parse(parsed);
  return validated.questions;
}
```

**ステップ 4: テスト実行（PASS確認）**

**ステップ 5: コミット**

```bash
git add src/services/gemini.ts tests/services/gemini.test.ts
git commit -m "feat: implement parseResponse method with Zod validation"
```

---

#### タスク 2.5: generateQuizメソッド実装

**ファイル:**
- 修正: `src/services/gemini.ts`
- 修正: `tests/services/gemini.test.ts`

**ステップ 1: 失敗するテストを追加**

```typescript
import { vi } from 'vitest';

describe('generateQuiz', () => {
  it('Gemini APIを呼び出してクイズを生成する', async () => {
    const mockResponse = {
      questions: [{
        id: 'q1',
        question: 'Cloud Storageのストレージクラスは？',
        choices: ['Standard', 'Nearline', 'Coldline', '全て正解'],
        correctIndex: 3,
        explanation: '全てCloud Storageのストレージクラスです',
        topic: 'gcp-ace',
        difficulty: 'medium',
      }]
    };

    const service = new GeminiService('dummy-key');
    // モデルをモック
    (service as any).model = {
      generateContent: vi.fn().mockResolvedValue({
        response: { text: () => JSON.stringify(mockResponse) }
      })
    };

    const result = await service.generateQuiz('gcp-ace', 1);

    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe('gcp-ace');
  });
});
```

**ステップ 2: テスト実行（FAIL確認）**

**ステップ 3: 実装**

```typescript
// src/services/gemini.ts
async generateQuiz(topic: string, count: number): Promise<QuizQuestion[]> {
  const prompt = this.buildPrompt(topic, count);
  const result = await this.model.generateContent(prompt);
  const text = result.response.text();
  return this.parseResponse(text);
}
```

**ステップ 4: テスト実行（PASS確認）**

**ステップ 5: コミット**

```bash
git add src/services/gemini.ts tests/services/gemini.test.ts
git commit -m "feat: implement generateQuiz method"
```

---

### Phase 3: クイズロジック

#### タスク 3.1: QuizServiceスケルトン

**ファイル:**
- 作成: `src/services/quiz.ts`
- テスト: `tests/services/quiz.test.ts`

（Phase 2と同様のTDDサイクル）

---

#### タスク 3.2: calculateResultメソッド実装

**ファイル:**
- 修正: `src/services/quiz.ts`
- 修正: `tests/services/quiz.test.ts`

**ステップ 1: 失敗するテストを書く**

```typescript
describe('calculateResult', () => {
  it('正答数と正答率が正しく計算される', () => {
    const service = new QuizService();
    const questions = createMockQuestions(5);
    const answers = [
      { questionId: 'q1', selectedIndex: 0, isCorrect: true, answeredAt: new Date() },
      { questionId: 'q2', selectedIndex: 1, isCorrect: false, answeredAt: new Date() },
      { questionId: 'q3', selectedIndex: 0, isCorrect: true, answeredAt: new Date() },
      { questionId: 'q4', selectedIndex: 2, isCorrect: true, answeredAt: new Date() },
      { questionId: 'q5', selectedIndex: 0, isCorrect: false, answeredAt: new Date() },
    ];

    const result = (service as any).calculateResult(questions, answers);

    expect(result.score).toBe(3);
    expect(result.totalQuestions).toBe(5);
    expect(result.percentage).toBe(60);
  });
});

function createMockQuestions(count: number): QuizQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q${i + 1}`,
    question: `質問${i + 1}`,
    choices: ['A', 'B', 'C', 'D'] as [string, string, string, string],
    correctIndex: 0,
    explanation: '解説',
    topic: 'test',
    difficulty: 'medium' as const,
  }));
}
```

**ステップ 2-5:** （標準TDDサイクル）

---

### Phase 4: スコア管理

#### タスク 4.1-4.3: ScoreService実装

（Phase 2-3と同様のTDDサイクル）

---

### Phase 5: CLIコマンド

#### タスク 5.1: エントリーポイント作成

**ファイル:**
- 作成: `src/index.ts`

**実装:**

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { quizCommand } from './commands/quiz';
import { historyCommand } from './commands/history';

const program = new Command();

program
  .name('gemiquiz')
  .description('Gemini AIを使ったGoogle Cloud資格クイズ')
  .version('0.1.0');

program.addCommand(quizCommand);
program.addCommand(historyCommand);

program.parse();
```

---

### Phase 6: Discord連携（後回し可能）

Discord連携はPhase 5完了後に追加する。基本的なCLI機能が動作することを優先。

---

### Phase 7: GitHub Actions

**ファイル:**
- 作成: `.github/workflows/daily-quiz.yml`

```yaml
name: Daily Quiz to Discord

on:
  schedule:
    - cron: '0 9 * * *'
  workflow_dispatch:

jobs:
  send-quiz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run discord
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          DISCORD_TOKEN: ${{ secrets.DISCORD_TOKEN }}
          DISCORD_CHANNEL_ID: ${{ secrets.DISCORD_CHANNEL_ID }}
```

---

## 検証方法

### 単体テスト

```bash
npm run test:run
```

### 統合テスト（手動）

```bash
# クイズ実行
GEMINI_API_KEY=your-key npm run dev quiz gcp-ace -n 3

# 履歴確認
npm run dev history

# ビルド確認
npm run build
```

### Discord連携テスト

```bash
GEMINI_API_KEY=your-key \
DISCORD_TOKEN=your-token \
DISCORD_CHANNEL_ID=your-channel \
npm run dev discord
```

---

## 重要ファイル

- `src/services/gemini.ts` - Gemini API連携のコアロジック
- `src/types/index.ts` - 全コンポーネントで共有する型定義
- `src/services/quiz.ts` - クイズ実行ロジック
- `src/index.ts` - CLIエントリーポイント
- `vitest.config.ts` - テスト設定
