import { z } from "zod";

// Question type for different quiz styles
export type QuestionType = "concept" | "best-practice" | "troubleshooting";

// Quiz schema and type
export const QuizSchema = z.object({
  id: z.string(),
  exam_code: z.string(),
  domain: z.string(),
  section: z.string(),
  topic: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  question: z.string(),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correct: z.number().int().min(0).max(3),
  explanation: z.string(),
});

export type Quiz = z.infer<typeof QuizSchema>;

// QuizPost schema and type (quiz with Discord message metadata)
export const QuizPostSchema = z.object({
  quiz: QuizSchema,
  message_id: z.string(),
  channel_id: z.string(),
  posted_at: z.string().datetime(),
});

export type QuizPost = z.infer<typeof QuizPostSchema>;

// Reaction statistics
export const ReactionStatsSchema = z.object({
  a: z.number().int().default(0),
  b: z.number().int().default(0),
  c: z.number().int().default(0),
  d: z.number().int().default(0),
});

export type ReactionStats = z.infer<typeof ReactionStatsSchema>;

// QuizStats schema and type (quiz post with reaction statistics)
export const QuizStatsSchema = z.object({
  quiz_post: QuizPostSchema,
  reactions: ReactionStatsSchema,
  total_answers: z.number().int(),
  correct_rate: z.number().min(0).max(1),
});

export type QuizStats = z.infer<typeof QuizStatsSchema>;

// Reaction emoji mapping
export const REACTION_EMOJIS = {
  0: "🅰️",
  1: "🅱️",
  2: "🇨",
  3: "🇩",
} as const;

export const EMOJI_TO_INDEX: Record<string, number> = {
  "🅰️": 0,
  "🅱️": 1,
  "🇨": 2,
  "🇩": 3,
};
