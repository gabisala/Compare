import DiffMatchPatch from 'diff-match-patch';

export type Diff = [number, string];

export interface DiffResult {
  diffs: Diff[];
  formattedDiffs?: {
    left: string;
    right: string;
  };
  lineMap?: {
    left: Map<number, number>;
    right: Map<number, number>;
  };
}

/**
 * Normalize text by removing extra whitespace or applying other transformations
 * based on the provided options
 */
export function normalizeText(
  text: string,
  options: { ignoreWhitespace?: boolean; ignoreCase?: boolean } = {}
): string {
  let normalized = text;

  if (options.ignoreCase) {
    normalized = normalized.toLowerCase();
  }

  if (options.ignoreWhitespace) {
    // Replace multiple whitespace with a single space
    normalized = normalized.replace(/\s+/g, ' ');
    // Trim whitespace from start and end
    normalized = normalized.trim();
  }

  return normalized;
}

/**
 * Compare two text documents and generate a list of differences
 */
export function compareTexts(
  leftText: string,
  rightText: string,
  options: { ignoreWhitespace?: boolean; ignoreCase?: boolean } = {}
): DiffResult {
  // Normalize the texts
  const normalizedLeft = normalizeText(leftText, options);
  const normalizedRight = normalizeText(rightText, options);

  // Initialize the diff tool
  const dmp = new DiffMatchPatch();
  // Set a reasonable timeout for large docs (10 seconds)
  dmp.Diff_Timeout = 10;

  // Compute the diff
  const diffs = dmp.diff_main(normalizedLeft, normalizedRight);
  
  // Apply cleanup to make the diff more human-readable
  dmp.diff_cleanupSemantic(diffs);

  // Generate line mapping for alignment
  const lineMap = generateLineMap(leftText.split('\n'), rightText.split('\n'), diffs);

  return {
    diffs,
    formattedDiffs: formatDiffs(diffs),
    lineMap
  };
}

/**
 * Generate a mapping between line numbers in the left and right documents
 * to help with alignment in the UI
 */
function generateLineMap(
  leftLines: string[],
  rightLines: string[],
  diffs: Diff[]
): { left: Map<number, number>; right: Map<number, number> } {
  const leftMap = new Map<number, number>();
  const rightMap = new Map<number, number>();
  
  let leftLine = 0;
  let rightLine = 0;
  
  // Process each diff to build the line mapping
  diffs.forEach(([operation, text]) => {
    const lines = text.split('\n');
    const lineCount = lines.length - (lines[lines.length - 1] === '' ? 1 : 0);
    
    switch (operation) {
      case -1: // Deletion (present in left, absent in right)
        // Map each line in the deletion to the current right position
        for (let i = 0; i < lineCount; i++) {
          leftMap.set(leftLine + i, rightLine);
        }
        leftLine += lineCount;
        break;
      case 0: // No change (present in both)
        // Map matching lines one-to-one
        for (let i = 0; i < lineCount; i++) {
          leftMap.set(leftLine + i, rightLine + i);
          rightMap.set(rightLine + i, leftLine + i);
        }
        leftLine += lineCount;
        rightLine += lineCount;
        break;
      case 1: // Addition (absent in left, present in right)
        // Map each line in the addition to the current left position
        for (let i = 0; i < lineCount; i++) {
          rightMap.set(rightLine + i, leftLine);
        }
        rightLine += lineCount;
        break;
    }
  });
  
  return { left: leftMap, right: rightMap };
}

/**
 * Format diffs for rendering in HTML
 */
function formatDiffs(diffs: Diff[]): { left: string; right: string } {
  let leftHtml = '';
  let rightHtml = '';

  diffs.forEach(([operation, text]) => {
    // Escape HTML special characters to prevent injection
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    switch (operation) {
      case -1: // Deletion (present in left, absent in right)
        leftHtml += `<span class="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">${escapedText}</span>`;
        break;
      case 0: // No change (present in both)
        leftHtml += escapedText;
        rightHtml += escapedText;
        break;
      case 1: // Addition (absent in left, present in right)
        rightHtml += `<span class="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">${escapedText}</span>`;
        break;
    }
  });

  return { left: leftHtml, right: rightHtml };
}

/**
 * Extract text from PDF data for comparison using PDF.js
 */
export async function extractTextFromPDF(pdfData: ArrayBuffer): Promise<string> {
  if (typeof window === 'undefined') {
    return "Server-side PDF extraction not supported";
  }

  try {
    // Import PDF.js dynamically
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source
    const workerSrc = '/pdf-worker/pdf.worker.min.js';
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    
    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    
    // Extract text from all pages
    let combinedText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Concatenate the text from all items
      const pageText = textContent.items
        .map(item => 'str' in item ? item.str : '')
        .join(' ');
      
      combinedText += pageText + '\n';
    }
    
    return combinedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return `Error extracting PDF text: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Compare two PDF documents and return the differences
 */
export async function comparePDFs(
  leftPdfData: ArrayBuffer,
  rightPdfData: ArrayBuffer,
  options: { ignoreWhitespace?: boolean; ignoreCase?: boolean } = {}
): Promise<DiffResult> {
  // Extract text from both PDFs
  const leftText = await extractTextFromPDF(leftPdfData);
  const rightText = await extractTextFromPDF(rightPdfData);

  // Compare the extracted texts
  return compareTexts(leftText, rightText, options);
} 