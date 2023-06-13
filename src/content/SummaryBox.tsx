import "../assets/SummaryBox.css";
import getVideoId from "get-video-id";
import Browser from "webextension-polyfill";
import { getYoutubeVideoInfo, YoutubeVideoInfo } from "./YoutubeVideoInfo";
import { useRef, useState, useEffect, useCallback } from "preact/hooks";
import { getOptionsHash } from "../options/options/OptionsHash";
import { shouldSummPagebyPage } from "../options/options/SUMMARIZATION_METHOD";
import {
  ChangedChromeExtSettingMessage,
  GptResponseMessage,
  LongTranscriptSummarizationStatusMessage,
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
  CogIcon,
} from "./icons";

const getOnMountText = (): string =>
  getYoutubeVideoId() === "" ? "" : "loading";
const calcIsDarkMode = (): boolean =>
  document.querySelector("html[dark]") !== null;
const scrollToTop = (): void => window.scrollTo({ top: 0, behavior: "smooth" });

const getYoutubeVideoId = (
  currentHref: string = window.location.href
): string => {
  const { id, service } = getVideoId(currentHref);
  return service === "youtube" && id ? id : "";
};

const sendTranscriptToBgScript = async(
  port: Browser.Runtime.Port,
  videoInfoInstance: YoutubeVideoInfo,
  tabUUID: string,
) => port.postMessage({...videoInfoInstance.getPostMessageObject(), tabUUID})

const getMainTextToInsert = (message: MessageFromBgScript): string => {
  let youtubeVideoId: string, gptResponse: string, page: number;

  switch (message.type) {
    case MESSAGE_TYPES.GPT_RESPONSE:
      ({ gptResponse, youtubeVideoId } = message as GptResponseMessage);
      if (getYoutubeVideoId() === youtubeVideoId) return gptResponse;
      return "";
    case MESSAGE_TYPES.LONG_TRANSCRIPT_SUMMARIZATION_STATUS:
      ({ page, youtubeVideoId } = message as LongTranscriptSummarizationStatusMessage)
      if (getYoutubeVideoId() === youtubeVideoId) return `Summarizing ${page}`;
      return "";
    case MESSAGE_TYPES.NO_ACCESS_TOKEN:
      return "Please login to OpenAI to access ChatGPT";
    case MESSAGE_TYPES.NO_TRANSCRIPT:
      return "Video has no transcript";
    default:
      return "";
  }
};

export default function SummaryBox({ uuid } : { uuid: string }): JSX.Element {
  const tabUUID = useRef<string>(uuid);
  const [port] = useState<Browser.Runtime.Port>(Browser.runtime.connect());
  const [text, setText] = useState<string>(getOnMountText());
  const [youtubeVideoInfo, setYoutubeVideoInfo] = useState<YoutubeVideoInfo>(
    new YoutubeVideoInfo()
  );
  const [showRefresh, setShowRefresh] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(calcIsDarkMode());
  const [summMethod, setSummMethod] = useState<string>('');

  const [OptionsComponent, setOptionsComponent] = useState<JSX.Element>(<div />);

  const showRefreshLater = () => {
    setShowRefresh(false);
    const id = setTimeout(() => setShowRefresh(true), 10000);
    return () => clearTimeout(id);
  };
  const [cancelShowRefreshLater, setCancelShowRefreshLater] =
    useState<Function>(() => () => null);

  useEffect(() => {
    getOptionsHash()
      .then(options => setSummMethod(options.summarization_method))
  },[])

  const summPageByPage = useCallback(() => shouldSummPagebyPage(summMethod), [summMethod])

  const setYoutubeVideoInfoAndSendToBgScript = useCallback(
    (youtubeVideoInfo: YoutubeVideoInfo): void => {
      setYoutubeVideoInfo(youtubeVideoInfo);
      if (getYoutubeVideoId()) {
        setText("loading");
        cancelShowRefreshLater();
        setCancelShowRefreshLater(showRefreshLater());
        sendTranscriptToBgScript(port, youtubeVideoInfo, tabUUID.current);
      }
    },
    []
  );

  const handleChangedChromeSetting = useCallback(async (message: MessageFromBgScript) => {
    switch (message.type) {
      case MESSAGE_TYPES.CHANGED_CHROME_EXT_SETTING:
        const msg = message as ChangedChromeExtSettingMessage
        if(msg.settingKey === 'summarization_method') setSummMethod(msg.data)
    }
  }, []);

  const listenForBgScriptResponse = useCallback(
    (message: MessageFromBgScript) => {
      if (message.type === MESSAGE_TYPES.SERVER_SENT_EVENTS_END)
        return setShowRefresh(true);
      else if (message.type === MESSAGE_TYPES.SERVER_ERROR_RESPONSE) {
        setText('loading')
        return setTimeout(() => {
          const button = document.querySelector('button[title="Refresh Summary"') as HTMLButtonElement
          button?.click();
        }, 1200)
      }
      else if(message.type === MESSAGE_TYPES.CHANGED_CHROME_EXT_SETTING) {
        return handleChangedChromeSetting(message);
      }
      else if(message.type === MESSAGE_TYPES.PING_CONTENT_SCRIPT_FOR_TRANSCRIPT) {
        return getTranscriptAndSendToBgScript();
      }
      setText(getMainTextToInsert(message));
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
    port.postMessage({
      type: MESSAGE_TYPES.PING_BG_SCRIPT_ACTIVE_YOUTUBE_VIDEO_ID,
      youtubeVideoId: getYoutubeVideoId(),
      tabUUID: tabUUID.current,
    })

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

  const RefreshButton = useCallback(
    (): JSX.Element => (
      <button
        title="Refresh Summary"
        onClick={(e) => setYoutubeVideoInfoAndSendToBgScript(youtubeVideoInfo)}
      >
        <ArrowClockwise />
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

  const OpenOptionsButton = useCallback(
    (): JSX.Element => (
      <button
        title="Settings"
        onClick={async (e) => {
          await import('../options/Options')
          .then(({Options}) => Options)
          .then(Options=>
            <Wrapper
              elements={[
                <Options
                  exitButton={
                    <button
                      onClick={async (e) => {
                        scrollToTop();
                        await getTranscriptAndSendToBgScript();
                      }}
                    >
                      Back to summary
                    </button>
                  }
                />,
              ]}
            />
          )
          .then(setOptionsComponent);
          text !== "options"
            ? setText("options")
            : await getTranscriptAndSendToBgScript();
          scrollToTop();
        }}
      >
        <CogIcon />
      </button>
    ),
    [text]
  );

  const wrapperCssAttrs: Record<string, string> = {
    backgroundColor: isDarkMode ? "#0f0f0f" : "#e8e8e8",
    color: isDarkMode ? "white" : "black",
    fontSize: "18px",
    borderRadius: "8px",
    padding: "19px",
    minHeight: "100px",
  };

  const Wrapper = useCallback(
    ({ elements }: { elements: (JSX.Element | string)[] | string }) => (
      <div style={wrapperCssAttrs}>
        {elements}
        {showRefresh && (
          <div style={{ margin: "5px 0" }}>
            <div style={{ fontWeight: "600", margin: "10px 0" }}>
              {summPageByPage() && youtubeVideoInfo.getPageIndicatorStr()}
            </div>
            {summPageByPage() && youtubeVideoInfo.hasPrevPage() && <PrevPageButton />}&nbsp;
            {summPageByPage() && youtubeVideoInfo.hasNextPage() && <NextPageButton />}
            <div style={{ float: "right" }}>
              {youtubeVideoInfo.hasTranscript() && <RefreshButton />}
              &nbsp;
              <ToggleThemeButton />
              &nbsp;
              <OpenOptionsButton />
            </div>
          </div>
        )}
      </div>
    ),
    [
      wrapperCssAttrs,
      text,
      summMethod,
      youtubeVideoInfo,
      showRefresh,
      ToggleThemeButton,
      PrevPageButton,
      NextPageButton,
    ]
  );

  if (text === "loading")
    return <Wrapper elements={["Summarizing... ", <Spinner />]} />;
  else if (text.match(/^Summarizing (\d+)$/))
    return <Wrapper elements={[`${text}/${youtubeVideoInfo.transcriptParts.length}`, <Spinner />]} />
  else if (text === "options")
    return OptionsComponent;
  return <Wrapper elements={text} />;
}
