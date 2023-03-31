import { h, render } from 'preact';
import SummaryBox from './SummaryBox';

console.info('the content script is running');

let prevUrl = null;

function updateSummaryWrapper() {
  const injectPts = document.querySelectorAll('#secondary');
  for (const injectPt of injectPts) {
    injectPt.querySelector('#summary-wrapper')?.remove();

    if (injectPt.offsetWidth > 0) {
      const summaryWrapper = document.createElement('div');
      summaryWrapper.id = 'summary-wrapper';
      render(h(SummaryBox), summaryWrapper);
      injectPt.prepend(summaryWrapper);
    }
  }
}

function tryUpdateSummaryWrapper() {
  if (prevUrl !== window.location.href) {
    prevUrl = window.location.href;
    updateSummaryWrapper();
  }
}

(new MutationObserver(([{ type, attributeName }]) => {
  if(type === 'attributes' && attributeName === 'href') tryUpdateSummaryWrapper()
})).observe(
  document,
  { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] }
);

window.addEventListener('popstate', tryUpdateSummaryWrapper);
window.addEventListener('hashchange', tryUpdateSummaryWrapper);

function waitForSecondary() {
  if (document.getElementById('secondary')) {
    return tryUpdateSummaryWrapper();
  } else {
    setTimeout(waitForSecondary, 100);
  }
}

waitForSecondary();