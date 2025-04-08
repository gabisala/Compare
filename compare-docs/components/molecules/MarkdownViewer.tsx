import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import { Button } from '../ui/button';
import { Eye, Code, Link as LinkIcon } from 'lucide-react';
import { DiffResult, Diff } from '@/lib/comparison-engine';

// Load Prism languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';

interface MarkdownViewerProps {
  markdownContent: string;
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

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ 
  markdownContent, 
  highlightDiffs = false,
  diffResult,
  side = 'left'
}) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [diffDisplayMode, setDiffDisplayMode] = useState<'github' | 'formatted'>('github');
  const [highlightedContent, setHighlightedContent] = useState(markdownContent);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [showDiffPanel, setShowDiffPanel] = useState(true);
  const [fixedDiffPanelHeight, setFixedDiffPanelHeight] = useState<number | null>(null);
  const [fixedContentHeight, setFixedContentHeight] = useState<number | null>(null);
  const diffPanelRef = useRef<HTMLDivElement>(null);
  const contentPanelRef = useRef<HTMLDivElement>(null);
  
  // Add a state to track when this diff panel is actively being scrolled by sync
  const [isBeingSynced, setIsBeingSynced] = useState(false);
  
  // Apply syntax highlighting when component mounts or content changes
  useEffect(() => {
    if (viewMode === 'raw') {
      Prism.highlightAll();
    }
  }, [highlightedContent, viewMode]);

  // Process diffs into GitHub-style line-by-line format
  useEffect(() => {
    if (highlightDiffs && diffResult?.diffs) {
      const result = processGitHubStyleDiff(diffResult.diffs, side);
      setDiffLines(result);
    } else {
      setDiffLines([]);
    }
  }, [highlightDiffs, diffResult, side]);

  // Apply diff highlighting when diffResult changes
  useEffect(() => {
    if (highlightDiffs && diffResult?.formattedDiffs) {
      // Apply formatted diffs to the content
      if (side === 'left') {
        setHighlightedContent(diffResult.formattedDiffs.left);
      } else {
        setHighlightedContent(diffResult.formattedDiffs.right);
      }
    } else {
      setHighlightedContent(markdownContent);
    }
  }, [highlightDiffs, diffResult, side, markdownContent]);

  // Visual feedback for synced scrolling
  useEffect(() => {
    if (isBeingSynced) {
      const timer = setTimeout(() => setIsBeingSynced(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isBeingSynced]);

  // Process diffs into GitHub-style line-by-line format with line numbers
  const processGitHubStyleDiff = (diffs: Diff[], side: 'left' | 'right'): DiffLine[] => {
    const lines: DiffLine[] = [];
    let lineNumber = 1;
    
    // Get the original line count
    const originalLineCount = markdownContent.split('\n').length;

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

  // Toggle diff panel
  const toggleDiffPanel = () => {
    setShowDiffPanel(!showDiffPanel);
  };

  // Add line numbers to the raw markdown content
  const rawContentWithLineNumbers = markdownContent
    .split('\n')
    .map((line, index) => `${index + 1} | ${line}`)
    .join('\n');

  // Calculate and synchronize the heights of GitHub-style diff panels
  useEffect(() => {
    if (highlightDiffs && diffResult && showDiffPanel && diffDisplayMode === 'github') {
      // Use a global variable to store and synchronize heights between both viewers
      if (typeof window !== 'undefined') {
        // Initialize global tracking object if not exists
        if (!window.diffPanelHeights) {
          window.diffPanelHeights = {
            left: null,
            right: null,
            maxHeight: null,
            contentLeft: null,
            contentRight: null,
            maxContentHeight: null
          };
        }
        
        // Set the height for diff lines
        window.diffPanelHeights[side] = diffLines.length * 24; // 24px per line as a rough estimate
        
        // Calculate max diff height across both sides
        const maxHeight = Math.max(
          window.diffPanelHeights.left || 0,
          window.diffPanelHeights.right || 0
        );
        
        // Set the content panel height
        if (contentPanelRef.current) {
          // Use type-safe property access
          if (side === 'left') {
            window.diffPanelHeights.contentLeft = contentPanelRef.current.scrollHeight;
          } else {
            window.diffPanelHeights.contentRight = contentPanelRef.current.scrollHeight;
          }
        }
        
        // Calculate max content height
        const maxContentHeight = Math.max(
          window.diffPanelHeights.contentLeft || 0,
          window.diffPanelHeights.contentRight || 0
        );
        
        if (maxHeight > 0) {
          window.diffPanelHeights.maxHeight = maxHeight;
          setFixedDiffPanelHeight(maxHeight);
        }
        
        if (maxContentHeight > 0) {
          window.diffPanelHeights.maxContentHeight = maxContentHeight;
          setFixedContentHeight(maxContentHeight);
        }
      }
    }
  }, [diffLines, highlightDiffs, diffResult, showDiffPanel, diffDisplayMode, side]);

  return (
    <div className="markdown-viewer h-full flex flex-col">
      <div className="toolbar border-b p-2 bg-slate-100 dark:bg-slate-800 flex justify-between">
        <div className="view-mode-toggle flex">
          <Button
            variant={viewMode === 'rendered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('rendered')}
            className="mr-1"
            aria-label="View rendered markdown"
          >
            <Eye className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Rendered</span>
          </Button>
          <Button
            variant={viewMode === 'raw' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('raw')}
            aria-label="View raw markdown"
          >
            <Code className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Raw</span>
          </Button>
        </div>
        
        {highlightDiffs && diffResult && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDiffPanel}
            aria-label={showDiffPanel ? "Hide differences" : "Show differences"}
          >
            {showDiffPanel ? 'Hide' : 'Show'} Differences
          </Button>
        )}
      </div>

      <div className="content-container flex-1 overflow-auto">
        {/* Regular content view (without diffs) */}
        {(!highlightDiffs || !diffResult || !showDiffPanel) && (
          viewMode === 'rendered' ? (
            <div className="prose dark:prose-invert max-w-none p-4">
              <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </div>
          ) : (
            <pre className="p-4 bg-slate-800 text-slate-100 rounded overflow-x-auto">
              <code className="language-markdown">
                {rawContentWithLineNumbers}
              </code>
            </pre>
          )
        )}

        {/* Original content view above the diff panel */}
        {highlightDiffs && diffResult && showDiffPanel && (
          <div 
            className="mb-4"
            ref={contentPanelRef}
            style={fixedContentHeight ? { minHeight: `${fixedContentHeight}px` } : {}}
          >
            <h4 className="text-md font-medium mb-2">Original Content</h4>
            {viewMode === 'rendered' ? (
              <div className="prose dark:prose-invert max-w-none p-4 border rounded">
                <ReactMarkdown>{markdownContent}</ReactMarkdown>
              </div>
            ) : (
              <pre className="p-4 bg-slate-800 text-slate-100 rounded overflow-x-auto">
                <code className="language-markdown">
                  {rawContentWithLineNumbers}
                </code>
              </pre>
            )}
          </div>
        )}

        {/* Diff panel for showing differences */}
        {highlightDiffs && diffResult && showDiffPanel && diffLines.length > 0 && (
          <div 
            className="border rounded-md bg-white dark:bg-slate-800 p-4 diff-panel"
            ref={diffPanelRef}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">
                {side === 'left' ? 'Modifications in This Document' : 'Modifications in Comparison Document'}
              </h3>
              
              {isBeingSynced && (
                <div className="flex items-center text-blue-500 text-sm mr-2">
                  <LinkIcon className="h-3 w-3 mr-1 animate-pulse" />
                  <span>Synced</span>
                </div>
              )}
            </div>
            
            <div className="tabs mb-4">
              <Button 
                variant={diffDisplayMode === 'github' ? 'default' : 'outline'}
                size="sm" 
                className="mr-2"
                onClick={() => setDiffDisplayMode('github')}
                aria-pressed={diffDisplayMode === 'github'}
                aria-label="Show GitHub style diff"
              >
                GitHub Style
              </Button>
              <Button 
                variant={diffDisplayMode === 'formatted' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDiffDisplayMode('formatted')}
                aria-pressed={diffDisplayMode === 'formatted'}
                aria-label="Show formatted diff"
              >
                Formatted
              </Button>
            </div>
            
            <div 
              className={`diff-content bg-gray-50 dark:bg-gray-900 rounded border overflow-auto ${isBeingSynced ? 'ring-1 ring-blue-400' : ''}`}
              style={{ 
                maxHeight: '28rem',
                ...(diffDisplayMode === 'github' && fixedDiffPanelHeight ? { 
                  height: `${fixedDiffPanelHeight}px`,
                  minHeight: '200px'
                } : {})
              }}
              data-sync-scroll="true"
              data-viewer-type="markdown"
              data-side={side}
              onScroll={(e) => {
                // This helps debug scroll events
                console.log(`Markdown diff panel scroll (${side})`, e.currentTarget.scrollTop);
              }}
              // Custom event listener to detect when another component is syncing this panel
              ref={(el) => {
                if (el) {
                  // Setup mutation observer to detect style changes that indicate syncing
                  const observer = new MutationObserver(() => {
                    // When scrollTop changes due to external sync, show visual feedback
                    setIsBeingSynced(true);
                  });
                  
                  observer.observe(el, {
                    attributes: true,
                    attributeFilter: ['style', 'scrollTop'],
                  });
                  
                  // Store the original scrollTo method
                  const originalScrollTop = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
                  
                  if (originalScrollTop && originalScrollTop.set) {
                    // Create a proxy to detect when scrollTop is set programmatically
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
              {diffDisplayMode === 'github' ? (
                <div className="github-diff-content font-mono text-sm">
                  {diffLines.map((line, index) => renderDiffLine(line, index))}
                  {/* Add empty placeholder lines to maintain consistent height */}
                  {fixedDiffPanelHeight && diffLines.length * 24 < fixedDiffPanelHeight && 
                    Array.from({ length: Math.ceil((fixedDiffPanelHeight - diffLines.length * 24) / 24) }).map((_, i) => (
                      <div key={`placeholder-${i}`} className="flex bg-white dark:bg-gray-900 min-h-[1.5rem]">
                        <div className="text-gray-500 w-12 text-right pr-2 select-none border-r border-gray-300 dark:border-gray-700 font-mono text-xs">
                          &nbsp;
                        </div>
                        <div className="pl-2 font-mono text-xs whitespace-pre text-gray-300 dark:text-gray-700 flex-1">
                          <span className="inline-block w-4">&nbsp;</span>
                          <span>&nbsp;</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              ) : (
                processDiffTextWithFormatting(diffLines)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add TypeScript declaration for the global window object
declare global {
  interface Window {
    diffPanelHeights?: {
      left: number | null;
      right: number | null;
      maxHeight: number | null;
      contentLeft: number | null;
      contentRight: number | null;
      maxContentHeight: number | null;
    };
  }
}

export default MarkdownViewer; 