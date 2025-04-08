import { Document } from "./document-context";

/**
 * Reads a file and returns its contents as text
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read file as text"));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsText(file);
  });
}

/**
 * Simple diff function to find additions and deletions between two strings
 * This is a basic implementation and could be replaced with a more robust diff algorithm
 */
export function diffTexts(original: string, modified: string): {
  additions: { line: number; content: string }[];
  deletions: { line: number; content: string }[];
} {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  const additions: { line: number; content: string }[] = [];
  const deletions: { line: number; content: string }[] = [];
  
  // Very simple diff implementation
  // A more robust implementation would use an algorithm like Myers diff
  let i = 0;
  let j = 0;
  
  while (i < originalLines.length || j < modifiedLines.length) {
    if (i >= originalLines.length) {
      // All remaining lines in modified are additions
      additions.push({ line: j, content: modifiedLines[j] });
      j++;
    } else if (j >= modifiedLines.length) {
      // All remaining lines in original are deletions
      deletions.push({ line: i, content: originalLines[i] });
      i++;
    } else if (originalLines[i] === modifiedLines[j]) {
      // Lines match, move forward in both
      i++;
      j++;
    } else {
      // Check if this line was added
      const nextOrigIndex = originalLines.indexOf(modifiedLines[j], i);
      if (nextOrigIndex !== -1 && nextOrigIndex < i + 3) {
        // Lines were deleted from original
        for (let k = i; k < nextOrigIndex; k++) {
          deletions.push({ line: k, content: originalLines[k] });
        }
        i = nextOrigIndex;
      } else {
        // Line was added in modified
        additions.push({ line: j, content: modifiedLines[j] });
        j++;
      }
    }
  }
  
  return { additions, deletions };
}

/**
 * Processes two files and returns a comparison result
 */
export async function compareFiles(file1: File, file2: File): Promise<{
  file1Name: string;
  file2Name: string;
  file1Content: string;
  file2Content: string;
  differences: {
    additions: { line: number; content: string }[];
    deletions: { line: number; content: string }[];
  };
}> {
  const file1Content = await readFileAsText(file1);
  const file2Content = await readFileAsText(file2);
  
  const differences = diffTexts(file1Content, file2Content);
  
  return {
    file1Name: file1.name,
    file2Name: file2.name,
    file1Content,
    file2Content,
    differences,
  };
}

/**
 * Determine file type from file extension
 */
export function getFileType(fileName: string): 'pdf' | 'markdown' | 'unknown' {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (extension === 'pdf') {
    return 'pdf';
  } else if (['md', 'markdown', 'mdown', 'mkdn'].includes(extension || '')) {
    return 'markdown';
  }
  
  return 'unknown';
}

/**
 * Process uploaded file into the Document structure
 */
export async function processFile(file: File): Promise<Document> {
  const fileType = getFileType(file.name);
  
  if (fileType === 'unknown') {
    throw new Error(`Unsupported file type: ${file.name}`);
  }
  
  if (fileType === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    return {
      name: file.name,
      type: 'pdf',
      data: arrayBuffer
    };
  } else {
    // Markdown file
    const text = await file.text();
    return {
      name: file.name,
      type: 'markdown',
      data: text
    };
  }
}

/**
 * Validate if file is of a supported type
 */
export function validateFile(file: File): { valid: boolean; message?: string } {
  const fileType = getFileType(file.name);
  
  if (fileType === 'unknown') {
    return {
      valid: false,
      message: 'Unsupported file type. Please upload PDF or Markdown files.'
    };
  }
  
  // Add size validation
  if (file.size > 10 * 1024 * 1024) { // 10MB
    return {
      valid: false,
      message: 'File too large. Maximum file size is 10MB.'
    };
  }
  
  return { valid: true };
}

/**
 * Create a sample Markdown document for testing
 */
export function createSampleMarkdown(version: 'original' | 'modified'): Document {
  const originalContent = `# Sample Document
  
## Introduction

This is a sample Markdown document used for testing the comparison tool.

## Features

- Bullet points
- **Bold text**
- *Italic text*

## Code Example

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

## Conclusion

Thank you for using this sample document.
`;

  const modifiedContent = `# Sample Document
  
## Introduction

This is a modified sample Markdown document used for testing the comparison tool.

## New Features

- Bullet points
- **Bold text**
- *Italic text*
- Added feature

## Code Example

\`\`\`javascript
function hello() {
  console.log("Hello, modified world!");
  return true;
}
\`\`\`

## Conclusion

Thank you for using this modified sample document!
`;

  return {
    name: version === 'original' ? 'original.md' : 'modified.md',
    type: 'markdown',
    data: version === 'original' ? originalContent : modifiedContent
  };
} 