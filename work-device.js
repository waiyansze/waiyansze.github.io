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
  const steps = [...panels, ...chapters.slice(1)];
  const readings = steps.map(step => step.querySelector('.device-reading'));
  const chapterLinks = [...section.querySelectorAll('[data-work-chapter]')];
  const pageLinks = [...section.querySelectorAll('.device-pages a')];
  const pages = section.querySelector('.device-pages');
  const previous = section.querySelector('[data-work-direction="-1"]');
  const next = section.querySelector('[data-work-direction="1"]');
  const label = section.querySelector('.device-page-label');
  const help = section.querySelector('.device-scroll-help');
  const mapStatus = section.querySelector('.device-map-status');
  const query = matchMedia('(min-width:901px) and (min-height:560px) and (prefers-reduced-motion:no-preference)');
  const bound = (value, min, max) => Math.max(min, Math.min(max, value));
  const chapterOf = index => Math.max(0, index - panels.length + 1);
  let segments = [], total = 0, selected = -1, frame = 0, measured = false;

  function mark(index) {
    if (index === selected) return;
    selected = index;
    const chapter = chapterOf(index);
    chapterLinks.forEach((link, i) => {
      if (i === chapter) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    pageLinks.forEach((link, i) => {
      if (i === index) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    pages.hidden = chapter !== 0;
    const name = ['Systems', 'Space', 'Flowers'][chapter];
    const spine = section.querySelector('.editorial-spine');
    if (spine) spine.textContent = name;
    section.querySelectorAll('[data-editorial-work-dot]').forEach((dot, i) => {
      dot.classList.toggle('is-complete', i < chapter);
      dot.classList.toggle('is-current', i === chapter);
    });
    label.replaceChildren(document.createTextNode(name));
    const counter = document.createElement('span');
    counter.textContent = chapter === 0 ? `${String(index + 1).padStart(2, '0')} / ${String(panels.length).padStart(2, '0')}` : `${String(chapter + 1).padStart(2, '0')} / 03 chapters`;
    label.append(counter);
    previous.disabled = index === 0;
    next.setAttribute('aria-label', index === steps.length - 1 ? 'Continue to Digital projects' : index === panels.length - 1 ? 'Next chapter: Space' : index === panels.length ? 'Next chapter: Flowers' : 'Next work page');
    previous.setAttribute('aria-label', chapter > 0 ? 'Previous work chapter' : 'Previous work page');
    next.textContent = '→';
    help.textContent = index === steps.length - 1 ? 'Scroll to continue to Digital projects ↓' : chapter ? 'Scroll to read this chapter ↓' : index === panels.length - 1 ? 'Scroll to continue to Space ↓' : 'Scroll to follow the story or choose a chapter.';
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
    const chapterPosition = Math.max(0, position - panels.length + 1);
    stack.style.transform = `translate3d(0,${-chapterPosition * viewport.clientHeight}px,0)`;
    systemTrack.style.transform = `translate3d(${-Math.min(position, panels.length - 1) * systemTrack.clientWidth}px,0,0)`;
    steps.forEach((step, i) => step.inert = i !== index);
    chapters[0].inert = index >= panels.length;
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
    chapters[0].inert = false;
    if (!query.matches) {
      section.style.removeProperty('--work-height');
      stack.style.removeProperty('transform');
      systemTrack.style.removeProperty('transform');
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
    if (hash === '#systems-case' || hash === '#work-viewer') index = 0;
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
