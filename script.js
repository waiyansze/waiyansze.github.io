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

const hero = document.querySelector('.hero');
const inkRhythm = document.querySelector('.ink-rhythm');
const desktopMotion = window.matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)');
const lightInkPalette = ['rgba(7,8,7,.78)', 'rgba(25,27,24,.62)', 'rgba(55,57,52,.48)', 'rgba(92,94,87,.36)', 'rgba(128,130,122,.26)'];
const darkInkPalette = ['rgba(224,225,218,.28)', 'rgba(190,192,184,.24)', 'rgba(149,152,143,.2)', 'rgba(108,111,104,.18)', 'rgba(76,79,74,.16)'];

hero?.addEventListener('pointerdown', (event) => {
  if (!desktopMotion.matches || event.button !== 0 || event.target.closest('a, button, input')) return;

  const bounds = hero.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  const isDarkField = x / bounds.width >= 0.58;
  const palette = isDarkField ? darkInkPalette : lightInkPalette;
  const drop = document.createElement('span');
  const size = 64 + Math.random() * 116;

  drop.className = 'ink-drop click-ink-drop';
  drop.style.left = `${x}px`;
  drop.style.top = `${y}px`;
  drop.style.width = `${size}px`;
  drop.style.height = `${size * (0.82 + Math.random() * 0.28)}px`;
  drop.style.setProperty('--drop-color', palette[Math.floor(Math.random() * palette.length)]);
  drop.style.setProperty('--drop-duration', `${2.2 + Math.random() * 1.5}s`);
  inkRhythm?.append(drop);
  drop.addEventListener('animationend', () => drop.remove(), { once: true });
});
