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
    if (!document.querySelector('dialog.more[open]')) root.style.removeProperty('overflow');
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
    const indexNav = deck.querySelector('[data-deck-index]');
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
    let measured = false;
    let lastSwipe = -1; // page being read in swipe mode, kept up to date while scrolling
    let indexChapter = -1;
    let indexButtons = [];

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
      if (indexChapter !== page.chapter) {
        indexChapter = page.chapter;
        indexButtons = [...chapter.el.querySelectorAll('.page')].map((el, i) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = el.dataset.short || pad(i + 1);
          button.setAttribute('aria-label', `${chapter.name} page ${i + 1} of ${chapter.count}: ${el.dataset.short || ''}`);
          button.addEventListener('click', () => go(chapter.first + i));
          return button;
        });
        const extra = [];
        if (chapter.el.dataset.more) {
          const more = document.createElement('button');
          more.type = 'button';
          more.className = 'index-more';
          more.textContent = '+ More';
          more.setAttribute('aria-label', `More detail from ${chapter.name}`);
          more.addEventListener('click', () => openMore(chapter.el.dataset.more, more));
          extra.push(more);
        }
        indexNav.replaceChildren(...indexButtons, ...extra);
        indexNav.setAttribute('aria-label', `${chapter.name} pages`);
      }
      indexButtons.forEach((button, i) => {
        if (i === page.local) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
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
      const reading = swipePosition();
      if (reading >= 0) lastSwipe = reading;
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

    // Which page is the reader on in swipe mode? The chapter crossing the
    // upper-middle of the viewport, at its current horizontal position.
    function swipePosition() {
      for (const chapter of chapters) {
        const r = chapter.el.getBoundingClientRect();
        if (r.top < innerHeight * .6 && r.bottom > innerHeight * .2) return chapter.first + trackIndex(chapter);
      }
      return -1;
    }

    function measure() {
      const wasPinned = pinned;
      // Remember the page being read before the layout changes, in either mode.
      let keep = -1;
      if (wasPinned) keep = current >= 0 && runwayContains(scrollY) ? current : -1;
      else if (measured) keep = lastSwipe;
      pinned = pinQuery.matches;
      root.classList.toggle('deck-pinned', pinned);
      if (!pinned) {
        deck.style.removeProperty('height');
        pages.forEach(p => { p.el.inert = false; p.el.classList.remove('is-active', 'is-near', 'is-leaving', 'is-entering'); });
        current = -1;
        if (wasPinned && keep >= 0) {
          const chapter = chapters[pages[keep].chapter];
          const top = chapter.el.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(chapter.el).scrollMarginTop) || 0);
          window.scrollTo({ top, behavior: 'auto' });
          scrollTrackTo(chapter, pages[keep].local, false);
        }
        chapters.forEach(updateTrack);
        measured = true;
        return;
      }
      // About 0.45 of the viewport per page: one short trackpad swipe, a few wheel notches.
      step = Math.round(clamp(innerHeight * .45, 320, 460));
      deck.style.height = `${stage.offsetHeight + pages.length * step}px`;
      if (keep >= 0) window.scrollTo({ top: targetY(keep), behavior: 'auto' });
      current = -1;
      setPage(keep >= 0 ? keep : indexFromScroll(), false);
      measured = true;
    }

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (pinned) setPage(indexFromScroll());
        else if (measured) lastSwipe = swipePosition();
      });
    }

    prevButton.addEventListener('click', () => go(current - 1));
    nextButton.addEventListener('click', () => go(current + 1));
    tabs.forEach((tab, c) => tab.addEventListener('click', event => {
      event.preventDefault();
      go(chapters[c].first);
    }));

    document.addEventListener('keydown', event => {
      // Only when focus is already inside the deck (e.g. after using its buttons),
      // so arrow keys are never taken over elsewhere on the page.
      if (!isStuck() || !deck.contains(document.activeElement) || dialog.open || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
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
      'work-viewer': 'freight-case', 'systems-case': 'freight-case',
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
      if (index < 0) return routeMore(hash);
      go(index);
      return true;
    };
    return { route, isPinned: () => pinned, stuck: isStuck, runway: () => [startY(), startY() + pages.length * step] };
  }

  /* 8b · Case detail -------------------------------------------------------
     Each case shows three pages in the deck; the other two open in a sheet,
     so the main scroll stays short and the detail is still one click away. */
  let moreOpener = null;
  function openMore(id, opener, target) {
    const sheet = document.getElementById(id);
    if (!sheet || typeof sheet.showModal !== 'function') return false;
    moreOpener = opener || document.activeElement;
    root.style.overflow = 'hidden';
    if (!sheet.open) sheet.showModal();
    const inner = sheet.querySelector('.more-inner');
    if (target) inner.scrollTop = target.offsetTop - inner.offsetTop - 12;
    else inner.scrollTop = 0;
    sheet.querySelector('[data-more-close]').focus({ preventScroll: true });
    return true;
  }
  function routeMore(hash) {
    let id = '';
    try { id = decodeURIComponent(String(hash).replace(/^#/, '')); } catch (e) { return false; }
    const aliases = { 'space-outcomes': 'space-programmes', 'flowers-farfetch': 'flowers-dior', 'flowers-wedding-production': 'flowers-delivery', 'flowers-wedding-motion': 'flowers-delivery' };
    const target = id && document.getElementById(aliases[id] || id);
    const sheet = target?.closest('dialog.more');
    if (!sheet) return false;
    if (sheet.dataset.return) deckApi?.route('#' + sheet.dataset.return);
    return openMore(sheet.id, null, target);
  }
  document.querySelectorAll('dialog.more').forEach(sheet => {
    sheet.querySelector('[data-more-close]').addEventListener('click', () => sheet.close());
    sheet.addEventListener('click', event => { if (event.target === sheet) sheet.close(); });
    sheet.addEventListener('close', () => {
      sheet.querySelectorAll('video').forEach(v => v.pause());
      root.style.removeProperty('overflow');
      if (moreOpener && document.contains(moreOpener)) moreOpener.focus({ preventScroll: true });
      moreOpener = null;
    });
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-more-open]');
    if (button) openMore(button.dataset.moreOpen, button);
  });

  /* 9 · Anchor links --------------------------------------------------------
     Deck targets route to their page. Other jumps are smooth when short and
     instant when they would otherwise flick through every page of the deck. */
  const jumpTo = (target, hash) => {
    const top = target.id === 'top' ? 0 : target.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
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
  };
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
    jumpTo(target, hash);
  });
  /* Selected work opener: the title settles in when it fills the screen; three
     seconds later, once only, the page glides on to the first chapter. Any wheel,
     touch, key or click cancels it, and reduced motion never moves the page. */
  const workIntro = document.querySelector('[data-work-intro]');
  const workDeck = document.getElementById('work-viewer');
  if (workIntro && workDeck && 'IntersectionObserver' in window) {
    const COUNT = 3000, SETTLE = 2700;
    let countTimer = 0, autoDone = !!location.hash;
    workIntro.classList.add('is-ready');
    const deckTop = () => deckApi && deckApi.isPinned()
      ? deckApi.runway()[0] + 2
      : workDeck.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(workDeck).scrollMarginTop) || 0);
    const cancel = () => {
      clearTimeout(countTimer); countTimer = 0;
      workIntro.classList.remove('is-counting');
      autoDone = true;
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(t => removeEventListener(t, cancel, true));
    };
    const start = () => {
      if (autoDone || reduceMotion.matches) return;
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(t => addEventListener(t, cancel, { capture: true, passive: true }));
      countTimer = setTimeout(() => {
        workIntro.style.setProperty('--count', COUNT + 'ms');
        workIntro.classList.add('is-counting');
        countTimer = setTimeout(() => {
          const top = deckTop();
          cancel();
          if (Math.abs(top - scrollY) > 4) window.scrollTo({ top, behavior: 'smooth' });
        }, COUNT);
      }, SETTLE);
    };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio >= .6) {
        workIntro.classList.add('is-in');
        if (!countTimer) start();
      } else if (countTimer) cancel();   // scrolled away before it moved on: stay put from now on
    }, { threshold: [0, .6] }).observe(workIntro);
  }

  addEventListener('hashchange', () => { deckApi?.route(location.hash); });
  if (location.hash) addEventListener('load', () => { deckApi?.route(location.hash); }, { once: true });

  /* 10 · Page nav -------------------------------------------------------------
     A quiet way back up: "back to the previous section" and "top". It stays
     out of the way until the reader is past the hero, hides while the deck is
     pinned (the deck has its own index), and on narrow screens only shows when
     the reader scrolls up or reaches the end, so it never sits on the text. */
  const pageNav = document.querySelector('[data-page-nav]');
  if (pageNav) {
    const prevButton = pageNav.querySelector('[data-page-prev]');
    const prevName = pageNav.querySelector('[data-page-prev-name]');
    const topButton = pageNav.querySelector('[data-page-top]');
    const sections = [['top', 'Intro'], ['work', 'Selected work'], ['digital-projects', 'Digital projects'], ['thread', 'The thread'], ['contact', 'Contact']]
      .map(([id, name]) => ({ el: document.getElementById(id), name })).filter(x => x.el);
    const narrow = matchMedia('(max-width: 699px)');
    let lastY = scrollY, upward = false, queued = false, previous = null;
    const currentIndex = () => {
      const line = scrollY + innerHeight * .35;
      let index = 0;
      sections.forEach((x, i) => { if (i && x.el.getBoundingClientRect().top + scrollY <= line) index = i; });
      return index;
    };
    const update = () => {
      queued = false;
      if (Math.abs(scrollY - lastY) > 8) { upward = scrollY < lastY; lastY = scrollY; }
      const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 96;
      // At the very end the last section may be too short to reach the reading line.
      const last = sections[sections.length - 1].el.getBoundingClientRect().top;
      const index = atEnd && last < innerHeight * .8 ? sections.length - 1 : currentIndex();
      previous = index >= 2 ? sections[index - 1] : null;
      prevButton.hidden = !previous;
      if (previous) prevName.textContent = previous.name;
      const show = scrollY > innerHeight * .9 && !(deckApi && deckApi.stuck()) &&
        (!narrow.matches || upward || atEnd || pageNav.contains(document.activeElement));
      pageNav.classList.toggle('is-visible', show);
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    prevButton.addEventListener('click', () => { if (previous) jumpTo(previous.el, '#' + previous.el.id); });
    topButton.addEventListener('click', () => jumpTo(sections[0].el, '#top'));
    update();
  }

  /* Digital index: marks the project currently beside the sticky title. */
  const digitalLinks = [...document.querySelectorAll('[data-digital-link]')];
  if (digitalLinks.length && 'IntersectionObserver' in window) {
    const targets = digitalLinks.map(link => document.querySelector(link.getAttribute('href')));
    const seen = new Map();
    const mark = () => {
      let best = -1, bestTop = Infinity;
      targets.forEach((t, i) => { const r = t.getBoundingClientRect(); if (seen.get(t) && Math.abs(r.top - innerHeight * .3) < bestTop) { bestTop = Math.abs(r.top - innerHeight * .3); best = i; } });
      digitalLinks.forEach((link, i) => { if (i === best) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current'); });
    };
    const io = new IntersectionObserver(entries => { entries.forEach(e => seen.set(e.target, e.isIntersecting)); mark(); }, { rootMargin: '-20% 0px -40% 0px' });
    targets.forEach(t => io.observe(t));
  }

  /* 11 · Hero motion ---------------------------------------------------------
     Twelve strokes in every state, in the site's order: Systems, Space, Flowers.
     Systems is drawn flat: Adobe Commerce is the large black disc, the other
     systems are grey discs joined by hairlines. SAP traffic passes my check,
     and the Copilot agent's price drafts wait for review before they go in. The
     lines then morph into the Ensō House plan, and the arrangement is built
     up the way it is made: basin, kenzan, shin, soe, hikae, then details.
     The cinnabar seal sits where the judgement happens in each. */
  const motion = document.querySelector('[data-motion]');
  if (motion) initMotion(motion);

  function initMotion(figure) {
    const canvas = figure.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const hero = figure.closest('.hero') || document;
    const stepButtons = [...hero.querySelectorAll('[data-motion-step]')];
    const pauseButton = hero.querySelector('[data-motion-pause]');
    const notesBox = figure.querySelector('[data-motion-notes]');
    const linesBox = figure.querySelector('[data-motion-lines]');
    const notesList = figure.querySelector('[data-motion-notes-list]');
    const focusBox = figure.querySelector('[data-motion-focus]');
    const text = figure.querySelector('[data-motion-text]');
    const link = figure.querySelector('[data-motion-link]');
    const N = 80;
    const css = getComputedStyle(document.documentElement);
    const INK = css.getPropertyValue('--ink').trim() || '#1c1f1c';
    const WASH = css.getPropertyValue('--wash').trim() || '#3f6b69';
    const SEAL = css.getPropertyValue('--seal').trim() || '#a93a2c';
    const INK3 = css.getPropertyValue('--ink-3').trim() || '#5f645d';
    const PAPER = css.getPropertyValue('--paper').trim() || '#ffffff';

    // Geometry helpers in a 100 × 100 space.
    const line = (a, b) => [a, b];
    const quad = (p0, c, p1, n = 24) => Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n, u = 1 - t;
      return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
    });
    const arc = (cx, cy, r, a0, a1, n = 32) => Array.from({ length: n + 1 }, (_, i) => {
      const a = a0 + (a1 - a0) * i / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    });
    const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
    const rrect = (cx, cy, w, h, r) => {
      const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
      return [...arc(x1 - r, y0 + r, r, -Math.PI / 2, 0, 6), ...arc(x1 - r, y1 - r, r, 0, Math.PI / 2, 6),
        ...arc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, 6), ...arc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, 6), [x1 - r, y0]];
    };
    const resample = pts => {
      const d = [0];
      for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const total = d[d.length - 1] || 1, out = [];
      for (let k = 0, j = 0; k < N; k++) {
        const target = total * k / (N - 1);
        while (j < d.length - 2 && d[j + 1] < target) j++;
        const seg = (d[j + 1] - d[j]) || 1, t = (target - d[j]) / seg;
        out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t]);
      }
      return out;
    };

    const spiral = (cx, cy, r, turns = 2.3, n = 60) => Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n, a = t * turns * Math.PI * 2 - Math.PI / 2, rr = r * (1 - .82 * t);
      return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    });
    const ellipse = (cx, cy, rx, ry, n = 48) => Array.from({ length: n + 1 }, (_, i) => {
      const a = i / n * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    });
    const zigzag = (x0, x1, y0, y1, steps) => {
      const pts = []; for (let i = 0; i <= steps; i++) { const x = x0 + (x1 - x0) * i / steps; pts.push(i % 2 ? [x, y1] : [x, y0], i % 2 ? [x, y0] : [x, y1]); } return pts;
    };
    // Twelve strokes in every state, so each line always has somewhere to go.
    // Order follows the site: Systems (now) → Space → Flowers.
    const BASE = [46, 69];
    const dir = (deg, len) => [BASE[0] + len * Math.sin(deg * Math.PI / 180), BASE[1] - len * Math.cos(deg * Math.PI / 180)];
    const kenzan = [[41, 72.4], [41, 70.4], [51, 70.4], [51, 72.4], [41, 72.4], [41, 70.4], ...zigzag(41.8, 50.2, 68.6, 70.4, 8)];
    // Systems geometry. Dynamics, SAP and ServiceNow sit on one ring around
    // Adobe Commerce: they also talk to each other directly. The Copilot agent
    // (mine) sits outside the ring and connects only to Adobe Commerce.
    const RING = 36, HUB_R = 15, SYS = {
      cop: [86, 15, 6.5],
      dyn: [50 + RING * Math.cos(200 * Math.PI / 180), 50 + RING * Math.sin(200 * Math.PI / 180), 9.5],
      sap: [50 + RING * Math.cos(20 * Math.PI / 180), 50 + RING * Math.sin(20 * Math.PI / 180), 10],
      sn: [50 + RING * Math.cos(115 * Math.PI / 180), 50 + RING * Math.sin(115 * Math.PI / 180), 6.5]
    };
    // A hairline from a disc's edge to the edge of the Adobe Commerce disc.
    const hair = ([x, y, r]) => {
      const dx = 50 - x, dy = 50 - y, d = Math.hypot(dx, dy);
      return [[x + dx / d * r, y + dy / d * r], [50 - dx / d * HUB_R, 50 - dy / d * HUB_R]];
    };
    // An arc of the ring between two discs, trimmed at their edges (angles in degrees).
    const deg = Math.PI / 180;
    const ringArc = (a0, r0, a1, r1) => arc(50, 50, RING, a0 * deg + r0 / RING, a1 * deg - r1 / RING, 40);
    const PEER = [ringArc(200, SYS.dyn[2], 380, SYS.sap[2]), ringArc(20, SYS.sap[2], 115, SYS.sn[2]), ringArc(115, SYS.sn[2], 200, SYS.dyn[2])];
    const mid = ([a, b]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const states = [
      { // Systems, drawn flat: Adobe Commerce is the large black disc everything
        // radiates from; the other systems are solid grey discs of different sizes,
        // joined by hairlines. Seal red is the only colour: my check and my agent.
        strokes: [
          ellipse(50, 50, HUB_R, HUB_R),                                               // Adobe Commerce
          ellipse(SYS.cop[0], SYS.cop[1], SYS.cop[2], SYS.cop[2]),                     // Copilot agent
          ellipse(SYS.dyn[0], SYS.dyn[1], SYS.dyn[2], SYS.dyn[2]),                     // Dynamics 365
          ellipse(SYS.sap[0], SYS.sap[1], SYS.sap[2], SYS.sap[2]),                     // SAP ERP
          ellipse(SYS.sn[0], SYS.sn[1], SYS.sn[2], SYS.sn[2]),                         // ServiceNow
          hair(SYS.cop), hair(SYS.dyn), hair(SYS.sap), hair(SYS.sn),                   // into Adobe Commerce
          ...PEER                                                                      // and to each other
        ],
        build: [[.14, .3], [.56, .66], [.36, .48], [.42, .54], [.5, .6], [.3, .5], [.22, .42], [.26, .46], [.34, .54], [.6, .8], [.64, .84], [.68, .88]],
        buildTime: 2800,
        discs: [[50, 50, HUB_R, '#1c1f1c', 0], [...SYS.cop, '#8e928d', 1], [...SYS.dyn, '#dcdedb', 2], [...SYS.sap, '#4a4e4a', 3], [...SYS.sn, '#b6b9b5', 4]],
        inkLabels: true,
        seal: mid(hair(SYS.sap)),                                                      // my check, on the way in from SAP
        marks: [[SYS.cop[0] + 4.6, SYS.cop[1] - 4.6]],                                     // the agent is mine
        notes: [
          { at: [50 + RING * Math.cos(245 * deg), 50 + RING * Math.sin(245 * deg)], side: 'left', y: 34, title: 'Connected', text: 'The systems also talk to each other, not only through Adobe Commerce.' },
          { at: [86, 15], fs: 20, side: 'right', y: 20, mine: true, title: 'My agent', text: 'A Copilot agent I built. Nothing goes in without my approval.' },
          { at: mid(hair(SYS.sap)), side: 'right', y: 35, mine: true, title: 'My check', text: 'About 1 in 10 orders corrected before processing.' }
        ],
        // Pointing at a system brings forward what it is linked to (stroke indices
        // as above: discs 0–4, hairlines 5–8, ring arcs 9–11) and its note, if any.
        nodes: [
          { at: [50, 50], r: HUB_R, keep: [0, 1, 2, 3, 4, 5, 6, 7, 8], note: -1, label: 'Adobe Commerce · linked to all four' },
          { at: SYS.cop, r: SYS.cop[2], keep: [0, 1, 5], note: 1, label: 'Into Adobe Commerce, after my approval' },
          { at: SYS.dyn, r: SYS.dyn[2], keep: [0, 2, 3, 4, 6, 9, 11], note: 0, label: 'Dynamics 365 · Adobe Commerce, SAP, ServiceNow' },
          { at: SYS.sap, r: SYS.sap[2], self: 3, below: true, keep: [0, 2, 3, 4, 7, 9, 10], note: 2, label: 'SAP ERP · Adobe Commerce, Dynamics, ServiceNow' },
          { at: SYS.sn, r: SYS.sn[2], self: 4, below: true, keep: [0, 2, 3, 4, 8, 10, 11], note: 0, label: 'ServiceNow · Adobe Commerce, Dynamics, SAP' }
        ],
        labels: [['Adobe Commerce', 50, 50.4, 0, 0, 1], ['Copilot agent', SYS.cop[0], SYS.cop[1] + 10.5, 0, 1], ['Dynamics 365', SYS.dyn[0], SYS.dyn[1] + 13.5, 0, 2],
          ['SAP ERP', SYS.sap[0], SYS.sap[1] + 14, 0, 3], ['ServiceNow', SYS.sn[0], SYS.sn[1] + 10.5, 0, 4]],
        hold: 6200, text: 'Orders and pricing moving through connected systems.', href: '#systems-case', flow: true
      },
      { // Space: Ensō House ground floor, from Wai's own plan, with the track lighting.
        strokes: [
          [[80.9, 81.2], [72, 81.2], [72, 80.5], [69.9, 80.5], [69.9, 79.1], [33.5, 79.1], [33.5, 80.5], [12, 80.5], [12, 22], [88, 22], [88, 81.2], [84, 81.2], [84, 87.4], ...arc(84, 81.2, 6.2, Math.PI / 2, Math.PI, 10)],
          [[12, 41.6], [30, 41.6], [30, 57.6], [12, 57.6]],                            // stair and WC core
          zigzag(21.5, 29, 45, 54.2, 4),                                               // stair treads
          [[72, 81.2], [72, 56], [88, 56]],                                            // entrance stair hall
          [[88, 39.4], [72, 39.4], [72, 54.4], [88, 54.4]],                            // side room
          zigzag(74.5, 85.5, 59, 76.5, 5),                                             // entrance stair treads
          rect(35.5, 37.2, 37.8, 41.8),                                                // columns
          rect(61.6, 36.6, 63.9, 41.8),
          rect(35.5, 58, 37.8, 63.2),
          rect(61.6, 58, 63.9, 62.6),
          rect(22, 26, 69, 33.5),                                                      // lighting track
          rect(27, 65.5, 66, 74)                                                       // lighting track
        ],
        seal: [80, 76.5],
        labels: [],
        notes: [
          { at: [12, 30], side: 'left', y: 30, title: 'The room', text: '3,000 sq ft creative space next to Tate Modern.' },
          { at: [36.6, 60.6], side: 'left', y: 50, title: 'Then', text: '50+ programmes in 15 months.' },
          { at: [80, 76.5], side: 'right', y: 46, mine: true, title: 'Idea to opening', text: '3.5 months, within the agreed budget.' }
        ],
        hold: 3800, text: 'Plan, flow and use of a room.', href: '#enso-case'
      },
      { // Flowers: a slanting moribana from Wai's notebook, built up in the order
        // it is made: basin, kenzan, shin 45°, soe 15°, hikae 75°, then the details.
        strokes: [
          ellipse(46, 74, 23, 4.6),                                                    // basin rim
          [[23, 74], [24, 79], ...quad([24, 79], [46, 84.5], [68, 79], 20), [69, 74]], // basin wall
          kenzan,                                                                      // kenzan
          quad(BASE, [30, 57], dir(-45, 44)),                                          // shin
          quad(BASE, [48, 51], dir(15, 34)),                                           // soe
          quad(BASE, [62, 63], dir(75, 25)),                                           // hikae
          [[46, 69], [46, 50]],                                                        // vertical reference
          arc(BASE[0], BASE[1], 13, -Math.PI / 2, -Math.PI * .75, 20),                 // the 45° being measured
          quad([28.7, 53.7], [22, 50], [20.5, 43], 12),                                // twig growing from shin
          spiral(40.2, 66.4, 4.4),                                                     // ranunculus
          spiral(52, 64.8, 3.6),                                                       // ranunculus
          spiral(46.4, 62.8, 2.6)                                                      // ranunculus
        ],
        enter: 'build',
        build: [[.04, .2], [.08, .24], [.22, .34], [.34, .5], [.48, .62], [.6, .74], [.36, .44], [.4, .5], [.74, .84], [.8, .9], [.84, .94], [.88, .98]],
        buildTime: 4200,
        dotsAt: .9,
        seal: BASE,
        dots: [[21.6, 43.6], [18.3, 41.1], [24.2, 46.9], [19.7, 44.8], [17.4, 39.6], [52.6, 43.6], [54.2, 39.2], [53.9, 36.6], [51.3, 47.3], [66.2, 63.3], [69.4, 61.9]],
        notes: [
          { at: [46, 69], side: 'left', y: 48, mine: true, title: 'Seven years', text: 'My own floral studio: briefs, budgets and installations.' },
          { at: [52, 64.8], side: 'right', y: 40, title: 'Balance', text: 'Line, balance and placement, set out in a costed proposal first.' }
        ],
        labels: [['moribana', 46, 91, 0, 0], ['kenzan', 57, 76.5, 1, 2], ['shin 45°', 11, 33, 0, 3], ['soe 15°', 60, 31, 0, 4], ['hikae 75°', 80, 57, 0, 5]],
        hold: 4200, text: 'Line, balance and placement.', href: '#creative-case'
      }
    ].map(st => ({ ...st, strokes: st.strokes.map(resample) }));

    const MORPH = 1600;
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const progress = (state, s, p) => { const [a, b] = state.build ? state.build[s] : [0, 1]; return clamp01((p - a) / (b - a)); };
    const enterTime = st => st.enter === 'build' ? st.buildTime : MORPH;
    let from = 0, to = 0, phaseStart = 0, flowStart = 0, phase = 'draw', paused = reduceMotion.matches, auto = true, visible = true, raf = 0, size = 0, dpr = 1;
    // Pointing: the system under the pointer keeps full ink, the rest fade back.
    let inside = false, hovering = false, hoverNode = null, hoverMix = 0, hoverTarget = 0, lastFrame = 0;
    const emph = s => {
      if (phase !== 'hold' || !hoverNode || !hoverNode.keep || hoverMix <= 0) return 1;
      return hoverNode.keep.includes(s) ? 1 : 1 - hoverMix * .84;
    };

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = Math.min(r.width, r.height);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      render(performance.now());
    }

    // Labels and details. `p` is how far the state has been built (1 = complete);
    // labels tied to a stroke appear as that stroke lands.
    function drawDetails(state, alpha, p = 1) {
      if (alpha <= 0) return;
      const u = size / 100;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const px = Math.max(9, size * .024), small = Math.max(8.5, size * .019);
      if (state.dots) {
        ctx.globalAlpha = alpha * clamp01((p - (state.dotsAt || 0)) / .1);
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, size * .0026);
        state.dots.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * u, y * u, size * .0085, 0, Math.PI * 2); ctx.stroke(); });
      }
      if (state.marks) {
        ctx.globalAlpha = alpha * clamp01((p - .6) / .2) * emph(1);
        ctx.fillStyle = SEAL;
        state.marks.forEach(([x, y]) => ctx.fillRect(x * u - size * .011, y * u - size * .011, size * .022, size * .022));
      }
      state.labels.forEach(([t, x, y, minor, stroke, light]) => {
        const a = stroke === undefined ? clamp01((p - .85) / .15) : progress(state, stroke, p);
        const named = phase === 'hold' && hoverNode?.below && hoverNode.self === stroke ? 1 - hoverMix : 1;   // the frame's label takes its place
        ctx.globalAlpha = alpha * a * emph(stroke ?? 0) * named;
        ctx.font = minor ? `400 ${small}px "IBM Plex Sans", Helvetica, Arial, sans-serif` : `500 ${px}px "IBM Plex Sans", Helvetica, Arial, sans-serif`;
        ctx.fillStyle = light ? PAPER : minor ? INK3 : state.inkLabels ? INK : WASH;
        if (state.inkLabels && !light) { ctx.strokeStyle = PAPER; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeText(t, x * u, y * u); }
        ctx.fillText(t, x * u, y * u);
      });
      ctx.globalAlpha = 1;
    }

    // Flat discs: each grows in with its outline, and fades out as the lines move on.
    const backOut = t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    function drawDiscs(state, alpha, p = 1) {
      if (!state.discs || alpha <= 0) return;
      const u = size / 100;
      state.discs.forEach(([x, y, r, color, stroke]) => {
        const g = progress(state, stroke, p);
        if (g <= 0) return;
        ctx.globalAlpha = alpha * emph(stroke);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x * u, y * u, Math.max(0, r * u * backOut(g)), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function strokePath(points, count, k) {
      ctx.beginPath();
      for (let i = 0; i < count; i++) { const [x, y] = points[i]; i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k); }
      ctx.stroke();
    }

    function render(now) {
      const w = canvas.width / dpr, h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, (w - size) / 2 * dpr, (h - size) / 2 * dpr);
      ctx.clearRect(-(w - size), -(h - size), w * 2, h * 2);
      const k = size / 100;
      const elapsed = now - phaseStart;
      const A = states[from], B = states[to];
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.2, size * .0034);
      let sealT = 1, sealScale = 1, flowAlpha = 1;
      const building = phase === 'draw' || (phase === 'morph' && B.enter === 'build');

      if (building) {
        // Previous drawing (if any) dissolves, then each stroke is drawn in its turn.
        const p = clamp01(elapsed / B.buildTime);
        if (phase === 'morph') {
          ctx.globalAlpha = 1 - clamp01(p / .14);
          if (ctx.globalAlpha > 0) { A.strokes.forEach(st => strokePath(st, N, k)); drawDetails(A, ctx.globalAlpha); }
          ctx.globalAlpha = 1;
          sealT = ease(clamp01(p / .3));
        } else {
          sealT = 1; sealScale = clamp01((p - .9) / .1);
        }
        if (phase === 'morph') drawDiscs(A, 1 - clamp01(p / .14));
        drawDiscs(B, 1, p);
        B.strokes.forEach((st, s) => { const r = progress(B, s, p); if (r > 0) strokePath(st, Math.max(2, Math.round(N * ease(r))), k); });
        drawDetails(B, 1, p);
        flowAlpha = 0;
      } else {
        const t = phase === 'morph' ? ease(clamp01(elapsed / MORPH)) : 1;
        if (phase === 'morph') { drawDiscs(A, 1 - clamp01(elapsed / (MORPH * .4))); drawDiscs(B, clamp01((elapsed - MORPH * .6) / (MORPH * .4))); }
        else drawDiscs(B, 1);
        for (let s = 0; s < B.strokes.length; s++) {
          const P = A.strokes[s], Q = B.strokes[s];
          ctx.globalAlpha = emph(s);
          ctx.beginPath();
          for (let i = 0; i < N; i++) {
            const x = (P[i][0] + (Q[i][0] - P[i][0]) * t) * k, y = (P[i][1] + (Q[i][1] - P[i][1]) * t) * k;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (phase === 'morph') {
          drawDetails(A, 1 - clamp01(elapsed / (MORPH * .35)));
          flowAlpha = clamp01((elapsed - MORPH * .7) / (MORPH * .3));
          drawDetails(B, flowAlpha);
        } else drawDetails(B, 1);
        sealT = t;
      }

      // Systems running: records flow along the spokes into Adobe Commerce.
      let pulse = 0;
      if (B.flow && flowAlpha > 0) pulse = drawFlow(now, flowAlpha, k);

      // The seal: where the judgement happens.
      const S0 = A.seal, S1 = B.seal;
      const sx = (S0[0] + (S1[0] - S0[0]) * sealT) * k, sy = (S0[1] + (S1[1] - S0[1]) * sealT) * k;
      const sealSize = size * .034 * sealScale;
      const sealAlpha = B.flow ? emph(7) : 1;   // on Systems the seal sits on the SAP hairline
      if (sealSize > 0) { ctx.globalAlpha = sealAlpha; ctx.fillStyle = SEAL; ctx.fillRect(sx - sealSize / 2, sy - sealSize / 2, sealSize, sealSize); ctx.globalAlpha = 1; }
      if (pulse > 0) {
        ctx.strokeStyle = SEAL; ctx.globalAlpha = pulse * sealAlpha; ctx.lineWidth = Math.max(1, size * .0025);
        const r = size * (.028 + .03 * (1 - pulse));
        ctx.strokeRect(sx - r, sy - r, r * 2, r * 2); ctx.globalAlpha = 1;
      }
    }

    // Traffic into the hub: records leave Dynamics, SAP and ServiceNow and travel
    // the hairline into Adobe Commerce; about 1 in 3 from SAP waits at my check.
    // Between them, records also move round the ring without Adobe Commerce.
    // The agent's price drafts arrive hollow, pause for review and are filled in.
    const SPOKES = [hair(SYS.dyn), hair(SYS.sap), hair(SYS.sn)];
    const AGENT = hair(SYS.cop);
    const SPAWN = 560, SPEED = 0.0075; // units per ms
    const segLen = ([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    const CHECK_AT = segLen(SPOKES[1]) / 2;
    const along = ([a, b], d) => {
      const len = segLen([a, b]);
      if (d > len) return null;
      const t = d / len; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    };
    function drawFlow(now, alpha, k) {
      if (alpha <= 0) return 0;
      const t0 = now - flowStart;
      let pulse = 0;
      for (let n = Math.max(0, Math.floor((t0 - 6000) / SPAWN)); n * SPAWN <= t0; n++) {
        const which = n % 3, age = t0 - n * SPAWN;
        let dist = age * SPEED;
        if (which === 1 && Math.floor(n / 3) % 3 === 1 && dist > CHECK_AT) {   // held at the check
          const HOLD = 1100, waited = (dist - CHECK_AT) / SPEED;
          if (waited < HOLD) { dist = CHECK_AT; pulse = Math.max(pulse, 1 - waited / HOLD); }
          else dist = CHECK_AT + (waited - HOLD) * SPEED;
        }
        const p = along(SPOKES[which], dist);
        if (!p) continue;
        ctx.globalAlpha = alpha * emph(6 + which);
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(p[0] * k, p[1] * k, Math.max(2.2, size * .0075), 0, Math.PI * 2); ctx.fill();
      }
      // Peer traffic: the systems also exchange records directly, round the ring.
      ctx.fillStyle = INK3;
      PEER.forEach((route, i) => {
        const PEER_EVERY = 1700, V = 0.00045;                                   // share of the arc per ms
        for (let n = Math.max(0, Math.floor((t0 - 3000) / PEER_EVERY)); n * PEER_EVERY <= t0; n++) {
          let f = (t0 - n * PEER_EVERY - i * 500) * V;
          if (f < 0 || f > 1) continue;
          if (n % 2) f = 1 - f;                                                  // both directions
          const q = route[Math.min(route.length - 1, Math.round(f * (route.length - 1)))];
          ctx.globalAlpha = alpha * .9 * emph(9 + i);
          ctx.beginPath(); ctx.arc(q[0] * k, q[1] * k, Math.max(1.8, size * .006), 0, Math.PI * 2); ctx.fill();
        }
      });
      const PRICE_EVERY = 2400, REVIEW = 800, len = segLen(AGENT), mid = len / 2, V = 0.006;
      for (let n = Math.max(0, Math.floor((t0 - 6000) / PRICE_EVERY)); n * PRICE_EVERY <= t0; n++) {
        let d = (t0 - n * PRICE_EVERY) * V, approved = false, reviewing = 0;
        if (d > mid) {
          const waited = (d - mid) / V;
          if (waited < REVIEW) { d = mid; reviewing = waited / REVIEW; approved = reviewing > .55; }
          else { d = mid + (waited - REVIEW) * V; approved = true; }
        }
        const p = along(AGENT, d);
        if (!p) continue;
        const sq = Math.max(7, size * .017), x = p[0] * k - sq / 2, top = p[1] * k - sq / 2;
        ctx.globalAlpha = alpha * emph(5);
        ctx.fillStyle = ctx.strokeStyle = INK;
        ctx.lineWidth = Math.max(1.2, size * .0026);
        if (approved) ctx.fillRect(x, top, sq, sq); else { ctx.fillStyle = PAPER; ctx.fillRect(x, top, sq, sq); ctx.strokeRect(x, top, sq, sq); }
        if (reviewing) {
          const grow = sq * (.5 + reviewing * .7);
          ctx.globalAlpha = alpha * (1 - reviewing) * .8 * emph(5);
          ctx.strokeRect(x - grow / 2, top - grow / 2, sq + grow, sq + grow);
        }
      }
      ctx.globalAlpha = 1;
      return pulse * alpha;
    }

    // Notes: real text beside the drawing, joined to it by fine elbow lines.
    const SVGNS = 'http://www.w3.org/2000/svg';
    let notesTimer = 0, focusTimer = 0, noteEls = [];
    // The viewfinder: four corner marks that frame one thing at a time.
    function placeFocus(target, label) {
      if (!focusBox) return;
      const [x, y] = target.at;
      const moved = focusBox.style.left !== x + '%' || focusBox.style.top !== y + '%';
      focusBox.style.left = x + '%'; focusBox.style.top = y + '%';
      focusBox.style.setProperty('--fs', (target.fs || (target.r ? 2 * target.r + 7 : 11)) + '%');
      focusBox.dataset.label = label || '';
      focusBox.classList.toggle('is-flip', x > 55);
      focusBox.classList.toggle('is-below', !!target.below);
      focusBox.classList.toggle('is-hover', hovering);
      focusBox.classList.add('is-on');
      // Once it arrives, it closes in slightly, like a lens finding focus.
      if (moved && !reduceMotion.matches && focusBox.animate) {
        focusBox.animate([{ scale: '1.18', opacity: .5 }, { scale: '1', opacity: 1 }],
          { duration: 420, delay: hovering ? 260 : 820, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      }
    }
    function activateNote(i) {
      noteEls.forEach((els, j) => els.forEach(el => el.classList.toggle('is-active', j === i)));
      notesBox?.classList.toggle('has-active', i >= 0 && i < noteEls.length);
      linesBox?.classList.toggle('has-active', i >= 0 && i < noteEls.length);
    }
    function idleFocus() {
      clearInterval(focusTimer);
      const notes = states[to].notes || [];
      if (!focusBox || !notes.length || reduceMotion.matches || !noteEls.length) return;
      let i = 0;
      const move = () => { const n = i % notes.length; placeFocus(notes[n]); activateNote(n); i++; };
      move(); focusTimer = setInterval(() => { if (!paused && !hovering) move(); }, 2600);
    }
    function renderNotes(state) {
      clearTimeout(notesTimer); clearInterval(focusTimer);
      noteEls = [];
      if (notesBox) notesBox.replaceChildren();
      if (linesBox) linesBox.replaceChildren();
      if (notesList) notesList.replaceChildren();
      const notes = state.notes || [];
      notes.forEach(n => {
        if (!notesList) return;
        const li = document.createElement('li');
        if (n.mine) li.className = 'is-mine';
        li.innerHTML = `<b>${n.title}.</b> ${n.text}`;
        notesList.append(li);
      });
      if (!notesBox || !linesBox) return;
      const width = canvas.getBoundingClientRect().width || 1;
      const W = 208 / width * 100;                  // a note is 13rem wide, in % of the drawing
      const pointsFor = (n, y) => {
        const [ax, ay] = n.at, left = n.side === 'left';
        const edge = left ? -3 : 103, outer = left ? edge - W : edge + W;
        const knee = edge + (ax - edge) * .55;
        return `${outer},${y} ${edge},${y} ${knee},${ay} ${ax + (left ? -1.8 : 1.8)},${ay}`;
      };
      notes.forEach(n => {
        const [ax, ay] = n.at, left = n.side === 'left';
        const edge = left ? -3 : 103;
        const line = document.createElementNS(SVGNS, 'polyline');
        line.setAttribute('points', pointsFor(n, n.y));
        line.setAttribute('pathLength', '1');
        linesBox.append(line);
        const mark = document.createElement('span');
        mark.className = 'note-mark' + (n.mine ? ' is-mine' : '');
        mark.style.left = ax + '%'; mark.style.top = ay + '%';
        const note = document.createElement('p');
        note.className = 'note note--' + n.side;
        note.style.bottom = `calc(${100 - n.y}% + 6px)`;
        if (left) note.style.right = (100 - edge) + '%'; else note.style.left = edge + '%';
        note.innerHTML = `<b>${n.title}</b>${n.text}`;
        notesBox.append(mark, note);
        noteEls.push([line, mark, note]);
      });
      fitNotes(notes, pointsFor);
      // Left alone, the frame moves from one note to the next; pointing takes over.
      if (hovering && hoverNode) { placeFocus(hoverNode, hoverNode.label); activateNote(hoverNode.note); }
      else idleFocus();
    }
    // Keep notes clear of the text around the drawing. Its height changes with the
    // window, so a note on the left is moved down below the tagline (and the
    // next one below it), and a note on the right is moved up above the intro box.
    function fitNotes(notes, pointsFor) {
      if (!notesBox.offsetParent || !noteEls.length) return;
      const box = canvas.getBoundingClientRect(), H = box.height || 1, GAP = 16, LINE = 6;
      const rectOf = sel => hero.querySelector(sel)?.getBoundingClientRect();
      const head = rectOf('.hero-head'), intro = rectOf('.hero-intro');
      const y = notes.map(n => box.top + n.y / 100 * H);          // where each note's line sits, in px
      const h = noteEls.map(([, , note]) => note.offsetHeight);
      const order = side => notes.map((n, i) => i).filter(i => notes[i].side === side).sort((a, b) => y[a] - y[b]);
      let minTop = head ? head.bottom + GAP : -Infinity;
      order('left').forEach(i => {
        if (y[i] - LINE - h[i] < minTop) y[i] = minTop + LINE + h[i];
        minTop = y[i] + GAP;
      });
      let maxLine = intro ? intro.top - GAP : Infinity;
      order('right').reverse().forEach(i => {
        if (y[i] > maxLine) y[i] = maxLine;
        maxLine = y[i] - LINE - h[i] - GAP;
      });
      notes.forEach((n, i) => {
        const pct = Math.max(2, Math.min(98, (y[i] - box.top) / H * 100));
        if (Math.abs(pct - n.y) < .1) return;
        const [line, , note] = noteEls[i];
        line.setAttribute('points', pointsFor(n, pct));
        note.style.bottom = `calc(${100 - pct}% + ${LINE}px)`;
      });
    }
    function queueNotes(state, delay) {
      clearTimeout(notesTimer); clearInterval(focusTimer);
      noteEls = [];
      focusBox?.classList.remove('is-on');
      if (notesBox) { notesBox.replaceChildren(); notesBox.classList.remove('has-active'); }
      if (linesBox) { linesBox.replaceChildren(); linesBox.classList.remove('has-active'); }
      notesTimer = setTimeout(() => renderNotes(state), delay);
    }

    // Pointing at the drawing (mouse only, and only where the notes sit beside it):
    // the frame snaps to the nearest system, its links stay dark, the rest fade.
    function kick() {
      if (paused || reduceMotion.matches || !visible) { hoverMix = hoverTarget; render(paused ? pausedAt : performance.now()); }
      else loop();
    }
    function nearestNode(e) {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left - (r.width - size) / 2) / size * 100;
      const y = (e.clientY - r.top - (r.height - size) / 2) / size * 100;
      const st = states[to];
      const nodes = st.nodes || (st.notes || []).map((n, i) => ({ at: n.at, fs: n.fs, r: 0, note: i }));
      let best = null, bestD = Infinity;
      nodes.forEach(n => { const d = Math.hypot(x - n.at[0], y - n.at[1]) - (n.r || 0); if (d < bestD) { bestD = d; best = n; } });
      return best;
    }
    function pointAt(e) {
      if (e.pointerType !== 'mouse' || !focusBox || !focusBox.offsetParent || phase !== 'hold' || !noteEls.length) return;
      const node = nearestNode(e);
      if (!node || (node === hoverNode && hoverTarget === 1)) return;
      hovering = true; hoverNode = node; hoverTarget = 1;
      clearInterval(focusTimer);
      placeFocus(node, node.label);
      activateNote(node.note);
      kick();
    }
    function leave() {
      if (inside && phase === 'hold') phaseStart = performance.now();   // a full look before it moves on
      inside = false;
      if (!hovering) return;
      hovering = false; hoverTarget = 0;
      focusBox?.classList.remove('is-hover');
      idleFocus();
      kick();
    }
    addEventListener('resize', () => { clearTimeout(notesTimer); notesTimer = setTimeout(() => renderNotes(states[to]), 150); });

    function show(index, instant) {
      from = instant ? index : to; to = index;
      hovering = false; hoverNode = null; hoverTarget = 0; hoverMix = 0;
      phase = instant || reduceMotion.matches ? 'hold' : 'morph';
      phaseStart = performance.now();
      if (states[index].flow && from !== index) flowStart = phaseStart + (states[index].enter === 'build' ? states[index].buildTime : 0);
      stepButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
      queueNotes(states[index], instant || reduceMotion.matches ? 0 : enterTime(states[index]) * .7);
      if (text) text.textContent = states[index].text;
      if (link) link.setAttribute('href', states[index].href);
      if (phase === 'hold') { from = index; render(phaseStart); }
      loop();
    }

    function tick(now) {
      raf = 0;
      const dt = lastFrame ? now - lastFrame : 0; lastFrame = now;
      if (hoverMix !== hoverTarget) hoverMix = hoverTarget > hoverMix ? Math.min(1, hoverMix + dt / 260) : Math.max(0, hoverMix - dt / 380);
      const elapsed = now - phaseStart;
      if (phase === 'draw' && elapsed >= states[to].buildTime) { phase = 'hold'; phaseStart = now; flowStart = now; }
      else if (phase === 'morph' && elapsed >= enterTime(states[to])) { from = to; phase = 'hold'; phaseStart = now; }
      else if (phase === 'hold' && elapsed >= states[to].hold && auto && !paused && !inside) { show((to + 1) % states.length); return; }
      render(now);
      if (visible && !paused && (phase !== 'hold' || auto || states[to].flow || hoverMix !== hoverTarget)) raf = requestAnimationFrame(tick);
    }
    function loop() { if (!raf && visible) { lastFrame = 0; raf = requestAnimationFrame(tick); } }

    // Choosing a medium stops the automatic sequence but keeps that drawing alive.
    stepButtons.forEach((b, i) => b.addEventListener('click', () => {
      auto = false;
      pauseButton.textContent = paused ? 'Play' : 'Resume';
      if (i !== to || phase === 'draw') show(i, false);
    }));
    function setPaused(value) {
      const was = paused;
      paused = value;
      pauseButton.textContent = paused ? 'Play' : 'Pause';
      pauseButton.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation');
      if (was && !paused) { const shift = performance.now() - pausedAt; phaseStart += shift; flowStart += shift; loop(); }
      if (!was && paused) pausedAt = performance.now();
    }
    let pausedAt = performance.now();
    // Pause freezes everything; Play (or Resume after choosing a medium) restarts the sequence.
    pauseButton.addEventListener('click', () => {
      if (!paused && !auto) { auto = true; phaseStart = performance.now(); pauseButton.textContent = 'Pause'; loop(); return; }
      setPaused(!paused);
      if (!paused) auto = true;
    });
    // Pointing at the drawing holds the current medium (it won't move on) and
    // shows what connects to what; leaving hands the frame back to the notes.
    const canvasBox = figure.querySelector('.motion-canvas');
    canvasBox.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') inside = true; });
    canvasBox.addEventListener('pointermove', pointAt);
    canvasBox.addEventListener('pointerleave', leave);
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }).observe(figure);
    addEventListener('resize', resize);
    document.fonts?.ready.then(() => render(performance.now()));
    resize();
    if (reduceMotion.matches) { setPaused(true); show(0, true); pauseButton.hidden = true; }
    else { phase = 'draw'; phaseStart = performance.now(); setPaused(false); loop(); queueNotes(states[0], states[0].buildTime * .7); }
  }

  /* 10 · Header ------------------------------------------------------------- */
  const header = document.querySelector('.site-header');
  const updateHeader = () => header?.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
})();
