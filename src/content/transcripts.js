import Api from 'youtube-browser-api';
import splitTextIntoSizeableTokenArrays from './splitTokens';

const transcripts = new Map();

export function YoutubeTranscript ({ transcriptParts = [], youtubeVideoId = '' }) {
  this.transcriptParts = transcriptParts;
  this.activeTranscriptPartId = 0;
  this.youtubeVideoId = youtubeVideoId;
}

YoutubeTranscript.prototype = {
  hasTranscript: function() {
    return this.transcriptParts.length > 0;
  },
  hasMultiPageTranscript: function() {
    return this.transcriptParts.length > 1;
  },
  hasNextPage: function() {
    return this.hasMultiPageTranscript() && this.activeTranscriptPartId < this.transcriptParts.length-1;
  },
  hasPrevPage: function() {
    return this.hasMultiPageTranscript() && this.activeTranscriptPartId > 0;
  },
  nextPage: function({ callback = (transcriptInstance) => null }) {
    if(this.hasNextPage()) {
      this.activeTranscriptPartId++;
      callback(this);
    }
  },
  prevPage: function({ callback = (transcriptInstance) => null }) {
    if(this.hasPrevPage()) {
      this.activeTranscriptPartId--;
      callback(this);
    }
  },
  getPageIndicatorStr: function() {
    return this.hasMultiPageTranscript() ? `${this.activeTranscriptPartId+1} / ${this.transcriptParts.length}` : ''
  }
}

function parseTranscriptArrToString(transcriptArr) {
  const transcript = []
  transcriptArr.forEach(({ text }) => transcript.push(text))
  return transcript.join(' ');
}

export async function getYoutubeTranscript(youtubeVideoId) {
  if(youtubeVideoId === '') return new YoutubeTranscript()

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