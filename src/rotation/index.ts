import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  ExamDomainsSchema,
  type ExamDomains,
  type FlattenedTopic,
} from "./domains.js";
import type { QuestionType } from "../quiz/types.js";

/**
 * Load exam domains from YAML file
 */
export function loadExamDomains(examCode: string): ExamDomains {
  const filePath = path.join(
    process.cwd(),
    "data",
    "exam-domains",
    `${examCode.toLowerCase()}.yaml`
  );

  const content = fs.readFileSync(filePath, "utf-8");
  const data = yaml.load(content);

  return ExamDomainsSchema.parse(data);
}

/**
 * Flatten all topics from exam domains into a single array
 */
export function flattenTopics(examDomains: ExamDomains): FlattenedTopic[] {
  const topics: FlattenedTopic[] = [];

  for (const domain of examDomains.domains) {
    for (const section of domain.sections) {
      for (const topic of section.topics) {
        topics.push({
          exam_code: examDomains.exam_code,
          domain: domain.name,
          section: section.name,
          topic: topic.name,
          weight: topic.weight ?? 1,
        });
      }
    }
  }

  return topics;
}

/**
 * Get day of year (1-366)
 */
export function getDayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Get time slot based on UTC hour
 * UTC 0:00 (JST 9:00) -> slot 0
 * UTC 4:00 (JST 13:00) -> slot 1
 * UTC 9:00 (JST 18:00) -> slot 2
 */
export function getTimeSlot(date: Date = new Date()): number {
  const hour = date.getUTCHours();
  if (hour >= 9) return 2;
  if (hour >= 4) return 1;
  return 0;
}

/**
 * Select topic based on date and time slot rotation
 */
export function selectTopicByDate(
  topics: FlattenedTopic[],
  date: Date = new Date()
): FlattenedTopic {
  const dayOfYear = getDayOfYear(date);
  const slot = getTimeSlot(date);
  const index = (dayOfYear * 3 + slot) % topics.length;
  return topics[index];
}

/**
 * Select question type based on time of day
 * UTC 0:00 (JST 9:00) -> concept (概念・定義の理解)
 * UTC 4:00 (JST 13:00) -> best-practice (ベストプラクティス・推奨設定)
 * UTC 9:00 (JST 18:00) -> troubleshooting (問題解決・トラブルシューティング)
 */
export function selectQuestionType(date: Date = new Date()): QuestionType {
  const hour = date.getUTCHours();
  if (hour >= 9) return "troubleshooting";
  if (hour >= 4) return "best-practice";
  return "concept";
}

/**
 * Select topic with weighted random selection
 */
export function selectTopicWeighted(
  topics: FlattenedTopic[],
  seed?: number
): FlattenedTopic {
  const totalWeight = topics.reduce((sum, t) => sum + t.weight, 0);

  // Use seed for reproducible random or current time
  const random = seed !== undefined ? seededRandom(seed) : Math.random();
  let threshold = random * totalWeight;

  for (const topic of topics) {
    threshold -= topic.weight;
    if (threshold <= 0) {
      return topic;
    }
  }

  // Fallback to last topic
  return topics[topics.length - 1];
}

/**
 * Simple seeded random number generator
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Get today's topic for the specified exam
 */
export function getTodaysTopic(
  examCode: string,
  date: Date = new Date()
): FlattenedTopic {
  const examDomains = loadExamDomains(examCode);
  const topics = flattenTopics(examDomains);
  return selectTopicByDate(topics, date);
}

/**
 * Generate a unique quiz ID based on date and topic
 */
export function generateQuizId(topic: FlattenedTopic, date: Date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const topicSlug = topic.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);

  return `${topic.exam_code.toLowerCase()}-${dateStr}-${topicSlug}`;
}
