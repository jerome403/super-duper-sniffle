import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addPDFSplitJob } from "@/lib/queue";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.FILE_STORAGE_PATH || "./uploads";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const caseId = formData.get("caseId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!caseId) {
      return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
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

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Check file size (500MB limit)
    const MAX_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 500MB limit" },
        { status: 400 }
      );
    }

    // Create upload directory for case
    const caseDir = path.join(UPLOAD_DIR, caseId);
    await mkdir(caseDir, { recursive: true });

    // Generate unique filename
    const fileId = crypto.randomUUID();
    const fileName = `${fileId}.pdf`;
    const filePath = path.join(caseDir, fileName);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create upload record
    const upload = await prisma.upload.create({
      data: {
        caseId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: "application/pdf",
        storagePath: filePath,
      },
    });

    // Update case status
    await prisma.case.update({
      where: { id: caseId },
      data: { status: "UPLOADING" },
    });

    // Queue PDF processing job
    await addPDFSplitJob({
      caseId,
      uploadId: upload.id,
      filePath,
    });

    return NextResponse.json({
      success: true,
      upload: {
        id: upload.id,
        fileName: file.name,
        fileSize: file.size,
        storagePath: filePath,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
