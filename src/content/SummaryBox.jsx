import getVideoId from 'get-video-id';
import Browser from 'webextension-polyfill'
import { getYoutubeTranscript, YoutubeTranscript } from './transcripts';
import { useState, useEffect, useCallback } from 'preact/hooks'
import Spinner from './Spinner'

const getOnMountText = () => getYoutubeVideoId() === '' ? '' : 'loading'
const calcIsDarkMode = () => document.querySelector('html[dark]') !== null;

const getYoutubeVideoId = (currentHref = window.location.href) => {
  const {id, service} = getVideoId(currentHref)
  return (service==='youtube' && id) ? id : '';
}

const sendTranscriptToBgScript = (port, transcriptInstance) => { 
  return port.postMessage({
    type: 'VIDEO_TRANSCRIPT',
    data: { 
      transcript: transcriptInstance.transcriptParts,
      transcriptPartId: transcriptInstance.activeTranscriptPartId,
      youtubeVideoId: transcriptInstance.youtubeVideoId 
    }
  });
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
  const [port,] = useState(Browser.runtime.connect())
  const [text, setText] = useState(getOnMountText());
  const [youtubeTranscript, setYoutubeTranscript] = useState(new YoutubeTranscript({ transcriptParts: [], youtubeVideoId: '' }))
  const [showRefresh, setShowRefresh] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(calcIsDarkMode());

  const setYoutubeTranscriptAndSendToBgScript = (transcriptInstance) => {
    setYoutubeTranscript(transcriptInstance)
    sendTranscriptToBgScript(port, transcriptInstance)
  }

  const prevPageButton = useCallback(() => youtubeTranscript?.activeTranscriptPartId > 0 && <button onClick={e=>{
    youtubeTranscript.activeTranscriptPartId -= 1
    setYoutubeTranscriptAndSendToBgScript(youtubeTranscript);
  }}>Prev Page</button>, [youtubeTranscript]);

  const nextPageButton = useCallback(() => youtubeTranscript?.transcriptParts?.length > 0 && youtubeTranscript?.activeTranscriptPartId < youtubeTranscript.transcriptParts.length-1 && <button onClick={e=>{
    youtubeTranscript.activeTranscriptPartId += 1
    setYoutubeTranscriptAndSendToBgScript(youtubeTranscript);
  }}>Next Page</button>, [youtubeTranscript]);

  const listenForBgScriptResponse = useCallback((message) => {
    if(message.type === 'STREAMING_END') return setShowRefresh(true);
    setShowRefresh(false);
    setText(getTextToInsert(message));
    if(['NO_TRANSCRIPT','NO_ACCESS_TOKEN'].includes(message.type)) setShowRefresh(true)
  }, [])

  const getVideoIdAndTranscriptObject = useCallback(async() => {
    const youtubeVideoId = getYoutubeVideoId(window.location.href);
    return await getYoutubeTranscript(youtubeVideoId);
  }, [])

  const getTranscriptAndSendToBgScript = useCallback(async() => {
    setText(getOnMountText())
    setShowRefresh(false);
    setYoutubeTranscriptAndSendToBgScript(await getVideoIdAndTranscriptObject());
  }, [])

  useEffect(() => {
    port.onMessage.addListener(listenForBgScriptResponse);
    getTranscriptAndSendToBgScript();

    return () => {
      port.onMessage.removeListener(listenForBgScriptResponse);
      port.disconnect();
    };
  }, []);

  const ToggleThemeButton = useCallback(() => <button onClick={e=>setIsDarkMode(!isDarkMode)}>{isDarkMode?'Light':'Dark'} mode</button>, [isDarkMode])

  const wrapperCssAttrs = {backgroundColor: isDarkMode ? '#0f0f0f' : '#e8e8e8', color: isDarkMode ? 'white' : 'black', fontSize:'18px', borderRadius:'4px', padding:'8px', marginBottom:'4px' };

  const Wrapper = useCallback(({elements}) => <div style={wrapperCssAttrs}>
    {elements}
    <div>
      {showRefresh && prevPageButton()}
      {showRefresh && nextPageButton()}
      {showRefresh && youtubeTranscript?.transcriptParts?.length > 1 && `${youtubeTranscript.activeTranscriptPartId+1} / ${youtubeTranscript?.transcriptParts?.length}`}
    </div>
    {showRefresh && <div style={{margin:'5px 0 0 0'}}>
      <button onClick={sendTranscriptToBgScript}>Refresh</button>&nbsp;<ToggleThemeButton />
    </div>}
  </div>, [text, showRefresh, ToggleThemeButton, prevPageButton, nextPageButton])

  if(text === 'loading') return <Wrapper elements={['Summarizing... ', <Spinner />]} />
  return <Wrapper elements={text} />
}