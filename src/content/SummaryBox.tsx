import "../assets/SummaryBox.css";
import getVideoId from "get-video-id";
import {
  getYoutubeVideoInfo,
  YoutubeVideoInfo,
} from "../utils/YoutubeVideoInfo";
import { useRef, useState, useEffect, useCallback } from "preact/hooks";
import { getOptionsHash } from "../options/options/OptionsHash";
import { shouldSummPagebyPage } from "../options/options/SUMMARIZATION_METHOD";
import {
  ChangedChromeExtSettingMessage,
  GptResponseMessage,
  LongTranscriptSummarizationStatusMessage,
  MESSAGE_TYPES,
  MessageFromBgScript,
} from "../types";
import {
  PlayIcon,
  ArrowLeftSquareIcon,
  ArrowRightSquareIcon,
  MoonIcon,
  Spinner,
  SunIcon,
  CogIcon,
  StopIcon,
} from "./icons";
import { AUTOMATION_DEFAULT } from "../options/options/AUTOMATION";

const port = async () => import(".").then(({ port }) => port);
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

const getMainTextToInsert = (message: MessageFromBgScript): string => {
  let youtubeVideoId: string, gptResponse: string, page: number;

  switch (message.type) {
    case MESSAGE_TYPES.GPT_RESPONSE:
      ({ gptResponse, youtubeVideoId } = message as GptResponseMessage);
      if (getYoutubeVideoId() === youtubeVideoId) return gptResponse;
      return "";
    case MESSAGE_TYPES.LONG_TRANSCRIPT_SUMMARIZATION_STATUS:
      ({ page, youtubeVideoId } =
        message as LongTranscriptSummarizationStatusMessage);
      if (getYoutubeVideoId() === youtubeVideoId)
        return `Summarizing (${page} pages left)`;
      return "";
    case MESSAGE_TYPES.PING_CONTENT_SCRIPT_REQ_ABORTED:
      return "Stopped summarization";
    case MESSAGE_TYPES.NO_ACCESS_TOKEN:
      return "Please login to ChatGPT on a different tab";
    case MESSAGE_TYPES.NO_TRANSCRIPT:
      return "Video has no transcript";
    case MESSAGE_TYPES.SERVER_ERROR_RESPONSE:
      return "Summarization aborted";
    default:
      return "";
  }
};

async function portDecorator(
  func: () => void,
  remount: () => void
): Promise<void> {
  try {
    await func();
  } catch (e) {
    console.error(e);
    await remount();
  }
}

export default function SummaryBox({
  uuid,
  automation,
  remount,
  reqFromError,
}: {
  uuid: string;
  automation: string;
  remount: () => void;
  reqFromError: boolean;
}): JSX.Element {
  const tabUUID = useRef<string>(uuid);
  const autoSummarize = automation === AUTOMATION_DEFAULT;
  const [text, setText] = useState<string>(getOnMountText());
  const [youtubeVideoInfo, setYoutubeVideoInfo] = useState<YoutubeVideoInfo>(
    new YoutubeVideoInfo()
  );
  const [isDarkMode, setIsDarkMode] = useState<boolean>(calcIsDarkMode());
  const [summMethod, setSummMethod] = useState<string>("");

  const [OptionsComponent, setOptionsComponent] = useState<JSX.Element | null>(
    null
  );

  useEffect(() => {
    getOptionsHash().then((options) =>
      setSummMethod(options.summarization_method)
    );
  }, []);

  const summPageByPage = useCallback(
    () => shouldSummPagebyPage(summMethod),
    [summMethod]
  );

  const sendAbortReqBgScript = async () =>
    await portDecorator(
      async () =>
        (
          await port()
        ).postMessage({ type: MESSAGE_TYPES.PING_BG_SCRIPT_ABORT_REQ }),
      remount
    );

  const setYoutubeVideoInfoAndSendToBgScript = async (
    youtubeVideoInfo: YoutubeVideoInfo
  ) => {
    setYoutubeVideoInfo(youtubeVideoInfo);
    if (getYoutubeVideoId())
      await portDecorator(
        async () =>
          (
            await port()
          ).postMessage({
            ...youtubeVideoInfo.getPostMessageObject(),
            tabUUID: tabUUID.current,
          }),
        remount
      );
  };

  const handleChangedChromeSetting = useCallback(
    async (message: MessageFromBgScript) => {
      switch (message.type) {
        case MESSAGE_TYPES.CHANGED_CHROME_EXT_SETTING:
          const msg = message as ChangedChromeExtSettingMessage;
          if (msg.settingKey === "summarization_method")
            setSummMethod(msg.data);
      }
    },
    []
  );

  const listenForBgScriptResponse = useCallback(
    async (message: MessageFromBgScript) => {
      if (message.type === MESSAGE_TYPES.SERVER_SENT_EVENTS_END)
        return console.log("end");
      else if (message.type === MESSAGE_TYPES.CHANGED_CHROME_EXT_SETTING) {
        return handleChangedChromeSetting(message);
      } else if (
        message.type === MESSAGE_TYPES.PING_CONTENT_SCRIPT_FOR_TRANSCRIPT
      ) {
        return await getTranscriptAndSendToBgScript();
      }
      setText(getMainTextToInsert(message));
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
      await setYoutubeVideoInfoAndSendToBgScript(
        await getVideoIdAndTranscriptObject()
      );
    }, []);

  const pingBgScriptActiveVideoId = async (reqResponse: boolean = true) =>
    await portDecorator(
      async () =>
        (
          await port()
        ).postMessage({
          type: MESSAGE_TYPES.PING_BG_SCRIPT_ACTIVE_YOUTUBE_VIDEO_ID,
          youtubeVideoId: getYoutubeVideoId(),
          tabUUID: tabUUID.current,
          reqResponse,
        }),
      remount
    );

  useEffect(() => {
    port()
      .then((port) => port.onMessage.addListener(listenForBgScriptResponse))
      .then(async () => {
        setText("");
        if (autoSummarize || reqFromError) await pingBgScriptActiveVideoId();
        else
          getVideoIdAndTranscriptObject()
            .then(setYoutubeVideoInfo)
            .then(async () => await pingBgScriptActiveVideoId(false));
      });

    return () => {
      sendAbortReqBgScript();
      port().then((port) =>
        port.onMessage.removeListener(listenForBgScriptResponse)
      );
    };
  }, []);

  const PrevPageButton = useCallback(
    (): JSX.Element =>
      youtubeVideoInfo.hasPrevPage() ? (
        <button
          onClick={async (e) => {
            youtubeVideoInfo.prevPage();
            await getTranscriptAndSendToBgScript();
          }}
        >
          <ArrowLeftSquareIcon />
        </button>
      ) : (
        <span class="button-placeholder"></span>
      ),
    [youtubeVideoInfo]
  );

  const NextPageButton = useCallback(
    (): JSX.Element =>
      youtubeVideoInfo.hasNextPage() ? (
        <button
          onClick={async (e) => {
            youtubeVideoInfo.nextPage();
            await getTranscriptAndSendToBgScript();
          }}
        >
          <ArrowRightSquareIcon />
        </button>
      ) : (
        <span class="button-placeholder"></span>
      ),
    [youtubeVideoInfo]
  );

  const PlayButton = useCallback(
    (): JSX.Element =>
      youtubeVideoInfo.hasTranscript() ? (
        <button
          title="Refresh Summary"
          onClick={async (e) => await getTranscriptAndSendToBgScript()}
        >
          <PlayIcon />
        </button>
      ) : (
        <span />
      ),
    [youtubeVideoInfo]
  );

  const StopButton = (): JSX.Element => (
    <button title="Stop summarization" onClick={sendAbortReqBgScript}>
      <StopIcon />
    </button>
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
        onClick={async (e) =>
          await import("../options/Options")
            .then(({ Options }) => Options)
            .then(async (Options) => (
              <Options
                optionsHash={await getOptionsHash()}
                customHeaderText="Summary Options"
                exitButton={
                  <button
                    onClick={() => {
                      scrollToTop();
                      setOptionsComponent(null);
                    }}
                  >
                    Back to summary
                  </button>
                }
              />
            ))
            .then(setOptionsComponent)
            .then(scrollToTop)
        }
      >
        <CogIcon />
      </button>
    ),
    [text]
  );

  const wrapperCssAttrs: Record<string, string> = {
    backgroundColor: isDarkMode ? "#0f0f0f" : "#e8e8e8",
    color: isDarkMode ? "white" : "black",
    fontSize: "17px",
    borderRadius: "8px",
    padding: "14px 27px 24px 27px",
    margin: "0 0 10px 0",
    minHeight: "100px",
  };

  const PageByPageButtons = useCallback(
    (): JSX.Element => (
      <span style={{ float: "right" }}>
        <PrevPageButton />
        &nbsp;
        <NextPageButton />
        <div style={{ fontWeight: "600", margin: "10px 0" }}>
          {youtubeVideoInfo.getPageIndicatorStr()}
        </div>
      </span>
    ),
    [youtubeVideoInfo]
  );

  const ControlButtons = useCallback(
    (): JSX.Element => (
      <span>
        <ToggleThemeButton />
        &nbsp;
        <OpenOptionsButton />
        &nbsp;
        {(text === "loading" ||
          text.match(/^Summarizing \(\d+ pages left\)$/)) &&
        youtubeVideoInfo.hasTranscript() ? (
          <StopButton />
        ) : (
          <PlayButton />
        )}
        <div style={{ fontWeight: "600", margin: "15px 0 10px 0" }}>
          {text !== "loading" &&
            !text.match(/^Summarizing \(\d+ pages left\)$/) &&
            text !== "options" &&
            text !== "" &&
            youtubeVideoInfo.hasTranscript() &&
            "Summary"}
        </div>
      </span>
    ),
    [text, isDarkMode, youtubeVideoInfo]
  );

  const Wrapper = useCallback(
    ({ elements }: { elements: (JSX.Element | string)[] | string }) => (
      <div style={wrapperCssAttrs}>
        {!OptionsComponent && (
          <div style={{ height: "80px", margin: "10px 0" }}>
            {summPageByPage() && <PageByPageButtons />}
            <ControlButtons />
          </div>
        )}
        {elements}
      </div>
    ),
    [wrapperCssAttrs, summMethod, isDarkMode, text, OptionsComponent]
  );

  if (OptionsComponent) return <Wrapper elements={[OptionsComponent]} />;
  else if (text === "loading")
    return <Wrapper elements={["Summarizing... ", <Spinner />]} />;
  else if (text.match(/^Summarizing \(\d+ pages left\)$/))
    return <Wrapper elements={[text, <Spinner />]} />;
  else if (text === "")
    return (
      <Wrapper
        elements={
          youtubeVideoInfo.hasTranscript()
            ? "Assistant: Transcript loaded. Ready to summarize."
            : "Video has no transcript"
        }
      />
    );
  return <Wrapper elements={text} />;
}
