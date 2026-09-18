/**
 * Utility functions for word counting and limiting in forms.
 */

export const MAX_SUBJECT_WORDS = 15;

/**
 * Counts the number of words in a given text string.
 * Accurately handles multiple spaces, tabs, newlines, and unicode/Bangla characters.
 */
export function countWords(text?: string | null): number {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Clamps a text string to a maximum number of words without breaking in-progress typing.
 * Preserves trailing whitespace so users can type spaces naturally, but prevents adding any
 * word beyond maxWords. Oversized pasted text is cleanly truncated right before the (maxWords + 1)th word.
 */
export function clampToMaxWords(text: string, maxWords: number = MAX_SUBJECT_WORDS): string {
  if (!text || typeof text !== 'string') return '';
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return text;
  }

  let count = 0;
  let inWord = false;
  let cutIndex = text.length;

  for (let i = 0; i < text.length; i++) {
    const isSpace = /\s/.test(text[i]!);
    if (!isSpace && !inWord) {
      inWord = true;
      count++;
      if (count > maxWords) {
        cutIndex = i;
        break;
      }
    } else if (isSpace && inWord) {
      inWord = false;
    }
  }

  return text.slice(0, cutIndex);
}
