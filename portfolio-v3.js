/* Progressive enhancement only: the complete story is present in the HTML.
 * A single flat frame list owns content, chapter labels and pagination.
 * Native document scrolling is never intercepted. */
(() => {
  'use strict';

  const deck = document.querySelector('#work-deck');
  if (!deck) return;
  const stage = deck.querySelector('#work-stage');
  const shell = deck.querySelector('.deck-shell');
  const frames = [...deck.querySelectorAll('[data-frame]')];
  const chapterLinks = [...deck.querySelectorAll('.chapter-nav a')];
  const counter = deck.querySelector('[data-frame-counter]');
  const status = deck.querySelector('[data-deck-status]');
  const previous = deck.querySelector('[data-step="-1"]');
  const next = deck.querySelector('[data-step="1"]');
  const hint = deck.querySelector('[data-scroll-hint]');
  const motionButton = deck.querySelector('[data-motion-toggle]');
  const desktop = matchMedia('(min-width: 1024px) and (min-height: 680px) and (prefers-reduced-motion: no-preference)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const pad = value => String(value).padStart(2, '0');
  let selected = -1;
  let pinned = false;
  let distance = 1;
  let origin = 0;
  let scrollFrame = 0;
  let resizeFrame = 0;
  let manualMotionPause = false;
  let hasNavigated = false;
  const pageNav = document.createElement('nav');
  pageNav.className = 'chapter-pages';
  pageNav.setAttribute('aria-label', 'Pages in this chapter');
  counter.after(pageNav);
  let pageChapter = '';

  function paintProgress(progress) {
    const position = pinned ? progress : Math.max(0, selected);
    frames.forEach((frame, i) => {
      frame.style.setProperty('--page-x', `${(i - position) * 100}%`);
    });
    deck.style.setProperty('--read-progress', String(position / (frames.length - 1)));
  }

  // Keep useful old deep links working after the shorter content model.
  const aliases = {
    '#work-viewer': 'systems-case', '#systems-overview': 'systems-case',
    '#systems-workflow': 'systems-ai', '#systems-pricing': 'systems-ai',
    '#systems-precheck': 'systems-quality', '#systems-resolve': 'systems-diagnosis',
    '#systems-improve': 'systems-visibility', '#space-overview': 'enso-case',
    '#space-build': 'space-plan', '#space-programmes': 'space-operation',
    '#space-outcomes': 'space-operation', '#flowers-overview': 'creative-case',
    '#flowers-wedding-production': 'flowers-delivery', '#flowers-wedding-motion': 'flowers-delivery',
    '#flowers-brief': 'flowers-process', '#flowers-budget': 'flowers-process',
    '#flowers-dior': 'flowers-commissions', '#flowers-lc': 'flowers-commissions',
    '#flowers-lane-crawford': 'flowers-commissions',
    '#flowers-senreve': 'flowers-commissions', '#flowers-farfetch': 'flowers-commissions'
  };

  const systemContext = {
    commerce: 'Adobe Commerce: the order, product and pricing information behind the storefront.',
    sap: 'SAP ERP: order processing, freight and invoice status used to validate an exception.',
    dynamics: 'Dynamics 365: customer and account context used to understand the order.',
    servicenow: 'ServiceNow: the incident evidence, escalation and resolution record shared with support teams.'
  };
  deck.querySelectorAll('[data-system]').forEach(button => {
    button.addEventListener('click', () => {
      deck.querySelectorAll('[data-system]').forEach(node => node.setAttribute('aria-pressed', String(node === button)));
      const context = deck.querySelector('#system-context');
      context.textContent = systemContext[button.dataset.system];
      context.dataset.activeSystem = button.dataset.system;
    });
  });

  // Galleries enhance existing figures, without rewriting content at runtime.
  const dialog = document.querySelector('#evidence-dialog');
  let zoomOrigin = null;
  if (dialog && typeof dialog.showModal === 'function') {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (zoomOrigin?.isConnected && !zoomOrigin.closest('[inert]')) zoomOrigin.focus({ preventScroll: true });
    });
  }

  document.querySelectorAll('[data-gallery]').forEach(gallery => {
    const figures = [...gallery.querySelectorAll(':scope > figure')];
    if (!figures.length) return;
    let active = 0;
    const controls = document.createElement('div');
    controls.className = 'gallery-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', `${gallery.getAttribute('aria-label')} controls`);
    const back = document.createElement('button');
    const forward = document.createElement('button');
    const count = document.createElement('span');
    back.type = forward.type = 'button';
    back.textContent = '←';
    forward.textContent = '→';
    back.setAttribute('aria-label', 'Previous evidence');
    forward.setAttribute('aria-label', 'Next evidence');
    count.className = 'gallery-count';
    count.setAttribute('aria-live', 'polite');
    count.setAttribute('aria-atomic', 'true');
    controls.append(back, count, forward);
    const enlarge = document.createElement('button');
    enlarge.type = 'button';
    enlarge.className = 'gallery-enlarge';
    enlarge.textContent = '+';
    enlarge.setAttribute('aria-label', 'Enlarge current evidence image');
    if (dialog && typeof dialog.showModal === 'function') {
      controls.append(enlarge);
      enlarge.addEventListener('click', () => {
        const image = figures[active].querySelector('img');
        if (!image) return;
        zoomOrigin = enlarge;
        const target = dialog.querySelector('img');
        target.src = image.currentSrc || image.src;
        target.alt = image.alt;
        dialog.querySelector('#evidence-caption').textContent = figures[active].querySelector('figcaption')?.textContent || image.alt;
        dialog.showModal();
      });
    }
    function show(index) {
      active = clamp(index, 0, figures.length - 1);
      figures.forEach((figure, i) => {
        if (i !== active) figure.querySelectorAll('video').forEach(video => video.pause());
        figure.hidden = i !== active;
      });
      count.textContent = `${pad(active + 1)} / ${pad(figures.length)}`;
      back.disabled = active === 0;
      forward.disabled = active === figures.length - 1;
      back.hidden = forward.hidden = figures.length < 2;
      enlarge.hidden = !figures[active].querySelector('img');
      scheduleMeasure();
    }
    back.addEventListener('click', () => show(active - 1));
    forward.addEventListener('click', () => show(active + 1));
    gallery.addEventListener('keydown', event => {
      // Native video controls own their keyboard interactions.
      if (event.target.closest('video')) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      event.stopPropagation();
      show(active + (event.key === 'ArrowRight' ? 1 : -1));
    });
    gallery.append(controls);
    gallery.classList.add('gallery-ready');
    show(0);
  });

  function mark(index, force = false) {
    if (selected === index && !force) return;
    const oldIndex = selected;
    selected = index;
    const current = frames[index];
    const chapter = current.dataset.chapter;
    const siblings = frames.filter(frame => frame.dataset.chapter === chapter);
    const page = siblings.indexOf(current) + 1;
    stage.style.setProperty('--enter-x', index < oldIndex ? '-22px' : '22px');
    frames.forEach((frame, i) => {
      frame.classList.toggle('is-current', i === index);
      frame.inert = i !== index;
      if (i !== index) frame.setAttribute('aria-hidden', 'true');
      else frame.removeAttribute('aria-hidden');
      if (pinned && i !== index) frame.querySelectorAll('video').forEach(video => video.pause());
    });
    chapterLinks.forEach(link => {
      if (link.dataset.chapter === chapter) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    counter.replaceChildren(document.createTextNode(chapter));
    const numbers = document.createElement('span');
    numbers.textContent = `${pad(page)} / ${pad(siblings.length)}`;
    counter.append(numbers);
    if (pageChapter !== chapter) {
      pageChapter = chapter;
      pageNav.replaceChildren(...siblings.map((frame, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = pad(i + 1);
        button.dataset.page = frame.id;
        button.setAttribute('aria-label', `${chapter} ${i + 1}: ${frame.querySelector('h3').textContent}`);
        button.addEventListener('click', () => go(frames.indexOf(frame)));
        return button;
      }));
    }
    pageNav.querySelectorAll('button').forEach(button => {
      if (button.dataset.page === current.id) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    previous.disabled = index === 0;
    next.setAttribute('aria-label', index === frames.length - 1 ? 'Continue to The thread' : 'Next work page');
    hint.hidden = hasNavigated || !pinned;
    if (pinned && document.activeElement?.closest('.work-frame[inert]')) stage.focus({ preventScroll: true });
  }

  function update() {
    scrollFrame = 0;
    const bounds = deck.getBoundingClientRect();
    deck.classList.toggle('deck-offscreen', bounds.bottom < 0 || bounds.top > innerHeight);
    let index;
    const progress = pinned ? clamp((scrollY - origin) / distance, 0, frames.length - 1) : Math.max(0, selected);
    paintProgress(progress);
    if (pinned) index = Math.round(progress);
    else index = Math.max(0, selected);
    if (index > 0) hasNavigated = true;
    mark(index);
    if (bounds.bottom < 0 || bounds.top > innerHeight) deck.querySelectorAll('video').forEach(video => { if (!video.paused) video.pause(); });
  }

  function scheduleUpdate() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(update);
  }

  function measure(preserve = true) {
    resizeFrame = 0;
    const before = deck.getBoundingClientRect();
    const oldHeight = deck.offsetHeight;
    const wasPinned = pinned && before.top <= 90 && before.bottom >= innerHeight - 20;
    const wasAfter = before.bottom < 0;
    const index = Math.max(0, selected);
    const readingProgress = pinned ? clamp((scrollY - origin) / distance, 0, frames.length - 1) : index;
    const wasReading = before.top < innerHeight * .38 && before.bottom > innerHeight * .38;
    const oldMode = pinned;
    pinned = desktop.matches;
    deck.classList.toggle('is-deck', pinned);
    deck.style.removeProperty('height');

    if (pinned) {
      // Zoom, translated text and small laptop heights must never clip the copy.
      const fits = frames.every(frame => {
        const style = getComputedStyle(frame);
        const available = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        return [...frame.children].every(child => Math.max(child.scrollHeight, child.getBoundingClientRect().height) <= available + 2);
      });
      if (!fits) {
        pinned = false;
        deck.classList.remove('is-deck');
      }
    }
    if (pinned) {
      distance = Math.max(560, innerHeight * .88);
      deck.style.height = `${shell.offsetHeight + (frames.length - 1) * distance}px`;
      origin = deck.getBoundingClientRect().top + scrollY - 86;
    }
    mark(index, true);
    paintProgress(pinned ? readingProgress : index);
    if (preserve && (wasPinned || (oldMode !== pinned && wasReading))) {
      if (pinned) window.scrollTo({ top: origin + readingProgress * distance, behavior: 'instant' });
      else frames[index].scrollIntoView({ block: 'start', behavior: 'instant' });
    } else if (preserve && wasAfter) {
      window.scrollBy({ top: deck.offsetHeight - oldHeight, behavior: 'instant' });
    }
    scheduleUpdate();
  }

  function scheduleMeasure() {
    if (!resizeFrame) resizeFrame = requestAnimationFrame(() => measure());
  }

  function rememberFrame(hash) {
    if (location.hash === hash) return;
    // Preview hosts can inject a cross-origin <base>. History must stay on
    // the actual page URL, including the preview host's query string.
    const url = new URL(location.href);
    url.hash = hash;
    history.pushState(null, '', url.href);
  }

  function go(index, { remember = true, announce = true, animate = true } = {}) {
    if (index >= frames.length) {
      const thread = document.querySelector('#thread');
      thread.scrollIntoView({ block: 'start', behavior: 'instant' });
      thread.setAttribute('tabindex', '-1');
      thread.focus({ preventScroll: true });
      if (remember) rememberFrame('#thread');
      return;
    }
    index = clamp(index, 0, frames.length - 1);
    hasNavigated = true;
    const frame = frames[index];
    if (pinned) window.scrollTo({ top: origin + index * distance, behavior: animate && !reducedMotion.matches && !manualMotionPause ? 'smooth' : 'instant' });
    else {
      mark(index, true);
      shell.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    mark(index, true);
    if (remember) rememberFrame(`#${frame.id}`);
    if (announce) {
      const heading = frame.querySelector('h3');
      const words = [...heading.childNodes].map(node => node.nodeName === 'BR' ? ' ' : node.textContent).join('');
      status.textContent = `${counter.textContent}: ${words}`;
    }
    scheduleUpdate();
  }

  function route(hash, options) {
    let id;
    try { id = aliases[hash] || decodeURIComponent(hash.slice(1)); } catch { return false; }
    const index = frames.findIndex(frame => frame.id === id);
    if (index < 0) return false;
    go(index, options);
    return true;
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    let hash = href;
    if (!href.startsWith('#')) {
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
      hash = url.hash;
    }
    if (route(hash)) event.preventDefault();
  });
  previous.addEventListener('click', () => go(selected - 1));
  next.addEventListener('click', () => go(selected + 1));
  stage.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.target.closest('button, a, video, input, select, textarea, summary, [contenteditable]')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      go(selected + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });

  function syncMotion() {
    const paused = manualMotionPause || reducedMotion.matches;
    document.body.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
    motionButton.hidden = reducedMotion.matches;
  }
  motionButton.addEventListener('click', () => { manualMotionPause = !manualMotionPause; syncMotion(); });
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('page-away', document.hidden);
    if (document.hidden) document.querySelectorAll('video').forEach(video => video.pause());
  });
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (!entry.isIntersecting) entry.target.pause(); });
    }, { threshold: 0 });
    document.querySelectorAll('video').forEach(video => videoObserver.observe(video));
  }
  desktop.addEventListener('change', scheduleMeasure);
  reducedMotion.addEventListener('change', syncMotion);
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('hashchange', () => route(location.hash, { remember: false, animate: false }));
  window.addEventListener('popstate', () => route(location.hash, { remember: false, animate: false }));
  deck.addEventListener('load', scheduleMeasure, true);
  deck.querySelector('.page-controls').hidden = false;
  deck.classList.add('is-enhanced', 'is-paged');
  syncMotion();
  measure(false);
  requestAnimationFrame(() => route(location.hash, { remember: false, announce: false, animate: false }));
})();
