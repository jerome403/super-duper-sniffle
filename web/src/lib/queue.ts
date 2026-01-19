import { Queue, QueueEvents } from "bullmq";
import redis from "./redis";

// Job types matching the database schema
export enum JobType {
  PDF_SPLIT = "PDF_SPLIT",
  DOCUMENT_CLASSIFY = "DOCUMENT_CLASSIFY",
  EXTRACT_EVIDENCE = "EXTRACT_EVIDENCE",
  SYNTHESIZE_EVIDENCE = "SYNTHESIZE_EVIDENCE",
  GENERATE_OUTPUT = "GENERATE_OUTPUT",
}

// Job data interfaces
export interface PDFSplitJobData {
  caseId: string;
  uploadId: string;
  filePath: string;
}

export interface DocumentClassifyJobData {
  caseId: string;
  documentId: string;
  filePath: string;
}

export interface ExtractEvidenceJobData {
  caseId: string;
  documentId: string;
  conditionId: string;
  extractedText: string;
}

export interface SynthesizeEvidenceJobData {
  caseId: string;
  conditionId: string;
}

export interface GenerateOutputJobData {
  caseId: string;
  outputType: string;
}

export type JobData =
  | PDFSplitJobData
  | DocumentClassifyJobData
  | ExtractEvidenceJobData
  | SynthesizeEvidenceJobData
  | GenerateOutputJobData;

// Queue configuration
const queueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 1000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // Keep completed jobs for 24 hours
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

// Create queues for different job types
export const pdfQueue = new Queue<PDFSplitJobData>("pdf-processing", queueOptions);
export const classifyQueue = new Queue<DocumentClassifyJobData>("document-classification", queueOptions);
export const extractQueue = new Queue<ExtractEvidenceJobData>("evidence-extraction", queueOptions);
export const synthesizeQueue = new Queue<SynthesizeEvidenceJobData>("evidence-synthesis", queueOptions);
export const outputQueue = new Queue<GenerateOutputJobData>("output-generation", queueOptions);

// Queue events for monitoring
export const pdfQueueEvents = new QueueEvents("pdf-processing", { connection: redis });
export const classifyQueueEvents = new QueueEvents("document-classification", { connection: redis });
export const extractQueueEvents = new QueueEvents("evidence-extraction", { connection: redis });
export const synthesizeQueueEvents = new QueueEvents("evidence-synthesis", { connection: redis });
export const outputQueueEvents = new QueueEvents("output-generation", { connection: redis });

// Helper functions to add jobs
export async function addPDFSplitJob(data: PDFSplitJobData) {
  return pdfQueue.add(JobType.PDF_SPLIT, data, {
    jobId: `pdf-split-${data.caseId}-${data.uploadId}`,
  });
}

export async function addClassifyJob(data: DocumentClassifyJobData) {
  return classifyQueue.add(JobType.DOCUMENT_CLASSIFY, data, {
    jobId: `classify-${data.documentId}`,
  });
}

export async function addExtractJob(data: ExtractEvidenceJobData) {
  return extractQueue.add(JobType.EXTRACT_EVIDENCE, data, {
    jobId: `extract-${data.documentId}-${data.conditionId}`,
  });
}

export async function addSynthesizeJob(data: SynthesizeEvidenceJobData) {
  return synthesizeQueue.add(JobType.SYNTHESIZE_EVIDENCE, data, {
    jobId: `synthesize-${data.conditionId}`,
  });
}

export async function addOutputJob(data: GenerateOutputJobData) {
  return outputQueue.add(JobType.GENERATE_OUTPUT, data, {
    jobId: `output-${data.caseId}-${data.outputType}`,
  });
}
