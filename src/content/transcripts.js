import Api from 'youtube-browser-api';

const NO_TRANSCRIPT_VALUE = 'This video does not have a transcript';
const NO_VIDEO_ID_VALUE = '';

function Transcripts() {
  this.map = new Map();
  this.port = undefined;
}

Transcripts.prototype = {
  parseTranscript: function(arr) {
    const transcript = []
    arr.forEach(({ text }) => transcript.push(text))
    return transcript.join(' ');
  },
  getTranscript: async function(videoId) {
    let transcript = this.map.get(videoId);
    if(transcript !== undefined) return transcript;
    transcript = await Api.transcript
      .GET({ query: { videoId } })
      .Ok(({body}) => body)
      .then(({body}) => body)
      .then(({videoId}) => videoId)
      .then(this.parseTranscript)
      .catch(() => NO_TRANSCRIPT_VALUE)
    this.map.set(videoId, transcript)
    return transcript;
  },
  setBgScriptPort: function(port) { 
    this.port = port
  },
  sendToBgScript: async function(youtubeVideoId, eventType) {
    const transcript = await this.getTranscript(youtubeVideoId);
    if(transcript === NO_TRANSCRIPT_VALUE) return this.port.postMessage({ type: 'NO_TRANSCRIPT' })
    if(transcript === NO_VIDEO_ID_VALUE) return this.port.postMessage({ type: 'NO_VIDEO_ID' })
    this.port.postMessage({
      type: 'VIDEO_TRANSCRIPT',
      data: { transcript, youtubeVideoId, eventType }
    })
  }
}

const transcripts = new Transcripts();
transcripts.NO_TRANSCRIPT_VALUE = NO_TRANSCRIPT_VALUE;
transcripts.NO_VIDEO_ID_VALUE = NO_VIDEO_ID_VALUE;
export default transcripts;