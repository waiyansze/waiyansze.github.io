/* Wai — portfolio · preview/editorial-deck
   One script, no dependencies. The document always owns scrolling:
   nothing here intercepts the wheel or traps scroll inside the page.

   1 Helpers · 2 Unit grids · 3 Justified image rows · 4 Compare tabs
   5 System map · 6 Lightbox · 7 Video · 8 Deck · 9 Anchor links · 10 Header */
(() => {
  'use strict';

  /* 1 · Helpers ------------------------------------------------------------ */
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pad = n => String(n).padStart(2, '0');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const replaceHash = hash => { try { history.replaceState(null, '', hash); } catch (e) { /* sandboxed previews */ } };

  /* 2 · Unit grids: one square per order, so the proportion is literal. ---- */
  document.querySelectorAll('[data-units]').forEach(el => {
    const total = Number(el.dataset.units);
    const mark = Number(el.dataset.mark || 0);
    const fill = Number(el.dataset.fill || 0);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < total; i++) {
      const unit = document.createElement('i');
      if (i < mark) unit.className = 'is-mark';
      else if (i < fill) unit.className = 'is-fill';
      frag.append(unit);
    }
    el.append(frag);
  });

  /* 3 · Justified rows: widths follow each image's aspect ratio, so a row
         shares one height and no evidence image is cropped. -------------- */
  document.querySelectorAll('.pair, .compare-panel').forEach(row => {
    let sum = 0, inverse = 0;
    row.querySelectorAll(':scope > figure').forEach(figure => {
      const media = figure.querySelector('img, video');
      const w = Number(media?.getAttribute('width')), h = Number(media?.getAttribute('height'));
      const ratio = w && h ? w / h : 1;
      figure.style.setProperty('--ar', ratio.toFixed(4));
      sum += ratio;
      inverse += 1 / ratio;
    });
    row.style.setProperty('--row-ar', sum.toFixed(4));
    row.style.setProperty('--col-ar', (1 / inverse).toFixed(4));
  });

  /* 4 · Compare tabs (proposal → delivered, design → built). -------------- */
  document.querySelectorAll('[data-compare]').forEach(box => {
    const tabs = [...box.querySelectorAll('[role="tab"]')];
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
    const select = (index, focus) => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
        if (!on) panels[i].querySelectorAll('video').forEach(v => v.pause());
      });
      if (focus) tabs[index].focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', event => {
        const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[event.key];
        if (to === undefined) return;
        event.preventDefault();
        select((to + tabs.length) % tabs.length, true);
      });
    });
    select(0);
  });

  /* 5 · System map: explains the environment; the case pages prove the work. */
  document.querySelectorAll('[data-sysmap]').forEach(map => {
    const nodes = [...map.querySelectorAll('[data-node]')];
    const details = [...map.querySelectorAll('[data-detail]')];
    const show = key => {
      nodes.forEach(node => node.setAttribute('aria-pressed', String(node.dataset.node === key)));
      details.forEach(detail => { detail.hidden = detail.dataset.detail !== key; });
    };
    nodes.forEach(node => node.addEventListener('click', () => show(node.dataset.node)));
    show('checks');
  });

  /* 6 · Lightbox: any image marked data-zoom can be enlarged. --------------- */
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', 'Enlarged image');
  dialog.innerHTML = '<div class="lightbox-inner"><button type="button" class="lightbox-close">Close <span aria-hidden="true">×</span></button><img alt=""><p></p></div>';
  document.body.append(dialog);
  const lightboxImage = dialog.querySelector('img');
  const lightboxText = dialog.querySelector('p');
  const lightboxClose = dialog.querySelector('.lightbox-close');
  let opener = null;
  lightboxClose.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target.classList.contains('lightbox-inner')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    root.style.removeProperty('overflow');
    opener?.focus({ preventScroll: true });
  });
  document.querySelectorAll('img[data-zoom]').forEach(img => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'zoom';
    button.setAttribute('aria-label', `Enlarge image: ${img.alt}`);
    img.replaceWith(button);
    button.append(img);
    button.addEventListener('click', () => {
      if (typeof dialog.showModal !== 'function') return;
      opener = button;
      lightboxImage.src = img.currentSrc || img.src;
      lightboxImage.alt = img.alt;
      lightboxText.textContent = img.closest('figure')?.querySelector('figcaption')?.textContent || img.alt;
      root.style.overflow = 'hidden';
      dialog.showModal();
      lightboxClose.focus();
    });
  });

  /* 7 · Video: never keeps playing out of sight. ---------------------------- */
  const videos = [...document.querySelectorAll('video')];
  if ('IntersectionObserver' in window) {
    const watch = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) entry.target.pause();
    }));
    videos.forEach(video => watch.observe(video));
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) videos.forEach(v => v.pause()); });

  /* 8 · Deck ----------------------------------------------------------------
     Pinned mode (wide and tall screens): the stage sticks, native scroll picks
     the page (one page per `step` pixels), and the change itself is a short
     timed transition. Swipe mode (everything else): native scroll-snap tracks. */
  const deck = document.querySelector('[data-deck]');
  let deckApi = null;
  if (deck) deckApi = initDeck(deck);

  function initDeck(deck) {
    const stage = deck.querySelector('.deck-stage');
    const viewport = deck.querySelector('[data-deck-viewport]');
    const pages = [];
    const chapters = [...deck.querySelectorAll('.chapter')].map((el, c) => {
      const list = [...el.querySelectorAll('.page')];
      const first = pages.length;
      list.forEach((page, local) => pages.push({ el: page, chapter: c, local, title: page.querySelector('h3')?.textContent.trim() || '' }));
      return {
        el, first, count: list.length,
        name: el.dataset.chapter, context: el.dataset.context,
        track: el.querySelector('[data-track]'),
        counter: el.querySelector('[data-track-count]'),
        prev: el.querySelector('[data-track-step="-1"]'),
        next: el.querySelector('[data-track-step="1"]')
      };
    });
    const tabs = [...deck.querySelectorAll('[data-deck-tab]')];
    const countEl = deck.querySelector('[data-deck-count]');
    const contextEl = deck.querySelector('[data-deck-context]');
    const hint = deck.querySelector('[data-deck-hint]');
    const live = deck.querySelector('[data-deck-live]');
    const prevButton = deck.querySelector('[data-deck-step="-1"]');
    const nextButton = deck.querySelector('[data-deck-step="1"]');
    const nextLabel = deck.querySelector('[data-deck-next-label]');
    const after = document.getElementById('digital-projects');
    const pinQuery = matchMedia('(min-width: 960px) and (min-height: 640px)');

    let pinned = false;
    let current = -1;
    let step = 600;
    let frame = 0;
    let leaving = null;
    let leaveTimer = 0;

    const stageTop = () => parseFloat(getComputedStyle(stage).top) || 0;
    const startY = () => deck.getBoundingClientRect().top + scrollY - stageTop();
    const targetY = index => Math.round(startY() + index * step + 2);
    const indexFromScroll = () => clamp(Math.floor((scrollY - startY()) / step), 0, pages.length - 1);
    const isStuck = () => pinned && Math.abs(stage.getBoundingClientRect().top - stageTop()) < 2;
    const runwayContains = y => y >= startY() - 1 && y <= startY() + pages.length * step;

    function setPage(index, animate = true) {
      if (index === current) return;
      const previous = current;
      current = index;
      const page = pages[index];

      pages.forEach((p, i) => {
        p.el.classList.toggle('is-active', i === index);
        p.el.classList.toggle('is-near', i !== index && Math.abs(i - index) <= 1);
        p.el.inert = pinned && i !== index;
        if (i !== index) {
          p.el.classList.remove('is-entering');
          p.el.querySelectorAll('video').forEach(v => v.pause());
        }
      });

      if (leaving) { leaving.classList.remove('is-leaving'); leaving = null; }
      if (pinned && previous >= 0 && animate && !reduceMotion.matches) {
        leaving = pages[previous].el;
        leaving.classList.add('is-leaving');
        clearTimeout(leaveTimer);
        leaveTimer = setTimeout(() => { leaving?.classList.remove('is-leaving'); leaving = null; }, 240);
        page.el.style.setProperty('--dir', index > previous ? '1' : '-1');
        page.el.classList.remove('is-entering');
        void page.el.offsetWidth; // restart the settle animation
        page.el.classList.add('is-entering');
      }

      // Keep keyboard focus inside the visible page.
      if (previous >= 0 && pages[previous].el.contains(document.activeElement)) viewport.focus({ preventScroll: true });

      const chapter = chapters[page.chapter];
      tabs.forEach((tab, c) => {
        if (c === page.chapter) tab.setAttribute('aria-current', 'true');
        else tab.removeAttribute('aria-current');
      });
      tabs[page.chapter]?.style.setProperty('--p', `${((page.local + 1) / chapter.count * 100).toFixed(1)}%`);
      countEl.textContent = `${pad(page.local + 1)} / ${pad(chapter.count)}`;
      contextEl.textContent = chapter.context;
      prevButton.disabled = index === 0;
      const last = index === pages.length - 1;
      nextLabel.textContent = last ? 'Digital projects' : '';
      nextButton.setAttribute('aria-label', last ? 'Continue to Digital projects' : 'Next page');
      if (previous >= 0) {
        hint.hidden = true; // the instruction is only needed once
        live.textContent = `${chapter.name}, ${page.local + 1} of ${chapter.count}: ${page.title}`;
      }
    }

    function go(index) {
      if (index >= pages.length) {
        const top = after.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(after).scrollMarginTop) || 0);
        window.scrollTo({ top, behavior: 'auto' });
        return;
      }
      index = clamp(index, 0, pages.length - 1);
      const page = pages[index];
      if (pinned) {
        window.scrollTo({ top: targetY(index), behavior: 'auto' });
        setPage(index);
      } else {
        const chapter = chapters[page.chapter];
        const top = chapter.el.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(chapter.el).scrollMarginTop) || 0);
        if (Math.abs(chapter.el.getBoundingClientRect().top) > innerHeight * .5) window.scrollTo({ top, behavior: 'auto' });
        scrollTrackTo(chapter, page.local, false);
      }
    }

    // Swipe mode: native horizontal tracks, one counter per chapter.
    function trackIndex(chapter) {
      const track = chapter.track;
      const first = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const width = first.getBoundingClientRect().width + gap;
      return clamp(Math.round(track.scrollLeft / width), 0, chapter.count - 1);
    }
    function scrollTrackTo(chapter, index, smooth = true) {
      const track = chapter.track;
      const target = track.children[clamp(index, 0, chapter.count - 1)];
      track.scrollTo({ left: target.offsetLeft - track.firstElementChild.offsetLeft, behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto' });
    }
    function updateTrack(chapter) {
      const index = trackIndex(chapter);
      chapter.counter.textContent = `${pad(index + 1)} / ${pad(chapter.count)}`;
      chapter.prev.disabled = index === 0;
      chapter.next.disabled = index === chapter.count - 1;
    }
    chapters.forEach(chapter => {
      let pending = 0;
      chapter.track.addEventListener('scroll', () => {
        if (pending || pinned) return;
        pending = requestAnimationFrame(() => { pending = 0; updateTrack(chapter); });
      }, { passive: true });
      chapter.prev.addEventListener('click', () => scrollTrackTo(chapter, trackIndex(chapter) - 1));
      chapter.next.addEventListener('click', () => scrollTrackTo(chapter, trackIndex(chapter) + 1));
    });

    function measure() {
      const keep = current;
      const keepPlace = pinned && keep >= 0 && runwayContains(scrollY);
      pinned = pinQuery.matches;
      root.classList.toggle('deck-pinned', pinned);
      if (!pinned) {
        deck.style.removeProperty('height');
        pages.forEach(p => { p.el.inert = false; p.el.classList.remove('is-active', 'is-near', 'is-leaving', 'is-entering'); });
        current = -1;
        chapters.forEach(updateTrack);
        return;
      }
      step = Math.round(clamp(innerHeight * .6, 380, 620));
      deck.style.height = `${stage.offsetHeight + pages.length * step}px`;
      if (keepPlace) window.scrollTo({ top: targetY(keep), behavior: 'auto' });
      current = -1;
      setPage(keepPlace ? keep : indexFromScroll(), false);
    }

    function onScroll() {
      if (frame || !pinned) return;
      frame = requestAnimationFrame(() => { frame = 0; setPage(indexFromScroll()); });
    }

    prevButton.addEventListener('click', () => go(current - 1));
    nextButton.addEventListener('click', () => go(current + 1));
    tabs.forEach((tab, c) => tab.addEventListener('click', event => {
      event.preventDefault();
      go(chapters[c].first);
    }));

    document.addEventListener('keydown', event => {
      if (!isStuck() || dialog.open || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.target.closest('input, textarea, select, video, [role="tab"], [contenteditable="true"]')) return;
      event.preventDefault();
      go(current + (event.key === 'ArrowRight' ? 1 : -1));
    });

    addEventListener('scroll', onScroll, { passive: true });
    let resizeFrame = 0;
    addEventListener('resize', () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(measure);
    });
    pinQuery.addEventListener('change', measure);
    addEventListener('load', measure);
    document.fonts?.ready.then(measure);
    measure();

    // Old links (from applications already sent) still land on the right page.
    const aliases = {
      'work-viewer': 'systems-overview', 'systems-case': 'systems-overview',
      'enso-case': 'space-overview', 'creative-case': 'flowers-overview',
      'space-build': 'space-plan', 'space-outcomes': 'space-programmes',
      'flowers-budget': 'flowers-brief', 'flowers-lane-crawford': 'flowers-senreve',
      'flowers-farfetch': 'flowers-dior', 'flowers-wedding-production': 'flowers-delivery',
      'flowers-wedding-motion': 'flowers-delivery'
    };
    const indexForHash = hash => {
      let id = '';
      try { id = decodeURIComponent(String(hash).replace(/^#/, '')); } catch (e) { return -1; }
      id = aliases[id] || id;
      return pages.findIndex(p => p.el.id === id);
    };
    const route = hash => {
      const index = indexForHash(hash);
      if (index < 0) return false;
      go(index);
      return true;
    };
    return { route, isPinned: () => pinned, runway: () => [startY(), startY() + pages.length * step] };
  }

  /* 9 · Anchor links --------------------------------------------------------
     Deck targets route to their page. Other jumps are smooth when short and
     instant when they would otherwise flick through every page of the deck. */
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const hash = link.getAttribute('href');
    if (deckApi && deckApi.route(hash)) {
      event.preventDefault();
      replaceHash(hash);
      return;
    }
    const target = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
    if (!target) return;
    event.preventDefault();
    const top = target.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
    let crossesDeck = false;
    if (deckApi && deckApi.isPinned()) {
      const [a, b] = deckApi.runway();
      crossesDeck = Math.min(scrollY, top) < b && Math.max(scrollY, top) > a;
    }
    const smooth = !reduceMotion.matches && !crossesDeck && Math.abs(top - scrollY) < innerHeight * 3;
    window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    replaceHash(hash);
  });
  addEventListener('hashchange', () => { deckApi?.route(location.hash); });
  if (location.hash) addEventListener('load', () => { deckApi?.route(location.hash); }, { once: true });

  /* 10 · Header ------------------------------------------------------------- */
  const header = document.querySelector('.site-header');
  const updateHeader = () => header?.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
})();
