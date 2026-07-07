(() => {
  const body = document.body;
  const loader = document.getElementById('loader');
  const skipLoader = document.getElementById('skipLoader');
  const loaderPercent = document.getElementById('loaderPercent');
  const loaderBar = document.getElementById('loaderBar');
  const loaderStatus = document.getElementById('loaderStatus');
  let progress = 0;

  body.style.overflow = 'hidden';

  const statuses = ['Rendering signal', 'Aligning frames', 'Calibrating motion', 'Opening sequence'];
  const loadingInterval = setInterval(() => {
    progress += Math.max(1, Math.round((100 - progress) / 14));
    progress = Math.min(progress, 100);
    loaderPercent.textContent = progress;
    loaderBar.style.width = `${progress}%`;
    loaderStatus.textContent = statuses[Math.min(statuses.length - 1, Math.floor(progress / 28))];
    if (progress >= 100) {
      clearInterval(loadingInterval);
      setTimeout(closeLoader, 260);
    }
  }, 55);

  function closeLoader() {
    loader.classList.add('is-hidden');
    body.style.overflow = '';
    setTimeout(() => loader.remove(), 900);
  }
  skipLoader.addEventListener('click', () => {
    clearInterval(loadingInterval);
    closeLoader();
  });

  // Live timecode motif.
  const tc = document.getElementById('timecode');
  const tcStart = performance.now();
  function updateTimecode(now) {
    const elapsed = now - tcStart;
    const totalFrames = Math.floor(elapsed / (1000 / 24));
    const frames = totalFrames % 24;
    const totalSeconds = Math.floor(totalFrames / 24);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);
    tc.textContent = `TC ${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
    requestAnimationFrame(updateTimecode);
  }
  const pad = n => String(n).padStart(2, '0');
  requestAnimationFrame(updateTimecode);

  // Scroll reveal and progress.
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  const progressBar = document.querySelector('.scroll-progress span');
  function updateScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const ratio = max > 0 ? scrollY / max : 0;
    progressBar.style.width = `${ratio * 100}%`;
  }
  addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  // Custom cursor.
  const cursor = document.getElementById('cursor');
  const cursorLabel = document.getElementById('cursorLabel');
  let mouseX = innerWidth / 2, mouseY = innerHeight / 2;
  let cursorX = mouseX, cursorY = mouseY;
  addEventListener('pointermove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
  function animateCursor() {
    cursorX += (mouseX - cursorX) * .16;
    cursorY += (mouseY - cursorY) * .16;
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;
    cursorLabel.style.left = `${cursorX}px`;
    cursorLabel.style.top = `${cursorY}px`;
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  document.querySelectorAll('[data-cursor]').forEach((el) => {
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

  // Magnetic controls.
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * .15;
      const y = (e.clientY - r.top - r.height / 2) * .15;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  // Subtle project-card perspective.
  document.querySelectorAll('.interactive-card').forEach((card) => {
    const visual = card.querySelector('.project-visual');
    card.addEventListener('pointermove', (e) => {
      const r = visual.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5;
      const py = (e.clientY - r.top) / r.height - .5;
      visual.style.transform = `perspective(900px) rotateX(${py * -3.4}deg) rotateY(${px * 4.5}deg) scale(1.008)`;
    });
    card.addEventListener('pointerleave', () => { visual.style.transform = ''; });
  });

  // Generative hero signal canvas.
  const canvas = document.getElementById('signalCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let cw = 0, ch = 0, dpr = 1;

  function resizeCanvas() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    cw = canvas.clientWidth;
    ch = canvas.clientHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(80, Math.floor(cw / 18));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * cw,
      y: Math.random() * ch,
      vx: (Math.random() - .5) * .16,
      vy: (Math.random() - .5) * .16,
      r: Math.random() * 1.7 + .35,
      a: Math.random() * .52 + .1
    }));
  }
  addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function drawSignal(t) {
    ctx.clearRect(0, 0, cw, ch);
    const gx = cw * (.55 + Math.sin(t * .00013) * .08);
    const gy = ch * (.48 + Math.cos(t * .00017) * .06);
    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(cw, ch) * .58);
    grad.addColorStop(0, 'rgba(202,246,255,.12)');
    grad.addColorStop(.35, 'rgba(45,98,104,.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = cw + 10;
      if (p.x > cw + 10) p.x = -10;
      if (p.y < -10) p.y = ch + 10;
      if (p.y > ch + 10) p.y = -10;
      ctx.beginPath();
      ctx.fillStyle = `rgba(202,246,255,${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 105) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(202,246,255,${(1 - dist / 105) * .09})`;
          ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    });
    requestAnimationFrame(drawSignal);
  }
  requestAnimationFrame(drawSignal);
})();