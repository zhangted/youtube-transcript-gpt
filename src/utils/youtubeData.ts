type transcriptLangOption = {
  language?: string;
  link?: string;
};

async function getLangOptionsWithLink(
  videoId: string
): Promise<transcriptLangOption[]> {
  const videoPageHtml = await fetch(
    "https://www.youtube.com/watch?v=" + videoId
  ).then((res) => res.text());
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
