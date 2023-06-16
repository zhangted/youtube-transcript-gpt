import { h, render } from "preact";
import { v4 as uuidv4 } from "uuid";
import SummaryBox from "./SummaryBox";
import Browser from "webextension-polyfill";
import { getOptionsHash } from "../options/options/OptionsHash";

console.info("the content script is running");

let tabUUID: string = uuidv4();
let summaryBox: HTMLElement | null = null;
let prevUrl: string | null = null;
export let port: Browser.Runtime.Port = setupPort();

function waitForElm(selector: string) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

function setupPort(): Browser.Runtime.Port {
  return Browser.runtime.connect()
}

async function remount() {
  port = setupPort();
  await updateSummaryWrapper(true);
}

async function updateSummaryWrapper(reqFromError: boolean = false) {
  let { automation } = await getOptionsHash();

  waitForElm("#secondary.style-scope.ytd-watch-flexy").then(() => {
    if (summaryBox) {
      render(null, summaryBox);
      summaryBox?.remove();
    }
    summaryBox = document.createElement("div");
    summaryBox.id = "summary-wrapper";
    render(h(SummaryBox, { uuid: tabUUID, automation, remount, reqFromError }), summaryBox);
    reqFromError = false
    document
      .querySelector("#secondary.style-scope.ytd-watch-flexy")
      ?.prepend(summaryBox);
  });
}

async function tryUpdateSummaryWrapper() {
  if (prevUrl !== window.location.href) {
    prevUrl = window.location.href;
    await updateSummaryWrapper();
  }
}

window.addEventListener("click", async () => await tryUpdateSummaryWrapper());

new MutationObserver(async ([{ type, attributeName }]) => {
  if (type === "attributes" && attributeName === "href")
    await tryUpdateSummaryWrapper();
}).observe(document, {
  subtree: true,
  attributes: true,
  attributeFilter: ["href"],
});

waitForElm("#secondary").then(async () => await tryUpdateSummaryWrapper());
