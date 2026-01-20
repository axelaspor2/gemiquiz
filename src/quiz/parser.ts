import { z } from "zod";

// Schema for raw quiz response from Gemini
const RawQuizResponseSchema = z.object({
  question: z.string(),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correct: z.number().int().min(0).max(3),
  explanation: z.string(),
});

export type RawQuizResponse = z.infer<typeof RawQuizResponseSchema>;

/**
 * Extract JSON from a string that may contain markdown code blocks
 */
export function extractJson(text: string): string {
  // Remove markdown code blocks if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return text.trim();
}

/**
 * Parse and validate quiz response from Gemini
 */
export function parseQuizResponse(text: string): RawQuizResponse {
  const jsonStr = extractJson(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}\nInput: ${jsonStr}`
    );
  }

  const result = RawQuizResponseSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `Invalid quiz response format: ${result.error.message}\nInput: ${JSON.stringify(parsed, null, 2)}`
    );
  }

  return result.data;
}
