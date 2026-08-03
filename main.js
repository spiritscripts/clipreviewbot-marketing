// main.js -- Content Rewards Clip Reviewer marketing site.
//
// This site is intentionally just a landing page: pitch, pricing, download
// the extension, sign in. Every "Sign In" button does the same thing --
// there's only one plan, so getting in and subscribing are the same action.
// Checkout itself is Stripe's own hosted page (redirect there and back);
// this site never touches card details.

const API_ORIGIN = "https://app.clipbait.ai";

const el = (id) => document.getElementById(id);

// --- Download modal ------------------------------------------------------------
const downloadBackdrop = el("download-backdrop");
function openDownload() { downloadBackdrop.classList.add("open"); }
function closeDownload() { downloadBackdrop.classList.remove("open"); }
el("nav-download-btn").addEventListener("click", openDownload);
el("download-close-btn").addEventListener("click", closeDownload);
downloadBackdrop.addEventListener("click", (e) => { if (e.target === downloadBackdrop) closeDownload(); });

// --- Sign in / checkout ------------------------------------------------------------
async function startCheckout(triggerBtn) {
  const original = triggerBtn.textContent;
  triggerBtn.disabled = true;
  triggerBtn.textContent = "Redirecting…";
  try {
    const resp = await fetch(`${API_ORIGIN}/api/content-rewards-bot/create-checkout-session`, { method: "POST" });
    const data = await resp.json();
    if (!resp.ok || !data.url) throw new Error(data?.message || "Something went wrong. Please try again.");
    window.location.href = data.url;
  } catch (err) {
    triggerBtn.disabled = false;
    triggerBtn.textContent = original;
    alert(err.message || "Something went wrong. Please try again.");
  }
}

["nav-signin-btn", "hero-signin-btn", "pricing-signin-btn"].forEach((id) => {
  el(id).addEventListener("click", () => startCheckout(el(id)));
});
