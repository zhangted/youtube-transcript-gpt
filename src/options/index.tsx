import { render } from "preact";
import { Options } from "./Options";
import { getOptionsHash } from "./options/OptionsHash";

const insertElement: HTMLElement =
  document.querySelector("#app") ?? document.body;

async function mount() {
  render(<Options optionsHash={await getOptionsHash()} />, insertElement);
}

mount();