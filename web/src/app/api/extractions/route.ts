import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateExtractionSchema = z.object({
  extractionId: z.string(),
  status: z.enum(["APPROVED", "REJECTED", "EDITED"]),
  editedText: z.string().optional(),
});

// GET /api/extractions - List extractions for a condition or document
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conditionId = searchParams.get("conditionId");
    const documentId = searchParams.get("documentId");
    const reviewStatus = searchParams.get("reviewStatus");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    if (!conditionId && !documentId) {
      return NextResponse.json(
        { error: "Either conditionId or documentId is required" },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {};

    if (conditionId) {
      // Verify condition belongs to user's case
      const condition = await prisma.claimedCondition.findFirst({
        where: {
          id: conditionId,
          case: { userId: session.user.id },
        },
      });
      if (!condition) {
        return NextResponse.json({ error: "Condition not found" }, { status: 404 });
      }
      where.conditionId = conditionId;
    }

    if (documentId) {
      // Verify document belongs to user's case
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          case: { userId: session.user.id },
        },
      });
      if (!document) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      where.documentId = documentId;
    }

    if (reviewStatus) {
      where.reviewStatus = reviewStatus;
    }

    const [extractions, total] = await Promise.all([
      prisma.extraction.findMany({
        where,
        include: {
          document: {
            select: {
              id: true,
              documentType: true,
              sourceFileName: true,
              pageStart: true,
              pageEnd: true,
            },
          },
          condition: {
            select: {
              id: true,
              conditionName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.extraction.count({ where }),
    ]);

    return NextResponse.json({
      items: extractions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching extractions:", error);
    return NextResponse.json(
      { error: "Failed to fetch extractions" },
      { status: 500 }
    );
  }
}

// PATCH /api/extractions - Update extraction review status
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = updateExtractionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { extractionId, status, editedText } = result.data;

    // Verify extraction belongs to user's case
    const extraction = await prisma.extraction.findFirst({
      where: {
        id: extractionId,
        document: {
          case: { userId: session.user.id },
        },
      },
    });

    if (!extraction) {
      return NextResponse.json(
        { error: "Extraction not found" },
        { status: 404 }
      );
    }

    // Update extraction
    const updated = await prisma.extraction.update({
      where: { id: extractionId },
      data: {
        reviewStatus: status,
        editedText: status === "EDITED" ? editedText : null,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating extraction:", error);
    return NextResponse.json(
      { error: "Failed to update extraction" },
      { status: 500 }
    );
  }
}
