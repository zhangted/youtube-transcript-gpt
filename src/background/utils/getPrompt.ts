export default function getPrompt(
  transcript: string,
  response_tokens: number,
  gpt_language: string,
  metadata: string,
  forcedTokenSuggestion: number
) {
  const disableTokenSuggestion = forcedTokenSuggestion === 0;

  const parameters = disableTokenSuggestion
    ? gpt_language
    : `<=${response_tokens} ${gpt_language} tokens`;

  const parameters2 = disableTokenSuggestion
    ? "requires summarization"
    : `requires summarization within ${response_tokens} tokens`;

  const metaDataPrompt = metadata
    ? `Consider or discard the video's metadata (${metadata}) while summarizing the transcript.`
    : "";

  return `You are an expert summarizer tasked with extracting only the most important details and condensing this YouTube transcript into a concise ${parameters} summary.
  Please provide ONLY a focused and deterministic summary with a temperature of 0.1.
  Please provide ONLY the ${parameters} summary in the response.
  ${metaDataPrompt}
  Here is the transcript of a YouTube video that ${parameters2}: ${transcript}`;
}
