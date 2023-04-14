import '../assets/SummaryBox.css'
import getVideoId from 'get-video-id';
import Browser from 'webextension-polyfill'
import { getYoutubeTranscript, YoutubeTranscript } from './transcripts';
import { useState, useEffect, useCallback } from 'preact/hooks'
import { ArrowClockwise, ArrowLeftSquareIcon, ArrowRightSquareIcon, MoonIcon, Spinner, SunIcon } from './icons'

const getOnMountText = () => getYoutubeVideoId() === '' ? '' : 'loading'
const calcIsDarkMode = () => document.querySelector('html[dark]') !== null;

const getYoutubeVideoId = (currentHref = window.location.href) => {
  const {id, service} = getVideoId(currentHref)
  return (service==='youtube' && id) ? id : '';
}

const sendTranscriptToBgScript = (port, transcriptInstance) => {
  return port.postMessage(transcriptInstance.hasTranscript() ? {
    type: 'VIDEO_TRANSCRIPT',
    data: {
      transcript: transcriptInstance.transcriptParts,
      transcriptPartId: transcriptInstance.activeTranscriptPartId,
      youtubeVideoId: transcriptInstance.youtubeVideoId 
    }
  } : { type: 'NO_TRANSCRIPT' })
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

  const setYoutubeTranscriptAndSendToBgScript = useCallback((transcriptInstance) => {
    setYoutubeTranscript(transcriptInstance)
    sendTranscriptToBgScript(port, transcriptInstance)
  }, [])

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

  const PrevPageButton = useCallback(() => youtubeTranscript.hasPrevPage() && <button onClick={
    e=>youtubeTranscript.prevPage({ callback: setYoutubeTranscriptAndSendToBgScript })}><ArrowLeftSquareIcon /></button>, [youtubeTranscript]);

  const NextPageButton = useCallback(() => youtubeTranscript.hasNextPage() && <button onClick={
    e=>youtubeTranscript.nextPage({ callback: setYoutubeTranscriptAndSendToBgScript })}><ArrowRightSquareIcon /></button>, [youtubeTranscript]);

  const ToggleThemeButton = useCallback(() => <button onClick={e=>setIsDarkMode(!isDarkMode)}>{isDarkMode?<SunIcon />:<MoonIcon />}</button>, [isDarkMode])

  const wrapperCssAttrs = {backgroundColor: isDarkMode ? '#0f0f0f' : '#e8e8e8', color: isDarkMode ? 'white' : 'black', fontSize:'18px', borderRadius:'8px', padding:'19px', marginBottom:'5px'}
  const Wrapper = useCallback(({elements}) => <div style={wrapperCssAttrs}>
    {elements}
    {showRefresh && <div style={{margin:'5px 0'}}>
      <div style={{fontWeight:'600', margin:'10px 0'}}>{youtubeTranscript.getPageIndicatorStr()}</div>
      <PrevPageButton />&nbsp;
      <NextPageButton />
      <div style={{float:'right'}}>
        <button onClick={e=>setYoutubeTranscriptAndSendToBgScript(youtubeTranscript)}><ArrowClockwise /></button>&nbsp;<ToggleThemeButton />
      </div>
    </div>}
  </div>, [wrapperCssAttrs, text, showRefresh, ToggleThemeButton, PrevPageButton, NextPageButton])

  if(text === 'loading') return <Wrapper elements={['Summarizing... ', <Spinner />]} />
  return <Wrapper elements={text} />
}