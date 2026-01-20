import { WebhookClient, type EmbedBuilder } from "discord.js";
import type { Quiz } from "../quiz/types.js";
import { REACTION_EMOJIS } from "../quiz/types.js";
import { formatQuizEmbed, formatAnswerEmbed } from "./formatter.js";

interface PostResult {
  messageId: string;
  channelId: string;
}

/**
 * Create a webhook client from URL
 */
export function createWebhookClient(webhookUrl: string): WebhookClient {
  return new WebhookClient({ url: webhookUrl });
}

/**
 * Post a quiz question to Discord via webhook
 */
export async function postQuiz(
  webhookUrl: string,
  quiz: Quiz
): Promise<PostResult> {
  const client = createWebhookClient(webhookUrl);

  try {
    const embed = formatQuizEmbed(quiz);
    const message = await client.send({
      embeds: [embed],
    });

    return {
      messageId: message.id,
      channelId: message.channel_id,
    };
  } finally {
    client.destroy();
  }
}

/**
 * Post quiz answer to Discord via webhook
 */
export async function postAnswer(
  webhookUrl: string,
  quiz: Quiz,
  embed?: EmbedBuilder
): Promise<PostResult> {
  const client = createWebhookClient(webhookUrl);

  try {
    const answerEmbed = embed ?? formatAnswerEmbed(quiz);
    const message = await client.send({
      embeds: [answerEmbed],
    });

    return {
      messageId: message.id,
      channelId: message.channel_id,
    };
  } finally {
    client.destroy();
  }
}

/**
 * Add reaction emojis to a message (requires bot token, not webhook)
 * This is a placeholder - actual implementation needs Discord bot client
 */
export function getReactionEmojis(): string[] {
  return [
    REACTION_EMOJIS[0],
    REACTION_EMOJIS[1],
    REACTION_EMOJIS[2],
    REACTION_EMOJIS[3],
  ];
}
