import { h, render } from 'preact';
import SummaryBox from './SummaryBox';

console.info('the content script is running');

let lastInjectedWrapper;

function onMutationYoutube(mutations) {
  const injectPts = document.querySelectorAll('#secondary');
  const injectPt = injectPts[injectPts.length - 1];
  if (!injectPt || lastInjectedWrapper?.parentNode === injectPt) return;
  if (lastInjectedWrapper) lastInjectedWrapper.remove();

  const summaryWrapper = document.createElement('div');
  summaryWrapper.id = 'summary-wrapper';
  render(h(SummaryBox), summaryWrapper);
  injectPt.prepend(summaryWrapper);

  lastInjectedWrapper = summaryWrapper;
}

const observer = new MutationObserver(onMutationYoutube);
observer.observe(document, {
  childList: true,
  subtree: true,
});