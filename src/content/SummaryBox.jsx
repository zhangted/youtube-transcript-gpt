import getVideoId from 'get-video-id';
import Browser from 'webextension-polyfill'
import transcripts from './transcripts';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import Spinner from './Spinner'

function getYoutubeVideoId(currentHref = window.location.href) {
  const {id, service} = getVideoId(currentHref)
  return (service==='youtube' && id) ? id : '';
}

const getTranscriptAndSendToBgScript = (eventType = null) => {
  const youtubeVideoId = getYoutubeVideoId(window.location.href);
  transcripts.sendToBgScript(youtubeVideoId, eventType)
}

const getBgScriptResponse = (message) => {
  if(message.type === 'GPT_RESPONSE') {
    const { gptResponse, youtubeVideoId } = message;
    if(getYoutubeVideoId() === youtubeVideoId) return gptResponse
    return getTranscriptAndSendToBgScript();
  }
  else if(message.type === 'NO_TRANSCRIPT') {
    return transcripts.NO_TRANSCRIPT_VALUE;
  }
  else if(message.type === 'NO_VIDEO_ID') {
    return transcripts.NO_VIDEO_ID_VALUE;
  }
}

export default function SummaryBox() {
  const [text, setText] = useState('loading');
  const finishedLoading = ['', 'loading'].indexOf(text) == -1;
  const prevUrlRef= useRef(window.location.href);

  const setBgScriptResponse = useCallback((message) => setText(getBgScriptResponse(message)), [])
  const refreshSummary = useCallback((event) => {
    setText('loading')
    getTranscriptAndSendToBgScript(event?.type)
  }, [])

  useEffect(() => {
    // Setup "backend"
    const port = Browser.runtime.connect()
    transcripts.setBgScriptPort(port);
    port.onMessage.addListener(setBgScriptResponse);
    refreshSummary();

    // Watch for changes to the href attribute of links
    const observer = new MutationObserver(([{ type, attributeName }]) => {
      if(type === 'attributes' && attributeName === 'href' && window.location.href !== prevUrlRef.current) {
        prevUrlRef.current = window.location.href;
        refreshSummary();
      }
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['href'] });

    return () => {
      port.onMessage.removeListener(setBgScriptResponse);
      port.disconnect();
      observer.disconnect();
    };
  }, []);

  const wrapperCssAttrs = {backgroundColor:'black', color:'white', fontSize:'18px', borderRadius:'4px', padding:'6px', marginBottom:'4px'};
  const Wrapper = useCallback(({elements}) => <div style={wrapperCssAttrs}>
    {elements}
    {finishedLoading && <div style={{margin:'5px 0 0 0'}}><button onClick={refreshSummary}>Refresh</button></div>}
  </div>, [finishedLoading])

  if(text === 'loading') return <Wrapper elements={['Summarizing... ', <Spinner />]} />
  return <Wrapper elements={text} />
}