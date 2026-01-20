import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getTodaysTopic, selectQuestionType, generateQuizId } from "../rotation/index.js";
import { selectDifficulty } from "../quiz/generator.js";
import { postQuiz } from "../discord/client.js";
import type { Quiz, QuestionType } from "../quiz/types.js";
import { QuizSchema } from "../quiz/types.js";

const EXAM_CODE = "PDE";

interface PostQuizOptions {
  dryRun?: boolean;
  examCode?: string;
  date?: Date;
}

/**
 * Get question type instruction text based on the question type
 */
function getQuestionTypeInstruction(questionType: QuestionType): string {
  switch (questionType) {
    case "concept":
      return `概念・定義の理解を問う問題を作成してください。
- サービスや機能の基本的な概念を確認する
- 用語の定義や意味を問う
- 「〜とは何か」「〜の目的は何か」といった形式`;
    case "best-practice":
      return `ベストプラクティス・推奨設定を問う問題を作成してください。
- Google Cloud が推奨する設計パターンや設定を確認する
- セキュリティ、パフォーマンス、コスト最適化のベストプラクティス
- 「〜の場合、どの設定が推奨されるか」といった形式`;
    case "troubleshooting":
      return `問題解決・トラブルシューティングを問う問題を作成してください。
- エラーや問題が発生した際の対処方法を確認する
- ログやメトリクスの分析に基づく問題特定
- 「〜というエラーが発生した場合、どのように対処すべきか」といった形式`;
  }
}

/**
 * Load and fill prompt template
 */
function loadPrompt(
  templateName: string,
  variables: Record<string, string>
): string {
  const templatePath = path.join(process.cwd(), "prompts", `${templateName}.md`);
  let content = fs.readFileSync(templatePath, "utf-8");

  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  return content;
}

/**
 * Generate quiz using Gemini CLI with MCP server
 */
async function generateQuizWithGeminiCLI(
  topic: ReturnType<typeof getTodaysTopic>,
  difficulty: string,
  questionType: QuestionType,
  date: Date
): Promise<Quiz> {
  // Load prompts
  const systemPrompt = loadPrompt("system-prompt", {});
  const userPrompt = loadPrompt("generate-quiz", {
    exam_code: topic.exam_code,
    domain: topic.domain,
    section: topic.section,
    topic: topic.topic,
    difficulty: difficulty,
    question_type: questionType,
    question_type_instruction: getQuestionTypeInstruction(questionType),
  });

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  console.log("  Prompt prepared, calling Gemini CLI...");

  // Write prompt to temp file to avoid shell escaping issues
  const tmpDir = os.tmpdir();
  const promptFile = path.join(tmpDir, `gemini-prompt-${Date.now()}.txt`);
  fs.writeFileSync(promptFile, fullPrompt, "utf-8");

  try {
    // Execute Gemini CLI with prompt from stdin
    // Gemini CLI uses GOOGLE_API_KEY environment variable
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
    const result = execSync(`cat "${promptFile}" | gemini --model ${model} --yolo`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: {
        ...process.env,
        GOOGLE_API_KEY: apiKey,
      },
      shell: "/bin/bash",
    });

    console.log("  Gemini CLI response received, parsing...");

    // Extract JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from Gemini CLI response");
    }

    const rawQuiz = JSON.parse(jsonMatch[0]);

    // Build full Quiz object
    const quiz: Quiz = {
      id: generateQuizId(topic, date),
      exam_code: topic.exam_code,
      domain: topic.domain,
      section: topic.section,
      topic: topic.topic,
      difficulty: difficulty as "easy" | "medium" | "hard",
      question: rawQuiz.question,
      options: rawQuiz.options,
      correct: rawQuiz.correct,
      explanation: rawQuiz.explanation,
    };

    // Validate with schema
    QuizSchema.parse(quiz);

    return quiz;
  } finally {
    // Clean up temp file
    if (fs.existsSync(promptFile)) {
      fs.unlinkSync(promptFile);
    }
  }
}

async function main(options: PostQuizOptions = {}) {
  const { dryRun = false, examCode = EXAM_CODE, date = new Date() } = options;

  console.log("Starting quiz generation...");
  console.log(`Date: ${date.toISOString()}`);

  // 1. Get today's topic
  console.log("\nSelecting topic...");
  const topic = getTodaysTopic(examCode, date);
  console.log(`  Domain: ${topic.domain}`);
  console.log(`  Section: ${topic.section}`);
  console.log(`  Topic: ${topic.topic}`);

  // 2. Select difficulty and question type
  const difficulty = selectDifficulty(date);
  const questionType = selectQuestionType(date);
  console.log(`  Difficulty: ${difficulty}`);
  console.log(`  Question Type: ${questionType}`);

  // 3. Generate quiz using Gemini CLI
  console.log("\nGenerating quiz with Gemini CLI...");
  const quiz = await generateQuizWithGeminiCLI(topic, difficulty, questionType, date);
  console.log(`  Quiz ID: ${quiz.id}`);
  console.log(`  Question: ${quiz.question.slice(0, 50)}...`);

  // 4. Save quiz data for answer posting
  const dataDir = path.join(process.cwd(), "data", "current");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const quizPath = path.join(dataDir, "quiz.json");
  fs.writeFileSync(quizPath, JSON.stringify(quiz, null, 2));
  console.log(`\nQuiz saved to: ${quizPath}`);

  // 5. Post to Discord (unless dry-run)
  if (dryRun) {
    console.log("\nDry run mode - skipping Discord post");
    console.log("\nGenerated Quiz:");
    console.log(JSON.stringify(quiz, null, 2));
  } else {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error("DISCORD_WEBHOOK_URL environment variable is required");
    }

    console.log("\nPosting to Discord...");
    const result = await postQuiz(webhookUrl, quiz);
    console.log(`  Message ID: ${result.messageId}`);
    console.log(`  Channel ID: ${result.channelId}`);

    // Save post metadata
    const postData = {
      quiz,
      message_id: result.messageId,
      channel_id: result.channelId,
      posted_at: new Date().toISOString(),
    };
    const postPath = path.join(dataDir, "post.json");
    fs.writeFileSync(postPath, JSON.stringify(postData, null, 2));
    console.log(`\nPost data saved to: ${postPath}`);
  }

  console.log("\nDone!");
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

main({ dryRun }).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
