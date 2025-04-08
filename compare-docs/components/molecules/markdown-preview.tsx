"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface MarkdownPreviewProps {
  content: string;
  fileName: string;
  highlightedLines?: {
    line: number;
    type: "addition" | "deletion";
    content: string;
  }[];
}

export function MarkdownPreview({
  content,
  fileName,
  highlightedLines = [],
}: MarkdownPreviewProps) {
  const [viewMode, setViewMode] = useState<"raw" | "rendered">("raw");
  
  const toggleViewMode = () => {
    setViewMode(viewMode === "raw" ? "rendered" : "raw");
  };

  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const isMarkdown = fileExtension === 'md';
  
  const renderContent = () => {
    if (!content) return <p className="text-muted-foreground italic">No content to display</p>;

    if (viewMode === "raw" || !isMarkdown) {
      // Raw view - display with line numbers and highlighting
      const lines = content.split('\n');
      
      return (
        <div className="font-mono text-sm">
          {lines.map((line, index) => {
            const highlightedLine = highlightedLines?.find(h => h.line === index);
            const highlightClass = highlightedLine 
              ? highlightedLine.type === "addition" 
                ? "bg-secondary/10 text-secondary" 
                : "bg-destructive/10 text-destructive"
              : "";
            
            return (
              <div key={index} className={`flex ${highlightClass}`}>
                <div className="w-12 text-right pr-4 select-none text-muted-foreground border-r mr-3">
                  {index + 1}
                </div>
                <div className="flex-1 overflow-x-auto">
                  {line || " "}
                </div>
              </div>
            );
          })}
        </div>
      );
    } else {
      // Rendered view for markdown (actual rendering would be implemented with a library like react-markdown)
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {/* In a real implementation, we would use react-markdown to render the markdown */}
          <p className="italic text-muted-foreground">
            (Rendered Markdown would appear here using react-markdown)
          </p>
          <pre>
            {content}
          </pre>
        </div>
      );
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {isMarkdown && (
        <div className="mb-3 flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleViewMode}
            className="text-xs"
          >
            {viewMode === "raw" ? "Show Rendered" : "Show Raw"}
          </Button>
        </div>
      )}
      
      <div className="flex-1 overflow-auto border rounded-md bg-muted/30 p-4">
        {renderContent()}
      </div>
    </div>
  );
} 