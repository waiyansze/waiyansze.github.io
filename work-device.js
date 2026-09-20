/* The document owns scrolling. No wheel interception and no nested scroll trap. */
(() => {
  const section = document.querySelector('.work-experience');
  if (!section) return;
  const pin = section.querySelector('.work-device-pin');
  const device = section.querySelector('.work-device');
  const viewport = section.querySelector('.device-viewport');
  const stack = section.querySelector('.device-chapters');
  const chapters = [...section.querySelectorAll('.device-chapter')];
  const systemTrack = section.querySelector('.device-system-track');
  const panels = [...section.querySelectorAll('.device-panel')];
  const groups = chapters.map((chapter, i) => i === 0 ? panels : [...chapter.querySelectorAll('.story-page')]);
  const tracks = [systemTrack, ...chapters.slice(1).map(chapter => chapter.querySelector('.chapter-track'))];
  const steps = groups.flat();
  const starts = groups.map((group, i) => groups.slice(0, i).reduce((n, pages) => n + pages.length, 0));
  const readings = steps.map(step => step.querySelector('.device-reading'));
  const chapterLinks = [...section.querySelectorAll('[data-work-chapter]')];
  let pageLinks = [];
  let shownChapter = -1;
  const pages = section.querySelector('.device-pages');
  const previous = section.querySelector('[data-work-direction="-1"]');
  const next = section.querySelector('[data-work-direction="1"]');
  const label = section.querySelector('.device-page-label');
  const help = section.querySelector('.device-scroll-help');
  const mapStatus = section.querySelector('.device-map-status');
  const query = matchMedia('(min-width:901px) and (min-height:560px) and (prefers-reduced-motion:no-preference)');
  const bound = (value, min, max) => Math.max(min, Math.min(max, value));
  const chapterOf = index => Math.max(0, starts.findLastIndex(start => index >= start));
  let segments = [], total = 0, selected = -1, frame = 0, measured = false;

  function mark(index) {
    if (index === selected) return;
    selected = index;
    const chapter = chapterOf(index);
    chapterLinks.forEach((link, i) => {
      if (i === chapter) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (shownChapter !== chapter) {
      shownChapter = chapter;
      pages.setAttribute('aria-label', ['Systems', 'Space', 'Flowers'][chapter] + ' pages');
      pages.replaceChildren(...groups[chapter].map((step, i) => {
        const a = document.createElement('a'); a.href = '#' + step.id; a.textContent = String(i + 1).padStart(2, '0');
        a.setAttribute('aria-label', step.dataset.label || ('Page ' + (i + 1))); return a;
      }));
      pageLinks = [...pages.querySelectorAll('a')];
    }
    pageLinks.forEach((link, i) => {
      if (i === index - starts[chapter]) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    pages.hidden = false;
    const name = ['Systems', 'Space', 'Flowers'][chapter];
    const spine = section.querySelector('.editorial-spine');
    if (spine) spine.textContent = name;
    section.querySelectorAll('[data-editorial-work-dot]').forEach((dot, i) => {
      dot.classList.toggle('is-complete', i < chapter);
      dot.classList.toggle('is-current', i === chapter);
    });
    label.replaceChildren(document.createTextNode(name));
    const counter = document.createElement('span');
    counter.textContent = `${String(index - starts[chapter] + 1).padStart(2, '0')} / ${String(groups[chapter].length).padStart(2, '0')}`;
    label.append(counter);
    previous.disabled = index === 0;
    next.setAttribute('aria-label', index === steps.length - 1 ? 'Continue to Digital projects' : 'Next work page');
    previous.setAttribute('aria-label', 'Previous work page');
    next.textContent = '→';
    help.textContent = index === steps.length - 1 ? 'Continue to Digital projects ↓' : 'Scroll or use the arrows to turn the page →';
    const systemPanel = panels[Math.min(index, panels.length - 1)];
    mapStatus.textContent = systemPanel.dataset.label;
    const activeSystems = systemPanel.dataset.systems.split(',');
    section.querySelectorAll('[data-node]').forEach(node => node.classList.toggle('is-active', activeSystems.includes(node.dataset.node)));
    section.querySelectorAll('[data-map-step]').forEach(link => {
      if (Number(link.dataset.mapStep) === index) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  }

  function update() {
    frame = 0;
    const bounds = section.getBoundingClientRect();
    const inView = query.matches && bounds.top < 70 && bounds.bottom > innerHeight - 50;
    document.body.classList.toggle('in-work-device', inView);
    if (!query.matches || !segments.length) {
      const current = steps.reduce((nearest, step, i) => step.getBoundingClientRect().top <= innerHeight * .4 ? i : nearest, 0);
      mark(current);
      return;
    }
    const offset = bound(-bounds.top, 0, total);
    let position = steps.length - 1;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      readings[i].scrollTop = bound(offset - segment.start - segment.lead, 0, segment.extra);
      if (offset >= segment.start && offset <= segment.end + segment.travel) {
        position = i + (segment.travel ? bound((offset - segment.end) / segment.travel, 0, 1) : 0);
      }
    }
    const index = bound(Math.round(position), 0, steps.length - 1);
    const from = Math.floor(position), to = Math.min(from + 1, steps.length - 1);
    const chapterPosition = chapterOf(from) + (chapterOf(to) - chapterOf(from)) * (position - from);
    stack.style.transform = `translate3d(0,${-chapterPosition * viewport.clientHeight}px,0)`;
    tracks.forEach((track, c) => {
      const local = bound(position - starts[c], 0, groups[c].length - 1);
      track.style.transform = `translate3d(${-local * track.clientWidth}px,0,0)`;
    });
    steps.forEach((step, i) => step.inert = i !== index);
    chapters.forEach((chapter, c) => chapter.inert = c !== chapterOf(index));
    mark(index);
    device.style.setProperty('--work-progress', String(total ? offset / total : 0));
    if (inView) {
      const meter = document.querySelector('.scene-current');
      if (meter) meter.textContent = String(3 + chapterOf(index)).padStart(2, '0');
    }
    // Keep keyboard focus in the visible reader when scrolling removes a panel.
    if (document.activeElement?.closest('.work-device [inert]')) viewport.focus({preventScroll:true});
  }

  function requestUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function measure(preserve = true) {
    const oldBounds = section.getBoundingClientRect();
    const oldOffset = -oldBounds.top;
    const previousIndex = Math.max(0, selected);
    const oldSegment = segments[previousIndex];
    const oldProgress = oldSegment ? bound((oldOffset - oldSegment.start) / Math.max(1, oldSegment.end + oldSegment.travel - oldSegment.start), 0, 1) : 0;
    const wasPinned = measured && oldBounds.top <= 0 && oldBounds.bottom >= innerHeight;
    const wasAfter = measured && oldBounds.bottom < 0;
    const oldHeight = section.offsetHeight;
    document.body.classList.toggle('has-work-device', query.matches);
    steps.forEach(step => step.inert = false);
    chapters.forEach(chapter => chapter.inert = false);
    if (!query.matches) {
      section.style.removeProperty('--work-height');
      stack.style.removeProperty('transform');
      tracks.forEach(track => track.style.removeProperty('transform'));
      readings.forEach(body => body.scrollTop = 0);
      segments = [];
      total = 0;
      if (wasPinned && preserve) steps[previousIndex].scrollIntoView({block:'start',behavior:'instant'});
    } else if (pin.clientHeight) {
      let distance = 0;
      segments = steps.map((step, i) => {
        const extra = Math.max(0, readings[i].scrollHeight - readings[i].clientHeight);
        const lead = innerHeight * .18;
        const hold = innerHeight * .38;
        const travel = i < steps.length - 1 ? innerHeight * (i < panels.length - 1 ? .65 : .85) : 0;
        const result = {start:distance, lead, extra, end:distance + lead + extra + hold, travel};
        distance = result.end + travel;
        return result;
      });
      total = distance;
      section.style.setProperty('--work-height', `${pin.offsetHeight + total}px`);
      if (preserve && wasPinned) {
        const segment = segments[previousIndex];
        window.scrollTo({top:section.getBoundingClientRect().top + scrollY + segment.start + oldProgress * (segment.end + segment.travel - segment.start),behavior:'instant'});
      }
    }
    if (preserve && wasAfter) window.scrollBy({top:section.offsetHeight - oldHeight,behavior:'instant'});
    measured = pin.clientHeight > 0;
    requestUpdate();
  }

  function go(index, smooth = true) {
    if (index >= steps.length) {
      document.querySelector('#digital-projects').scrollIntoView({behavior:query.matches && smooth ? 'smooth':'instant',block:'start'});
      return;
    }
    const target = bound(index, 0, steps.length - 1);
    if (query.matches && segments.length) {
      const top = section.getBoundingClientRect().top + scrollY + segments[target].start;
      window.scrollTo({top,behavior:smooth ? 'smooth':'instant'});
    } else steps[target].scrollIntoView({block:'start',behavior:'instant'});
  }

  function route(hash, smooth = true) {
    let index = steps.findIndex(step => `#${step.id}` === hash);
    const c = chapters.findIndex(chapter => '#' + chapter.id === hash);
    if (c >= 0) index = starts[c];
    if (hash === '#work-viewer') index = 0;
    if (index < 0) return false;
    go(index, smooth);
    return true;
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link && route(link.hash)) {
      event.preventDefault();
      history.replaceState(null, '', link.hash);
    }
  });
  previous.addEventListener('click', () => go(selected - 1));
  next.addEventListener('click', () => go(selected + 1));
  section.querySelector('[data-editorial-reset="work"]')?.addEventListener('click', () => go(0));
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport || !query.matches) return;
    const destination = {ArrowLeft:selected - 1,ArrowRight:selected + 1,Home:0,End:steps.length - 1};
    if (event.key in destination) {event.preventDefault();go(destination[event.key]);}
  });
  window.addEventListener('scroll', requestUpdate, {passive:true});
  window.addEventListener('resize', () => measure(), {passive:true});
  query.addEventListener('change', () => measure());
  window.addEventListener('hashchange', () => route(location.hash, false));
  const initialize = () => {measure(false);route(location.hash, false);};
  window.addEventListener('load', initialize);
  window.addEventListener('portfolio:unlocked', () => requestAnimationFrame(initialize));
  document.fonts?.ready.then(() => measure());
  section.querySelectorAll('img').forEach(img => img.addEventListener('load', () => measure(), {once:true}));
  measure(false);
})();
