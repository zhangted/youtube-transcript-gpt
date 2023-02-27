import getVideoId from 'get-video-id';
import Api from 'youtube-browser-api';
import Browser from 'webextension-polyfill'
import { useState, useEffect, useRef } from 'preact/hooks'
import Spinner from './Spinner'

function parseTranscript(arr) {
  const transcript = []
  arr.forEach(({ text }) => transcript.push(text))
  return transcript.join(' ');
}

async function getTranscriptRaw(videoId) {
  return await Api.transcript
      .GET({ query: { videoId } })
      .Ok(({body}) => body)
      .then(({body}) => body)
      .then(({videoId}) => videoId)
      .then(parseTranscript)
}

function SummaryBoxState() {
  const [text, setText] = useState('loading');
  return { text, setText }
}

export default function SummaryBox() {
  const { text, setText } = SummaryBoxState()
  const prevUrlRef= useRef(window.location.href);

  const runParseFetchPrintTranscriptCycle = (currentHref) => {
    setText('loading')
    console.log(currentHref)
    const videoIdObj = getVideoId(currentHref)
    const {id, service} = videoIdObj
    if(service === 'youtube' && id) {
      getTranscriptRaw(id)
        .then(transcript => {
          console.log(transcript)
  
          // Send a message to the background script and process it
          Browser.runtime.sendMessage({
            type: 'VIDEO_TRANSCRIPT',
            data: { transcript }
          }).then((response) => {
            setText(response)
            console.log('Response received:', response);
          }).catch((error) => {
            console.error('Error sending message:', error);
            setText(`error detected in openAI request cycle (rate limited, not logged in, or parsing issue from response).`)
          });
        })
        .catch((e) => {
          console.error(e)
          setText('error detected in youtube transcript fetch cycle (video may not have transcript)')
        })
    }
  }

  useEffect(() => {
    // Watch for changes to the href attribute of links
    const observer = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
          const newlocation = window.location.href;
          if(newlocation !== prevUrlRef.current) {
            prevUrlRef.current = newlocation
            runParseFetchPrintTranscriptCycle(window.location.href);
          }
        }
      }
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['href'] });

    runParseFetchPrintTranscriptCycle(window.location.href)

    return () => {
      observer.disconnect();
    };
  }, []);

  const Wrapper = ({elements}) => <div style={{backgroundColor:'black', color:'white', fontSize:'18px', borderRadius:'4px', padding:'6px', marginBottom:'4px'}}>{elements}</div> 

  if(text === 'loading') return <Wrapper elements={[<Spinner />, 'loading transcript + chatgpt response']} />
  return <Wrapper elements={text} />
}