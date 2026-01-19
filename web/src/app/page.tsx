import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, CheckCircle, FileOutput } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">VA C-File Analyzer</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-6">
            Streamline Your VA Claims Evidence Review
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            Upload C-files, automatically extract relevant medical evidence, and generate
            structured outputs for 4138 statements and BVA briefs.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg">Start Analyzing</Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Upload className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Bulk Upload</CardTitle>
              <CardDescription>
                Upload entire C-files up to 2000+ pages at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Our system handles large PDF files efficiently, splitting them into
                individual documents for processing.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Smart Classification</CardTitle>
              <CardDescription>
                AI-powered document type identification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Automatically identifies DD214s, C&P exams, treatment records,
                rating decisions, and more.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Evidence Extraction</CardTitle>
              <CardDescription>
                Condition-specific evidence mapping
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Extract diagnoses, nexus statements, treatments, and symptoms
                relevant to each claimed condition.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileOutput className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Structured Outputs</CardTitle>
              <CardDescription>
                Generate 4138s and BVA briefs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Synthesize evidence into legal elements and generate draft
                statements ready for review.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Workflow */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white rounded-lg border">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold">Create a Case</h3>
                <p className="text-slate-600">
                  Set up a new case with your internal identifier and specify the
                  conditions being claimed with their service connection theories.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white rounded-lg border">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold">Upload C-File</h3>
                <p className="text-slate-600">
                  Upload the veteran&apos;s C-file PDF. The system automatically splits
                  it into individual documents and classifies each one.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white rounded-lg border">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold">Review Extractions</h3>
                <p className="text-slate-600">
                  Review AI-extracted evidence for each condition. Approve, edit, or
                  reject extractions to ensure accuracy.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white rounded-lg border">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold">Generate Outputs</h3>
                <p className="text-slate-600">
                  Generate evidence compilations, argument frameworks, and draft
                  4138 statements or BVA briefs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-slate-600">
          <p>VA C-File Analyzer - Internal Tool</p>
          <p className="text-sm mt-2">
            Not for public use. Contains no veteran PII in the system.
          </p>
        </div>
      </footer>
    </div>
  );
}
