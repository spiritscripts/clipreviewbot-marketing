// main.js -- Content Rewards Clip Reviewer marketing site.
//
// This site is intentionally just a landing page: pitch, pricing, download
// the extension, sign in. "Sign In" starts the SAME real Google OAuth flow
// the main Clipbait app uses (routes/auth.js's /api/auth/google), just with
// a return_to pointed back at this site's connect.html instead of the main
// app's own success page. connect.html is what actually decides what
// happens next (already subscribed -> straight to the extension handoff;
// not subscribed -> Stripe checkout) -- this file's job ends at getting the
// user through Google.

const API_ORIGIN = "https://app.clipbait.ai";
const MARKETING_ORIGIN = window.location.origin;

const el = (id) => document.getElementById(id);

// --- Download ------------------------------------------------------------
// Confirmed live bug (now moot for desktop): this modal used to always show
// "open chrome://extensions" install steps, even to a visitor on their
// phone -- Chrome extensions flatly can't be installed on mobile, so that
// was a dead end. Now that the extension's on the Chrome Web Store, a
// desktop visitor skips the modal entirely and goes straight there; the
// modal only exists at all for the mobile case, where the store page
// itself wouldn't help them either.
const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const WEB_STORE_URL = "https://chromewebstore.google.com/detail/whop-content-rewards-clip/pchbnkgobclbjfgchbmhafgopeopofph";

const downloadBackdrop = el("download-backdrop");
function openDownload() { downloadBackdrop.classList.add("open"); }
function closeDownload() { downloadBackdrop.classList.remove("open"); }
el("nav-download-btn").addEventListener("click", () => {
  if (IS_MOBILE) {
    openDownload();
  } else {
    window.open(WEB_STORE_URL, "_blank", "noopener");
  }
});
el("download-close-btn").addEventListener("click", closeDownload);
downloadBackdrop.addEventListener("click", (e) => { if (e.target === downloadBackdrop) closeDownload(); });

const copyLinkBtn = el("modal-copy-link-btn");
if (copyLinkBtn) {
  copyLinkBtn.addEventListener("click", async () => {
    const original = copyLinkBtn.textContent;
    try {
      await navigator.clipboard.writeText(MARKETING_ORIGIN + "/");
      copyLinkBtn.textContent = "Copied!";
    } catch (_) {
      copyLinkBtn.textContent = "Couldn't copy -- copy the link above manually";
    }
    setTimeout(() => { copyLinkBtn.textContent = original; }, 1800);
  });
}

// --- Sign in ------------------------------------------------------------
function startSignIn() {
  const returnTo = `${MARKETING_ORIGIN}/connect.html`;
  window.location.href = `${API_ORIGIN}/api/auth/google?return_to=${encodeURIComponent(returnTo)}`;
}

["nav-signin-btn", "hero-signin-btn", "pricing-signin-btn"].forEach((id) => {
  el(id).addEventListener("click", startSignIn);
});
