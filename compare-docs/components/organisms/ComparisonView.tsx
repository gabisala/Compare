import React, { useEffect, useRef, useState } from 'react';
import PDFViewer from '../molecules/PDFViewer';
import MarkdownViewer from '../molecules/MarkdownViewer';
import { DiffResult } from '../../lib/comparison-engine';

interface ComparisonViewProps {
  leftDocument: {
    type: 'pdf' | 'markdown';
    data: ArrayBuffer | string;
    name: string;
  };
  rightDocument: {
    type: 'pdf' | 'markdown';
    data: ArrayBuffer | string;
    name: string;
  };
  diffResult?: DiffResult;
  syncScroll?: boolean;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({
  leftDocument,
  rightDocument,
  diffResult,
  syncScroll = true,
}) => {
  const leftContainerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);
  const [isScrollingSynced, setIsScrollingSynced] = useState(syncScroll);
  const [isSyncingScroll, setIsSyncingScroll] = useState(false);

  useEffect(() => {
    setIsScrollingSynced(syncScroll);
  }, [syncScroll]);

  // Set up synchronized scrolling
  useEffect(() => {
    if (!isScrollingSynced || !leftContainerRef.current || !rightContainerRef.current) {
      return;
    }

    const leftContainer = leftContainerRef.current;
    const rightContainer = rightContainerRef.current;

    const handleScroll = (source: 'left' | 'right', event: Event) => {
      if (isSyncingScroll) return;

      setIsSyncingScroll(true);
      const scrollContainer = event.target as HTMLDivElement;
      const targetContainer = source === 'left' ? rightContainer : leftContainer;

      // Calculate scroll position as a percentage
      const scrollPercentage = scrollContainer.scrollTop / 
        (scrollContainer.scrollHeight - scrollContainer.clientHeight);
      
      // Apply the same percentage to the target container
      targetContainer.scrollTop = scrollPercentage * 
        (targetContainer.scrollHeight - targetContainer.clientHeight);
      
      setTimeout(() => setIsSyncingScroll(false), 50);
    };

    const handleLeftScroll = (e: Event) => handleScroll('left', e);
    const handleRightScroll = (e: Event) => handleScroll('right', e);

    leftContainer.addEventListener('scroll', handleLeftScroll);
    rightContainer.addEventListener('scroll', handleRightScroll);

    return () => {
      leftContainer.removeEventListener('scroll', handleLeftScroll);
      rightContainer.removeEventListener('scroll', handleRightScroll);
    };
  }, [isScrollingSynced, isSyncingScroll, leftContainerRef, rightContainerRef]);

  // Render the appropriate viewer based on document type
  const renderDocumentViewer = (
    document: ComparisonViewProps['leftDocument'], 
    side: 'left' | 'right'
  ) => {
    if (document.type === 'pdf') {
      return (
        <PDFViewer 
          pdfData={document.data as ArrayBuffer} 
          highlightDiffs={!!diffResult}
        />
      );
    } else if (document.type === 'markdown') {
      return (
        <MarkdownViewer 
          markdownContent={document.data as string} 
          highlightDiffs={!!diffResult}
        />
      );
    }
    return <div>Unsupported document type</div>;
  };

  return (
    <div className="comparison-view flex flex-col md:flex-row w-full h-full gap-2">
      <div className="document-container left-document w-full md:w-1/2 border rounded-lg overflow-hidden" ref={leftContainerRef}>
        <div className="document-title p-2 bg-slate-200 dark:bg-slate-800 font-medium">
          {leftDocument.name}
        </div>
        <div className="document-content h-[calc(100%-2.5rem)]">
          {renderDocumentViewer(leftDocument, 'left')}
        </div>
      </div>

      <div className="document-container right-document w-full md:w-1/2 border rounded-lg overflow-hidden" ref={rightContainerRef}>
        <div className="document-title p-2 bg-slate-200 dark:bg-slate-800 font-medium">
          {rightDocument.name}
        </div>
        <div className="document-content h-[calc(100%-2.5rem)]">
          {renderDocumentViewer(rightDocument, 'right')}
        </div>
      </div>
    </div>
  );
};

export default ComparisonView; 