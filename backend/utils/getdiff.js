function getWordDiff(oldText, newText) {
  const oldWords = oldText.trim().split(/\s+/);
  const newWords = newText.trim().split(/\s+/);

  const added = newWords.filter((w) => !oldWords.includes(w));
  const removed = oldWords.filter((w) => !newWords.includes(w));

  return { added, removed };
}

module.exports = getWordDiff;
