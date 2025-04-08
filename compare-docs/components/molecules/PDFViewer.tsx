'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Link as LinkIcon } from 'lucide-react';
import { DiffResult, Diff } from '@/lib/comparison-engine';

// Dynamically import PDF.js types
interface PDFJSModule {
  getDocument: (data: ArrayBuffer | { data: ArrayBuffer }) => { promise: Promise<PDFDocumentProxy> };
  GlobalWorkerOptions: { workerSrc: string };
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getViewport: (options: { scale: number }) => PDFViewport;
  render: (options: { canvasContext: CanvasRenderingContext2D, viewport: PDFViewport }) => { promise: Promise<void> };
  getTextContent: () => Promise<PDFTextContent>;
}

interface PDFViewport {
  width: number;
  height: number;
}

interface PDFTextContent {
  items: Array<{ str: string; transform: number[] }>;
}

interface PDFViewerProps {
  pdfData: ArrayBuffer;
  highlightDiffs?: boolean;
  diffResult?: DiffResult;
  side?: 'left' | 'right';
}

interface DiffLine {
  type: 'addition' | 'deletion' | 'context';
  content: string;
  lineNumber: number;
  correspondingLine?: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  pdfData, 
  highlightDiffs = false,
  diffResult,
  side = 'left'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfJS, setPdfJS] = useState<PDFJSModule | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const workerInitializedRef = useRef(false);
  const [showDiffPanel, setShowDiffPanel] = useState(true);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [viewMode, setViewMode] = useState<'github' | 'formatted'>('github');
  const [isBeingSynced, setIsBeingSynced] = useState(false);

  // Load PDF.js library
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const loadPdfLibrary = async () => {
      try {
        // Dynamically import PDF.js only on client side
        const pdfJSModule = await import('pdfjs-dist');
        setPdfJS(pdfJSModule as unknown as PDFJSModule);
        
        // Set worker source
        if (!workerInitializedRef.current) {
          const workerSrc = '/pdf-worker/pdf.worker.min.js';
          pdfJSModule.GlobalWorkerOptions.workerSrc = workerSrc;
          workerInitializedRef.current = true;
          console.log('PDF.js worker source set to:', workerSrc);
        }
      } catch (err) {
        console.error('Error loading PDF.js library:', err);
        setError(`Failed to load PDF.js library: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };
    
    loadPdfLibrary();
  }, []);

  // Process diffs into GitHub-style line-by-line format
  useEffect(() => {
    if (highlightDiffs && diffResult?.diffs) {
      const result = processGitHubStyleDiff(diffResult.diffs, side);
      setDiffLines(result);
    } else {
      setDiffLines([]);
    }
  }, [highlightDiffs, diffResult, side]);

  // Process diffs into GitHub-style line-by-line format with line numbers
  const processGitHubStyleDiff = (diffs: Diff[], side: 'left' | 'right'): DiffLine[] => {
    const lines: DiffLine[] = [];
    let lineNumber = 1;
    
    // Use lineMap for alignment if available
    const lineMap = diffResult?.lineMap;
    
    // Process the diffs to create line-by-line entries
    diffs.forEach(([operation, text]) => {
      // Split the text into lines
      const textLines = text.split('\n');
      
      // Process each line based on the operation
      textLines.forEach((line, index) => {
        // Skip the last empty line that comes from splitting
        if (index === textLines.length - 1 && line === '') {
          return;
        }

        // For left side (document 1), show deletions and context
        // For right side (document 2), show additions and context
        if (operation === 0) {
          // Context (no change)
          lines.push({
            type: 'context',
            content: line,
            lineNumber: lineNumber++,
            correspondingLine: lineMap ? 
              (side === 'left' ? lineMap.left.get(lineNumber - 1) : lineMap.right.get(lineNumber - 1)) : 
              undefined
          });
        } else if (operation === -1 && side === 'left') {
          // Deletion (present in doc 1, absent in doc 2)
          lines.push({
            type: 'deletion',
            content: line,
            lineNumber: lineNumber++,
            correspondingLine: lineMap?.left.get(lineNumber - 1)
          });
        } else if (operation === 1 && side === 'right') {
          // Addition (absent in doc 1, present in doc 2)
          lines.push({
            type: 'addition',
            content: line,
            lineNumber: lineNumber++,
            correspondingLine: lineMap?.right.get(lineNumber - 1)
          });
        } else {
          // Increment line number for additions on left side and deletions on right side
          // This helps maintain alignment between the two views
          lineNumber++;
        }
      });
    });

    return lines;
  };

  // Load the PDF document
  useEffect(() => {
    if (!pdfJS || !pdfData) return;
    
    const loadPdfDocument = async () => {
      try {
        console.log('Loading PDF document...');
        setLoading(true);
        
        // Important: Get the document from the promise
        const loadingTask = pdfJS.getDocument({ data: pdfData });
        const pdfDocument = await loadingTask.promise;
        
        setPdfDoc(pdfDocument);
        setTotalPages(pdfDocument.numPages);
        setLoading(false);
        console.log(`PDF loaded successfully with ${pdfDocument.numPages} pages`);
      } catch (err) {
        console.error('Error loading PDF document:', err);
        setError(`Failed to load PDF: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };
    
    loadPdfDocument();
  }, [pdfJS, pdfData]);

  // Render the current page when it changes or when the scale changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    
    let isActive = true; // Flag to prevent state updates after unmount
    
    const renderPage = async () => {
      try {
        console.log(`Rendering page ${currentPage} at scale ${scale}`);
        const page = await pdfDoc.getPage(currentPage);
        
        // Prevent rendering if component unmounted
        if (!isActive || !canvasRef.current) return;
        
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          const renderContext = {
            canvasContext: context,
            viewport,
          };

          await page.render(renderContext).promise;
          
          // Prevent state updates if component unmounted
          if (!isActive) return;
          
          console.log(`Page ${currentPage} rendered successfully`);
        }
      } catch (err) {
        // Prevent state updates if component unmounted
        if (!isActive) return;
        
        console.error('Error rendering page:', err);
        setError(`Failed to render PDF page: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    renderPage();
    
    // Cleanup function
    return () => {
      isActive = false; // Set flag to prevent state updates
    };
  }, [pdfDoc, currentPage, scale]);

  // Render a GitHub-style diff line
  const renderDiffLine = (line: DiffLine, index: number) => {
    const bgClass = 
      line.type === 'addition' ? 'bg-green-50 dark:bg-green-950' : 
      line.type === 'deletion' ? 'bg-red-50 dark:bg-red-950' : 
      'bg-white dark:bg-gray-900';
    
    const textClass = 
      line.type === 'addition' ? 'text-green-800 dark:text-green-200' : 
      line.type === 'deletion' ? 'text-red-800 dark:text-red-200' : 
      'text-gray-800 dark:text-gray-200';
    
    const prefixChar = 
      line.type === 'addition' ? '+' : 
      line.type === 'deletion' ? '-' : 
      ' ';

    return (
      <div key={index} className={`flex ${bgClass} min-h-[1.5rem]`}>
        <div className="text-gray-500 w-12 text-right pr-2 select-none border-r border-gray-300 dark:border-gray-700 font-mono text-xs">
          {line.lineNumber}
        </div>
        <div className={`pl-2 font-mono text-xs whitespace-pre ${textClass} flex-1`}>
          <span className="inline-block w-4">{prefixChar}</span>
          <span>{line.content}</span>
        </div>
      </div>
    );
  };

  // Process diff text to formatted paragraphs
  const processDiffTextWithFormatting = (diffLines: DiffLine[]): React.ReactNode => {
    return (
      <div className="formatted-diff space-y-2">
        {diffLines.map((line, index) => {
          const textClass = 
            line.type === 'addition' ? 'text-green-800 dark:text-green-200' : 
            line.type === 'deletion' ? 'text-red-800 dark:text-red-200' : 
            'text-gray-800 dark:text-gray-200';
          
          if (!line.content.trim()) {
            return <div key={index} className="h-4"></div>;
          }
          
          // Format headings and paragraphs
          const isLikelyHeading = 
            line.content.length < 50 && 
            !line.content.includes('.') && 
            (line.content.endsWith(':') || line.content === line.content.toUpperCase());
          
          if (isLikelyHeading) {
            return (
              <h3 key={index} className={`text-lg font-semibold my-2 ${textClass} flex`}>
                <span className="w-12 text-right pr-2 text-gray-500">{line.lineNumber}</span>
                <span className="pl-2">{line.content}</span>
              </h3>
            );
          }
          
          return (
            <p key={index} className={`mb-2 ${textClass} flex`}>
              <span className="w-12 text-right pr-2 text-gray-500">{line.lineNumber}</span>
              <span className="pl-2">{line.content}</span>
            </p>
          );
        })}
      </div>
    );
  };

  // Navigation functions
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Zoom functions
  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  };

  // Toggle diff panel
  const toggleDiffPanel = () => {
    setShowDiffPanel(!showDiffPanel);
  };

  // Visual feedback for synced scrolling
  useEffect(() => {
    if (isBeingSynced) {
      const timer = setTimeout(() => setIsBeingSynced(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isBeingSynced]);

  if (loading) {
    return (
      <div className="pdf-viewer flex flex-col items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p>Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-viewer flex flex-col items-center justify-center h-full text-destructive">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="pdf-viewer flex flex-col h-full">
      <div className="controls flex justify-between p-2 bg-slate-100 dark:bg-slate-800 mb-2 rounded">
        <div className="pagination flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="mr-2"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="ml-2"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="zoom-controls flex">
          <Button
            variant="outline"
            size="sm"
            onClick={zoomOut}
            className="mr-1"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={zoomIn}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="pdf-container flex-1 overflow-auto relative">
        <canvas ref={canvasRef} className="pdf-canvas block mx-auto"></canvas>
        
        {diffLines.length > 0 && highlightDiffs && diffResult && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">
                {side === 'left' ? 'Modifications in This Document' : 'Modifications in Comparison Document'}
              </h3>
              
              <div className="flex items-center">
                {isBeingSynced && (
                  <div className="flex items-center text-blue-500 text-sm mr-2">
                    <LinkIcon className="h-3 w-3 mr-1 animate-pulse" />
                    <span>Synced</span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleDiffPanel}
                  aria-label={showDiffPanel ? "Hide differences" : "Show differences"}
                >
                  {showDiffPanel ? 'Hide' : 'Show'} Differences
                </Button>
              </div>
            </div>
            
            {showDiffPanel && (
              <div className="border rounded-md bg-white dark:bg-slate-800 p-4 diff-panel">
                <div className="tabs mb-4">
                  <Button 
                    variant={viewMode === 'github' ? 'default' : 'outline'}
                    size="sm" 
                    className="mr-2"
                    onClick={() => setViewMode('github')}
                    aria-pressed={viewMode === 'github'}
                  >
                    GitHub Style
                  </Button>
                  <Button 
                    variant={viewMode === 'formatted' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('formatted')}
                    aria-pressed={viewMode === 'formatted'}
                  >
                    Formatted
                  </Button>
                </div>
                
                <div 
                  className={`diff-content bg-gray-50 dark:bg-gray-900 rounded border overflow-auto ${isBeingSynced ? 'ring-1 ring-blue-400' : ''}`}
                  style={{ maxHeight: '28rem' }}
                  data-sync-scroll="true"
                  data-viewer-type="pdf"
                  data-side={side}
                  onScroll={(e) => {
                    // This helps debug scroll events
                    console.log(`PDF diff panel scroll (${side})`, e.currentTarget.scrollTop);
                  }}
                  ref={(el) => {
                    if (el) {
                      // Setup mutation observer to detect style changes that indicate syncing
                      const observer = new MutationObserver(() => {
                        setIsBeingSynced(true);
                      });
                      
                      observer.observe(el, {
                        attributes: true,
                        attributeFilter: ['style', 'scrollTop'],
                      });
                      
                      // Store the original scrollTo method
                      const originalScrollTop = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
                      
                      if (originalScrollTop && originalScrollTop.set) {
                        Object.defineProperty(el, 'scrollTop', {
                          set: function(v) {
                            setIsBeingSynced(true);
                            originalScrollTop.set?.call(this, v);
                          },
                          get: function() {
                            return originalScrollTop.get?.call(this);
                          },
                          configurable: true
                        });
                      }
                    }
                  }}
                >
                  {viewMode === 'github' ? (
                    <div className="github-diff-content font-mono text-sm">
                      {diffLines.map((line, index) => renderDiffLine(line, index))}
                    </div>
                  ) : (
                    processDiffTextWithFormatting(diffLines)
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer; 