import type { ReactionStats } from "../quiz/types.js";
import { EMOJI_TO_INDEX } from "../quiz/types.js";

interface DiscordReaction {
  emoji: {
    id: string | null;
    name: string;
  };
  count: number;
}

interface DiscordMessage {
  reactions?: DiscordReaction[];
}

/**
 * Get reactions from a Discord message using Bot Token
 * Returns zero counts if bot token is not provided
 */
export async function getReactions(
  channelId: string,
  messageId: string,
  botToken?: string
): Promise<ReactionStats> {
  const emptyStats: ReactionStats = { a: 0, b: 0, c: 0, d: 0 };

  if (!botToken) {
    console.log("⚠️ No bot token provided, skipping reaction collection");
    return emptyStats;
  }

  const url = `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Discord API error: ${response.status} - ${errorText}`);
      return emptyStats;
    }

    const message = (await response.json()) as DiscordMessage;

    if (!message.reactions || message.reactions.length === 0) {
      console.log("📊 No reactions found on the message");
      return emptyStats;
    }

    const stats = { ...emptyStats };

    for (const reaction of message.reactions) {
      const emojiName = reaction.emoji.name;
      const index = EMOJI_TO_INDEX[emojiName];

      if (index !== undefined) {
        const key = (["a", "b", "c", "d"] as const)[index];
        // Subtract 1 to exclude the bot's own reaction
        stats[key] = Math.max(0, reaction.count - 1);
      }
    }

    console.log(`📊 Reactions collected: A=${stats.a}, B=${stats.b}, C=${stats.c}, D=${stats.d}`);
    return stats;
  } catch (error) {
    console.error("❌ Failed to fetch reactions:", error);
    return emptyStats;
  }
}
