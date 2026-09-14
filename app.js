(() => {
  'use strict';
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)');
  const compact = matchMedia('(max-width: 1200px)');
  const lowPower = navigator.connection?.saveData || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
  const storage = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* Storage is optional. */ } }
  };
  let paused = storage.get('ck-motion-paused') === 'true';
  const motionAllowed = () => !reduced.matches && !paused && !document.hidden;
  const motionButton = document.querySelector('.motion-toggle');
  const syncTasks = [];
  const syncMotion = () => {
    body.classList.toggle('motion-paused', !motionAllowed());
    if (motionButton) {
      motionButton.hidden = false;
      motionButton.disabled = reduced.matches;
      motionButton.textContent = reduced.matches ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion';
      motionButton.setAttribute('aria-pressed', String(paused || reduced.matches));
    }
    syncTasks.forEach(sync => sync());
  };
  motionButton?.addEventListener('click', () => {
    paused = !paused; storage.set('ck-motion-paused', String(paused)); syncMotion();
  });
  reduced.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);

  // Optional first-visit intro; the HTML is usable before and without this script.
  const loader = document.getElementById('loader');
  if (loader && motionAllowed() && !lowPower && !location.hash && !storage.get('ck-intro-seen')) {
    storage.set('ck-intro-seen', 'true'); loader.hidden = false;
    const start = performance.now();
    let introFrame = 0, closed = false;
    const close = () => {
      if (closed) return;
      closed = true; cancelAnimationFrame(introFrame);
      loader.classList.add('is-hidden'); loader.inert = true;
      document.removeEventListener('keydown', close);
      setTimeout(() => { loader.hidden = true; }, 300);
    };
    const tick = now => {
      const progress = Math.min(100, Math.round((now - start) / 6));
      document.getElementById('loaderPercent').textContent = progress;
      document.getElementById('loaderBar').style.transform = `scaleX(${progress / 100})`;
      if (progress === 100) close(); else introFrame = requestAnimationFrame(tick);
    };
    introFrame = requestAnimationFrame(tick);
    document.getElementById('skipLoader')?.addEventListener('click', close, { once: true });
    document.addEventListener('keydown', close);
    setTimeout(close, 900); // Fail open even if frames are suspended.
    syncTasks.push(() => { if (!motionAllowed()) close(); });
  }

  const serviceSelect = document.getElementById('inquiry-service');
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (!serviceSelect) return;
    serviceSelect.value = link.dataset.service;
    requestAnimationFrame(() => serviceSelect.focus({ preventScroll: true }));
  }));
  document.querySelectorAll('.portfolio-thumb img').forEach(img => {
    const fallback = () => {
      if (!img.dataset.fallback) return;
      const src = img.dataset.fallback; delete img.dataset.fallback; img.src = src;
    };
    img.addEventListener('error', fallback, { once: true });
    if (img.complete && img.naturalWidth === 0) fallback();
  });

  // Progressive enhancement: default content is visible if observers or JS fail.
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view'); observer.unobserve(entry.target);
      });
    }, { threshold: .04 });
    document.querySelectorAll('.reveal').forEach(el => reveals.observe(el));
    body.classList.add('reveal-ready');
    const regions = new IntersectionObserver(entries => entries.forEach(entry => {
      entry.target.classList.toggle('motion-visible', entry.isIntersecting);
      if (entry.target.id === 'contact') body.classList.toggle('contact-visible', entry.isIntersecting);
    }));
    document.querySelectorAll('.hero, .ticker, .contact, .site-header').forEach(el => regions.observe(el));
  } else {
    document.querySelectorAll('.hero, .ticker, .contact, .site-header').forEach(el => el.classList.add('motion-visible'));
  }
  const bar = document.querySelector('.scroll-progress span');
  let scrollFrame = 0;
  const updateProgress = () => {
    scrollFrame = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.max(0, Math.min(1, scrollY / max)) : 0})`;
  };
  const queueProgress = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateProgress); };
  addEventListener('scroll', queueProgress, { passive: true });
  addEventListener('resize', queueProgress, { passive: true });
  updateProgress();

  // No animation-frame loop for timecode; stop when hidden, paused or off screen.
  const tc = document.getElementById('timecode'), tcStart = performance.now();
  const pad = n => String(n).padStart(2, '0');
  let clockTimer = 0, headerVisible = true;
  const clockTick = () => {
    const frames = Math.floor((performance.now() - tcStart) * 24 / 1000), seconds = Math.floor(frames / 24);
    tc.textContent = `TC ${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}:${pad(frames % 24)}`;
  };
  const syncClock = () => {
    clearInterval(clockTimer); clockTimer = 0;
    if (tc && headerVisible && !compact.matches && motionAllowed()) { clockTick(); clockTimer = setInterval(clockTick, 1000 / 12); }
  };
  syncTasks.push(syncClock); compact.addEventListener('change', syncClock);
  if (tc && 'IntersectionObserver' in window) new IntersectionObserver(entries => {
    headerVisible = entries[0].isIntersecting; syncClock();
  }).observe(tc);

  // The cursor stops scheduling frames once settled and never replaces touch/keyboard input.
  const cursor = document.getElementById('cursor'), label = document.getElementById('cursorLabel');
  let cursorFrame = 0, x = 0, y = 0, targetX = 0, targetY = 0, cursorActive = false;
  const stopCursor = () => {
    cancelAnimationFrame(cursorFrame); cursorFrame = 0; cursorActive = false;
    body.classList.remove('custom-cursor-active');
  };
  const cursorTick = () => {
    cursorFrame = 0; x += (targetX - x) * .28; y += (targetY - y) * .28;
    const position = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    cursor.style.transform = position; label.style.transform = position;
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .1) cursorFrame = requestAnimationFrame(cursorTick);
  };
  const resetTransforms = [];
  const syncPointer = () => {
    if (desktop.matches && motionAllowed()) return;
    stopCursor(); resetTransforms.forEach(reset => reset());
  };
  desktop.addEventListener('change', syncPointer); syncTasks.push(syncPointer);
  if (cursor && label) {
    addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !desktop.matches || !motionAllowed()) { stopCursor(); return; }
      targetX = event.clientX; targetY = event.clientY;
      if (!cursorActive) { x = targetX; y = targetY; }
      cursorActive = true; body.classList.add('custom-cursor-active');
      if (!cursorFrame) cursorFrame = requestAnimationFrame(cursorTick);
    }, { passive: true });
    document.addEventListener('pointerleave', stopCursor);
    addEventListener('blur', stopCursor); document.addEventListener('keydown', stopCursor);
    document.querySelectorAll('[data-cursor]').forEach(el => {
      el.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse') return;
        label.textContent = el.dataset.cursor; cursor.classList.add('is-active'); label.classList.add('is-active');
      });
      el.addEventListener('pointerleave', () => { cursor.classList.remove('is-active'); label.classList.remove('is-active'); });
    });
  }
  document.querySelectorAll('.magnetic, .interactive-card').forEach(el => {
    const isCard = el.classList.contains('interactive-card');
    const target = isCard ? el.querySelector('.project-visual') : el;
    if (!target) return;
    let frame = 0, bounds, nextX = 0, nextY = 0;
    const reset = () => { cancelAnimationFrame(frame); frame = 0; bounds = null; target.style.transform = ''; };
    resetTransforms.push(reset);
    el.addEventListener('pointerenter', () => { bounds = target.getBoundingClientRect(); });
    el.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !desktop.matches || !motionAllowed()) return;
      bounds ||= target.getBoundingClientRect();
      nextX = event.clientX - bounds.left - bounds.width / 2; nextY = event.clientY - bounds.top - bounds.height / 2;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        target.style.transform = isCard
          ? `perspective(900px) rotateX(${nextY / bounds.height * -3.4}deg) rotateY(${nextX / bounds.width * 4.5}deg) scale(1.008)`
          : `translate3d(${nextX * .08}px,${nextY * .08}px,0)`;
      });
    }, { passive: true });
    el.addEventListener('pointerleave', reset); el.addEventListener('blur', reset);
  });
  addEventListener('scroll', () => resetTransforms.forEach(reset => reset()), { passive: true });

  // Cancel both scheduling and drawing whenever the hero is invisible or motion is paused.
  const canvas = document.getElementById('signalCanvas');
  let ctx;
  try { ctx = canvas?.getContext('2d', { alpha: true }); } catch { /* CSS artwork remains. */ }
  if (canvas && ctx) {
    let width = 0, height = 0, particles = [], heroVisible = true, timer = 0, frame = 0, lastDraw = 0;
    const interval = 1000 / (lowPower ? 20 : 30);
    const eligible = () => heroVisible && motionAllowed();
    const stop = () => { clearTimeout(timer); cancelAnimationFrame(frame); timer = frame = lastDraw = 0; };
    const draw = now => {
      frame = 0; if (!eligible()) return;
      const delta = lastDraw ? Math.min(2, (now - lastDraw) / (1000 / 30)) : 1; lastDraw = now;
      ctx.clearRect(0, 0, width, height);
      const gx = width * (.55 + Math.sin(now * .00013) * .08), gy = height * (.48 + Math.cos(now * .00017) * .06);
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(width, height) * .58);
      glow.addColorStop(0, 'rgba(202,246,255,.12)'); glow.addColorStop(.35, 'rgba(45,98,104,.06)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx * delta; p.y += p.vy * delta;
        if (p.x < -10) p.x = width + 10; else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10; else if (p.y > height + 10) p.y = -10;
        ctx.beginPath(); ctx.fillStyle = `rgba(202,246,255,${p.a})`; ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j], dx = p.x - q.x, dy = p.y - q.y, distance = dx * dx + dy * dy;
          if (distance >= 11025) continue;
          ctx.beginPath(); ctx.strokeStyle = `rgba(202,246,255,${(1 - Math.sqrt(distance) / 105) * .08})`;
          ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      });
      timer = setTimeout(() => { timer = 0; if (eligible()) frame = requestAnimationFrame(draw); }, Math.max(0, interval - (performance.now() - now) - 4));
    };
    const syncCanvas = () => { stop(); if (eligible()) frame = requestAnimationFrame(draw); };
    const resize = () => {
      const nextWidth = Math.max(1, canvas.clientWidth), nextHeight = Math.max(1, canvas.clientHeight);
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth; height = nextHeight;
      const dpr = Math.min(devicePixelRatio || 1, lowPower ? 1.25 : 1.5);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(lowPower ? 26 : 42, Math.max(18, Math.floor(width / 32)));
      particles = Array.from({ length: count }, () => ({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - .5) * .16, vy: (Math.random() - .5) * .16, r: Math.random() * 1.5 + .35, a: Math.random() * .45 + .1 }));
      syncCanvas();
    };
    syncTasks.push(syncCanvas);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else addEventListener('resize', resize, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting; syncCanvas();
    }).observe(canvas.closest('.hero'));
    resize();
  }
  syncMotion();
})();
