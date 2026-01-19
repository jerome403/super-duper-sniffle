/**
 * Background job worker for processing VA C-File tasks.
 *
 * Run with: npm run worker
 */

import { Worker, Job } from "bullmq";
import redis from "../lib/redis";
import { prisma } from "../lib/prisma";
import {
  JobType,
  PDFSplitJobData,
  DocumentClassifyJobData,
  ExtractEvidenceJobData,
  SynthesizeEvidenceJobData,
  GenerateOutputJobData,
} from "../lib/queue";

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || "http://localhost:8000";

// PDF Processing Worker
const pdfWorker = new Worker<PDFSplitJobData>(
  "pdf-processing",
  async (job: Job<PDFSplitJobData>) => {
    console.log(`Processing PDF split job: ${job.id}`);
    const { caseId, uploadId, filePath } = job.data;

    try {
      // Update case status
      await prisma.case.update({
        where: { id: caseId },
        data: { status: "PROCESSING" },
      });

      // Call PDF service to split the file
      const response = await fetch(`${PDF_SERVICE_URL}/api/pdf/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          file_path: filePath,
        }),
      });

      if (!response.ok) {
        throw new Error(`PDF service error: ${response.statusText}`);
      }

      const result = await response.json();

      // Create document records for each split segment
      for (const doc of result.documents) {
        await prisma.document.create({
          data: {
            caseId,
            documentType: doc.suggested_type || "UNCLASSIFIED",
            sourceFileName: filePath,
            pageStart: doc.page_start,
            pageEnd: doc.page_end,
            extractedText: "", // Will be populated during extraction
            processingStatus: "PENDING",
          },
        });
      }

      // Update upload with page count
      await prisma.upload.update({
        where: { id: uploadId },
        data: { totalPages: result.total_pages },
      });

      console.log(`PDF split complete: ${result.documents.length} documents found`);
      return { documentsCreated: result.documents.length };
    } catch (error) {
      console.error(`PDF split job failed:`, error);
      await prisma.case.update({
        where: { id: caseId },
        data: { status: "ERROR" },
      });
      throw error;
    }
  },
  { connection: redis, concurrency: 2 }
);

// Document Classification Worker
const classifyWorker = new Worker<DocumentClassifyJobData>(
  "document-classification",
  async (job: Job<DocumentClassifyJobData>) => {
    console.log(`Processing classification job: ${job.id}`);
    const { caseId, documentId, filePath } = job.data;

    try {
      // Call PDF service to classify
      const response = await fetch(`${PDF_SERVICE_URL}/api/pdf/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          document_id: documentId,
          file_path: filePath,
        }),
      });

      if (!response.ok) {
        throw new Error(`Classification service error: ${response.statusText}`);
      }

      const result = await response.json();

      // Update document with classification
      await prisma.document.update({
        where: { id: documentId },
        data: {
          documentType: result.document_type,
          provider: result.provider,
          documentDate: result.document_date ? new Date(result.document_date) : null,
          processingStatus: "CLASSIFIED",
        },
      });

      console.log(`Document ${documentId} classified as ${result.document_type}`);
      return result;
    } catch (error) {
      console.error(`Classification job failed:`, error);
      await prisma.document.update({
        where: { id: documentId },
        data: { processingStatus: "ERROR" },
      });
      throw error;
    }
  },
  { connection: redis, concurrency: 5 }
);

// Evidence Extraction Worker
const extractWorker = new Worker<ExtractEvidenceJobData>(
  "evidence-extraction",
  async (job: Job<ExtractEvidenceJobData>) => {
    console.log(`Processing extraction job: ${job.id}`);
    const { caseId, documentId, conditionId, extractedText } = job.data;

    try {
      // Get condition details
      const condition = await prisma.claimedCondition.findUnique({
        where: { id: conditionId },
      });

      if (!condition) {
        throw new Error(`Condition ${conditionId} not found`);
      }

      // Use Claude to extract relevant evidence
      // This would call the Anthropic API to analyze the text
      // For now, we'll create a placeholder implementation
      const extractions = await extractEvidenceWithAI(
        extractedText,
        condition.conditionName,
        condition.serviceConnectionTheory
      );

      // Save extractions
      for (const extraction of extractions) {
        await prisma.extraction.create({
          data: {
            documentId,
            conditionId,
            extractionType: extraction.type,
            extractedText: extraction.text,
            pageReference: extraction.pageRef,
            confidence: extraction.confidence,
            reviewStatus: "PENDING",
          },
        });
      }

      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: { processingStatus: "EXTRACTED" },
      });

      console.log(`Extracted ${extractions.length} evidence items from document ${documentId}`);
      return { extractionsCreated: extractions.length };
    } catch (error) {
      console.error(`Extraction job failed:`, error);
      throw error;
    }
  },
  { connection: redis, concurrency: 3 }
);

// Evidence Synthesis Worker
const synthesizeWorker = new Worker<SynthesizeEvidenceJobData>(
  "evidence-synthesis",
  async (job: Job<SynthesizeEvidenceJobData>) => {
    console.log(`Processing synthesis job: ${job.id}`);
    const { caseId, conditionId } = job.data;

    try {
      // Get all approved extractions for this condition
      const extractions = await prisma.extraction.findMany({
        where: {
          conditionId,
          reviewStatus: { in: ["APPROVED", "EDITED"] },
        },
        include: {
          document: true,
        },
      });

      // Get condition details
      const condition = await prisma.claimedCondition.findUnique({
        where: { id: conditionId },
      });

      if (!condition) {
        throw new Error(`Condition ${conditionId} not found`);
      }

      // Use Claude to synthesize evidence into legal elements
      const syntheses = await synthesizeEvidenceWithAI(
        extractions,
        condition.conditionName,
        condition.serviceConnectionTheory
      );

      // Save syntheses
      for (const synthesis of syntheses) {
        const created = await prisma.evidenceSynthesis.create({
          data: {
            conditionId,
            legalElement: synthesis.legalElement,
            evidenceStrength: synthesis.strength,
            synthesisText: synthesis.text,
            gaps: synthesis.gaps,
          },
        });

        // Link supporting extractions
        for (const extractionId of synthesis.supportingExtractionIds) {
          await prisma.extractionOnSynthesis.create({
            data: {
              extractionId,
              synthesisId: created.id,
            },
          });
        }
      }

      // Update condition status
      await prisma.claimedCondition.update({
        where: { id: conditionId },
        data: { status: "COMPLETE" },
      });

      console.log(`Synthesized evidence for condition ${conditionId}`);
      return { synthesisCount: syntheses.length };
    } catch (error) {
      console.error(`Synthesis job failed:`, error);
      throw error;
    }
  },
  { connection: redis, concurrency: 2 }
);

// Output Generation Worker
const outputWorker = new Worker<GenerateOutputJobData>(
  "output-generation",
  async (job: Job<GenerateOutputJobData>) => {
    console.log(`Processing output job: ${job.id}`);
    const { caseId, outputType } = job.data;

    try {
      // Get all syntheses for the case
      const conditions = await prisma.claimedCondition.findMany({
        where: { caseId },
        include: {
          evidenceSyntheses: {
            include: {
              supportingExtractions: {
                include: {
                  extraction: true,
                },
              },
            },
          },
        },
      });

      // Generate output based on type
      let content: Record<string, unknown>;
      switch (outputType) {
        case "EVIDENCE_COMPILATION":
          content = generateEvidenceCompilation(conditions);
          break;
        case "ARGUMENT_FRAMEWORK":
          content = generateArgumentFramework(conditions);
          break;
        case "DRAFT_4138":
          content = await generateDraft4138(conditions);
          break;
        case "DRAFT_BVA_BRIEF":
          content = await generateBVABrief(conditions);
          break;
        default:
          throw new Error(`Unknown output type: ${outputType}`);
      }

      // Save output document
      await prisma.outputDocument.create({
        data: {
          caseId,
          outputType: outputType as "EVIDENCE_COMPILATION" | "ARGUMENT_FRAMEWORK" | "DRAFT_4138" | "DRAFT_BVA_BRIEF",
          content,
        },
      });

      // Update case status
      await prisma.case.update({
        where: { id: caseId },
        data: { status: "COMPLETE" },
      });

      console.log(`Generated ${outputType} output for case ${caseId}`);
      return { outputType };
    } catch (error) {
      console.error(`Output generation job failed:`, error);
      throw error;
    }
  },
  { connection: redis, concurrency: 1 }
);

// Placeholder AI functions - these would use the Anthropic API
async function extractEvidenceWithAI(
  text: string,
  conditionName: string,
  serviceConnectionTheory: string
): Promise<Array<{ type: string; text: string; pageRef: string; confidence: number }>> {
  // TODO: Implement with Anthropic API
  return [];
}

async function synthesizeEvidenceWithAI(
  extractions: Array<unknown>,
  conditionName: string,
  serviceConnectionTheory: string
): Promise<Array<{
  legalElement: string;
  strength: string;
  text: string;
  gaps: string | null;
  supportingExtractionIds: string[];
}>> {
  // TODO: Implement with Anthropic API
  return [];
}

function generateEvidenceCompilation(conditions: Array<unknown>): Record<string, unknown> {
  // TODO: Implement evidence compilation
  return { conditions, generatedAt: new Date().toISOString() };
}

function generateArgumentFramework(conditions: Array<unknown>): Record<string, unknown> {
  // TODO: Implement argument framework
  return { conditions, generatedAt: new Date().toISOString() };
}

async function generateDraft4138(conditions: Array<unknown>): Promise<Record<string, unknown>> {
  // TODO: Implement 4138 draft generation with AI
  return { conditions, generatedAt: new Date().toISOString() };
}

async function generateBVABrief(conditions: Array<unknown>): Promise<Record<string, unknown>> {
  // TODO: Implement BVA brief generation with AI
  return { conditions, generatedAt: new Date().toISOString() };
}

// Error handlers
pdfWorker.on("failed", (job, err) => {
  console.error(`PDF job ${job?.id} failed:`, err.message);
});

classifyWorker.on("failed", (job, err) => {
  console.error(`Classify job ${job?.id} failed:`, err.message);
});

extractWorker.on("failed", (job, err) => {
  console.error(`Extract job ${job?.id} failed:`, err.message);
});

synthesizeWorker.on("failed", (job, err) => {
  console.error(`Synthesize job ${job?.id} failed:`, err.message);
});

outputWorker.on("failed", (job, err) => {
  console.error(`Output job ${job?.id} failed:`, err.message);
});

console.log("Workers started. Waiting for jobs...");
