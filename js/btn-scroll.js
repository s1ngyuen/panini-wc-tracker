// js/btn-scroll.js
// Auto-wraps .btn-primary / .btn-secondary / .btn-reset text in scroll-reveal
// structure, matching the navbar tab hover animation. Skips buttons with SVG.

const SEL = '.btn-primary, .btn-secondary, .btn-reset, .btn-cancel, .gen-tab';

function applyBtnScroll(btn) {
  if (btn.querySelector('.btn-scrl') || btn.querySelector('svg')) return;
  const text = btn.textContent.trim();
  if (!text) return;
  btn.innerHTML = `<span class="btn-scrl"><span class="btn-scrl-inner"><span>${text}</span><span>${text}</span></span></span>`;
}

export function initBtnScroll() {
  document.querySelectorAll(SEL).forEach(applyBtnScroll);

  new MutationObserver(mutations => {
    for (const m of mutations) {
      // Re-wrap if button's own text content was replaced (e.g. textContent re-set)
      const t = m.target;
      if (t.nodeType === 1 && t.matches?.(SEL) && !t.querySelector('.btn-scrl') && !t.querySelector('svg')) {
        if (t.textContent.trim()) applyBtnScroll(t);
      }
      // Wrap newly inserted buttons
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.(SEL)) applyBtnScroll(node);
        node.querySelectorAll?.(SEL).forEach(applyBtnScroll);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
