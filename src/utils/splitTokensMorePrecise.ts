import { GPTTokens, supportModelType } from "gpt-tokens";

function* breakUpText(
  text: string,
  chunkSize: number,
  overlapSize: number
): Generator<string> {
  const tokens = getTokensUsed(text);

  if (tokens <= chunkSize) {
    yield text;
  } else {
    const chunk = text.slice(0, chunkSize - 100);
    yield chunk;
    yield* breakUpText(
      text.slice(chunkSize - 100 - overlapSize),
      chunkSize,
      overlapSize
    );
  }
}

export function breakUpTextToChunks(
  text: string,
  chunkSize: number = 2000,
  overlapSize: number = 0
): string[] {
  const chunks = [...breakUpText(text, chunkSize, overlapSize)];
  return chunks;
}

export function getTokensUsed(
  text: string,
  model: supportModelType = "gpt-3.5-turbo"
) {
  return new GPTTokens({
    model,
    messages: [{ role: "user", content: text }],
  }).usedTokens;
}
