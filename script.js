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

const observed = document.querySelectorAll('.statement, .case, .thread-list article');
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
  const size = 52 + Math.random() * 148;
  const radiusValues = Array.from({ length: 8 }, () => `${34 + Math.round(Math.random() * 32)}%`);

  drop.className = 'ink-drop click-ink-drop';
  drop.style.left = `${x}px`;
  drop.style.top = `${y}px`;
  drop.style.width = `${size}px`;
  drop.style.height = `${size * (0.56 + Math.random() * 0.76)}px`;
  drop.style.setProperty('--drop-color', palette[Math.floor(Math.random() * palette.length)]);
  drop.style.setProperty('--drop-duration', `${2 + Math.random() * 2.1}s`);
  drop.style.setProperty('--drop-radius', `${radiusValues.slice(0, 4).join(' ')}/${radiusValues.slice(4).join(' ')}`);
  drop.style.setProperty('--ink-x', `${30 + Math.random() * 40}%`);
  drop.style.setProperty('--ink-y', `${30 + Math.random() * 40}%`);
  drop.style.setProperty('--ink-core', `${15 + Math.random() * 24}%`);
  drop.style.setProperty('--ink-feather', `${48 + Math.random() * 24}%`);
  drop.style.setProperty('--drop-blur', `${Math.random() * 1.8}px`);
  drop.style.setProperty('--drop-rotation', `${-42 + Math.random() * 84}deg`);
  drop.style.setProperty('--drop-drift', `${-14 + Math.random() * 28}deg`);
  drop.style.setProperty('--drop-scale', `${0.94 + Math.random() * 0.56}`);
  drop.style.setProperty('--satellite-one-size', `${4 + Math.random() * 10}%`);
  drop.style.setProperty('--satellite-two-size', `${6 + Math.random() * 15}%`);
  drop.style.setProperty('--satellite-one-x', `${-18 + Math.random() * 34}%`);
  drop.style.setProperty('--satellite-one-y', `${8 + Math.random() * 78}%`);
  drop.style.setProperty('--satellite-two-x', `${-16 + Math.random() * 28}%`);
  drop.style.setProperty('--satellite-two-y', `${5 + Math.random() * 74}%`);
  drop.style.setProperty('--satellite-radius', `${35 + Math.random() * 45}% ${35 + Math.random() * 45}% ${35 + Math.random() * 45}% ${35 + Math.random() * 45}%`);
  drop.style.setProperty('--satellite-opacity', `${0.35 + Math.random() * 0.5}`);
  inkRhythm?.append(drop);
  drop.addEventListener('animationend', () => drop.remove(), { once: true });
});

const chapterCase = document.querySelector('.chapter-case');
const chapterBeats = [...document.querySelectorAll('.chapter-beat')];
const systemNodes = [...document.querySelectorAll('.chapter-case .system-node')];
const traceSteps = [...document.querySelectorAll('.chapter-case [data-trace]')];
const stageStatus = document.querySelector('.stage-status');

function activateChapterBeat(beat) {
  if (!beat || !chapterCase) return;

  const step = beat.dataset.step;
  const activeSystems = (beat.dataset.system || '').split(',').filter(Boolean);
  chapterCase.dataset.activeStep = step;
  chapterBeats.forEach((item) => item.classList.toggle('is-active', item === beat));
  systemNodes.forEach((node) => node.classList.toggle('is-active', activeSystems.includes(node.dataset.system)));
  traceSteps.forEach((trace) => trace.classList.toggle('is-active', step === 'improve' || trace.dataset.trace === step));
  if (stageStatus) stageStatus.textContent = step.charAt(0).toUpperCase() + step.slice(1);
}

if (chapterCase && desktopMotion.matches) {
  const chapterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) activateChapterBeat(entry.target);
    });
  }, { rootMargin: '-28% 0px -42% 0px', threshold: 0 });

  chapterBeats.forEach((beat) => chapterObserver.observe(beat));

  let progressFrame;
  const updateChapterProgress = () => {
    progressFrame = undefined;
    const bounds = chapterCase.getBoundingClientRect();
    const distance = Math.max(1, bounds.height - window.innerHeight);
    const progress = Math.min(1, Math.max(0, -bounds.top / distance));
    chapterCase.style.setProperty('--chapter-progress', progress.toFixed(3));
  };

  window.addEventListener('scroll', () => {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateChapterProgress);
  }, { passive: true });
  updateChapterProgress();

  systemNodes.forEach((node) => {
    node.addEventListener('pointerenter', () => {
      systemNodes.forEach((item) => item.classList.toggle('is-active', item === node));
      if (stageStatus) stageStatus.textContent = node.querySelector('strong')?.textContent || 'System';
    });
    node.addEventListener('pointerleave', () => {
      activateChapterBeat(chapterBeats.find((beat) => beat.dataset.step === chapterCase.dataset.activeStep));
    });
  });
}

const workSection = document.querySelector('.work');
const portfolioCases = [...document.querySelectorAll('.work [data-case]')];
const caseLinks = [...document.querySelectorAll('[data-case-link]')];
const ensoCollage = document.querySelector('.enso-collage');
const creativeCase = document.querySelector('.case-creative');

function setActiveCase(caseName) {
  caseLinks.forEach((link) => {
    const isActive = link.dataset.caseLink === caseName;
    link.classList.toggle('is-current', isActive);
    if (isActive) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}

if (workSection && desktopMotion.matches) {
  let editorialFrame;
  const updateEditorialMotion = () => {
    editorialFrame = undefined;
    const workBounds = workSection.getBoundingClientRect();
    const workDistance = Math.max(1, workBounds.height - window.innerHeight);
    const workProgress = Math.min(1, Math.max(0, -workBounds.top / workDistance));
    workSection.style.setProperty('--work-progress', workProgress.toFixed(3));

    const readingLine = window.innerHeight * .48;
    const activeCase = portfolioCases.find((item) => {
      const bounds = item.getBoundingClientRect();
      return bounds.top <= readingLine && bounds.bottom > readingLine;
    });
    if (activeCase) setActiveCase(activeCase.dataset.case);

    if (ensoCollage) {
      const bounds = ensoCollage.getBoundingClientRect();
      const centreOffset = (bounds.top + bounds.height / 2 - window.innerHeight / 2) / window.innerHeight;
      ensoCollage.style.setProperty('--collage-main-y', `${centreOffset * -22}px`);
      ensoCollage.style.setProperty('--collage-detail-y', `${centreOffset * 48}px`);
    }

    if (creativeCase) {
      const bounds = creativeCase.getBoundingClientRect();
      const centreOffset = (bounds.top + bounds.height / 2 - window.innerHeight / 2) / window.innerHeight;
      creativeCase.style.setProperty('--creative-image-y', `${Math.max(-32, Math.min(32, centreOffset * -28))}px`);
    }
  };

  window.addEventListener('scroll', () => {
    if (!editorialFrame) editorialFrame = requestAnimationFrame(updateEditorialMotion);
  }, { passive: true });
  window.addEventListener('resize', updateEditorialMotion, { passive: true });
  updateEditorialMotion();
}
