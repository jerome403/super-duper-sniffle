import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCaseSchema = z.object({
  internalIdentifier: z.string().min(1, "Internal identifier is required"),
  conditions: z.array(
    z.object({
      conditionName: z.string().min(1, "Condition name is required"),
      serviceConnectionTheory: z.enum([
        "DIRECT",
        "SECONDARY",
        "AGGRAVATION",
        "PRESUMPTIVE_AGENT_ORANGE",
        "PRESUMPTIVE_BURN_PIT",
        "PRESUMPTIVE_GULF_WAR",
        "PRESUMPTIVE_RADIATION",
      ]),
      primaryConditionId: z.string().optional(),
    })
  ).optional(),
});

// GET /api/cases - List all cases for the current user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const status = searchParams.get("status");

    const where = {
      userId: session.user.id,
      ...(status && { status: status as "CREATED" | "UPLOADING" | "PROCESSING" | "REVIEW" | "COMPLETE" | "ERROR" }),
    };

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: {
          claimedConditions: true,
          _count: {
            select: {
              documents: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.case.count({ where }),
    ]);

    return NextResponse.json({
      items: cases,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching cases:", error);
    return NextResponse.json(
      { error: "Failed to fetch cases" },
      { status: 500 }
    );
  }
}

// POST /api/cases - Create a new case
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createCaseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { internalIdentifier, conditions } = result.data;

    // Create case with conditions in a transaction
    const newCase = await prisma.$transaction(async (tx) => {
      const createdCase = await tx.case.create({
        data: {
          userId: session.user.id,
          internalIdentifier,
          status: "CREATED",
        },
      });

      // Create conditions if provided
      if (conditions && conditions.length > 0) {
        for (const condition of conditions) {
          await tx.claimedCondition.create({
            data: {
              caseId: createdCase.id,
              conditionName: condition.conditionName,
              serviceConnectionTheory: condition.serviceConnectionTheory,
              primaryConditionId: condition.primaryConditionId,
              status: "PENDING",
            },
          });
        }
      }

      return tx.case.findUnique({
        where: { id: createdCase.id },
        include: { claimedConditions: true },
      });
    });

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error("Error creating case:", error);
    return NextResponse.json(
      { error: "Failed to create case" },
      { status: 500 }
    );
  }
}
