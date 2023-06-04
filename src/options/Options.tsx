import { useState, useEffect } from "preact/hooks";

const GPT_LANGUAGE: string[] = [
  "English",
  "Spanish",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "French",
  "Arabic",
  "Russian",
  "Portuguese",
  "German",
  "Japanese",
  "Hindi",
  "Italian",
  "Vietnamese",
];

export interface OptionsHash extends Record<string, string | number> {
  // avail options
  gpt_language: string;
  response_tokens: number;
}

type OptionsHashKey = keyof OptionsHash;

const optionsHashDefaults: OptionsHash = {
  // defaults for each option
  gpt_language: GPT_LANGUAGE[0],
  response_tokens: 200,
};

const settingsKeys: OptionsHashKey[] = Object.keys(
  optionsHashDefaults
) as OptionsHashKey[];

export async function getOptionsHash(): Promise<OptionsHash> {
  const result = await chrome.storage.sync.get(settingsKeys);
  return result as OptionsHash;
}

async function setOptionsHash(optionsHash: OptionsHash) {
  console.log(optionsHash);
  await chrome.storage.sync
    .set(optionsHash)
    .then(() => console.log("Value is set"));
}

export function Options() {
  const [curSettings, setCurSettings] =
    useState<OptionsHash>(optionsHashDefaults);
  const [syncs, setSyncs] = useState<number>(0);
  const [status, setStatus] = useState<JSX.Element>();

  const getSetCurSettings = () =>
    getOptionsHash()
      .then((curSettings) =>
        settingsKeys.reduce(
          (curSettings: OptionsHash, key: OptionsHashKey): OptionsHash => {
            if (!curSettings[key]) curSettings[key] = optionsHashDefaults[key];
            return curSettings;
          },
          curSettings
        )
      )
      .then(setCurSettings);

  useEffect(() => {
    getSetCurSettings();
  }, []);

  useEffect(() => {
    getSetCurSettings();
    console.log("refetch settings");
  }, [syncs]);

  const afterSave = (msgEle: JSX.Element): void => {
    setStatus(msgEle);
    setTimeout(() => setStatus(<span></span>), 3000);
  };

  return (
    <div>
      <h2>Youtube Transcript Gpt Options</h2>

      <div style={{ margin: "10px" }}>
        <label for="language">Summary language: </label>
        <select
          name="language"
          id="language"
          value={curSettings.gpt_language}
          onChange={(e: Event) => {
            const ele = e.target as HTMLOptionElement;
            setCurSettings({ ...curSettings, gpt_language: ele.value });
          }}
        >
          {GPT_LANGUAGE.map((lang) => (
            <option value={lang}>{lang}</option>
          ))}
        </select>
      </div>

      <div style={{ margin: "10px" }}>
        <label for="response_tokens">Suggested Summary Length: </label>
        <input 
          onInput={(e: Event) => {
            const ele = e.target as HTMLOptionElement;
            setCurSettings({ ...curSettings, response_tokens: Number(ele.value) || optionsHashDefaults.response_tokens });
          }}
          value={curSettings.response_tokens}
          type="range" id="response_tokens" name="response_tokens" min="150" max="500" />
        {curSettings.response_tokens} tokens
        <div>(~{Math.floor(curSettings.response_tokens / 100 * 75)} words)</div>
      </div>

      <div style={{ margin: "10px" }}>
        <button
          onClick={async (e) => {
            await setOptionsHash({
              // validations here
              gpt_language: GPT_LANGUAGE.includes(curSettings.gpt_language)
                ? curSettings.gpt_language
                : optionsHashDefaults.gpt_language,
              response_tokens: curSettings.response_tokens >= 150 && curSettings.response_tokens <= 500
                ? curSettings.response_tokens
                : optionsHashDefaults.response_tokens
            });
            afterSave(<div style={{ color: "green" }}>saved!</div>);
            setSyncs(syncs + 1);
          }}
        >
          save
        </button>
        &nbsp;&nbsp;
        <button
          onClick={async (e) => {
            await setOptionsHash(optionsHashDefaults);
            afterSave(<div style={{ color: "brown" }}>settings reset!</div>);
            setSyncs(syncs + 1);
          }}
        >
          reset
        </button>
        {status}
      </div>
    </div>
  );
}
