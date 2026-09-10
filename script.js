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

  const bounds = hero.classList.contains('hero-kakemono') && inkRhythm
    ? inkRhythm.getBoundingClientRect()
    : hero.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  ) return;

  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  const isDarkField = hero.classList.contains('hero-kakemono') || x / bounds.width >= 0.58;
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

const heroLensButtons = [...document.querySelectorAll('.hero-lenses [data-hero-lens]')];
const mountCaption = document.querySelector('.mount-caption b');
let selectedHeroLens = hero?.dataset.heroLens || 'systems';

function showHeroLens(mode, commit = false) {
  if (!hero || !['systems', 'space', 'creative'].includes(mode)) return;
  hero.dataset.heroLens = mode;
  if (mountCaption) mountCaption.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);

  if (commit) {
    selectedHeroLens = mode;
    heroLensButtons.forEach((button) => {
      const isActive = button.dataset.heroLens === mode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }
}

heroLensButtons.forEach((button) => {
  const mode = button.dataset.heroLens;
  button.addEventListener('pointerenter', () => showHeroLens(mode));
  button.addEventListener('focus', () => showHeroLens(mode));
  button.addEventListener('pointerleave', () => showHeroLens(selectedHeroLens));
  button.addEventListener('blur', () => showHeroLens(selectedHeroLens));
  button.addEventListener('click', () => showHeroLens(mode, true));
});

if (hero?.classList.contains('hero-kakemono') && desktopMotion.matches) {
  let heroMotionFrame;
  let pointerX = 0.5;
  let pointerY = 0.5;

  const renderHeroMotion = () => {
    heroMotionFrame = undefined;
    hero.style.setProperty('--mount-tilt-x', `${(0.5 - pointerY) * 1.5}deg`);
    hero.style.setProperty('--mount-tilt-y', `${(pointerX - 0.5) * 1.9}deg`);
    hero.style.setProperty('--paper-shift-x', `${(0.5 - pointerX) * 5}px`);
    hero.style.setProperty('--paper-shift-y', `${(0.5 - pointerY) * 3}px`);
  };

  hero.addEventListener('pointermove', (event) => {
    const bounds = hero.getBoundingClientRect();
    pointerX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    pointerY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    if (!heroMotionFrame) heroMotionFrame = requestAnimationFrame(renderHeroMotion);
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    pointerX = 0.5;
    pointerY = 0.5;
    if (!heroMotionFrame) heroMotionFrame = requestAnimationFrame(renderHeroMotion);
  });
}

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
const viewerCounter = document.querySelector('.viewer-counter');
const viewerProjectLabel = document.querySelector('.viewer-project-label span');
const viewerHelp = document.querySelector('.viewer-help');
const viewerInfoButton = document.querySelector('[data-viewer-action="info"]');
const viewerActions = [...document.querySelectorAll('[data-viewer-action]')];
const projectNavigator = document.querySelector('.chapter-pagination');
const navigatorHandle = document.querySelector('.chapter-window-bar');
const caseOrder = ['systems', 'space', 'creative'];
const caseLabels = { systems: 'Systems', space: 'Space', creative: 'Creative' };
let currentCaseName = 'systems';
let navigatorOffsetX = 0;
let navigatorOffsetY = 0;
let navigatorDrag;

function positionNavigator(x, y) {
  if (!projectNavigator) return;
  navigatorOffsetX = Math.max(window.innerWidth * -.42, Math.min(0, x));
  navigatorOffsetY = Math.max(window.innerHeight * -.3, Math.min(window.innerHeight * .3, y));
  projectNavigator.style.setProperty('--nav-drag-x', `${navigatorOffsetX}px`);
  projectNavigator.style.setProperty('--nav-drag-y', `${navigatorOffsetY}px`);
}

if (navigatorHandle && desktopMotion.matches) {
  navigatorHandle.addEventListener('pointerdown', (event) => {
    navigatorDrag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: navigatorOffsetX,
      originY: navigatorOffsetY
    };
    navigatorHandle.setPointerCapture(event.pointerId);
  });

  navigatorHandle.addEventListener('pointermove', (event) => {
    if (!navigatorDrag || navigatorDrag.id !== event.pointerId) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      stopNavigatorDrag(event);
      return;
    }
    positionNavigator(
      navigatorDrag.originX + event.clientX - navigatorDrag.startX,
      navigatorDrag.originY + event.clientY - navigatorDrag.startY
    );
  });

  function stopNavigatorDrag(event) {
    if (!navigatorDrag) return;
    if (event?.pointerId !== undefined && navigatorDrag.id !== event.pointerId) return;
    const pointerId = navigatorDrag.id;
    navigatorDrag = undefined;
    if (navigatorHandle.hasPointerCapture(pointerId)) {
      navigatorHandle.releasePointerCapture(pointerId);
    }
  }

  navigatorHandle.addEventListener('pointerup', stopNavigatorDrag);
  navigatorHandle.addEventListener('pointercancel', stopNavigatorDrag);
  navigatorHandle.addEventListener('lostpointercapture', stopNavigatorDrag);
  window.addEventListener('pointerup', stopNavigatorDrag);
  window.addEventListener('pointercancel', stopNavigatorDrag);
  window.addEventListener('blur', () => stopNavigatorDrag());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopNavigatorDrag();
  });

  navigatorHandle.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 30 : 10;
    const movement = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step]
    }[event.key];
    if (movement) {
      event.preventDefault();
      positionNavigator(navigatorOffsetX + movement[0], navigatorOffsetY + movement[1]);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      positionNavigator(0, 0);
    }
  });
}

function setActiveCase(caseName) {
  currentCaseName = caseName;
  const activeIndex = caseOrder.indexOf(caseName);
  workSection?.setAttribute('data-active-case', caseName);
  if (viewerCounter && activeIndex >= 0) viewerCounter.textContent = `0${activeIndex + 1} / 03`;
  if (viewerProjectLabel) viewerProjectLabel.textContent = caseLabels[caseName] || caseName;
  caseLinks.forEach((link) => {
    const isActive = link.dataset.caseLink === caseName;
    link.classList.toggle('is-current', isActive);
    if (isActive) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}

function goToCase(caseName) {
  const target = portfolioCases.find((item) => item.dataset.case === caseName);
  target?.scrollIntoView({ behavior: desktopMotion.matches ? 'smooth' : 'auto', block: 'start' });
}

viewerActions.forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.viewerAction;
    const currentIndex = Math.max(0, caseOrder.indexOf(currentCaseName));

    if (action === 'previous') goToCase(caseOrder[(currentIndex - 1 + caseOrder.length) % caseOrder.length]);
    if (action === 'shuffle') {
      const choices = caseOrder.filter((name) => name !== currentCaseName);
      goToCase(choices[Math.floor(Math.random() * choices.length)]);
    }
    if (action === 'info' && viewerHelp) {
      const willOpen = viewerHelp.hidden;
      viewerHelp.hidden = !willOpen;
      viewerInfoButton?.setAttribute('aria-expanded', String(willOpen));
    }
  });
});

const systemVisual = document.querySelector('.chapter-case .system-visual');
if (systemVisual && desktopMotion.matches) {
  systemVisual.addEventListener('pointermove', (event) => {
    const bounds = systemVisual.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    systemVisual.style.setProperty('--viewer-tilt-x', `${y * -1.4}deg`);
    systemVisual.style.setProperty('--viewer-tilt-y', `${x * 1.8}deg`);
  });
  systemVisual.addEventListener('pointerleave', () => {
    systemVisual.style.setProperty('--viewer-tilt-x', '0deg');
    systemVisual.style.setProperty('--viewer-tilt-y', '0deg');
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
