import getVideoId from 'get-video-id';
import Browser from 'webextension-polyfill'
import transcripts from './transcripts';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import Spinner from './Spinner'

function getOnMountText() {
  return window.location.href === 'https://www.youtube.com/' ? '' : 'loading'
}

function getYoutubeVideoId(currentHref = window.location.href) {
  const {id, service} = getVideoId(currentHref)
  return (service==='youtube' && id) ? id : '';
}

const getTranscriptAndSendToBgScript = () => {
  const youtubeVideoId = getYoutubeVideoId(window.location.href);
  if(youtubeVideoId !== '') transcripts.sendToBgScript(youtubeVideoId)
}

const getTextToInsert = (message) => {
  if(message.type === 'GPT_RESPONSE') {
    const { gptResponse, youtubeVideoId } = message;
    if(getYoutubeVideoId() === youtubeVideoId) return gptResponse
  }
  else if(message.type === 'NO_ACCESS_TOKEN') {
    return 'Please login to OpenAI to access ChatGPT'
  }
  else if(message.type === 'NO_TRANSCRIPT') {
    return 'Video has no transcript'
  }
  return '';
}

export default function SummaryBox() {
  const [text, setText] = useState(getOnMountText());
  const [showRefresh, setShowRefresh] = useState(false);

  const listenForBgScriptResponse = useCallback((message) => {
    if(message.type === 'STREAMING_END') return setShowRefresh(true);
    setShowRefresh(false);
    setText(getTextToInsert(message));
    if(['NO_TRANSCRIPT','NO_ACCESS_TOKEN'].includes(message.type)) setShowRefresh(true)
  }, [])

  const refreshSummary = useCallback((e) => {
    setText('loading')
    setShowRefresh(false);
    getTranscriptAndSendToBgScript()
  }, []);

  useEffect(() => {
    // Setup "backend"
    const port = Browser.runtime.connect()
    transcripts.setBgScriptPort(port);
    port.onMessage.addListener(listenForBgScriptResponse);
    refreshSummary();

    return () => {
      port.onMessage.removeListener(listenForBgScriptResponse);
      port.disconnect();
    };
  }, []);

  const wrapperCssAttrs = {backgroundColor:'black', color:'white', fontSize:'18px', borderRadius:'4px', padding:'8px', marginBottom:'4px' };
  const Wrapper = useCallback(({elements}) => <div style={wrapperCssAttrs}>
    {elements}
    {showRefresh && <div style={{margin:'5px 0 0 0'}}><button onClick={refreshSummary}>Refresh</button></div>}
  </div>, [showRefresh])

  if(text === 'loading') return <Wrapper elements={['Summarizing... ', <Spinner />]} />
  return <Wrapper elements={text} />
}