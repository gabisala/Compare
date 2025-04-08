import React, { useEffect, useRef, useState } from 'react';
import PDFViewer from '../molecules/PDFViewer';
import MarkdownViewer from '../molecules/MarkdownViewer';
import { DiffResult } from '../../lib/comparison-engine';
import { Button } from '@/components/ui/button';

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
  onSyncScrollChange?: (sync: boolean) => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({
  leftDocument,
  rightDocument,
  diffResult,
  syncScroll = true,
  onSyncScrollChange,
}) => {
  const leftContainerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);
  const [isScrollingSynced, setIsScrollingSynced] = useState(syncScroll);
  const [isSyncingScroll, setIsSyncingScroll] = useState(false);
  const [leftHeight, setLeftHeight] = useState<number | null>(null);
  const [rightHeight, setRightHeight] = useState<number | null>(null);
  const [contentHeights, setContentHeights] = useState<{left: number, right: number}>({left: 0, right: 0});

  // Update local state when syncScroll prop changes
  useEffect(() => {
    setIsScrollingSynced(syncScroll);
  }, [syncScroll]);

  // Measure content heights for alignment
  useEffect(() => {
    const updateHeights = () => {
      if (leftContainerRef.current && rightContainerRef.current) {
        const leftContainer = leftContainerRef.current;
        const rightContainer = rightContainerRef.current;
        
        // Get the height of each document's content
        const leftContent = leftContainer.querySelector('.document-content');
        const rightContent = rightContainer.querySelector('.document-content');
        
        if (leftContent && rightContent) {
          const leftScrollHeight = leftContent.scrollHeight;
          const rightScrollHeight = rightContent.scrollHeight;
          
          setContentHeights({
            left: leftScrollHeight,
            right: rightScrollHeight
          });
        }
      }
    };

    // Initial update
    updateHeights();
    
    // Update on window resize
    window.addEventListener('resize', updateHeights);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', updateHeights);
    };
  }, [leftDocument, rightDocument, diffResult]);

  // Set up synchronized scrolling
  useEffect(() => {
    if (!isScrollingSynced || !leftContainerRef.current || !rightContainerRef.current) {
      return;
    }

    const leftContainer = leftContainerRef.current;
    const rightContainer = rightContainerRef.current;
    
    // Keep track of event listeners for cleanup
    const eventListeners: { element: Element; type: string; handler: EventListener }[] = [];
    
    // Helper to add event listener and track it for cleanup
    const addTrackedEventListener = (element: Element, type: string, handler: EventListener) => {
      element.addEventListener(type, handler);
      eventListeners.push({ element, type, handler });
    };

    // Helper to find diff panels with reliable targeting
    const findDiffPanel = (side: 'left' | 'right') => {
      const container = side === 'left' ? leftContainer : rightContainer;
      return container.querySelector('.document-content [data-sync-scroll="true"]') as HTMLElement | null;
    };

    // Handle main document scrolling
    const handleScroll = (source: 'left' | 'right', event: Event) => {
      if (isSyncingScroll) return;
      
      const scrollTarget = event.target as HTMLElement;
      // Only handle document container scrolling here
      if (!scrollTarget.classList.contains('document-content')) return;

      setIsSyncingScroll(true);
      const scrollContainer = event.target as HTMLDivElement;
      const targetContainer = source === 'left' ? rightContainer : leftContainer;
      
      // Find the content areas
      const sourceContent = source === 'left' 
        ? leftContainer.querySelector('.document-content') 
        : rightContainer.querySelector('.document-content');
      const targetContent = source === 'left' 
        ? rightContainer.querySelector('.document-content') 
        : leftContainer.querySelector('.document-content');
      
      if (sourceContent && targetContent) {
        // Calculate scroll position as a percentage
        const sourceScrollHeight = sourceContent.scrollHeight;
        const targetScrollHeight = targetContent.scrollHeight;
        
        const scrollPercentage = scrollContainer.scrollTop / 
          (scrollContainer.scrollHeight - scrollContainer.clientHeight || 1);
        
        // Apply the same percentage to the target container
        targetContainer.scrollTop = scrollPercentage * 
          (targetContainer.scrollHeight - targetContainer.clientHeight || 1);
        
        setTimeout(() => setIsSyncingScroll(false), 50);
      }
    };

    // Handle diff panel scrolling specifically
    const handleDiffScroll = (source: 'left' | 'right', event: Event) => {
      if (isSyncingScroll) return;
      
      // Check that this is actually a diff panel
      const scrollElement = event.target as HTMLElement;
      if (!scrollElement.hasAttribute('data-sync-scroll')) {
        return;
      }
      
      setIsSyncingScroll(true);
      
      // Get the target diff panel in the other document
      const otherSide = source === 'left' ? 'right' : 'left';
      const sourceSide = source;
      
      // Use data-side and data-viewer-type to find the exact matching panel
      const sourceType = scrollElement.getAttribute('data-viewer-type');
      const targetPanel = findDiffPanel(otherSide);
      
      if (targetPanel && targetPanel.getAttribute('data-viewer-type') === sourceType) {
        // Calculate scroll percentage carefully
        const sourceHeight = scrollElement.scrollHeight - scrollElement.clientHeight || 1;
        const scrollPercentage = scrollElement.scrollTop / sourceHeight;
        
        const targetHeight = targetPanel.scrollHeight - targetPanel.clientHeight || 1;
        targetPanel.scrollTop = Math.round(scrollPercentage * targetHeight);
        
        console.log(`Syncing ${sourceType} diff panels: ${sourceSide} -> ${otherSide}`, {
          sourceScroll: scrollElement.scrollTop,
          targetScroll: targetPanel.scrollTop,
          percentage: scrollPercentage
        });
      }
      
      setTimeout(() => setIsSyncingScroll(false), 100);
    };

    // Direct event handlers
    const handleLeftScroll = (e: Event) => handleScroll('left', e);
    const handleRightScroll = (e: Event) => handleScroll('right', e);
    
    // Set up document container scroll event listeners
    const leftContent = leftContainer.querySelector('.document-content');
    const rightContent = rightContainer.querySelector('.document-content');
    
    if (leftContent && rightContent) {
      addTrackedEventListener(leftContent, 'scroll', handleLeftScroll);
      addTrackedEventListener(rightContent, 'scroll', handleRightScroll);
    }
    
    // Function to set up diff panel scroll synchronization
    const setupDiffPanelSync = () => {
      const leftDiffPanel = findDiffPanel('left');
      const rightDiffPanel = findDiffPanel('right');
      
      if (leftDiffPanel && rightDiffPanel) {
        console.log('Found diff panels for sync', {
          left: {
            type: leftDiffPanel.getAttribute('data-viewer-type'),
            height: leftDiffPanel.scrollHeight
          },
          right: {
            type: rightDiffPanel.getAttribute('data-viewer-type'),
            height: rightDiffPanel.scrollHeight
          }
        });
        
        // Direct event handlers for diff panels
        const handleLeftDiffScroll = (e: Event) => {
          handleDiffScroll('left', e);
        };
        
        const handleRightDiffScroll = (e: Event) => {
          handleDiffScroll('right', e);
        };
        
        // Add event listeners with the correct handlers
        addTrackedEventListener(leftDiffPanel, 'scroll', handleLeftDiffScroll);
        addTrackedEventListener(rightDiffPanel, 'scroll', handleRightDiffScroll);
        
        return true;
      }
      
      return false;
    };
    
    // Set up intersection observer to detect when diff panels are visible
    const setupIntersectionObserver = () => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.target.hasAttribute('data-sync-scroll')) {
            console.log('Diff panel became visible', entry.target);
            setupDiffPanelSync();
          }
        });
      }, { threshold: 0.1 });
      
      // Observe any existing diff panels
      document.querySelectorAll('[data-sync-scroll="true"]').forEach(panel => {
        observer.observe(panel);
      });
      
      return observer;
    };
    
    // Run initial setup
    setupDiffPanelSync();
    const intersectionObserver = setupIntersectionObserver();
    
    // Use MutationObserver to detect when diff panels are added to the DOM
    const documentObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const panelAdded = Array.from(mutation.addedNodes).some(node => {
            if (node instanceof HTMLElement) {
              // Check if this element or any of its children has data-sync-scroll
              return node.hasAttribute('data-sync-scroll') || 
                     node.querySelector('[data-sync-scroll="true"]') !== null;
            }
            return false;
          });
          
          if (panelAdded) {
            console.log('Diff panel added to DOM');
            setupDiffPanelSync();
            
            // Re-observe any new panels with the intersection observer
            document.querySelectorAll('[data-sync-scroll="true"]').forEach(panel => {
              intersectionObserver.observe(panel);
            });
          }
        }
      }
    });
    
    // Start observing the document for changes
    documentObserver.observe(document.body, { 
      childList: true, 
      subtree: true
    });
    
    // Check for diff panels periodically as a fallback
    const checkInterval = setInterval(() => {
      const leftDiff = findDiffPanel('left');
      const rightDiff = findDiffPanel('right');
      
      if (leftDiff && rightDiff) {
        setupDiffPanelSync();
      }
    }, 1000);

    return () => {
      // Clean up all tracked event listeners
      eventListeners.forEach(({ element, type, handler }) => {
        element.removeEventListener(type, handler);
      });
      
      // Disconnect observers
      documentObserver.disconnect();
      intersectionObserver.disconnect();
      
      // Clear interval
      clearInterval(checkInterval);
    };
  }, [isScrollingSynced, isSyncingScroll]);

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
          diffResult={diffResult}
          side={side}
        />
      );
    } else if (document.type === 'markdown') {
      return (
        <MarkdownViewer 
          markdownContent={document.data as string} 
          highlightDiffs={!!diffResult}
          diffResult={diffResult}
          side={side}
        />
      );
    }
    return <div>Unsupported document type</div>;
  };

  // Toggle sync scrolling and notify parent component
  const toggleSyncScroll = () => {
    const newState = !isScrollingSynced;
    setIsScrollingSynced(newState);
    onSyncScrollChange?.(newState);
  };

  return (
    <div className="comparison-view flex flex-col w-full h-full gap-2">
      <div className="controls flex justify-end mb-2">
        <Button 
          onClick={toggleSyncScroll}
          variant={isScrollingSynced ? "default" : "outline"}
          size="sm"
        >
          {isScrollingSynced ? 'Sync Scroll: On' : 'Sync Scroll: Off'}
        </Button>
      </div>
      
      <div className="documents-container flex flex-col md:flex-row w-full h-full gap-2">
        <div className="document-container left-document w-full md:w-1/2 border rounded-lg overflow-hidden" ref={leftContainerRef}>
          <div className="document-title p-2 bg-slate-200 dark:bg-slate-800 font-medium">
            {leftDocument.name}
          </div>
          <div className="document-content h-[calc(100%-2.5rem)] overflow-auto">
            {renderDocumentViewer(leftDocument, 'left')}
          </div>
        </div>

        <div className="document-container right-document w-full md:w-1/2 border rounded-lg overflow-hidden" ref={rightContainerRef}>
          <div className="document-title p-2 bg-slate-200 dark:bg-slate-800 font-medium">
            {rightDocument.name}
          </div>
          <div className="document-content h-[calc(100%-2.5rem)] overflow-auto">
            {renderDocumentViewer(rightDocument, 'right')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonView; 