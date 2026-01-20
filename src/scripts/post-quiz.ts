import fs from "node:fs";
import path from "node:path";
import { getTodaysTopic } from "../rotation/index.js";
import { generateQuiz, selectDifficulty } from "../quiz/generator.js";
import { postQuiz } from "../discord/client.js";
import type { Quiz } from "../quiz/types.js";

const EXAM_CODE = "PDE";

interface PostQuizOptions {
  dryRun?: boolean;
  examCode?: string;
  date?: Date;
}

async function main(options: PostQuizOptions = {}) {
  const { dryRun = false, examCode = EXAM_CODE, date = new Date() } = options;

  console.log("🚀 Starting quiz generation...");
  console.log(`📅 Date: ${date.toISOString()}`);

  // 1. Get today's topic
  console.log("\n📋 Selecting topic...");
  const topic = getTodaysTopic(examCode, date);
  console.log(`  Domain: ${topic.domain}`);
  console.log(`  Section: ${topic.section}`);
  console.log(`  Topic: ${topic.topic}`);

  // 2. Select difficulty
  const difficulty = selectDifficulty(date);
  console.log(`  Difficulty: ${difficulty}`);

  // 3. Generate quiz
  console.log("\n🤖 Generating quiz with Gemini...");
  const quiz = await generateQuiz({ topic, difficulty, date });
  console.log(`  Quiz ID: ${quiz.id}`);
  console.log(`  Question: ${quiz.question.slice(0, 50)}...`);

  // 4. Save quiz data for answer posting
  const dataDir = path.join(process.cwd(), "data", "current");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const quizPath = path.join(dataDir, "quiz.json");
  fs.writeFileSync(quizPath, JSON.stringify(quiz, null, 2));
  console.log(`\n💾 Quiz saved to: ${quizPath}`);

  // 5. Post to Discord (unless dry-run)
  if (dryRun) {
    console.log("\n🔍 Dry run mode - skipping Discord post");
    console.log("\n📝 Generated Quiz:");
    console.log(JSON.stringify(quiz, null, 2));
  } else {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error("DISCORD_WEBHOOK_URL environment variable is required");
    }

    console.log("\n📤 Posting to Discord...");
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
    console.log(`\n💾 Post data saved to: ${postPath}`);
  }

  console.log("\n✅ Done!");
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

main({ dryRun }).catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
