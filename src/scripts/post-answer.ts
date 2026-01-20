import fs from "node:fs";
import path from "node:path";
import { postAnswer } from "../discord/client.js";
import { formatAnswerEmbed, formatAnswerEmbedWithStats } from "../discord/formatter.js";
import { getReactions } from "../discord/reactions.js";
import { QuizPostSchema } from "../quiz/types.js";

interface PostAnswerOptions {
  dryRun?: boolean;
}

async function main(options: PostAnswerOptions = {}) {
  const { dryRun = false } = options;

  console.log("🚀 Starting answer posting...");

  // 1. Load post.json
  const dataDir = path.join(process.cwd(), "data", "current");
  const postPath = path.join(dataDir, "post.json");

  if (!fs.existsSync(postPath)) {
    throw new Error(`Post data not found: ${postPath}`);
  }

  console.log(`\n📂 Loading post data from: ${postPath}`);
  const rawData = JSON.parse(fs.readFileSync(postPath, "utf-8"));
  const postData = QuizPostSchema.parse(rawData);

  console.log(`  Quiz ID: ${postData.quiz.id}`);
  console.log(`  Message ID: ${postData.message_id}`);
  console.log(`  Channel ID: ${postData.channel_id}`);
  console.log(`  Posted at: ${postData.posted_at}`);

  // 2. Get reactions (optional - requires bot token)
  const botToken = process.env.DISCORD_BOT_TOKEN;
  console.log("\n📊 Collecting reactions...");
  const stats = await getReactions(postData.channel_id, postData.message_id, botToken);

  const hasStats = stats.a > 0 || stats.b > 0 || stats.c > 0 || stats.d > 0;

  // 3. Create answer embed
  const embed = hasStats
    ? formatAnswerEmbedWithStats(postData.quiz, stats)
    : formatAnswerEmbed(postData.quiz);

  // 4. Post to Discord (unless dry-run)
  if (dryRun) {
    console.log("\n🔍 Dry run mode - skipping Discord post");
    console.log("\n📝 Answer Embed Preview:");
    console.log(`  Title: ${embed.data.title}`);
    console.log(`  Description: ${embed.data.description}`);
    if (embed.data.fields) {
      for (const field of embed.data.fields) {
        console.log(`  Field [${field.name}]:`);
        console.log(`    ${field.value.slice(0, 100)}...`);
      }
    }
  } else {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error("DISCORD_WEBHOOK_URL environment variable is required");
    }

    console.log("\n📤 Posting answer to Discord...");
    const result = await postAnswer(webhookUrl, postData.quiz, embed);
    console.log(`  Message ID: ${result.messageId}`);
    console.log(`  Channel ID: ${result.channelId}`);
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
