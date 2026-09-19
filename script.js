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
  window.dispatchEvent(new Event('portfolio:unlocked'));
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
    if (!location.hash) window.scrollTo({ top: 0 });
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

const storyScenes = [...document.querySelectorAll('[data-scene-number]')];
const sceneMeter = document.querySelector('.scene-meter');
const sceneCurrent = document.querySelector('.scene-current');

if (storyScenes.length && desktopMotion.matches) {
  let sceneFrame;
  const updateStoryScenes = () => {
    sceneFrame = undefined;
    const viewportHeight = window.innerHeight;
    let nearestScene = storyScenes[0];
    let nearestDistance = Infinity;

    storyScenes.forEach((scene) => {
      const bounds = scene.getBoundingClientRect();
      const sceneCentre = bounds.top + bounds.height / 2;
      const centreDistance = Math.abs(sceneCentre - viewportHeight / 2);
      const distance = Math.max(0, centreDistance - Math.max(0, bounds.height - viewportHeight) / 2);
      const visibility = Math.max(0, Math.min(1, 1 - distance / (viewportHeight * .82)));
      const progress = Math.max(0, Math.min(1, (viewportHeight - bounds.top) / (viewportHeight + bounds.height)));
      const shift = (0.5 - progress) * 72;

      scene.style.setProperty('--scene-y', `${shift.toFixed(2)}px`);
      scene.style.setProperty('--scene-y-soft', `${(shift * .55).toFixed(2)}px`);
      scene.style.setProperty('--scene-y-counter', `${(shift * -.45).toFixed(2)}px`);
      scene.style.setProperty('--scene-scale', `${(0.968 + visibility * .032).toFixed(4)}`);
      scene.style.setProperty('--scene-opacity', `${(0.65 + visibility * .35).toFixed(3)}`);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestScene = scene;
      }
    });

    if (sceneCurrent) sceneCurrent.textContent = nearestScene.dataset.sceneNumber || '01';
    if (sceneMeter) {
      const scrollDistance = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
      sceneMeter.style.setProperty('--page-progress', `${Math.max(0, Math.min(1, window.scrollY / scrollDistance)).toFixed(4)}`);
    }
  };

  const requestStoryUpdate = () => {
    if (!sceneFrame) sceneFrame = requestAnimationFrame(updateStoryScenes);
  };
  window.addEventListener('scroll', requestStoryUpdate, { passive: true });
  window.addEventListener('resize', requestStoryUpdate, { passive: true });
  window.addEventListener('portfolio:unlocked', requestStoryUpdate);
  document.addEventListener('toggle', requestStoryUpdate, true);
  updateStoryScenes();
}

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


const motionQuery = window.matchMedia('(min-width:901px) and (prefers-reduced-motion:no-preference)');
const siteHeader = document.querySelector('.site-header');
const systemsSection = document.querySelector('#systems-case');
const digitalSection = document.querySelector('#digital-projects');
const sequences = [];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
let pageFrame;

function updateSystemMap(panel) {
  if (!panel) return;
  const step = panel.dataset.step || 'overview';
  systemsSection.dataset.activeStep = step;
  const names = (panel.dataset.system || '').split(',');
  document.querySelectorAll('.system-node').forEach(node => node.classList.toggle('is-active', names.includes(node.dataset.system)));
  document.querySelectorAll('[data-trace]').forEach(node => node.classList.toggle('is-active', ['overview','prevent','evidence'].includes(step) || node.dataset.trace === step));
  document.querySelector('.stage-status').textContent = step.charAt(0).toUpperCase() + step.slice(1);
}

function createSequence(section, pinSelector, trackSelector, slideSelector, bodySelector, kind) {
  if (!section) return;
  const pin = section.querySelector(pinSelector);
  const track = section.querySelector(trackSelector);
  const slides = [...track.querySelectorAll(slideSelector)];
  const bodies = slides.map(slide => slide.querySelector(bodySelector));
  const links = kind === 'digital' ? [...section.querySelectorAll('.digital-pagination a')] : [];
  const buttons = [...section.querySelectorAll(kind === 'digital' ? '[data-digital-direction]' : '[data-system-direction]')];
  const counter = section.querySelector(kind === 'digital' ? '.digital-counter' : '.systems-counter');
  const state = {section, pin, track, slides, bodies, segments:[], total:0, selected:0};
  const mark = index => {
    state.selected = index;
    links.forEach((link, i) => {if (i === index) link.setAttribute('aria-current','true'); else link.removeAttribute('aria-current');});
    buttons.forEach(button => {
      const direction = Number(button.dataset.digitalDirection || button.dataset.systemDirection);
      button.disabled = direction < 0 ? index === 0 : index === slides.length - 1;
    });
    if (counter) counter.textContent = String(index + 1).padStart(2,'0') + ' / ' + String(slides.length).padStart(2,'0');
    if (kind === 'systems') updateSystemMap(slides[index]);
  };
  state.measure = () => {
    if (!motionQuery.matches) {
      section.style.removeProperty('--sequence-height');
      track.style.removeProperty('transform');
      slides.forEach(slide => slide.inert = false);
      bodies.forEach(body => body.scrollTop = 0);
      section.classList.remove('is-pinned');
      return;
    }
    if (!pin.clientHeight) return;
    let distance = 0;
    const lead = window.innerHeight * .15;
    const hold = window.innerHeight * .35;
    const travel = window.innerHeight * .75;
    state.segments = slides.map((slide,i) => {
      const body = bodies[i];
      const extra = Math.max(0,body.scrollHeight - body.clientHeight);
      const segment = {start:distance, extra, lead, end:distance + lead + extra + hold, travel:i === slides.length-1 ? 0 : travel};
      distance = segment.end + segment.travel;
      return segment;
    });
    state.total = distance;
    section.style.setProperty('--sequence-height', (pin.offsetHeight + distance) + 'px');
  };
  state.update = () => {
    if (!motionQuery.matches || !state.segments.length) return;
    const bounds = section.getBoundingClientRect();
    const offset = clamp(-bounds.top, 0, state.total);
    let position = slides.length - 1;
    state.segments.forEach((segment,i) => {
      bodies[i].scrollTop = clamp(offset - segment.start - segment.lead, 0, segment.extra);
      if (offset >= segment.start && offset <= segment.end + segment.travel) {
        position = i + (segment.travel ? clamp((offset-segment.end)/segment.travel,0,1) : 0);
      }
    });
    if (kind === 'systems') track.style.transform = 'translate3d(' + (-position*track.clientWidth) + 'px,0,0)';
    else track.scrollLeft = position * track.clientWidth;
    const nearest = clamp(Math.round(position),0,slides.length-1);
    slides.forEach((slide,i) => slide.inert = i !== nearest);
    if (nearest !== state.selected) mark(nearest);
    section.classList.toggle('is-pinned',bounds.top <= 1 && bounds.bottom >= pin.offsetHeight-1);
  };
  state.go = (index, smooth = true) => {
    const next = clamp(index,0,slides.length-1);
    if (motionQuery.matches && state.segments.length) {
      window.scrollTo({top:section.getBoundingClientRect().top + window.scrollY + state.segments[next].start, behavior:smooth ? 'smooth':'instant'});
    } else if (kind === 'digital') {
      track.scrollTo({left:slides[next].offsetLeft-slides[0].offsetLeft,behavior:'instant'});
    } else slides[next].scrollIntoView({block:'start',behavior:'auto'});
    mark(next);
  };
  links.forEach((link,i) => link.addEventListener('click',event => {event.preventDefault();state.go(i);}));
  buttons.forEach(button => button.addEventListener('click',() => state.go(state.selected+Number(button.dataset.digitalDirection || button.dataset.systemDirection))));
  const keyboardRegion = kind === 'systems' ? section.querySelector('.systems-copy-viewport') : track;
  keyboardRegion.addEventListener('keydown',event => {
    if (event.target !== keyboardRegion) return;
    const targets = {ArrowLeft:state.selected-1,ArrowRight:state.selected+1,Home:0,End:slides.length-1};
    if (event.key in targets) {event.preventDefault();state.go(targets[event.key]);}
  });
  track.addEventListener('scroll',() => {
    if (motionQuery.matches || kind !== 'digital') return;
    const width = slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap || 0);
    mark(clamp(Math.round(track.scrollLeft/width),0,slides.length-1));
  },{passive:true});
  section.addEventListener('toggle',() => {state.measure();requestPageUpdate();},true);
  const arrows = section.querySelector('.digital-arrows');
  if (arrows) arrows.hidden = false;
  mark(0);
  sequences.push(state);
}
createSequence(digitalSection,'.digital-pin','.digital-track','.digital-slide','.digital-description','digital');

function updatePage() {
  pageFrame = undefined;
  siteHeader?.classList.toggle('is-scrolled',window.scrollY > 16);
  sequences.forEach(state => state.update());
  const workCases = [...document.querySelectorAll('.work-gallery > .case')];
  const activeCase = workCases.find(section => {
    const bounds = section.getBoundingClientRect();
    return bounds.top <= window.innerHeight * .45 && bounds.bottom > window.innerHeight * .45;
  });
  document.querySelectorAll('[data-work-index]').forEach(link => {
    if (link.dataset.workIndex === activeCase?.dataset.case) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
  const footer = document.querySelector('.site-footer');
  if (sceneMeter && footer) sceneMeter.hidden = footer.getBoundingClientRect().top < window.innerHeight;

}
function requestPageUpdate() {
  if (!pageFrame) pageFrame = requestAnimationFrame(updatePage);
}
function measurePage() {
  document.body.classList.toggle('has-scroll-sequences',motionQuery.matches);
  sequences.forEach(state => state.measure());
  requestPageUpdate();
}
window.addEventListener('scroll',requestPageUpdate,{passive:true});
window.addEventListener('resize',measurePage,{passive:true});
window.addEventListener('portfolio:unlocked',measurePage);
motionQuery.addEventListener('change',measurePage);

// Route fragment links into their horizontal panel, including deep links.
function routePanel(hash, smooth) {
  const id = hash.replace(/^#/,'');
  for (const state of sequences) {
    const index = state.slides.findIndex(slide => slide.id === id);
    if (index >= 0) {state.go(index,smooth);return true;}
  }
  return false;
}
document.addEventListener('click',event => {
  const link = event.target.closest('a[href^="#"]');
  if (link && !link.closest('.digital-pagination') && routePanel(link.hash,true)) event.preventDefault();
});
window.addEventListener('hashchange',() => routePanel(location.hash,false));
window.addEventListener('load',() => {measurePage();routePanel(location.hash,false);});
window.addEventListener('portfolio:unlocked',() => routePanel(location.hash,false));

document.querySelectorAll('[data-viewer-action]').forEach(button => button.addEventListener('click',() => {
  const action=button.dataset.viewerAction;
  if (action === 'info') {
    const help=document.querySelector('.viewer-help');
    help.hidden=!help.hidden;
    button.setAttribute('aria-expanded',String(!help.hidden));
  } else document.querySelector(action === 'previous' ? '#creative-case' : Math.random() < .5 ? '#enso-case':'#creative-case')?.scrollIntoView({block:'start',behavior:motionQuery.matches?'smooth':'auto'});
}));
const contact = document.querySelector('#contact');
const contactBrush = document.querySelector('.contact-brush');
if (contactBrush) {
  new IntersectionObserver(entries => entries.forEach(entry => contact.classList.toggle('is-visible',entry.isIntersecting)),{threshold:.35}).observe(contactBrush);
}
measurePage();
