const AUTH_KEY = 'wai-portfolio-access';
const PASSWORD_HASH = '4493db19e9e18e380317f8b0c78ebc4076db300b105047f46183b4ba0967871d';
const root = document.documentElement;
const gateForm = document.querySelector('#gate-form');
const passwordInput = document.querySelector('#portfolio-password');
const gateMessage = document.querySelector('#gate-message');

function unlockPortfolio() {
  root.classList.remove('auth-pending');
  root.classList.add('auth-unlocked');
  document.querySelector('#portfolio-shell')?.removeAttribute('aria-hidden');
}

async function hashPassword(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

if (sessionStorage.getItem(AUTH_KEY) === PASSWORD_HASH) {
  unlockPortfolio();
} else {
  document.querySelector('#portfolio-shell')?.setAttribute('aria-hidden', 'true');
  passwordInput?.focus();
}

gateForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  gateMessage.textContent = '';

  if (await hashPassword(passwordInput.value) === PASSWORD_HASH) {
    sessionStorage.setItem(AUTH_KEY, PASSWORD_HASH);
    passwordInput.value = '';
    unlockPortfolio();
    window.scrollTo({ top: 0 });
    return;
  }

  gateMessage.textContent = 'That password does not match. Please try again.';
  passwordInput.select();
});

const observed = document.querySelectorAll('.case, .thread-list article');
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  observed.forEach((element) => io.observe(element));
}
