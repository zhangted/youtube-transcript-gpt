import "../assets/SummaryBox.css";
import getVideoId from "get-video-id";
import Browser from "webextension-polyfill";
import { getYoutubeVideoInfo, YoutubeVideoInfo } from "./YoutubeVideoInfo";
import { useState, useEffect, useCallback } from "preact/hooks";
import {
  GptResponseMessage,
  MESSAGE_TYPES,
  MessageFromBgScript,
} from "../utils/MessageTypes";
import {
  ArrowClockwise,
  ArrowLeftSquareIcon,
  ArrowRightSquareIcon,
  MoonIcon,
  Spinner,
  SunIcon,
} from "./icons";

const getOnMountText = (): string =>
  getYoutubeVideoId() === "" ? "" : "loading";
const calcIsDarkMode = (): boolean =>
  document.querySelector("html[dark]") !== null;

const getYoutubeVideoId = (
  currentHref: string = window.location.href
): string => {
  const { id, service } = getVideoId(currentHref);
  return service === "youtube" && id ? id : "";
};

const sendTranscriptToBgScript = (
  port: Browser.Runtime.Port,
  videoInfoInstance: YoutubeVideoInfo
) => port.postMessage(videoInfoInstance.getPostMessageObject());

const getTextToInsert = (message: MessageFromBgScript): string => {
  switch (message.type) {
    case MESSAGE_TYPES.GPT_RESPONSE:
      const { gptResponse, youtubeVideoId } = message as GptResponseMessage;
      if (getYoutubeVideoId() === youtubeVideoId) return gptResponse;
      return "";
    case MESSAGE_TYPES.NO_ACCESS_TOKEN:
      return "Please login to OpenAI to access ChatGPT";
    case MESSAGE_TYPES.NO_TRANSCRIPT:
      return "Video has no transcript";
    default:
      return "";
  }
};

export default function SummaryBox(): JSX.Element {
  const [port] = useState<Browser.Runtime.Port>(Browser.runtime.connect());
  const [text, setText] = useState<string>(getOnMountText());
  const [youtubeVideoInfo, setYoutubeVideoInfo] = useState<YoutubeVideoInfo>(
    new YoutubeVideoInfo()
  );
  const [showRefresh, setShowRefresh] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(calcIsDarkMode());

  const setYoutubeVideoInfoAndSendToBgScript = useCallback(
    (youtubeVideoInfo: YoutubeVideoInfo): void => {
      setYoutubeVideoInfo(youtubeVideoInfo);
      if(getYoutubeVideoId()) sendTranscriptToBgScript(port, youtubeVideoInfo);
    },
    []
  );

  const listenForBgScriptResponse = useCallback(
    (message: MessageFromBgScript) => {
      if (message.type === MESSAGE_TYPES.SERVER_SENT_EVENTS_END)
        return setShowRefresh(true);
      setShowRefresh(false);
      setText(getTextToInsert(message));
      if (
        [MESSAGE_TYPES.NO_TRANSCRIPT, MESSAGE_TYPES.NO_ACCESS_TOKEN].includes(
          message.type
        )
      )
        setShowRefresh(true);
    },
    []
  );

  const getVideoIdAndTranscriptObject =
    useCallback(async (): Promise<YoutubeVideoInfo> => {
      const youtubeVideoId = getYoutubeVideoId(window.location.href);
      return await getYoutubeVideoInfo(youtubeVideoId);
    }, []);

  const getTranscriptAndSendToBgScript =
    useCallback(async (): Promise<void> => {
      setText(getOnMountText());
      setShowRefresh(false);
      setYoutubeVideoInfoAndSendToBgScript(
        await getVideoIdAndTranscriptObject()
      );
    }, []);

  useEffect(() => {
    port.onMessage.addListener(listenForBgScriptResponse);
    getTranscriptAndSendToBgScript();

    return () => {
      port.onMessage.removeListener(listenForBgScriptResponse);
      port.disconnect();
    };
  }, []);

  const PrevPageButton = useCallback(
    (): JSX.Element => (
      <button
        onClick={(e) => {
          youtubeVideoInfo.prevPage();
          setYoutubeVideoInfoAndSendToBgScript(youtubeVideoInfo);
        }}
      >
        <ArrowLeftSquareIcon />
      </button>
    ),
    [youtubeVideoInfo]
  );

  const NextPageButton = useCallback(
    (): JSX.Element => (
      <button
        onClick={(e) => {
          youtubeVideoInfo.nextPage();
          setYoutubeVideoInfoAndSendToBgScript(youtubeVideoInfo);
        }}
      >
        <ArrowRightSquareIcon />
      </button>
    ),
    [youtubeVideoInfo]
  );

  const ToggleThemeButton = useCallback(
    (): JSX.Element => (
      <button onClick={(e) => setIsDarkMode(!isDarkMode)}>
        {isDarkMode ? <SunIcon /> : <MoonIcon />}
      </button>
    ),
    [isDarkMode]
  );

  const wrapperCssAttrs: Record<string, string> = {
    backgroundColor: isDarkMode ? "#0f0f0f" : "#e8e8e8",
    color: isDarkMode ? "white" : "black",
    fontSize: "18px",
    borderRadius: "8px",
    padding: "19px",
    marginBottom: "5px",
  };

  const Wrapper = useCallback(
    ({ elements }: { elements: (JSX.Element | string)[] }) => (
      <div style={wrapperCssAttrs}>
        {elements}
        {showRefresh && (
          <div style={{ margin: "5px 0" }}>
            <div style={{ fontWeight: "600", margin: "10px 0" }}>
              {youtubeVideoInfo.getPageIndicatorStr()}
            </div>
            {youtubeVideoInfo.hasPrevPage() && <PrevPageButton />}&nbsp;
            {youtubeVideoInfo.hasNextPage() && <NextPageButton />}
            <div style={{ float: "right" }}>
              <button
                onClick={(e) =>
                  setYoutubeVideoInfoAndSendToBgScript(youtubeVideoInfo)
                }
              >
                <ArrowClockwise />
              </button>
              &nbsp;
              <ToggleThemeButton />
            </div>
          </div>
        )}
      </div>
    ),
    [
      wrapperCssAttrs,
      text,
      showRefresh,
      ToggleThemeButton,
      PrevPageButton,
      NextPageButton,
    ]
  );

  if (text === "loading")
    return <Wrapper elements={["Summarizing... ", <Spinner />]} />;
  return <Wrapper elements={[text]} />;
}
