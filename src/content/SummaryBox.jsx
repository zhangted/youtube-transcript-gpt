import getVideoId from 'get-video-id';
import browser from 'webextension-polyfill'
import transcripts from './transcripts';
import { useState, useEffect, useRef } from 'preact/hooks'
import Spinner from './Spinner'

function getYoutubeVideoId(currentHref) {
  const {id, service} = getVideoId(currentHref)
  return (service==='youtube' && id) ? id : '';
}

const getBgScriptResponse = (message) => {
  if(message.type === 'GPT_RESPONSE') {
    const { gptResponse, youtubeVideoId } = message;
    if(!getYoutubeVideoId(window.location.href) === youtubeVideoId) return ''
    return gptResponse;
  }
  else if(message.type === 'NO_TRANSCRIPT') {
    return transcripts.NO_TRANSCRIPT_VALUE;
  }
}

export default function SummaryBox() {
  const [text, setText] = useState('loading');
  const hideSelf = () => setText('');
  const setBgScriptResponse = (message) => setText(getBgScriptResponse(message))
  const finishedLoading = ['', 'loading'].indexOf(text) == -1;
  const prevUrlRef= useRef(window.location.href);

  const getTranscriptAndSendToBgScript = (currentHref) => {
    setText('loading')
    const youtubeVideoId = getYoutubeVideoId(currentHref);
    if(!youtubeVideoId) return hideSelf();
    transcripts.sendToBgScript(youtubeVideoId)
  }
  const refreshSummary = () => getTranscriptAndSendToBgScript(window.location.href)

  useEffect(() => {
    // Setup "backend"
    const port = browser.runtime.connect()
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
  const Wrapper = ({elements}) => <div style={wrapperCssAttrs}>
    {elements}
    {finishedLoading && <button onClick={refreshSummary}>Refresh</button>}
  </div> 

  if(text === 'loading') return <Wrapper elements={[<Spinner />, 'loading transcript + chatgpt response']} />
  return <Wrapper elements={text} />
}