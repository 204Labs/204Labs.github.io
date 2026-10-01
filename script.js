(() => {
  'use strict';
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('.menu-toggle');
  const themeToggle = document.querySelector('.theme-toggle');
  const navigation = document.querySelector('#primary-nav');
  const mobile = window.matchMedia('(max-width: 600px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const themeStorageKey = '204labs_theme';

  // Progressive enhancement: links are visible and usable when JavaScript is unavailable.
  document.documentElement.classList.add('enhanced');
  menu.hidden = false;
  if (themeToggle) {
    themeToggle.hidden = false;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const setTheme = (theme, persist = true) => {
      const nextTheme = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = nextTheme;
      themeMeta?.setAttribute('content', nextTheme === 'dark' ? '#101A2C' : '#23324A');
      themeToggle.setAttribute('aria-label', nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      themeToggle.setAttribute('title', nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      themeToggle.querySelector('span').textContent = nextTheme === 'dark' ? '☼' : '◐';
      if (!persist) return;
      try {
        window.localStorage.setItem(themeStorageKey, nextTheme);
      } catch (_) {
        // If storage is unavailable, the selected theme still applies for this page view.
      }
    };
    setTheme(document.documentElement.dataset.theme, false);
    themeToggle.addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  }
  const setMenu = (open, returnFocus = false) => {
    menu.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
    if (returnFocus) menu.focus();
  };
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') setMenu(false, true);
  });
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setMenu(false);
  });
  mobile.addEventListener('change', () => setMenu(false));

  // Retain native anchor history and scrolling, while moving keyboard focus to the destination.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => {
      const destination = document.querySelector(link.getAttribute('href'));
      if (!destination) return;
      setMenu(false);
      destination.setAttribute('tabindex', '-1');
      destination.focus({ preventScroll: true });
      destination.addEventListener('blur', () => destination.removeAttribute('tabindex'), { once: true });
    });
  });

  let ticking = false;
  const updateHeader = () => {
    header.classList.toggle('scrolled', window.scrollY > 30);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });
  updateHeader();

  if (!('IntersectionObserver' in window)) return;
  const chapterLinks = [...document.querySelectorAll('.chapter-nav a')];
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  const chapterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      chapterLinks.forEach((link) => {
        if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-24% 0px -64% 0px', threshold: 0 });
  chapters.forEach((chapter) => chapterObserver.observe(chapter));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      if (!reducedMotion.matches) entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
})();

// Original geometric artwork. No animation library, perpetual loop, or scroll interception.
(() => {
  'use strict';
  const surface = document.querySelector('.philosophy-content');
  const artwork = document.querySelector('.outlook-symbol');
  const canvas = document.querySelector('.outlook-canvas');
  if (!surface || !canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const forced = window.matchMedia('(forced-colors: active)');
  const palette = getComputedStyle(document.documentElement);
  const cream = palette.getPropertyValue('--cream').trim();
  const mustard = palette.getPropertyValue('--mustard').trim();
  const aqua = palette.getPropertyValue('--aqua').trim();
  let size = 0;
  let frame = 0;
  let lastTime = 0;
  let visible = !('IntersectionObserver' in window);
  let touchActive = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchMoved = false;
  const rest = { x: -.25, y: .4 };
  const angle = { ...rest };
  const target = { ...rest };
  const allowed = () => visible && !document.hidden && !reduced.matches && !forced.matches;

  const project = (x, y, z) => {
    const cx = Math.cos(angle.x), sx = Math.sin(angle.x);
    const cy = Math.cos(angle.y), sy = Math.sin(angle.y);
    const ry = y * cx - z * sx;
    const rz = y * sx + z * cx;
    const rx = x * cy + rz * sy;
    const depth = -x * sy + rz * cy;
    const scale = size * .405 * (1 + depth * .075);
    return [size / 2 + rx * scale, size / 2 + ry * scale, depth];
  };
  const draw = () => {
    context.clearRect(0, 0, size, size);
    context.lineWidth = .8;
    // Meridian loops make a spherical form while leaving the message readable.
    for (let ring = 0; ring < 16; ring++) {
      const longitude = ring * Math.PI / 16;
      context.strokeStyle = cream;
      context.globalAlpha = ring % 4 === 0 ? .24 : .11;
      context.beginPath();
      for (let step = 0; step <= 96; step++) {
        const t = step * Math.PI * 2 / 96;
        const p = project(Math.cos(t) * Math.cos(longitude), Math.sin(t), Math.cos(t) * Math.sin(longitude));
        if (step === 0) context.moveTo(p[0], p[1]);
        else context.lineTo(p[0], p[1]);
      }
      context.stroke();
    }
    // Two independent satellite paths echo the existing circular brand language.
    [ { tilt: .55, phase: -.8, colour: mustard }, { tilt: -.8, phase: 2.5, colour: aqua } ].forEach((orbit, index) => {
      context.strokeStyle = orbit.colour;
      context.globalAlpha = .3;
      context.beginPath();
      for (let step = 0; step <= 120; step++) {
        const t = step * Math.PI * 2 / 120;
        const p = project(1.1 * Math.cos(t), 1.1 * Math.sin(t) * Math.cos(orbit.tilt), 1.1 * Math.sin(t) * Math.sin(orbit.tilt));
        if (!step) context.moveTo(p[0], p[1]);
        else context.lineTo(p[0], p[1]);
      }
      context.stroke();
      const phase = orbit.phase + angle.y * .45;
      const p = project(1.1 * Math.cos(phase), 1.1 * Math.sin(phase) * Math.cos(orbit.tilt), 1.1 * Math.sin(phase) * Math.sin(orbit.tilt));
      context.globalAlpha = 1;
      context.fillStyle = orbit.colour;
      context.beginPath();
      context.arc(p[0], p[1], index ? 5 : 8, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  };
  const tick = (time) => {
    frame = 0;
    if (!allowed()) return;
    const dt = lastTime ? Math.min(time - lastTime, 64) : 16;
    lastTime = time;
    const ease = 1 - Math.exp(-dt / 180);
    angle.x += (target.x - angle.x) * ease;
    angle.y += (target.y - angle.y) * ease;
    draw();
    if (Math.abs(target.x - angle.x) + Math.abs(target.y - angle.y) > .0005) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  };
  const start = () => { if (!frame && allowed()) frame = requestAnimationFrame(tick); };
  const reset = () => { Object.assign(target, rest); start(); };
  const resize = () => {
    size = canvas.getBoundingClientRect().width;
    if (!size) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  };
  artwork.classList.add('outlook-ready');
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(artwork);
  else window.addEventListener('resize', resize, { passive: true });
  const moveGlobe = (event) => {
    if (!allowed()) return;
    const box = surface.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1));
    target.x = rest.x - y * .65;
    target.y = rest.y + x * 1.3;
    start();
  };
  surface.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') {
      if (!touchActive) return;
      const dx = Math.abs(event.clientX - touchStartX);
      const dy = Math.abs(event.clientY - touchStartY);
      if (dx > 8 || dy > 8) touchMoved = true;
      if (touchMoved && dx >= dy * .55) moveGlobe(event);
      return;
    }
    moveGlobe(event);
  }, { passive: true });
  surface.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' || !allowed()) return;
    touchActive = true;
    touchMoved = false;
    touchStartX = event.clientX;
    touchStartY = event.clientY;
    moveGlobe(event);
  });
  const endTouch = () => {
    touchActive = false;
    touchMoved = false;
    reset();
  };
  surface.addEventListener('pointerup', (event) => { if (event.pointerType === 'touch') endTouch(); });
  surface.addEventListener('pointercancel', (event) => { if (event.pointerType === 'touch') endTouch(); });
  surface.addEventListener('pointerleave', reset);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) stop();
    }).observe(surface);
  }
  const preferenceChanged = () => {
    stop();
    Object.assign(angle, rest);
    Object.assign(target, rest);
    resize();
  };
  reduced.addEventListener('change', preferenceChanged);
  forced.addEventListener('change', preferenceChanged);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
})();

// ECHO: progressive enhancement confined to #approach; scrolling remains native.
(() => {
  'use strict';
  const section = document.querySelector('#approach');
  if (!section) return;
  const shell = section.querySelector('.echo-shell');
  if (!shell) return;
  const track = section.querySelector('.echo-track');
  const stages = [...section.querySelectorAll('.echo-stage')];
  const letters = [...section.querySelectorAll('.echo-nav-letter')];
  const previous = section.querySelector('.echo-previous');
  const next = section.querySelector('.echo-next');
  const instruction = section.querySelector('.echo-instruction');
  const desktop = matchMedia('(min-width: 1000px) and (min-height: 780px)');
  const mobileSequence = matchMedia('(max-width: 999px) and (min-height: 640px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const names = ['Experimentation', 'Curiosity with Purpose', 'Human', 'Optimism'];
  const read = [false, false, false, false];
  const explored = new Set();
  let active = -1;
  let pinned = false;
  let top = 138;
  let step = 700;
  let scrollFrame = 0;
  let playFrame = 0;
  let configuring = false;
  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const ease = (v) => v * v * (3 - 2 * v);
  const nodePositions = [
    [[55,85],[145,175],[235,60],[310,170]],
    [[110,135],[160,100],[210,155],[265,115]],
    [[65,195],[155,210],[215,190],[290,220]],
    [[70,242],[140,242],[210,242],[280,242]]
  ];
  const render = (index, rawProgress) => {
    const stage = stages[index];
    const progress = clamp(rawProgress);
    stage.style.setProperty('--echo-progress', progress.toFixed(4));
    letters.forEach((letter, i) => letter.style.setProperty('--echo-fill', i < index ? 1 : i === index ? progress : 0));
    const copy = stage.querySelector('.echo-copy');
    const parts = [...copy.children];
    const revealAll = reduced.matches || read[index];
    const threshold = (i) => index === 2 ? .78 + i * .07 : .43 + i * .1;
    parts.forEach((part, i) => part.classList.toggle('is-revealed', revealAll || progress >= threshold(i)));
    const isRead = revealAll || progress >= threshold(parts.length - 1);
    copy.classList.toggle('is-revealed', isRead);
    const readButton = stage.querySelector('.echo-read');
    readButton.hidden = reduced.matches;
    if (readButton.getAttribute('aria-expanded') !== String(isRead)) {
      readButton.setAttribute('aria-expanded', String(isRead));
      readButton.innerHTML = isRead ? 'Explore again <span aria-hidden="true">↺</span>' : 'Read the thinking <span aria-hidden="true">+</span>';
    }
    if (index === 0) {
      const phase = clamp(progress / .75) * 3;
      const from = Math.min(2, Math.floor(phase));
      const mix = ease(phase - from);
      stage.querySelectorAll('.echo-node').forEach((node, i) => {
        const a = nodePositions[from][i], b = nodePositions[from + 1][i];
        node.style.transform = `translate(${a[0] + (b[0] - a[0]) * mix}px,${a[1] + (b[1] - a[1]) * mix}px)`;
      });
    }
    if (index === 1) stage.querySelectorAll('.echo-question').forEach((question, i) => {
      const discovered = reduced.matches || explored.has(question) || progress >= .12 + i * .18;
      question.classList.toggle('is-discovered', discovered);
      question.setAttribute('aria-expanded', String(discovered));
    });
    if (index === 3) stage.querySelector('.echo-ending').classList.toggle('is-revealed', revealAll || progress >= .8);
  };
  const activate = (index) => {
    if (active === index) return;
    const old = stages[active];
    const moveFocus = old && old.contains(document.activeElement);
    active = index;
    stages.forEach((stage, i) => {
      stage.classList.toggle('is-active', i === index);
      stage.setAttribute('aria-hidden', String(i !== index));
      stage.inert = i !== index;
      if (i === index) letters[i].setAttribute('aria-current', 'step');
      else letters[i].removeAttribute('aria-current');
    });
    previous.disabled = index === 0;
    next.textContent = index === 3 ? 'Continue to portfolio ↓' : `Next: ${names[index + 1]} →`;
    if (moveFocus) letters[index].focus({ preventScroll: true });
  };
  const updateScroll = () => {
    scrollFrame = 0;
    if (!pinned) return;
    const amount = clamp((top - track.getBoundingClientRect().top) / step, 0, 3.999);
    const index = Math.floor(amount);
    activate(index);
    render(index, read[index] ? 1 : clamp((amount - index) / .88));
  };
  const scheduleScroll = () => {
    if (pinned && !scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  };
  const scrollToStage = (index, fraction = .04) => {
    window.scrollTo({ top: window.scrollY + track.getBoundingClientRect().top - top + step * (index + fraction), behavior: 'instant' });
    updateScroll();
  };
  const select = (index, focusLetter = false) => {
    cancelAnimationFrame(playFrame);
    playFrame = 0;
    if (pinned) scrollToStage(index);
    else {
      activate(index);
      render(index, reduced.matches || read[index] ? 1 : 0);
      const y = window.scrollY + shell.getBoundingClientRect().top - top;
      window.scrollTo({ top: y, behavior: reduced.matches ? 'instant' : 'smooth' });
    }
    if (focusLetter) letters[index].focus({ preventScroll: true });
  };
  const showThinking = (index) => {
    const replay = stages[index].querySelector('.echo-read').getAttribute('aria-expanded') === 'true';
    if (replay) {
      read[index] = false;
      if (pinned) { scrollToStage(index); return; }
    }
    cancelAnimationFrame(playFrame);
    if (pinned || reduced.matches) {
      read[index] = true;
      render(index, 1);
      return;
    }
    // A single finite iteration lets touch/keyboard visitors experience the same idea.
    const started = performance.now();
    const play = (now) => {
      if (index !== active || document.hidden) { playFrame = 0; return; }
      const p = clamp((now - started) / 1200);
      render(index, p);
      if (p < 1) playFrame = requestAnimationFrame(play);
      else { read[index] = true; playFrame = 0; render(index, 1); }
    };
    playFrame = requestAnimationFrame(play);
  };
  const playStage = (index, duration = 1600) => {
    cancelAnimationFrame(playFrame);
    if (pinned || reduced.matches || read[index]) {
      render(index, read[index] ? 1 : 0);
      return;
    }
    const started = performance.now();
    const play = (now) => {
      if (index !== active || document.hidden || pinned) { playFrame = 0; return; }
      const p = clamp((now - started) / duration);
      render(index, p);
      if (p < .86) playFrame = requestAnimationFrame(play);
      else playFrame = 0;
    };
    playFrame = requestAnimationFrame(play);
  };
  const configure = () => {
    if (configuring) return;
    configuring = true;
    const sectionBounds = section.getBoundingClientRect();
    const wasInView = sectionBounds.top < window.innerHeight && sectionBounds.bottom > top;
    const keepStage = active;
    cancelAnimationFrame(playFrame);
    playFrame = 0;
    const headerHeight = document.querySelector('.site-header').getBoundingClientRect().height;
    top = headerHeight + 12;
    const useMobileSequence = mobileSequence.matches && !desktop.matches;
    const height = window.innerHeight - top - (useMobileSequence ? 8 : 12);
    step = useMobileSequence ? Math.max(520, height * .92) : Math.max(864, height * 1.215);
    section.style.setProperty('--echo-top', `${top}px`);
    section.style.setProperty('--echo-pin-height', `${height}px`);
    section.style.setProperty('--echo-step', `${step}px`);
    const wasPinned = pinned;
    const largeText = parseFloat(getComputedStyle(document.documentElement).fontSize) > 22;
    section.classList.toggle('echo-large-text', largeText);
    pinned = (desktop.matches || useMobileSequence) && !reduced.matches && !largeText;
    section.classList.toggle('echo-pinned', pinned);
    section.classList.toggle('echo-mobile-pinned', pinned && useMobileSequence);
    // At high text zoom or short viewports, use the sequential version instead of clipping.
    if (pinned && !useMobileSequence && shell.scrollHeight > height + 2) {
      pinned = false;
      section.classList.remove('echo-pinned');
      section.classList.remove('echo-mobile-pinned');
    }
    // Reduce the actual toolbar-to-stage gap, including the flexible desktop space.
    section.style.setProperty('--echo-lift', '0px');
    if (pinned) {
      const toolbarBottom = section.querySelector('.echo-toolbar').getBoundingClientRect().bottom;
      const stageTop = stages[0].getBoundingClientRect().top;
      section.style.setProperty('--echo-lift', `${-Math.max(0, stageTop - toolbarBottom) * .3}px`);
    }
    instruction.textContent = pinned ? 'Scroll to explore. Or choose a letter.' : 'Choose a letter or explore the next principle.';
    if (pinned) {
      if (!wasPinned && wasInView && keepStage >= 0) scrollToStage(keepStage);
      else updateScroll();
    }
    else {
      activate(Math.max(0, active));
      render(active, reduced.matches || read[active] ? 1 : 0);
      if (!wasPinned) playStage(active, 1800);
      if (wasPinned && wasInView) window.scrollTo({ top: window.scrollY + shell.getBoundingClientRect().top - top, behavior: 'instant' });
    }
    configuring = false;
  };
  section.querySelector('.echo-letter-nav').hidden = false;
  section.querySelector('.echo-controls').hidden = false;
  stages.forEach((stage, index) => {
    const button = stage.querySelector('.echo-read');
    button.hidden = false;
    button.addEventListener('click', () => showThinking(index));
  });
  section.querySelectorAll('.echo-question').forEach((question) => {
    question.disabled = false;
    question.setAttribute('aria-label', question.textContent.trim());
    const discover = () => {
      explored.add(question);
      question.classList.add('is-discovered');
      question.setAttribute('aria-expanded', 'true');
    };
    question.addEventListener('click', discover);
    question.addEventListener('pointerenter', discover);
    question.addEventListener('focus', discover);
  });
  letters.forEach((letter, index) => {
    letter.addEventListener('click', () => { select(index); playStage(index, 1800); });
    letter.addEventListener('keydown', (event) => {
      const destinations = { ArrowRight: Math.min(3, index + 1), ArrowLeft: Math.max(0, index - 1), Home: 0, End: 3 };
      if (!(event.key in destinations)) return;
      event.preventDefault();
      select(destinations[event.key], true);
      playStage(destinations[event.key], 1800);
    });
  });
  previous.addEventListener('click', () => { const index = Math.max(0, active - 1); select(index, true); playStage(index, 1800); });
  next.addEventListener('click', () => {
    if (active < 3) { const index = active + 1; select(index, true); playStage(index, 1800); }
    else stages[3].querySelector('.echo-ending').click();
  });
  section.classList.add('echo-ready');
  activate(0);
  configure();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting || pinned || reduced.matches) return;
      playStage(active, 1800);
      observer.disconnect();
    }, { threshold: .35 }).observe(section);
  }
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', configure, { passive: true });
  reduced.addEventListener('change', configure);
  desktop.addEventListener('change', configure);
  mobileSequence.addEventListener('change', configure);
  if (document.fonts) document.fonts.ready.then(configure);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(playFrame); playFrame = 0; }
  });
})();

