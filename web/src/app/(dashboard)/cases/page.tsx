import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, AlertCircle } from "lucide-react";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  CREATED: { label: "Created", variant: "secondary" },
  UPLOADING: { label: "Uploading", variant: "warning" },
  PROCESSING: { label: "Processing", variant: "warning" },
  REVIEW: { label: "In Review", variant: "default" },
  COMPLETE: { label: "Complete", variant: "success" },
  ERROR: { label: "Error", variant: "destructive" },
};

export default async function CasesPage() {
  const session = await getServerSession(authOptions);

  const cases = await prisma.case.findMany({
    where: { userId: session!.user.id },
    include: {
      claimedConditions: true,
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cases</h1>
          <p className="text-muted-foreground">
            Manage your VA C-file analysis cases
          </p>
        </div>
        <Link href="/cases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Case
          </Button>
        </Link>
      </div>

      {/* Cases List */}
      {cases.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No cases yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first case to start analyzing C-files
              </p>
              <Link href="/cases/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Case
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cases.map((caseItem) => (
            <Link key={caseItem.id} href={`/cases/${caseItem.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">
                        {caseItem.internalIdentifier}
                      </CardTitle>
                      <Badge variant={STATUS_BADGES[caseItem.status].variant}>
                        {STATUS_BADGES[caseItem.status].label}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(caseItem.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">
                        {caseItem.claimedConditions.length}
                      </span>{" "}
                      Condition{caseItem.claimedConditions.length !== 1 ? "s" : ""}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        {caseItem._count.documents}
                      </span>{" "}
                      Document{caseItem._count.documents !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {caseItem.claimedConditions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {caseItem.claimedConditions.slice(0, 5).map((condition) => (
                        <Badge key={condition.id} variant="outline">
                          {condition.conditionName}
                        </Badge>
                      ))}
                      {caseItem.claimedConditions.length > 5 && (
                        <Badge variant="outline">
                          +{caseItem.claimedConditions.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
