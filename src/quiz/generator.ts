import fs from "node:fs";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FlattenedTopic } from "../rotation/domains.js";
import type { Quiz } from "./types.js";
import { parseQuizResponse } from "./parser.js";
import { generateQuizId } from "../rotation/index.js";

export type Difficulty = "easy" | "medium" | "hard";

interface GenerateQuizOptions {
  topic: FlattenedTopic;
  difficulty: Difficulty;
  date?: Date;
}

/**
 * Load prompt template and replace variables
 */
function loadPrompt(templateName: string, variables: Record<string, string>): string {
  const templatePath = path.join(process.cwd(), "prompts", `${templateName}.md`);
  let content = fs.readFileSync(templatePath, "utf-8");

  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  return content;
}

/**
 * Generate a quiz question using Gemini API
 */
export async function generateQuiz(options: GenerateQuizOptions): Promise<Quiz> {
  const { topic, difficulty, date = new Date() } = options;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  // Load prompts
  const systemPrompt = loadPrompt("system-prompt", {});
  const userPrompt = loadPrompt("generate-quiz", {
    exam_code: topic.exam_code,
    domain: topic.domain,
    section: topic.section,
    topic: topic.topic,
    difficulty: difficulty,
  });

  // Generate content
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });

  const response = result.response;
  const text = response.text();

  // Parse and validate response
  const rawQuiz = parseQuizResponse(text);

  // Build full Quiz object
  const quiz: Quiz = {
    id: generateQuizId(topic, date),
    exam_code: topic.exam_code,
    domain: topic.domain,
    section: topic.section,
    topic: topic.topic,
    difficulty: difficulty,
    question: rawQuiz.question,
    options: rawQuiz.options,
    correct: rawQuiz.correct,
    explanation: rawQuiz.explanation,
  };

  return quiz;
}

/**
 * Select difficulty based on day of week
 * Monday-Wednesday: easy, Thursday-Friday: medium, Weekend: hard
 */
export function selectDifficulty(date: Date = new Date()): Difficulty {
  const dayOfWeek = date.getDay();

  if (dayOfWeek >= 1 && dayOfWeek <= 3) {
    return "easy";
  } else if (dayOfWeek >= 4 && dayOfWeek <= 5) {
    return "medium";
  } else {
    return "hard";
  }
}
