"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";

interface DocumentDiff {
  additions: { line: number; content: string }[];
  deletions: { line: number; content: string }[];
}

interface DocumentComparisonState {
  leftDocument: {
    name: string;
    content: string;
  } | null;
  rightDocument: {
    name: string;
    content: string;
  } | null;
  differences: DocumentDiff | null;
  isProcessing: boolean;
  error: string | null;
}

interface DocumentContextType extends DocumentComparisonState {
  setLeftDocument: (name: string, content: string) => void;
  setRightDocument: (name: string, content: string) => void;
  compareDocuments: () => void;
  clearDocuments: () => void;
  setError: (error: string | null) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DocumentComparisonState>({
    leftDocument: null,
    rightDocument: null,
    differences: null,
    isProcessing: false,
    error: null,
  });

  const setLeftDocument = (name: string, content: string) => {
    setState(prev => ({
      ...prev,
      leftDocument: { name, content },
      error: null,
    }));
  };

  const setRightDocument = (name: string, content: string) => {
    setState(prev => ({
      ...prev,
      rightDocument: { name, content },
      error: null,
    }));
  };

  const compareDocuments = async () => {
    if (!state.leftDocument || !state.rightDocument) {
      setState(prev => ({
        ...prev,
        error: "Both documents are required for comparison",
      }));
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      // In a real implementation, we would use a more sophisticated diff algorithm
      // This is a simplified version for demonstration
      const leftLines = state.leftDocument.content.split("\n");
      const rightLines = state.rightDocument.content.split("\n");

      const additions: { line: number; content: string }[] = [];
      const deletions: { line: number; content: string }[] = [];

      // Very simple diff algorithm
      for (let i = 0; i < Math.max(leftLines.length, rightLines.length); i++) {
        if (i >= leftLines.length) {
          // Addition (line in right but not in left)
          additions.push({ line: i, content: rightLines[i] });
        } else if (i >= rightLines.length) {
          // Deletion (line in left but not in right)
          deletions.push({ line: i, content: leftLines[i] });
        } else if (leftLines[i] !== rightLines[i]) {
          // Change (different content)
          deletions.push({ line: i, content: leftLines[i] });
          additions.push({ line: i, content: rightLines[i] });
        }
      }

      // Simulate async process
      await new Promise(resolve => setTimeout(resolve, 500));

      setState(prev => ({
        ...prev,
        differences: { additions, deletions },
        isProcessing: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: "Failed to compare documents",
        isProcessing: false,
      }));
    }
  };

  const clearDocuments = () => {
    setState({
      leftDocument: null,
      rightDocument: null,
      differences: null,
      isProcessing: false,
      error: null,
    });
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const contextValue: DocumentContextType = {
    ...state,
    setLeftDocument,
    setRightDocument,
    compareDocuments,
    clearDocuments,
    setError,
  };

  return (
    <DocumentContext.Provider value={contextValue}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocumentContext() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error("useDocumentContext must be used within a DocumentProvider");
  }
  return context;
} 