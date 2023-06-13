import { useState, useEffect, useCallback } from "preact/hooks";
import { SUMMARIZATION_METHOD } from "./options/SUMMARIZATION_METHOD";
import { GPT_LANGUAGE } from "./options/GPT_LANGUAGE";
import { MIN_RESPONSE_TOKENS, MAX_RESPONSE_TOKENS } from "./options/RESPONSE_TOKENS";
import { optionsHashDefaults, OptionsHash, OptionsHashKey, settingsKeys, getOptionsHash, setOptionsHash} from "./options/OptionsHash";

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
            curSettings.response_tokens >= MIN_RESPONSE_TOKENS &&
            curSettings.response_tokens <= MAX_RESPONSE_TOKENS
              ? curSettings.response_tokens
              : optionsHashDefaults.response_tokens,
          summarization_method: SUMMARIZATION_METHOD.includes(curSettings.summarization_method)
            ? curSettings.summarization_method
            : optionsHashDefaults.summarization_method,
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

  const SelectOptionSettingElement = useCallback((
    options: string[], 
    settingKey: OptionsHashKey,
    headingText: string,
  ): JSX.Element => 
    <div style={{ margin: "10px" }}>
      <div>
        <label for="language">{headingText}</label>
      </div>
      <select
        name={settingKey as string}
        id={settingKey as string}
        value={curSettings[settingKey]}
        onChange={async (e: Event) => {
          const ele = e.target as HTMLOptionElement;
          const obj = { ...curSettings }
          obj[settingKey] = ele.value
          setCurSettings(obj);
        }}
      >
        {options.map((opt) => (
          <option value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  , [curSettings])

  return (
    <div>
      <h2>Youtube Video Summary Options</h2>

      {SelectOptionSettingElement(GPT_LANGUAGE, 'gpt_language', 'Summary language:')}
      {SelectOptionSettingElement(SUMMARIZATION_METHOD, 'summarization_method', 'How to summarize long videos:')}

      {<div style={{ margin: "10px" }}>
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
          min={MIN_RESPONSE_TOKENS}
          max={MAX_RESPONSE_TOKENS}
        />
        {curSettings.response_tokens} tokens
        <div>
          (~{Math.floor((curSettings.response_tokens / 100) * 75)} words)
        </div>
      </div>}

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
