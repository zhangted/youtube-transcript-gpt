type videoId = string;
type html = string;
const youtubePagesHtml = new Map<videoId, html>();

type transcriptLangOption = {
  language?: string;
  link?: string;
};

async function fetchVideoPageHtml(videoId: string): Promise<string> {
  return youtubePagesHtml.has(videoId)
    ? (youtubePagesHtml.get(videoId) as string)
    : await fetch(`https://www.youtube.com/watch?v=${videoId}`)
        .then((res) => res.text())
        .then((html: string) => {
          if (html.match(new RegExp("og:url")))
            youtubePagesHtml.set(videoId, html);
          return html;
        });
}

export async function getMetadata(videoId: string): Promise<string> {
  const videoPageHtml = await fetchVideoPageHtml(videoId);
  const doc = new DOMParser().parseFromString(videoPageHtml, "text/html");
  const sels = {
    title: 'meta[name="title"]',
    author: 'link[itemprop="name"]',
  };
  const metadata = Object.entries(sels).reduce((prev, [key, sel]) => {
    const val = doc.querySelector(sel)?.getAttribute("content");
    if (val) prev[key] = val;
    return prev;
  }, {} as { [key: string]: string });

  return Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : "";
}

async function getLangOptionsWithLink(
  videoId: string
): Promise<transcriptLangOption[]> {
  const videoPageHtml = await fetchVideoPageHtml(videoId);
  const splittedHtml = videoPageHtml.split('"captions":');

  if (splittedHtml.length < 2) {
    return [];
  } // No Caption Available

  const captions_json = JSON.parse(
    splittedHtml[1].split(',"videoDetails')[0].replace("\n", "")
  );
  const captionTracks =
    captions_json.playerCaptionsTracklistRenderer.captionTracks;
  const languageOptions = Array.from(captionTracks).map((i: any) => {
    return i.name.simpleText;
  });

  const first = "English"; // Sort by English first
  languageOptions.sort(function (x, y) {
    return x.includes(first) ? -1 : y.includes(first) ? 1 : 0;
  });
  languageOptions.sort(function (x, y) {
    return x == first ? -1 : y == first ? 1 : 0;
  });

  return Array.from(languageOptions).map((langName, index) => {
    const link = captionTracks.find(
      (i: any) => i.name.simpleText === langName
    ).baseUrl;
    return {
      language: langName,
      link: link,
    };
  });
}

export async function getTranscript(
  videoId: string
): Promise<transcriptPart[]> {
  const langOptLinks: transcriptLangOption[] = await getLangOptionsWithLink(
    videoId
  );
  const link: string | undefined = langOptLinks?.[0]?.link;
  return link ? await getRawTranscript(link) : [];
}

export type transcriptPart = {
  start?: number | null;
  duration?: number | null;
  text?: string | null;
};

async function getRawTranscript(link: string): Promise<transcriptPart[]> {
  // Get Transcript
  const transcriptPageResponse = await fetch(link); // default 0
  const transcriptPageXml = await transcriptPageResponse.text();

  // Parse Transcript
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(transcriptPageXml, "text/xml");

  // Get all text nodes
  const textNodes = xmlDoc.documentElement.childNodes;

  return Array.from(textNodes).map((i: any) => {
    return {
      start: i.getAttribute("start"),
      duration: i.getAttribute("dur"),
      text: i.textContent,
    };
  });
}
