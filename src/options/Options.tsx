import { useState, useEffect } from "preact/hooks";

const GPT_LANGUAGE: string[] = [
  "English",
  "Spanish",
  "Simplified Chinese",
  "Traditional Chinese",
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

export function Options({
  exitButton = undefined,
}: {
  exitButton?: JSX.Element | undefined;
}): JSX.Element {
  const autoSaveOnChange = exitButton !== undefined;

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
      .then((fetchedSettings) => {
        const changed =
          JSON.stringify(curSettings) !== JSON.stringify(fetchedSettings);
        if (changed) setCurSettings(fetchedSettings);
      });

  useEffect(() => {
    getSetCurSettings();
  }, []);

  useEffect(() => {
    getSetCurSettings();
    console.log("refetch settings");
  }, [syncs]);

  useEffect(() => {
    if (autoSaveOnChange) saveOptions();
  }, [curSettings]);

  const afterSave = (msgEle: JSX.Element): void => {
    setStatus(msgEle);
    setTimeout(() => setStatus(<span></span>), 3000);
  };

  const saveOptions = async (providedObj?: OptionsHash) => {
    const obj = providedObj
      ? providedObj
      : {
          // validations here
          gpt_language: GPT_LANGUAGE.includes(curSettings.gpt_language)
            ? curSettings.gpt_language
            : optionsHashDefaults.gpt_language,
          response_tokens:
            curSettings.response_tokens >= 150 &&
            curSettings.response_tokens <= 500
              ? curSettings.response_tokens
              : optionsHashDefaults.response_tokens,
        };
    await setOptionsHash(obj)
      .then(() => {
        const showSaveMsg =
          (autoSaveOnChange && syncs !== 0) || !autoSaveOnChange;
        if (showSaveMsg)
          afterSave(<div style={{ color: "green" }}>Saved!</div>);
        setSyncs(syncs + 1);
      })
      .catch((e) =>
        afterSave(<div style={{ color: "red" }}>Error! Couldn't save.</div>)
      );
  };

  const resetOptions = async (e: Event) => {
    await saveOptions(optionsHashDefaults);
    setSyncs(syncs + 1);
  };

  return (
    <div>
      <h2>Youtube Video Summary Options</h2>

      <div style={{ margin: "10px" }}>
        <div>
          <label for="language">Summary language: </label>
        </div>
        <select
          name="language"
          id="language"
          value={curSettings.gpt_language}
          onChange={async (e: Event) => {
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
        <div>
          <label for="response_tokens">Suggested Summary Length: </label>
        </div>
        <input
          onMouseUp={async (e: Event) => {
            const ele = e.target as HTMLOptionElement;
            setCurSettings({
              ...curSettings,
              response_tokens:
                Number(ele.value) || optionsHashDefaults.response_tokens,
            });
          }}
          value={curSettings.response_tokens}
          type="range"
          id="response_tokens"
          name="response_tokens"
          min="150"
          max="500"
        />
        {curSettings.response_tokens} tokens
        <div>
          (~{Math.floor((curSettings.response_tokens / 100) * 75)} words)
        </div>
      </div>

      <div style={{ margin: "10px" }}>
        {!autoSaveOnChange && (
          <button onClick={async () => await saveOptions()}>
            <b>Save</b>
          </button>
        )}
        &nbsp;&nbsp;
        <button onClick={resetOptions}>Reset</button>
        &nbsp;&nbsp;
        {exitButton && exitButton}
        <div style={{ height: "15px", margin: "4px 0 0 0" }}>{status}</div>
      </div>
    </div>
  );
}
