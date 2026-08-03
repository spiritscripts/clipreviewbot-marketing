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

// --- Download modal ------------------------------------------------------------
// Confirmed live bug: this modal always showed "open chrome://extensions"
// desktop install steps, even to a visitor on their phone -- Chrome
// extensions flatly can't be installed on mobile, so that's just a dead
// end. IS_MOBILE swaps the modal to a "come back on your computer" message
// with a copyable link instead of a useless .zip download.
const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const downloadBackdrop = el("download-backdrop");
function openDownload() {
  el("download-desktop-content").style.display = IS_MOBILE ? "none" : "block";
  el("download-mobile-content").style.display = IS_MOBILE ? "block" : "none";
  downloadBackdrop.classList.add("open");
}
function closeDownload() { downloadBackdrop.classList.remove("open"); }
el("nav-download-btn").addEventListener("click", openDownload);
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
