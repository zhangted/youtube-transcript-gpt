import Api from "youtube-browser-api";
import { MessageFromContentScript } from "../types";
import splitTextIntoSizeableTokenArrays from "./splitTokens";
import { getMetadata, getTranscript, transcriptPart } from "./youtubeData";

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

export async function getYoutubeVideoInfo(
  youtubeVideoId: string
): Promise<YoutubeVideoInfo> {
  if (youtubeVideoId === "") return new YoutubeVideoInfo();

  const existingYoutubeVideoInfo = videoInfoMap.get(youtubeVideoId);
  if (existingYoutubeVideoInfo !== undefined) return existingYoutubeVideoInfo;

  const transcriptParts: string[] | null = await getTranscriptParts(
    youtubeVideoId
  ).catch(() => null);
  if (!transcriptParts) return new YoutubeVideoInfo();
  const metadata: string = await getMetadata(youtubeVideoId);

  const youtubeVideoInfo: YoutubeVideoInfo = new YoutubeVideoInfo(
    transcriptParts,
    0,
    youtubeVideoId,
    metadata
  );

  videoInfoMap.set(youtubeVideoId, youtubeVideoInfo);
  return youtubeVideoInfo;
}
