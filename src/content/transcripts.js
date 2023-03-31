import Api from 'youtube-browser-api';
import ExpiryMap from 'expiry-map';

function Transcripts() {
  this.map = new ExpiryMap(60 * 6 * 1000);
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
      .catch(() => '')
    this.map.set(videoId, transcript)
    return transcript;
  },
  setBgScriptPort: function(port) { 
    this.port = port
  },
  sendToBgScript: async function(youtubeVideoId) {
    if(youtubeVideoId === '') return;
    const transcript = await this.getTranscript(youtubeVideoId);
    return this.port.postMessage({
      type: 'VIDEO_TRANSCRIPT',
      data: { transcript, youtubeVideoId }
    })
  }
}

const transcripts = new Transcripts();
export default transcripts;