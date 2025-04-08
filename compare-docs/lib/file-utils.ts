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