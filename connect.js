// connect.js -- Stripe's hosted Checkout redirects back here with
// ?session_id={CHECKOUT_SESSION_ID} once payment succeeds (see
// success_url in routes/contentRewardsBot.js's /create-checkout-session).
// Job: turn that session id into a real Clipbait API key, then hand that
// key straight to the extension over chrome.runtime.sendMessage -- no
// copy/pasting, ever. If the extension can't be reached (not installed
// yet, or its ID below isn't filled in), the fix is "go install it and
// retry", not "here's a raw key to type in somewhere" -- there's no such
// box in the extension on purpose.

const API_ORIGIN = "https://app.clipbait.ai";

// Currently the unpacked dev-mode ID from chrome://extensions (pre-Web-Store
// launch). Swap this to the permanent Web Store ID once the listing is
// approved -- unpacked IDs are derived from the local install path/key and
// do NOT carry over to the published version.
const EXTENSION_ID = "igfodggfmfomkcpggakbdmankhpgmbof";

const el = (id) => document.getElementById(id);
const spinner = el("connect-spinner");
const titleEl = el("connect-title");
const subEl = el("connect-sub");
const actionsEl = el("connect-actions");

function showResult({ title, sub, actionsHtml }) {
  spinner.style.display = "none";
  titleEl.textContent = title;
  subEl.textContent = sub;
  if (actionsHtml) {
    actionsEl.innerHTML = actionsHtml;
    actionsEl.classList.add("visible");
  }
}

function sendToExtension(apiKey) {
  return new Promise((resolve) => {
    if (!window.chrome?.runtime?.sendMessage || !EXTENSION_ID) {
      resolve({ ok: false, error: "extension_not_reachable" });
      return;
    }
    try {
      chrome.runtime.sendMessage(EXTENSION_ID, { type: "AUTH_HANDOFF", apiKey }, (resp) => {
        // chrome.runtime.lastError fires if no extension with this ID is
        // installed, or it doesn't list this origin in externally_connectable.
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

async function attemptHandoff(apiKey) {
  const result = await sendToExtension(apiKey);
  if (result.ok) {
    showResult({
      title: "You're connected!",
      sub: "The extension is signed in and ready. You can close this tab and open the extension's popup on Whop.",
    });
    return;
  }

  // Not a "here's a key, go paste it somewhere" fallback -- the fix for
  // "extension unreachable" is installing the extension (or, if it's
  // already installed, just retrying once it's had a moment to load).
  showResult({
    title: "Couldn't reach the extension",
    sub: "Install it if you haven't yet, then retry -- this page keeps your account connected either way.",
    actionsHtml: `
      <a class="btn btn-primary btn-block" href="downloads/content-rewards-clip-reviewer.zip" download>Download the extension</a>
      <button class="btn btn-outline btn-block" id="connect-retry-btn">Retry</button>
    `,
  });
  el("connect-retry-btn").addEventListener("click", () => {
    spinner.style.display = "block";
    titleEl.textContent = "Connecting your extension…";
    subEl.textContent = "Hang tight, this only takes a second.";
    actionsEl.classList.remove("visible");
    attemptHandoff(apiKey);
  });
}

(async function connect() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  if (!sessionId) {
    showResult({ title: "Missing checkout session", sub: "This link is incomplete. Try subscribing again from the pricing page." });
    return;
  }

  let apiKey;
  try {
    // Verifies the Stripe Checkout Session actually paid, activates the
    // subscription, and returns a short-lived JWT for this account.
    const sessResp = await fetch(`${API_ORIGIN}/api/content-rewards-bot/checkout-session/${encodeURIComponent(sessionId)}`);
    const sessData = await sessResp.json();
    if (!sessResp.ok || !sessData.token) throw new Error(sessData?.message || "Couldn't verify your payment.");

    // Mint (or fetch the existing) API key using that JWT -- reuses the
    // same endpoint the main Clipbait app already uses for agent/MCP/CLI
    // access, nothing new on the backend for this part.
    const keyResp = await fetch(`${API_ORIGIN}/api/users/me/api-key`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sessData.token}` },
    });
    if (!keyResp.ok) throw new Error(`status ${keyResp.status}`);
    const keyData = await keyResp.json();
    apiKey = keyData.apiKey;
    if (!apiKey) throw new Error("no api key returned");
  } catch (err) {
    showResult({
      title: "Couldn't connect automatically",
      sub: err.message || "Something went wrong fetching your account. Contact support and we'll sort it out.",
    });
    return;
  }

  await attemptHandoff(apiKey);
})();
