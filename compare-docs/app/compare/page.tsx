"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/atoms/theme-toggle";
import Link from "next/link";
import ComparisonView from "@/components/organisms/ComparisonView";
import { useDocumentContext } from "@/lib/document-context";
import { compareTexts, comparePDFs } from "@/lib/comparison-engine";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function ComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { leftDocument, rightDocument } = useDocumentContext();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<ReturnType<typeof compareTexts> | null>(null);
  const [syncScroll, setSyncScroll] = useState(true);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);

  // Extract file names from URL if available, otherwise use context
  const file1Name = searchParams.get('file1') || leftDocument?.name || '';
  const file2Name = searchParams.get('file2') || rightDocument?.name || '';
  
  useEffect(() => {
    if (!leftDocument || !rightDocument) {
      setError("No documents found. Please upload documents to compare.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    const compareDocuments = async () => {
      try {
        // Different comparison based on document type
        if (leftDocument.type === 'markdown' && rightDocument.type === 'markdown') {
          // For markdown, we can directly compare the text content
          console.log('Comparing markdown with options:', { ignoreWhitespace, ignoreCase });
          const result = compareTexts(
            leftDocument.data as string, 
            rightDocument.data as string,
            { ignoreWhitespace, ignoreCase }
          );
          setDiffResult(result);
        } else if (leftDocument.type === 'pdf' && rightDocument.type === 'pdf') {
          // For PDFs, we need to extract text first
          console.log('Comparing PDFs with options:', { ignoreWhitespace, ignoreCase });
          const result = await comparePDFs(
            leftDocument.data as ArrayBuffer,
            rightDocument.data as ArrayBuffer,
            { ignoreWhitespace, ignoreCase }
          );
          setDiffResult(result);
        } else {
          // Mixed document types
          setError("Cannot compare different document types. Please upload two documents of the same type.");
        }
      } catch (err) {
        console.error('Error comparing documents:', err);
        setError("Failed to compare documents. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    // Add a slight delay to ensure state has been properly updated
    const timeoutId = setTimeout(() => {
      compareDocuments();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [leftDocument, rightDocument, ignoreWhitespace, ignoreCase]);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b bg-background flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Compare Docs</h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/side-by-side')}
          >
            Switch to Side-by-Side View
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

      <div className="comparison-controls bg-background border-b p-2">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="sync-scroll" 
              checked={syncScroll} 
              onCheckedChange={(checked) => {
                setSyncScroll(checked === true);
              }}
              className="border-primary"
            />
            <Label htmlFor="sync-scroll" className="cursor-pointer">Sync scrolling</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Checkbox 
              id="ignore-whitespace" 
              checked={ignoreWhitespace} 
              onCheckedChange={(checked) => {
                setIgnoreWhitespace(checked === true);
              }}
              className="border-primary"
            />
            <Label htmlFor="ignore-whitespace" className="cursor-pointer">Ignore whitespace</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Checkbox 
              id="ignore-case" 
              checked={ignoreCase} 
              onCheckedChange={(checked) => {
                setIgnoreCase(checked === true);
              }}
              className="border-primary"
            />
            <Label htmlFor="ignore-case" className="cursor-pointer">Ignore case</Label>
          </div>
        </div>
      </div>

      <div className="flex-grow p-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-lg">Analyzing documents...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg text-destructive">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.href = '/'}
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : leftDocument && rightDocument ? (
          <div className="h-full">
            <ComparisonView
              leftDocument={leftDocument}
              rightDocument={rightDocument}
              diffResult={diffResult || undefined}
              syncScroll={syncScroll}
              onSyncScrollChange={(value) => setSyncScroll(value)}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg text-destructive">No documents available for comparison</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.href = '/'}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>

      <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        Document Comparison Tool &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
} 