import DiffMatchPatch from 'diff-match-patch';

export type Diff = [number, string];

export interface DiffResult {
  diffs: Diff[];
  formattedDiffs?: {
    left: string;
    right: string;
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

  return {
    diffs,
    formattedDiffs: formatDiffs(diffs)
  };
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
 * Extract text from PDF data for comparison
 * This is a placeholder that would need to be implemented with PDF.js
 */
export async function extractTextFromPDF(pdfData: ArrayBuffer): Promise<string> {
  // This is where you would implement PDF text extraction
  // For now, we'll return a placeholder message
  return "PDF text extraction to be implemented with PDF.js";
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