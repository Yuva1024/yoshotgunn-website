/* W ONES — studio site behaviour: mobile menu, hero footage, the game
   card's rotating stills, and placeholder links. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------
     Mobile menu. Escape, choosing a link, clicking outside or
     widening past the breakpoint all close it.
     --------------------------------------------------------- */
  var bar = $('#bar');
  var toggle = $('#barToggle');
  var wide = window.matchMedia('(min-width: 960px)');

  function setMenu(open, returnFocus) {
    bar.setAttribute('data-open', open ? 'true' : 'false');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open && returnFocus) toggle.focus();
  }

  if (bar && toggle) {
    toggle.addEventListener('click', function () {
      setMenu(bar.getAttribute('data-open') !== 'true', false);
    });
    $$('.bar__links a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false, false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && bar.getAttribute('data-open') === 'true') setMenu(false, true);
    });
    document.addEventListener('click', function (e) {
      if (bar.getAttribute('data-open') === 'true' && !bar.contains(e.target)) setMenu(false, false);
    });
    var onWide = function (mq) { if (mq.matches) setMenu(false, false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* ---------------------------------------------------------
     Hero footage. The clips listed in data-clips play one after
     the other and start over when the last one ends. A second
     player, stacked on top, starts the next clip just before the
     current one finishes and fades in over it. Muted, only while
     on screen, never under reduced motion, and pausable —
     background video over five seconds needs a way to stop it.
     --------------------------------------------------------- */
  var video = $('#heroVideo');
  var pauseBtn = $('#heroPause');
  var userPaused = false;
  var FADE = 0.9;           /* seconds; matches the CSS transition */

  if (video) {
    video.muted = true;

    var clips = (video.getAttribute('data-clips') || '').split(/\s+/).filter(Boolean).map(function (pair) {
      return pair.split('|')[0];
    });
    var players = [video];
    var active = 0;
    var clip = 0;
    var fading = false;

    if (clips.length > 1) {
      var twin = video.cloneNode(false);
      twin.removeAttribute('id');
      twin.removeAttribute('poster');
      twin.removeAttribute('data-clips');
      twin.muted = true;
      twin.preload = 'auto';
      twin.classList.add('is-hidden');
      video.classList.add('is-top');
      video.parentNode.insertBefore(twin, video.nextSibling);
      players.push(twin);
    }

    var cur = function () { return players[active]; };

    function setLabel() {
      if (!pauseBtn) return;
      var playing = !cur().paused;
      pauseBtn.setAttribute('aria-pressed', playing ? 'false' : 'true');
      $('span', pauseBtn).textContent = playing ? 'Pause footage' : 'Play footage';
    }

    /* load the next clip into the hidden player so it is ready to go */
    function queueNext() {
      if (players.length < 2) return;
      var p = players[1 - active];
      var src = clips[(clip + 1) % clips.length];
      if (p.getAttribute('src') !== src) p.src = src;
    }

    function handOver() {
      if (fading || players.length < 2) return;
      fading = true;
      var from = cur();
      var to = players[1 - active];
      queueNext();
      to.currentTime = 0;
      to.classList.add('is-hidden', 'is-top');
      from.classList.remove('is-top');
      var shown = false;
      function reveal() {
        if (shown) return;
        shown = true;
        to.removeEventListener('playing', reveal);
        requestAnimationFrame(function () { to.classList.remove('is-hidden'); });
        setTimeout(function () {
          from.pause();
          from.classList.add('is-hidden');
          active = 1 - active;
          clip = (clip + 1) % clips.length;
          fading = false;
          queueNext();
          setLabel();
        }, FADE * 1000 + 50);
      }
      to.addEventListener('playing', reveal);
      to.play().catch(function () { fading = false; to.removeEventListener('playing', reveal); });
    }

    players.forEach(function (p) {
      p.addEventListener('timeupdate', function () {
        if (p !== cur() || userPaused || !p.duration) return;
        if (p.duration - p.currentTime <= FADE) handOver();
      });
      p.addEventListener('ended', function () {
        if (p !== cur() || fading) return;
        if (players.length < 2) { p.currentTime = 0; if (!userPaused) p.play().catch(function () {}); }
        else handOver();
      });
      p.addEventListener('play', setLabel);
      p.addEventListener('pause', setLabel);
    });
    video.addEventListener('playing', queueNext, { once: true });

    function playCur() { if (!userPaused) cur().play().catch(function () {}); }
    function pauseAll() { players.forEach(function (p) { p.pause(); }); }

    if (reduced) {
      userPaused = true;
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) playCur();
          else pauseAll();
        });
      }, { threshold: 0.2 }).observe(video);
    } else {
      playCur();
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', function () {
        if (cur().paused) { userPaused = false; playCur(); }
        else { userPaused = true; pauseAll(); }
      });
    }
    setLabel();
  }

  /* ---------------------------------------------------------
     Game card. Two stacked stills cross-fade through the gallery
     listed in data-slides. It holds while hovered or focused,
     stops while off screen or in a background tab, and stays on
     the first still under reduced motion.
     --------------------------------------------------------- */
  var art = $('.game__art[data-slides]');
  var layers = art ? $$('.game__slide', art) : [];

  if (art && layers.length === 2 && !reduced) {
    var slides = art.getAttribute('data-slides').split(/\s+/).filter(Boolean);
    var shown = 0;          /* which layer is visible */
    var nextSlide = 0;      /* index into slides */
    var timer = null;
    var onScreen = false;
    var held = false;
    var INTERVAL = 3000;    /* ms each still stays up */

    function advance() {
      var base = slides[nextSlide];
      nextSlide = (nextSlide + 1) % slides.length;
      var incoming = layers[1 - shown];
      var swapped = false;
      function swap() {
        if (swapped) return;
        swapped = true;
        incoming.classList.add('is-on');
        layers[shown].classList.remove('is-on');
        shown = 1 - shown;
      }
      incoming.onload = swap;
      incoming.sizes = '(max-width: 900px) 100vw, 45vw';
      incoming.srcset = base + '-sm.webp 640w, ' + base + '.webp 1600w';
      incoming.src = base + '-sm.webp';
      /* fetch the one after this while it is on screen */
      new Image().src = slides[nextSlide] + '-sm.webp';
      if (incoming.complete && incoming.naturalWidth) swap();
    }

    function sync() {
      var run = onScreen && !held && !document.hidden;
      if (run && !timer) timer = setInterval(advance, INTERVAL);
      if (!run && timer) { clearInterval(timer); timer = null; }
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        sync();
      }, { threshold: 0.35 }).observe(art);
    } else {
      onScreen = true;
      sync();
    }
    art.addEventListener('mouseenter', function () { held = true; sync(); });
    art.addEventListener('mouseleave', function () { held = false; sync(); });
    art.addEventListener('focusin', function () { held = true; sync(); });
    art.addEventListener('focusout', function () { held = false; sync(); });
    document.addEventListener('visibilitychange', sync);
  }

  /* ---------------------------------------------------------
     Links that are not live yet. Give one a real href and its
     message stops firing on its own.
     --------------------------------------------------------- */
  var COPY = {
    steam: 'The Steam page goes live with the trailer.',
    presskit: 'The press kit ships with the trailer.',
    email: 'Studio contact opens with the press kit.',
    discord: 'The Discord opens alongside the demo.',
    instagram: 'Instagram launches with the first devlog.',
    youtube: 'The channel launches with the first devlog.'
  };
  var toast;
  $$('[data-needs-link]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (href && href !== '#') return;
      e.preventDefault();
      if (!toast) {
        toast = document.createElement('div');
        toast.setAttribute('role', 'status');
        toast.style.cssText =
          'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(12px);' +
          'background:#000;color:#fff;border:1px solid #fff;border-radius:10px;padding:.85rem 1.25rem;' +
          'font:400 .74rem/1.4 "Alata",sans-serif;letter-spacing:.16em;text-transform:uppercase;' +
          'z-index:400;opacity:0;transition:opacity .25s,transform .25s;' +
          'max-width:calc(100vw - 2rem);text-align:center;';
        document.body.appendChild(toast);
      }
      toast.textContent = COPY[a.getAttribute('data-needs-link')] || 'Coming soon.';
      requestAnimationFrame(function () {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
      clearTimeout(toast._t);
      toast._t = setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(12px)';
      }, 2600);
    });
  });
})();
