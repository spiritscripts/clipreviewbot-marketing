// welcome.js -- landing page after a Whop purchase. Deliberately NOT the
// same flow as connect.html (no Google sign-in, no chrome.runtime handoff
// attempt): a Whop buyer paid on Whop's own checkout page, we don't know
// who they are in a browser session at all, and there's no reliable way to
// carry a dynamic per-purchase value through Whop's static post-purchase
// redirect URL. Instead, routes/contentRewardsBot.js's whop-webhook handler
// emails the connection code directly the moment payment.succeeded fires --
// this page's job is just to show it if it arrived via that email's link
// (?code=...), or say "check your email" if someone lands here without one
// (e.g. Whop's own static redirect, which can't include the code).

const el = (id) => document.getElementById(id);

function renderConnectionCodeBox(apiKey) {
  return `
    <div class="connection-code-box">
      <div class="connection-code-label">Your connection code</div>
      <div class="connection-code-value" id="connection-code-value">${apiKey}</div>
      <button class="btn btn-outline btn-block" id="copy-code-btn" type="button">Copy code</button>
    </div>
    <p class="connection-code-note">Paste this into the extension's Home tab (step 5 below) to activate it.</p>
  `;
}

function wireConnectionCodeCopy(apiKey) {
  const copyBtn = el("copy-code-btn");
  if (!copyBtn) return;
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(apiKey).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy code";
      }, 1500);
    });
  });
}

(function init() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const codeSection = el("code-section");

  if (code) {
    codeSection.innerHTML = renderConnectionCodeBox(code);
    wireConnectionCodeCopy(code);
  } else {
    codeSection.innerHTML = `
      <div class="no-code-note">
        We emailed your connection code to the email you used on Whop -- check your inbox
        (and spam folder) for a message from Clipbait, then paste that code into the
        extension's Home tab (step 5 below).
      </div>
    `;
  }
})();
