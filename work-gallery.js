/* Image selection is independent of the document's chapter pagination. */
(() => {
  const videos = [...document.querySelectorAll('.wedding-motion video')];
  const visibility = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (!entry.isIntersecting) entry.target.pause(); });
  });
  videos.forEach(video => visibility.observe(video));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach(video => video.pause());
  });
  const media = [...document.querySelectorAll('.story-page-media')];
  if (!media.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'work-image-dialog';
  dialog.setAttribute('aria-label', 'Enlarged project image');
  const close = document.createElement('button');
  close.type = 'button'; close.textContent = 'Close ×';
  const full = document.createElement('img');
  const caption = document.createElement('p');
  dialog.append(close, full, caption); document.body.append(dialog);
  let opener, oldOverflow;
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = oldOverflow;
    opener?.focus({preventScroll:true});
  });
  media.forEach((container, galleryIndex) => {
    const figures = [...container.querySelectorAll(':scope > figure')];
    let active = 0, touchStart, suppressClick = false;
    container.classList.add('image-gallery');
    figures.forEach((figure, i) => {
      figure.id ||= `work-image-${galleryIndex}-${i}`;
      const img = figure.querySelector('img');
      const zoom = document.createElement('button');
      zoom.type = 'button'; zoom.className = 'image-zoom';
      zoom.setAttribute('aria-label', `Enlarge image: ${img.alt}`);
      img.before(zoom); zoom.append(img);
      const hint = document.createElement('span'); hint.className = 'image-zoom-hint'; hint.textContent = '+'; hint.setAttribute('aria-hidden', 'true');
      zoom.append(hint);
      zoom.addEventListener('click', () => {
        if (suppressClick) { suppressClick = false; return; }
        opener = zoom; full.src = img.currentSrc || img.src; full.alt = img.alt;
        caption.textContent = figure.querySelector('figcaption')?.textContent || img.alt;
        oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
        dialog.showModal(); close.focus();
      });
    });
    if (figures.length < 2) return;
    const controls = document.createElement('div'); controls.className = 'image-gallery-controls';
    const previous = document.createElement('button'), next = document.createElement('button');
    previous.type = next.type = 'button'; previous.textContent = '←'; next.textContent = '→';
    previous.setAttribute('aria-label', 'Previous image'); next.setAttribute('aria-label', 'Next image');
    const count = document.createElement('span'); count.className = 'image-gallery-count';
    count.setAttribute('aria-live', 'polite'); count.setAttribute('aria-atomic', 'true');
    const picks = document.createElement('div'); picks.className = 'image-gallery-picks';
    picks.setAttribute('role', 'group'); picks.setAttribute('aria-label', 'Choose an image');
    const buttons = figures.map((figure, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-controls', figure.id);
      const name = container.classList.contains('plans') ? ['Floor plan', '3D view'][i] : figure.querySelector('figcaption')?.textContent;
      b.setAttribute('aria-label', name || `Image ${i + 1}`);
      if (container.classList.contains('plans')) b.textContent = name;
      else { const thumb = figure.querySelector('img').cloneNode(); thumb.alt = ''; thumb.removeAttribute('width'); thumb.removeAttribute('height'); b.append(thumb); }
      b.addEventListener('click', () => select(i)); picks.append(b); return b;
    });
    function select(index) {
      active = (index + figures.length) % figures.length;
      figures.forEach((f, i) => f.hidden = i !== active);
      buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === active)));
      count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(figures.length).padStart(2, '0')}`;
      window.dispatchEvent(new Event('portfolio:mediachange'));
    }
    previous.addEventListener('click', () => select(active - 1)); next.addEventListener('click', () => select(active + 1));
    controls.append(previous, count, next, picks); container.append(controls);
    container.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault(); event.stopPropagation();
      select(active + (event.key === 'ArrowLeft' ? -1 : 1));
      if (event.target.closest('figure')) figures[active].querySelector('button').focus({preventScroll:true});
    });
    container.addEventListener('pointerdown', event => {
      suppressClick = false;
      if (event.pointerType === 'touch') touchStart = {x:event.clientX, y:event.clientY};
    });
    container.addEventListener('pointerup', event => {
      if (!touchStart) return;
      const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y; touchStart = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) { suppressClick = true; select(active + (dx < 0 ? 1 : -1)); }
    });
    container.addEventListener('pointercancel', () => touchStart = null);
    select(0);
  });
})();
