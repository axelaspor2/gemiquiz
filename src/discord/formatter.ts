import { EmbedBuilder } from "discord.js";
import type { Quiz } from "../quiz/types.js";
import { REACTION_EMOJIS } from "../quiz/types.js";

const DIFFICULTY_COLORS = {
  easy: 0x00ff00, // Green
  medium: 0xffff00, // Yellow
  hard: 0xff0000, // Red
} as const;

const DIFFICULTY_LABELS = {
  easy: "🟢 Easy",
  medium: "🟡 Medium",
  hard: "🔴 Hard",
} as const;

/**
 * Format quiz as Discord embed for question posting
 */
export function formatQuizEmbed(quiz: Quiz): EmbedBuilder {
  const options = quiz.options
    .map((opt, i) => `${REACTION_EMOJIS[i as 0 | 1 | 2 | 3]} ${opt}`)
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setTitle(`📝 ${quiz.exam_code} Daily Quiz`)
    .setDescription(quiz.question)
    .setColor(DIFFICULTY_COLORS[quiz.difficulty])
    .addFields(
      {
        name: "選択肢",
        value: options,
      },
      {
        name: "トピック",
        value: `${quiz.domain} > ${quiz.section}`,
        inline: true,
      },
      {
        name: "難易度",
        value: DIFFICULTY_LABELS[quiz.difficulty],
        inline: true,
      }
    )
    .setFooter({ text: `Quiz ID: ${quiz.id}` })
    .setTimestamp();

  return embed;
}

/**
 * Format quiz answer as Discord embed
 */
export function formatAnswerEmbed(quiz: Quiz): EmbedBuilder {
  const correctOption = quiz.options[quiz.correct];
  const correctEmoji = REACTION_EMOJIS[quiz.correct as 0 | 1 | 2 | 3];

  const embed = new EmbedBuilder()
    .setTitle(`✅ 解答: ${quiz.exam_code} Daily Quiz`)
    .setDescription(`**正解は ${correctEmoji} です！**\n\n${correctOption}`)
    .setColor(0x5865f2) // Discord blurple
    .addFields(
      {
        name: "📚 解説",
        value: quiz.explanation,
      },
      {
        name: "トピック",
        value: `${quiz.domain} > ${quiz.section} > ${quiz.topic}`,
      }
    )
    .setFooter({ text: `Quiz ID: ${quiz.id}` })
    .setTimestamp();

  return embed;
}

/**
 * Format quiz answer with statistics
 */
export function formatAnswerEmbedWithStats(
  quiz: Quiz,
  stats: { a: number; b: number; c: number; d: number }
): EmbedBuilder {
  const correctOption = quiz.options[quiz.correct];
  const correctEmoji = REACTION_EMOJIS[quiz.correct as 0 | 1 | 2 | 3];

  const total = stats.a + stats.b + stats.c + stats.d;
  const correctCount = [stats.a, stats.b, stats.c, stats.d][quiz.correct];
  const correctRate = total > 0 ? ((correctCount / total) * 100).toFixed(1) : "0.0";

  const statsText = [
    `🅰️: ${stats.a}票 ${quiz.correct === 0 ? "✓" : ""}`,
    `🅱️: ${stats.b}票 ${quiz.correct === 1 ? "✓" : ""}`,
    `🇨: ${stats.c}票 ${quiz.correct === 2 ? "✓" : ""}`,
    `🇩: ${stats.d}票 ${quiz.correct === 3 ? "✓" : ""}`,
  ].join("\n");

  const embed = new EmbedBuilder()
    .setTitle(`✅ 解答: ${quiz.exam_code} Daily Quiz`)
    .setDescription(`**正解は ${correctEmoji} です！**\n\n${correctOption}`)
    .setColor(0x5865f2)
    .addFields(
      {
        name: "📊 投票結果",
        value: `${statsText}\n\n**正答率: ${correctRate}%** (${correctCount}/${total}人)`,
      },
      {
        name: "📚 解説",
        value: quiz.explanation,
      },
      {
        name: "トピック",
        value: `${quiz.domain} > ${quiz.section} > ${quiz.topic}`,
      }
    )
    .setFooter({ text: `Quiz ID: ${quiz.id}` })
    .setTimestamp();

  return embed;
}
