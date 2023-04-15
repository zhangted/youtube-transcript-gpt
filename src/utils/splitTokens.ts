function splitIntoSizeableTokensForPayload(wordsArr: string[]): string[] {
  const wordsIn100Tokens = 75;
  const wordsPerArray = (wordsIn100Tokens - 20) * 38;
  const result: string[][] = [];
  for (let i = 0; i < wordsArr.length; i += wordsPerArray) {
    result.push(wordsArr.slice(i, i + wordsPerArray));
  }
  return result.map((words: string[]): string => words.join(" "));
}

export default function splitTextIntoSizeableTokenArrays(
  text: string
): string[] {
  const wordsArray: string[] = text.split(" ");
  return splitIntoSizeableTokensForPayload(wordsArray);
}
