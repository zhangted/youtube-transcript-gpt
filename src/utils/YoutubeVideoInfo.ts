import Api from "youtube-browser-api";
import { MessageFromContentScript } from "./MessageTypes";
import splitTextIntoSizeableTokenArrays from "./splitTokens";
import { getTranscript, transcriptPart } from "./youtubeData";

const videoInfoMap = new Map<string, YoutubeVideoInfo>();

export class YoutubeVideoInfo {
  constructor(
    public transcriptParts: string[] = [],
    public activeTranscriptPartId: number = 0,
    public youtubeVideoId: string = "",
    public metaData: string = ""
  ) {}

  hasTranscript(): boolean {
    return this.transcriptParts.length > 0;
  }

  hasMultiPageTranscript(): boolean {
    return this.transcriptParts.length > 1;
  }

  hasNextPage(): boolean {
    return (
      this.hasMultiPageTranscript() &&
      this.activeTranscriptPartId < this.transcriptParts.length - 1
    );
  }

  hasPrevPage(): boolean {
    return this.hasMultiPageTranscript() && this.activeTranscriptPartId > 0;
  }

  nextPage(): void {
    if (this.hasNextPage()) this.activeTranscriptPartId++;
  }

  prevPage(): void {
    if (this.hasPrevPage()) this.activeTranscriptPartId--;
  }

  getPageIndicatorStr(): string {
    return this.hasMultiPageTranscript()
      ? `Page ${this.activeTranscriptPartId + 1} / ${
          this.transcriptParts.length
        }`
      : "";
  }

  getPostMessageObject(): MessageFromContentScript {
    return this.hasTranscript()
      ? {
          type: "VIDEO_TRANSCRIPT",
          data: this,
        }
      : { type: "NO_TRANSCRIPT" };
  }
}

export function getActiveTranscriptPart(
  youtubeVideoInfo: YoutubeVideoInfo
): string {
  return youtubeVideoInfo.transcriptParts[
    youtubeVideoInfo.activeTranscriptPartId
  ];
}

function parseTranscriptArrToString(
  transcriptAsObjectArr: transcriptPart[]
): string {
  return transcriptAsObjectArr.map(({ text }) => text).join(" ");
}

async function fetchRawTranscript(
  youtubeVideoId: string
): Promise<transcriptPart[]> {
  try {
    return await getTranscript(youtubeVideoId);
  } catch (e) {
    console.error(e);
    try {
      return await Api.transcript
        .GET({ query: { videoId: youtubeVideoId } })
        .Ok(({ body }: { body: object }): object => body)
        .then(({ body }: { body: object }): object => body)
        .then(({ videoId }: { videoId: object[] }): object[] => videoId);
    } catch (e) {
      console.error(e);
      return [];
    }
  }
}

async function getTranscriptParts(youtubeVideoId: string): Promise<string[]> {
  let transcriptParts: transcriptPart[] = await fetchRawTranscript(
    youtubeVideoId
  );
  if (transcriptParts.length === 0) return [];
  let str = parseTranscriptArrToString(transcriptParts);
  return splitTextIntoSizeableTokenArrays(str);
}

async function getMetadata(youtubeVideoId: string): Promise<string> {
  return await Api.content
    .GET({
      query: {
        id: youtubeVideoId,
        params: ["title", "channel"],
      },
    })
    .Ok(({ body }: { body: object }): object => body)
    .then(({ body }: { body: object }): object => body)
    .then(JSON.stringify)
    .catch(() => "");
}

export async function getYoutubeVideoInfo(
  youtubeVideoId: string
): Promise<YoutubeVideoInfo> {
  if (youtubeVideoId === "") return new YoutubeVideoInfo();

  const existingYoutubeVideoInfo = videoInfoMap.get(youtubeVideoId);
  if (existingYoutubeVideoInfo !== undefined) return existingYoutubeVideoInfo;

  const youtubeVideoInfo: YoutubeVideoInfo | null = await Promise.allSettled([
    getTranscriptParts(youtubeVideoId),
    getMetadata(youtubeVideoId),
  ]).then(([transcriptPartsResult, metaDataResult]) => {
    if (transcriptPartsResult.status === "rejected") return null;

    const transcriptParts: string[] = transcriptPartsResult.value;
    const metaData: string =
      metaDataResult.status === "fulfilled" ? metaDataResult.value : "";

    return new YoutubeVideoInfo(transcriptParts, 0, youtubeVideoId, metaData);
  });

  if (youtubeVideoInfo === null) {
    return new YoutubeVideoInfo();
  }
  videoInfoMap.set(youtubeVideoId, youtubeVideoInfo);

  return youtubeVideoInfo;
}
