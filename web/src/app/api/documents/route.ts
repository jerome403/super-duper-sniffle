import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/documents - List documents for a case
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const documentType = searchParams.get("documentType");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    if (!caseId) {
      return NextResponse.json(
        { error: "Case ID is required" },
        { status: 400 }
      );
    }

    // Verify case ownership
    const existingCase = await prisma.case.findFirst({
      where: {
        id: caseId,
        userId: session.user.id,
      },
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const where = {
      caseId,
      ...(documentType && { documentType: documentType as string }),
      ...(status && { processingStatus: status as string }),
    };

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { pageStart: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { extractions: true },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({
      items: documents,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
