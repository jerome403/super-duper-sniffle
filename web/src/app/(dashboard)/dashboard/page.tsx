import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  CREATED: { label: "Created", variant: "secondary" },
  UPLOADING: { label: "Uploading", variant: "warning" },
  PROCESSING: { label: "Processing", variant: "warning" },
  REVIEW: { label: "In Review", variant: "default" },
  COMPLETE: { label: "Complete", variant: "success" },
  ERROR: { label: "Error", variant: "destructive" },
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Get recent cases
  const recentCases = await prisma.case.findMany({
    where: { userId: session!.user.id },
    include: {
      claimedConditions: true,
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  // Get stats
  const [totalCases, completedCases, processingCases] = await Promise.all([
    prisma.case.count({ where: { userId: session!.user.id } }),
    prisma.case.count({ where: { userId: session!.user.id, status: "COMPLETE" } }),
    prisma.case.count({
      where: {
        userId: session!.user.id,
        status: { in: ["UPLOADING", "PROCESSING", "REVIEW"] },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session!.user.name || "User"}
          </p>
        </div>
        <Link href="/cases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Case
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCases}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingCases}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCases}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cases</CardTitle>
          <CardDescription>Your most recently updated cases</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCases.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No cases yet</h3>
              <p className="text-muted-foreground">
                Get started by creating your first case
              </p>
              <Link href="/cases/new">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Case
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentCases.map((caseItem) => (
                <Link
                  key={caseItem.id}
                  href={`/cases/${caseItem.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {caseItem.internalIdentifier}
                        </span>
                        <Badge variant={STATUS_BADGES[caseItem.status].variant}>
                          {STATUS_BADGES[caseItem.status].label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {caseItem.claimedConditions.length} condition(s) |{" "}
                        {caseItem._count.documents} document(s)
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(caseItem.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}

              {totalCases > 5 && (
                <div className="text-center pt-4">
                  <Link href="/cases">
                    <Button variant="outline">View all cases</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
