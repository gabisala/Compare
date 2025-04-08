"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploadProps {
  onFileAccepted: (file: File) => void;
  accept: Record<string, string[]>;
  maxSize?: number;
  label?: string;
}

export function FileUpload({
  onFileAccepted,
  accept,
  maxSize = 5 * 1024 * 1024, // 5MB default
  label = "Drag and drop your file here, or click to browse",
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        const rejectionErrors = rejectedFiles[0].errors.map((err: any) => err.message).join(", ");
        setError(rejectionErrors);
        return;
      }

      if (acceptedFiles.length > 0) {
        setError(null);
        onFileAccepted(acceptedFiles[0]);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer flex flex-col items-center justify-center 
          ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"}`}
      >
        <input {...getInputProps()} />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`mb-4 ${isDragActive ? "text-primary" : "text-muted-foreground"}`}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
        <p className="text-sm text-muted-foreground text-center">{label}</p>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
} 