import { h, render } from 'preact';
import SummaryBox from './SummaryBox';

console.info('the content script is running');

function onMutation(mutations, mutationInstance) {
  const injectPt = document.getElementById('secondary');
  if (injectPt) {
    const summaryWrapper = document.createElement('div');
    summaryWrapper.id = 'summary-wrapper';
    render(h(SummaryBox), summaryWrapper);
    injectPt.prepend(summaryWrapper);
    mutationInstance.disconnect();
  }
}

const observer = new MutationObserver(onMutation);
observer.observe(document, {
  childList: true,
  subtree:   true
});