"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/molecules/file-upload";
import { Button } from "@/components/ui/button";
import { processFile, validateFile } from "@/lib/file-utils";
import { useDocumentContext } from "@/lib/document-context";

interface FileState {
  file: File | null;
  name: string;
  preview?: string;
}

export function FileUploadContainer() {
  const router = useRouter();
  const { setLeftDocument, setRightDocument } = useDocumentContext();
  
  const [leftFile, setLeftFile] = useState<FileState>({
    file: null,
    name: "",
  });
  
  const [rightFile, setRightFile] = useState<FileState>({
    file: null,
    name: "",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!leftFile.file || !rightFile.file) {
      setError("Please upload both documents to compare.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Process both files and store them in the document context
      const leftDocument = await processFile(leftFile.file);
      const rightDocument = await processFile(rightFile.file);
      
      // Store documents in context
      setLeftDocument(leftDocument);
      setRightDocument(rightDocument);
      
      // Navigate to the comparison page
      router.push('/compare');
    } catch (err) {
      console.error(err);
      setError("Failed to process files. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const acceptedFileTypes = {
    'text/markdown': ['.md'],
    'application/pdf': ['.pdf']
  };

  const handleLeftFileAccepted = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      // Use a default error message if message is undefined
      setError(validation.message || "Invalid file format");
      return;
    }
    
    setLeftFile({
      file,
      name: file.name,
    });
    setError(null);
  };

  const handleRightFileAccepted = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      // Use a default error message if message is undefined
      setError(validation.message || "Invalid file format");
      return;
    }
    
    setRightFile({
      file,
      name: file.name,
    });
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">First Document</h3>
          <FileUpload
            onFileAccepted={handleLeftFileAccepted}
            accept={acceptedFileTypes}
            label={leftFile.file ? `Selected: ${leftFile.name}` : "Drop first document here"}
          />
          {leftFile.file && (
            <p className="text-sm text-muted-foreground">
              {leftFile.name} ({(leftFile.file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Second Document</h3>
          <FileUpload
            onFileAccepted={handleRightFileAccepted}
            accept={acceptedFileTypes}
            label={rightFile.file ? `Selected: ${rightFile.name}` : "Drop second document here"}
          />
          {rightFile.file && (
            <p className="text-sm text-muted-foreground">
              {rightFile.name} ({(rightFile.file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Button
          disabled={!leftFile.file || !rightFile.file || isProcessing}
          onClick={handleCompare}
          className="px-8"
        >
          {isProcessing ? "Processing..." : "Compare Documents"}
        </Button>
      </div>
    </div>
  );
} 