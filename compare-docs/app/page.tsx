"use client";

import { ThemeToggle } from "@/components/atoms/theme-toggle";
import { FileUploadContainer } from "@/components/organisms/file-upload-container";
import { Button } from "@/components/ui/button";
import { useDocumentContext } from "@/lib/document-context";
import { createSampleMarkdown } from "@/lib/file-utils";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const { setLeftDocument, setRightDocument } = useDocumentContext();
  const router = useRouter();

  const handleUseSampleDocs = () => {
    const originalDoc = createSampleMarkdown('original');
    const modifiedDoc = createSampleMarkdown('modified');
    
    setLeftDocument(originalDoc);
    setRightDocument(modifiedDoc);
    
    router.push('/compare');
  };

  const handleUseSampleDocsSideBySide = () => {
    const originalDoc = createSampleMarkdown('original');
    const modifiedDoc = createSampleMarkdown('modified');
    
    setLeftDocument(originalDoc);
    setRightDocument(modifiedDoc);
    
    router.push('/side-by-side');
  };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b bg-background flex items-center justify-between p-4">
        <h1 className="text-2xl font-semibold">Compare Docs</h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-grow flex flex-col p-6 items-center justify-center">
        <div className="w-full mx-auto space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">Document Comparison Tool</h2>
            <p className="text-lg text-muted-foreground mt-2">
              Upload two documents to compare their differences side by side
            </p>
          </div>
          
          <FileUploadContainer />
          
          <div className="flex flex-col items-center mt-10 pt-6 border-t">
            <p className="text-muted-foreground mb-4">
              Don't have documents to compare? Try our sample documents:
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                onClick={handleUseSampleDocs}
                className="flex items-center gap-2"
              >
                Standard Comparison
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                onClick={handleUseSampleDocsSideBySide}
                className="flex items-center gap-2"
                variant="outline"
              >
                Side-by-Side Comparison
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        Document Comparison Tool &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
