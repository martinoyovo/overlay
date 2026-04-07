// Text processing utilities
export const getWordCount = (text: string): number => {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
};

export const getCharacterCount = (text: string): number => {
  return text.length;
};
