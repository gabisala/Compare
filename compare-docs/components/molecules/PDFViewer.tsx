import React, { useEffect, useRef, useState } from 'react';
import * as PDFJS from 'pdfjs-dist';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// Set the worker source - using a workaround for Next.js/webpack
if (typeof window !== 'undefined' && !PDFJS.GlobalWorkerOptions.workerSrc) {
  PDFJS.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${PDFJS.version}/build/pdf.worker.min.js`;
}

interface PDFViewerProps {
  pdfData: ArrayBuffer;
  highlightDiffs?: boolean;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfData, highlightDiffs = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFJS.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the PDF document when pdfData changes
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        const loadingTask = PDFJS.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document');
        setLoading(false);
      }
    };

    if (pdfData) {
      loadPDF();
    }
  }, [pdfData]);

  // Render the current page when it changes or when the scale changes
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(currentPage);
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

          // If we need to highlight differences, we would add that logic here
          if (highlightDiffs) {
            // This would require additional logic to identify and highlight differences
            // For now, this is a placeholder
          }
        }
      } catch (err) {
        console.error('Error rendering page:', err);
        setError('Failed to render PDF page');
      }
    };

    if (pdfDoc) {
      renderPage();
    }
  }, [pdfDoc, currentPage, scale, highlightDiffs]);

  const changePage = (offset: number) => {
    const newPage = currentPage + offset;
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const changeZoom = (delta: number) => {
    const newScale = Math.max(0.5, Math.min(scale + delta, 3.0));
    setScale(newScale);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading PDF...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="pdf-viewer flex flex-col h-full">
      <div className="controls flex justify-between items-center p-2 bg-slate-100 dark:bg-slate-800 mb-2 rounded">
        <div className="page-controls flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changePage(-1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changePage(1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="zoom-controls flex gap-2">
          <Button variant="outline" size="sm" onClick={() => changeZoom(-0.2)}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => changeZoom(0.2)}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="canvas-container flex-1 overflow-auto">
        <canvas ref={canvasRef} className="mx-auto shadow-md" />
      </div>
    </div>
  );
};

export default PDFViewer; 