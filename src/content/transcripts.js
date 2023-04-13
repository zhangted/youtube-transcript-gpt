import Api from 'youtube-browser-api';
import splitTextIntoSizeableTokenArrays from './splitTokens';

const transcripts = new Map();

export function YoutubeTranscript ({ transcriptParts = [], youtubeVideoId = null }) {
  this.transcriptParts = transcriptParts;
  this.activeTranscriptPartId = 0;
  this.youtubeVideoId = youtubeVideoId;
}

function parseTranscriptArrToString(transcriptArr) {
  const transcript = []
  transcriptArr.forEach(({ text }) => transcript.push(text))
  return transcript.join(' ');
}

export async function getYoutubeTranscript(youtubeVideoId) {
  if(youtubeVideoId === '') return [];

  const existingYoutubeTranscript = transcripts.get(youtubeVideoId);
  if(existingYoutubeTranscript !== undefined) return existingYoutubeTranscript

  const transcriptParts = await Api.transcript
    .GET({ query: { videoId: youtubeVideoId } })
    .Ok(({body}) => body)
    .then(({body}) => body)
    .then(({videoId}) => videoId)
    .then((transcriptAsArray) => parseTranscriptArrToString(transcriptAsArray))
    .then((transcriptAsString) => splitTextIntoSizeableTokenArrays(transcriptAsString))
    .catch(() => [])
  const youtubeTranscript = new YoutubeTranscript({ transcriptParts, youtubeVideoId })
  transcripts.set(youtubeVideoId, youtubeTranscript)
  return youtubeTranscript;
}