(() => {
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const body = document.body;

  // Use original repository portraits and let the browser decode them asynchronously.
  const teamPortraits = ['ammer-afaq.jpg', 'varun-sharma.jpg', 'chetan-kapadnis.jpg'];
  document.querySelectorAll('.team-card .team-photo img').forEach((img, index) => {
    if (!teamPortraits[index]) return;
    img.src = teamPortraits[index];
    img.removeAttribute('srcset');
    img.decoding = 'async';
    img.loading = 'lazy';
    img.fetchPriority = 'low';
  });

  // Convert static service price labels into real inquiry links.
  document.querySelectorAll('.service-row .service-tag').forEach(tag => {
    if (tag.tagName === 'A') return;
    const link = document.createElement('a');
    link.className = tag.className + ' service-cta';
    link.href = '#contact';
    link.setAttribute('aria-label', `Request a quote for ${tag.closest('.service-row')?.querySelector('h3')?.textContent || 'this service'}`);
    link.innerHTML = '<span>Request quote</span><b aria-hidden="true">↘</b>';
    tag.replaceWith(link);
  });

  // Loader.
  const loader = document.getElementById('loader');
  const skipLoader = document.getElementById('skipLoader');
  const loaderPercent = document.getElementById('loaderPercent');
  const loaderBar = document.getElementById('loaderBar');
  const loaderStatus = document.getElementById('loaderStatus');
  let progress = 0;
  let loadingInterval;

  if (loader) {
    body.style.overflow = 'hidden';
    const statuses = ['Rendering signal', 'Aligning frames', 'Calibrating motion', 'Opening sequence'];
    const closeLoader = () => {
      if (!loader || loader.classList.contains('is-hidden')) return;
      clearInterval(loadingInterval);
      loader.classList.add('is-hidden');
      body.style.overflow = '';
      setTimeout(() => loader.remove(), 900);
    };

    if (prefersReducedMotion) {
      loaderPercent.textContent = '100';
      loaderBar.style.width = '100%';
      setTimeout(closeLoader, 180);
    } else {
      loadingInterval = setInterval(() => {
        progress += Math.max(1, Math.round((100 - progress) / 14));
        progress = Math.min(progress, 100);
        loaderPercent.textContent = progress;
        loaderBar.style.width = `${progress}%`;
        loaderStatus.textContent = statuses[Math.min(statuses.length - 1, Math.floor(progress / 28))];
        if (progress >= 100) setTimeout(closeLoader, 260);
      }, 55);
    }
    skipLoader?.addEventListener('click', closeLoader, { once: true });
  }

  // Reveal animation.
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px' });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
  }

  // One lightweight frame for scroll progress instead of work on every scroll event.
  const progressBar = document.querySelector('.scroll-progress span');
  let scrollFrame = 0;
  const updateScroll = () => {
    scrollFrame = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    const ratio = max > 0 ? scrollY / max : 0;
    if (progressBar) progressBar.style.transform = `scaleX(${ratio})`;
  };
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }, { passive: true });
  addEventListener('resize', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }, { passive: true });
  updateScroll();

  // Timecode only needs to refresh at 12fps to look live.
  const tc = document.getElementById('timecode');
  const tcStart = performance.now();
  const pad = n => String(n).padStart(2, '0');
  let lastTc = 0;
  function updateTimecode(now) {
    if (!document.hidden && tc && now - lastTc >= 83) {
      lastTc = now;
      const totalFrames = Math.floor((now - tcStart) / (1000 / 24));
      const frames = totalFrames % 24;
      const totalSeconds = Math.floor(totalFrames / 24);
      tc.textContent = `TC ${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor(totalSeconds / 60) % 60)}:${pad(totalSeconds % 60)}:${pad(frames)}`;
    }
    requestAnimationFrame(updateTimecode);
  }
  requestAnimationFrame(updateTimecode);

  // Desktop-only custom cursor and magnetic interactions.
  const cursor = document.getElementById('cursor');
  const cursorLabel = document.getElementById('cursorLabel');
  if (finePointer && !prefersReducedMotion && cursor && cursorLabel) {
    let mouseX = innerWidth / 2, mouseY = innerHeight / 2;
    let cursorX = mouseX, cursorY = mouseY;
    let cursorActive = false;
    addEventListener('pointermove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorActive = true;
    }, { passive: true });

    const animateCursor = () => {
      if (cursorActive && !document.hidden) {
        cursorX += (mouseX - cursorX) * .18;
        cursorY += (mouseY - cursorY) * .18;
        const pos = `translate3d(${cursorX}px,${cursorY}px,0)`;
        cursor.style.transform = `${pos} translate(-50%,-50%)`;
        cursorLabel.style.transform = `${pos} translate(-50%,-50%)`;
      }
      requestAnimationFrame(animateCursor);
    };
    requestAnimationFrame(animateCursor);

    document.querySelectorAll('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.add('is-active');
        cursorLabel.classList.add('is-active');
        cursorLabel.textContent = el.dataset.cursor;
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-active');
        cursorLabel.classList.remove('is-active');
      });
    });

    document.querySelectorAll('.magnetic').forEach(el => {
      let frame = 0;
      let nextX = 0, nextY = 0;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        nextX = (e.clientX - r.left - r.width / 2) * .15;
        nextY = (e.clientY - r.top - r.height / 2) * .15;
        if (!frame) frame = requestAnimationFrame(() => {
          el.style.transform = `translate3d(${nextX}px,${nextY}px,0)`;
          frame = 0;
        });
      }, { passive: true });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    document.querySelectorAll('.interactive-card').forEach(card => {
      const visual = card.querySelector('.project-visual');
      if (!visual) return;
      let frame = 0, transform = '';
      card.addEventListener('pointermove', e => {
        const r = visual.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5;
        const py = (e.clientY - r.top) / r.height - .5;
        transform = `perspective(900px) rotateX(${py * -3.4}deg) rotateY(${px * 4.5}deg) scale(1.008)`;
        if (!frame) frame = requestAnimationFrame(() => {
          visual.style.transform = transform;
          frame = 0;
        });
      }, { passive: true });
      card.addEventListener('pointerleave', () => { visual.style.transform = ''; });
    });
  } else {
    cursor?.remove();
    cursorLabel?.remove();
    body.classList.add('native-cursor');
  }

  // Adaptive hero canvas: fewer particles, capped frame-rate and paused off-screen/hidden.
  const canvas = document.getElementById('signalCanvas');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (canvas && ctx && !prefersReducedMotion) {
    let particles = [];
    let cw = 0, ch = 0, dpr = 1;
    let heroVisible = true;
    let lastFrame = 0;
    const fps = lowPower ? 24 : 32;
    const frameInterval = 1000 / fps;

    const resizeCanvas = () => {
      dpr = Math.min(devicePixelRatio || 1, lowPower ? 1.25 : 1.5);
      cw = Math.max(1, canvas.clientWidth);
      ch = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = lowPower ? 26 : 42;
      const count = Math.min(target, Math.max(18, Math.floor(cw / 32)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * cw,
        y: Math.random() * ch,
        vx: (Math.random() - .5) * .16,
        vy: (Math.random() - .5) * .16,
        r: Math.random() * 1.5 + .35,
        a: Math.random() * .45 + .1
      }));
    };

    let resizeTimer;
    addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvas, 120);
    }, { passive: true });
    resizeCanvas();

    const hero = canvas.closest('.hero');
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        heroVisible = entries[0]?.isIntersecting ?? true;
      }, { rootMargin: '120px 0px' }).observe(hero);
    }

    const drawSignal = now => {
      if (!document.hidden && heroVisible && now - lastFrame >= frameInterval) {
        lastFrame = now;
        ctx.clearRect(0, 0, cw, ch);
        const gx = cw * (.55 + Math.sin(now * .00013) * .08);
        const gy = ch * (.48 + Math.cos(now * .00017) * .06);
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(cw, ch) * .58);
        grad.addColorStop(0, 'rgba(202,246,255,.12)');
        grad.addColorStop(.35, 'rgba(45,98,104,.06)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx; p.y += p.vy;
          if (p.x < -10) p.x = cw + 10; else if (p.x > cw + 10) p.x = -10;
          if (p.y < -10) p.y = ch + 10; else if (p.y > ch + 10) p.y = -10;
          ctx.beginPath();
          ctx.fillStyle = `rgba(202,246,255,${p.a})`;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();

          for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j];
            const dx = p.x - q.x, dy = p.y - q.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 11025) {
              const dist = Math.sqrt(distSq);
              ctx.beginPath();
              ctx.strokeStyle = `rgba(202,246,255,${(1 - dist / 105) * .08})`;
              ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
            }
          }
        }
      }
      requestAnimationFrame(drawSignal);
    };
    requestAnimationFrame(drawSignal);
  } else if (canvas) {
    canvas.style.display = 'none';
  }
})();