import { z } from "zod";

// Topic within a section
export const TopicSchema = z.object({
  name: z.string(),
  weight: z.number().optional().default(1),
});

export type Topic = z.infer<typeof TopicSchema>;

// Section within a domain
export const SectionSchema = z.object({
  name: z.string(),
  topics: z.array(TopicSchema),
});

export type Section = z.infer<typeof SectionSchema>;

// Domain within an exam
export const DomainSchema = z.object({
  name: z.string(),
  percentage: z.number().min(0).max(100),
  sections: z.array(SectionSchema),
});

export type Domain = z.infer<typeof DomainSchema>;

// Exam domains configuration
export const ExamDomainsSchema = z.object({
  exam_code: z.string(),
  exam_name: z.string(),
  domains: z.array(DomainSchema),
});

export type ExamDomains = z.infer<typeof ExamDomainsSchema>;

// Flattened topic with full context
export interface FlattenedTopic {
  exam_code: string;
  domain: string;
  section: string;
  topic: string;
  weight: number;
}
