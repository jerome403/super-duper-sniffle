import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/cases/[id] - Get a single case with details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const caseData = await prisma.case.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        claimedConditions: {
          include: {
            primaryCondition: true,
            secondaryConditions: true,
            evidenceSyntheses: true,
          },
        },
        documents: {
          orderBy: { pageStart: "asc" },
        },
        outputDocuments: {
          orderBy: { generatedAt: "desc" },
        },
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json(caseData);
  } catch (error) {
    console.error("Error fetching case:", error);
    return NextResponse.json(
      { error: "Failed to fetch case" },
      { status: 500 }
    );
  }
}

// PATCH /api/cases/[id] - Update a case
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const existingCase = await prisma.case.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const updatedCase = await prisma.case.update({
      where: { id },
      data: {
        ...(body.internalIdentifier && { internalIdentifier: body.internalIdentifier }),
        ...(body.status && { status: body.status }),
      },
      include: { claimedConditions: true },
    });

    return NextResponse.json(updatedCase);
  } catch (error) {
    console.error("Error updating case:", error);
    return NextResponse.json(
      { error: "Failed to update case" },
      { status: 500 }
    );
  }
}

// DELETE /api/cases/[id] - Delete a case
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existingCase = await prisma.case.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Cascade delete handled by Prisma schema
    await prisma.case.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting case:", error);
    return NextResponse.json(
      { error: "Failed to delete case" },
      { status: 500 }
    );
  }
}
