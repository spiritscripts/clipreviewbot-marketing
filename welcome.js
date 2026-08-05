// welcome.js -- landing page after a Whop purchase. Still NOT the same
// entry flow as connect.html (no Google sign-in: a Whop buyer paid on
// Whop's own checkout page, and there's no reliable way to carry a
// dynamic per-purchase value through Whop's static post-purchase redirect
// URL). Instead, routes/contentRewardsBot.js's whop-webhook handler emails
// the connection code directly the moment payment.succeeded fires, and
// this page shows it via that email's link (?code=...).
//
// DOES now attempt the same chrome.runtime automatic handoff connect.js
// uses, though -- that only became worthwhile once EXTENSION_ID below was
// the real Chrome Web Store ID (same for every install) rather than the
// old unpacked dev-mode one (which only ever matched the developer's own
// machine, so trying it here would never have worked for a real buyer).
// Falls back to the manual code box when it doesn't succeed -- most
// commonly because they haven't installed the extension yet, the normal
// case right after a Whop purchase.
const EXTENSION_ID = "pchbnkgobclbjfgchbmhafgopeopofph";

const el = (id) => document.getElementById(id);

function sendToExtension(apiKey) {
  return new Promise((resolve) => {
    if (!window.chrome?.runtime?.sendMessage || !EXTENSION_ID) {
      resolve({ ok: false, error: "extension_not_reachable" });
      return;
    }
    try {
      chrome.runtime.sendMessage(EXTENSION_ID, { type: "AUTH_HANDOFF", apiKey }, (resp) => {
        if (chrome.runtime.lastError || !resp?.ok) {
          resolve({ ok: false, error: chrome.runtime.lastError?.message || resp?.error || "handoff_failed" });
          return;
        }
        resolve({ ok: true });
      });
    } catch (err) {
      resolve({ ok: false, error: String(err) });
    }
  });
}

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

(async function init() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const codeSection = el("code-section");

  if (!code) {
    codeSection.innerHTML = `
      <div class="no-code-note">
        We emailed your connection code to the email you used on Whop -- check your inbox
        (and spam folder) for a message from Clipbait, then paste that code into the
        extension's Home tab (step 5 below).
      </div>
    `;
    return;
  }

  const result = await sendToExtension(code);
  if (result.ok) {
    el("welcome-title").textContent = "You're connected!";
    el("welcome-sub").textContent = "The extension is signed in and ready. You can close this tab.";
    el("welcome-card").style.display = "none"; // nothing left to do -- no install steps needed
    return;
  }

  // Most likely reason: they haven't installed the extension yet -- the
  // normal case right after a Whop purchase, not a real failure. Same
  // manual fallback as before the automatic attempt existed.
  codeSection.innerHTML = renderConnectionCodeBox(code);
  wireConnectionCodeCopy(code);
})();
