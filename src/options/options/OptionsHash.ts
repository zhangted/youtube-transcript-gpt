import { GPT_LANGUAGE_DEFAULT } from "./GPT_LANGUAGE";
import { SUMMARIZATION_METHOD_DEFAULT } from "./SUMMARIZATION_METHOD";
import { DEFAULT_REPSONSE_TOKENS } from "./RESPONSE_TOKENS";

export interface OptionsHash extends Record<string, string | number> {
  // avail options
  gpt_language: string;
  response_tokens: number;
  summarization_method: string;
}

export type OptionsHashKey = keyof OptionsHash;

export const optionsHashDefaults: OptionsHash = {
  // defaults for each option
  gpt_language: GPT_LANGUAGE_DEFAULT,
  response_tokens: DEFAULT_REPSONSE_TOKENS,
  summarization_method: SUMMARIZATION_METHOD_DEFAULT,
};

export const settingsKeys: OptionsHashKey[] = Object.keys(
  optionsHashDefaults
) as OptionsHashKey[];

export async function getOptionsHash(): Promise<OptionsHash> {
  const result = await chrome.storage.sync.get(settingsKeys);
  return result as OptionsHash;
}

export async function setOptionsHash(optionsHash: OptionsHash) {
  console.log(optionsHash);
  await chrome.storage.sync
    .set(optionsHash)
    .then(() => console.log("Value is set"));
}

export async function setupOptions(): Promise<OptionsHash> {
  return await getOptionsHash()
    .then((curSettings: OptionsHash) =>
    settingsKeys.reduce(
      (curSettings: OptionsHash, key: OptionsHashKey): OptionsHash => {
        if (!curSettings[key]) curSettings[key] = optionsHashDefaults[key];
        return curSettings;
      },
      curSettings
    ))
    .then(async(settings: OptionsHash) => {
      await setOptionsHash(settings)
      return settings;
    })
}