// accept-invite.js -- lands here from a real invite email
// (routes/contentRewardsBot.js's POST /seats/invite sends the link).
//
//   ?invite=<token>              first load -- show "Sign in with Google"
//   ?invite=<token>&token=<jwt>  back from Google OAuth (same return_to
//                                 pattern connect.js uses) -- accept the
//                                 seat, then hand off to the extension
//                                 exactly like a normal subscribe would.

const API_ORIGIN = "https://app.clipbait.ai";
const MARKETING_ORIGIN = window.location.origin;

// Same unpacked dev-mode ID as connect.js -- see that file's comment for
// why this needs updating once the Web Store listing is live.
const EXTENSION_ID = "igfodggfmfomkcpggakbdmankhpgmbof";

const el = (id) => document.getElementById(id);
const spinner = el("connect-spinner");
const titleEl = el("connect-title");
const subEl = el("connect-sub");
const actionsEl = el("connect-actions");

function showResult({ title, sub, actionsHtml, showSpinner }) {
  spinner.classList.toggle("hidden", !showSpinner);
  titleEl.textContent = title;
  subEl.textContent = sub;
  actionsEl.innerHTML = actionsHtml || "";
  actionsEl.classList.toggle("visible", !!actionsHtml);
}

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

async function attemptHandoff(apiKey, ownerEmail) {
  const result = await sendToExtension(apiKey);
  if (result.ok) {
    showResult({
      title: "You're connected!",
      sub: `The extension is signed in and ready to review clips on ${ownerEmail}'s team. You can close this tab.`,
    });
    return;
  }
  showResult({
    title: "Couldn't reach the extension",
    sub: "Install it if you haven't yet, then retry -- your seat is already accepted either way.",
    actionsHtml: `
      <a class="btn btn-primary btn-block" href="downloads/content-rewards-clip-reviewer.zip" download>Download the extension</a>
      <button class="btn btn-outline btn-block" id="connect-retry-btn">Retry</button>
    `,
  });
  el("connect-retry-btn").addEventListener("click", () => {
    showResult({ title: "Connecting your extension…", sub: "Hang tight, this only takes a second.", showSpinner: true });
    attemptHandoff(apiKey, ownerEmail);
  });
}

async function acceptAndConnect(inviteToken, jwtToken) {
  showResult({ title: "Joining the team…", sub: "Hang tight, this only takes a second.", showSpinner: true });
  try {
    const acceptResp = await fetch(`${API_ORIGIN}/api/content-rewards-bot/seats/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwtToken}` },
      body: JSON.stringify({ inviteToken }),
    });
    const acceptData = await acceptResp.json();
    if (!acceptResp.ok) throw new Error(acceptData?.message || "Couldn't accept this invite.");

    const keyResp = await fetch(`${API_ORIGIN}/api/users/me/api-key`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    if (!keyResp.ok) throw new Error(`status ${keyResp.status}`);
    const keyData = await keyResp.json();
    if (!keyData.apiKey) throw new Error("no api key returned");

    await attemptHandoff(keyData.apiKey, acceptData.ownerEmail);
  } catch (err) {
    showResult({ title: "Couldn't accept this invite", sub: err.message || "Something went wrong. Contact support and we'll sort it out." });
  }
}

(function init() {
  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get("invite");
  const jwtToken = params.get("token");

  if (!inviteToken) {
    showResult({ title: "Missing invite", sub: "This link is incomplete. Ask whoever invited you to resend it." });
    return;
  }

  if (jwtToken) {
    acceptAndConnect(inviteToken, jwtToken);
    return;
  }

  // First load -- not signed in yet. Show the sign-in button rather than
  // redirecting immediately, since this is a cold entry point from an
  // email, not a click from inside the site.
  const returnTo = `${MARKETING_ORIGIN}/accept-invite.html?invite=${encodeURIComponent(inviteToken)}`;
  showResult({
    title: "You're invited to a team",
    sub: "Sign in with Google to accept and connect the extension. No separate subscription needed, you're joining your team's plan.",
    actionsHtml: `<button class="btn btn-primary btn-block" id="accept-signin-btn">Sign in with Google</button>`,
  });
  el("accept-signin-btn").addEventListener("click", () => {
    window.location.href = `${API_ORIGIN}/api/auth/google?return_to=${encodeURIComponent(returnTo)}`;
  });
})();
