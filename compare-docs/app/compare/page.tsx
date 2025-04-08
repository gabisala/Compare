"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/atoms/theme-toggle";
import Link from "next/link";

interface ComparisonData {
  file1Name: string;
  file2Name: string;
  differences: {
    additions: { line: number; content: string }[];
    deletions: { line: number; content: string }[];
  };
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const file1Name = searchParams.get('file1');
  const file2Name = searchParams.get('file2');

  useEffect(() => {
    try {
      // Simulate a brief loading period for UX
      setTimeout(() => {
        // Retrieve the comparison data from localStorage
        const storedData = localStorage.getItem('compareDocsData');
        
        if (!storedData) {
          setError("No comparison data found. Please try comparing documents again.");
          setIsLoading(false);
          return;
        }
        
        const parsedData = JSON.parse(storedData) as ComparisonData;
        setComparisonData(parsedData);
        setIsLoading(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Failed to load comparison data.");
      setIsLoading(false);
    }
  }, []);

  const renderContentWithHighlights = (
    fileName: string | null, 
    isSource: boolean,
    differences: ComparisonData["differences"] | undefined
  ) => {
    if (!fileName || !differences) {
      return <p>No content to display</p>;
    }

    // In a real implementation, we would render the actual document content
    // with the differences highlighted. For this example, we're just showing
    // the differences themselves.

    return (
      <div className="font-mono text-sm whitespace-pre-wrap">
        {isSource ? (
          // Show deletions for source document
          differences.deletions.map((deletion, index) => (
            <div 
              key={`deletion-${index}`} 
              className="bg-destructive/10 text-destructive p-1 mb-2 rounded"
            >
              {deletion.line + 1}: {deletion.content}
            </div>
          ))
        ) : (
          // Show additions for target document
          differences.additions.map((addition, index) => (
            <div 
              key={`addition-${index}`} 
              className="bg-secondary/10 text-secondary p-1 mb-2 rounded"
            >
              {addition.line + 1}: {addition.content}
            </div>
          ))
        )}
        
        {(isSource && differences.deletions.length === 0) || 
        (!isSource && differences.additions.length === 0) ? (
          <p className="text-muted-foreground italic">
            No {isSource ? "deletions" : "additions"} detected
          </p>
        ) : null}
      </div>
    );
  };

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
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

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
        ) : comparisonData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            <div className="border rounded-lg p-4 bg-card h-full">
              <div className="border-b pb-2 mb-4">
                <h2 className="font-medium">{file1Name || comparisonData.file1Name}</h2>
                <p className="text-xs text-muted-foreground">Original document</p>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {renderContentWithHighlights(
                  file1Name || comparisonData.file1Name, 
                  true, 
                  comparisonData.differences
                )}
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-card h-full">
              <div className="border-b pb-2 mb-4">
                <h2 className="font-medium">{file2Name || comparisonData.file2Name}</h2>
                <p className="text-xs text-muted-foreground">Modified document</p>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {renderContentWithHighlights(
                  file2Name || comparisonData.file2Name, 
                  false, 
                  comparisonData.differences
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg text-destructive">No comparison data available</p>
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