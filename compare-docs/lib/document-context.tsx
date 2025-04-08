"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { DiffResult } from "./comparison-engine";

export interface Document {
  name: string;
  type: 'pdf' | 'markdown';
  data: ArrayBuffer | string;
}

interface DocumentComparisonState {
  leftDocument: Document | null;
  rightDocument: Document | null;
  diffResult: DiffResult | null;
  isProcessing: boolean;
  error: string | null;
}

interface DocumentContextType extends DocumentComparisonState {
  setLeftDocument: (document: Document) => void;
  setRightDocument: (document: Document) => void;
  compareDocuments: () => void;
  clearDocuments: () => void;
  setError: (error: string | null) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DocumentComparisonState>({
    leftDocument: null,
    rightDocument: null,
    diffResult: null,
    isProcessing: false,
    error: null,
  });

  // Initialize from localStorage if available
  useEffect(() => {
    try {
      const storedState = localStorage.getItem("compareDocsState");
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        
        // We need to handle ArrayBuffer serialization
        const leftDocument = parsedState.leftDocument ? {
          ...parsedState.leftDocument,
          // Convert base64 back to ArrayBuffer if it's a PDF
          data: parsedState.leftDocument.type === 'pdf' 
            ? base64ToArrayBuffer(parsedState.leftDocument.data as string)
            : parsedState.leftDocument.data
        } : null;
        
        const rightDocument = parsedState.rightDocument ? {
          ...parsedState.rightDocument,
          // Convert base64 back to ArrayBuffer if it's a PDF
          data: parsedState.rightDocument.type === 'pdf'
            ? base64ToArrayBuffer(parsedState.rightDocument.data as string)
            : parsedState.rightDocument.data
        } : null;
        
        setState({
          ...parsedState,
          leftDocument,
          rightDocument
        });
      }
    } catch (error) {
      console.error("Failed to restore state from localStorage:", error);
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    try {
      if (state.leftDocument || state.rightDocument) {
        // We need to handle ArrayBuffer serialization
        const stateToStore = {
          ...state,
          // Convert ArrayBuffer to base64 for storage
          leftDocument: state.leftDocument ? {
            ...state.leftDocument,
            data: state.leftDocument.type === 'pdf'
              ? arrayBufferToBase64(state.leftDocument.data as ArrayBuffer)
              : state.leftDocument.data
          } : null,
          rightDocument: state.rightDocument ? {
            ...state.rightDocument,
            data: state.rightDocument.type === 'pdf'
              ? arrayBufferToBase64(state.rightDocument.data as ArrayBuffer)
              : state.rightDocument.data
          } : null
        };
        
        localStorage.setItem("compareDocsState", JSON.stringify(stateToStore));
      }
    } catch (error) {
      console.error("Failed to save state to localStorage:", error);
    }
  }, [state]);

  const setLeftDocument = (document: Document) => {
    setState(prev => ({
      ...prev,
      leftDocument: document,
      error: null,
    }));
  };

  const setRightDocument = (document: Document) => {
    setState(prev => ({
      ...prev,
      rightDocument: document,
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
      // In a real implementation, we would use the comparison-engine.ts
      // But for now, we'll set a placeholder diff result
      setState(prev => ({
        ...prev,
        diffResult: { diffs: [] },
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
      diffResult: null,
      isProcessing: false,
      error: null,
    });
    localStorage.removeItem("compareDocsState");
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

// Helper function to convert ArrayBuffer to base64 for storage
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const binary = new Uint8Array(buffer);
  const bytes = binary.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
  return btoa(bytes);
}

// Helper function to convert base64 back to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
}

export function useDocumentContext() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error("useDocumentContext must be used within a DocumentProvider");
  }
  return context;
} 