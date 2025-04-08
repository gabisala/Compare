import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import { Button } from '../ui/button';
import { Eye, Code } from 'lucide-react';

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
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ 
  markdownContent, 
  highlightDiffs = false 
}) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  
  // Apply syntax highlighting when component mounts or content changes
  useEffect(() => {
    if (viewMode === 'raw') {
      Prism.highlightAll();
    }
  }, [markdownContent, viewMode]);

  // Add line numbers to the raw markdown content
  const rawContentWithLineNumbers = markdownContent
    .split('\n')
    .map((line, index) => `${index + 1} | ${line}`)
    .join('\n');

  return (
    <div className="markdown-viewer flex flex-col h-full">
      <div className="controls flex justify-end p-2 bg-slate-100 dark:bg-slate-800 mb-2 rounded">
        <div className="view-toggle flex">
          <Button
            variant={viewMode === 'rendered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('rendered')}
            className="rounded-r-none"
          >
            <Eye className="h-4 w-4 mr-1" />
            Rendered
          </Button>
          <Button
            variant={viewMode === 'raw' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('raw')}
            className="rounded-l-none"
          >
            <Code className="h-4 w-4 mr-1" />
            Raw
          </Button>
        </div>
      </div>

      <div className="content-container flex-1 overflow-auto">
        {viewMode === 'rendered' ? (
          <div className="prose dark:prose-invert max-w-none p-4">
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
    </div>
  );
};

export default MarkdownViewer; 