/* =============================================================
   Yo! ShotGunn — site behaviour
   1. Chrome: sticky nav, mobile menu
   2. Footage reels — drop-in video clips
   3. Roster reveal cards
   4. Placeholder link toasts
   5. Gallery lightbox
   ============================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------
     1. Chrome: sticky nav,
        and which section you are currently in.

        Layout reads (scrollHeight, section offsets) happen in
        measure() on load and resize only — never per scroll —
        and the scroll pass is coalesced into one rAF so it runs
        on the display's clock instead of once per scroll event.
     --------------------------------------------------------- */
  var nav = $('#nav');
  var navLinks = $$('.nav__links a');

  var maxScroll = 0;
  var vh = window.innerHeight;
  var marks = [];
  var queued = false;

  function measure() {
    vh = window.innerHeight;
    maxScroll = document.documentElement.scrollHeight - vh;
    marks = navLinks.map(function (a) {
      var href = a.getAttribute('href') || '';
      var el = href.charAt(0) === '#' ? document.getElementById(href.slice(1)) : null;
      return el ? { link: a, top: el.getBoundingClientRect().top + window.scrollY } : null;
    }).filter(Boolean);
  }

  function render() {
    queued = false;
    var y = window.scrollY || window.pageYOffset;

    if (nav) nav.setAttribute('data-stuck', y > 24 ? 'true' : 'false');

    /* the last section whose top has passed under the nav */
    var active = null;
    for (var i = 0; i < marks.length; i++) {
      if (marks[i].top - 140 <= y) active = marks[i];
    }
    navLinks.forEach(function (a) {
      var on = !!active && a === active.link;
      a.setAttribute('data-active', on ? 'true' : 'false');
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  function onScroll() {
    if (!queued) { queued = true; requestAnimationFrame(render); }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); onScroll(); });
  /* images settle after load and move everything below them */
  window.addEventListener('load', function () { measure(); onScroll(); });
  measure();
  render();

  /* Mobile menu. Below 1040px the section links live in a panel under
     the bar. The toggle opens it; Escape, choosing a link, clicking
     outside, or widening past the breakpoint closes it. */
  var navToggle = $('#navToggle');
  var desktopNav = window.matchMedia('(min-width: 1040px)');

  function setMenu(open, returnFocus) {
    if (!nav || !navToggle) return;
    nav.setAttribute('data-open', open ? 'true' : 'false');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open && returnFocus) navToggle.focus();
  }

  if (nav && navToggle) {
    navToggle.addEventListener('click', function () {
      setMenu(nav.getAttribute('data-open') !== 'true', false);
    });
    navLinks.forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false, false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.getAttribute('data-open') === 'true') setMenu(false, true);
    });
    document.addEventListener('click', function (e) {
      if (nav.getAttribute('data-open') === 'true' && !nav.contains(e.target)) setMenu(false, false);
    });
    var onBreakpoint = function (mq) { if (mq.matches) setMenu(false, false); };
    if (desktopNav.addEventListener) desktopNav.addEventListener('change', onBreakpoint);
    else if (desktopNav.addListener) desktopNav.addListener(onBreakpoint);
  }

  /* ---------------------------------------------------------
     Press feedback — lands on pointer-down so the surface never
     feels dead. The action still commits on release, and
     dragging off the element cancels the press.
     --------------------------------------------------------- */
  function pressable(el) {
    var set = function () { el.setAttribute('data-pressed', 'true'); };
    var clear = function () { el.removeAttribute('data-pressed'); };
    el.addEventListener('pointerdown', set);
    el.addEventListener('pointerup', clear);
    el.addEventListener('pointerleave', clear);
    el.addEventListener('pointercancel', clear);
    el.addEventListener('blur', clear);
  }

  /* ---------------------------------------------------------
     2. Footage reels

     Each <figure class="reel"> carries a data-src. If the file is
     there, it swaps itself in; if it is not, the designed empty
     state stays put. So adding a clip means dropping the file at
     that path — no markup to edit.
     --------------------------------------------------------- */
  var reels = $$('.reel[data-src]');

  reels.forEach(function (reel) {
    var frame = $('.reel__frame', reel);
    var empty = $('.reel__empty', reel);
    var src = reel.getAttribute('data-src');
    var poster = reel.getAttribute('data-poster');
    var title = $('.reel__t', reel);
    if (!frame || !src) return;

    var v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');
    v.preload = 'metadata';
    if (poster) v.poster = poster;
    /* reduced motion: no silent autoplay, hand over the controls instead */
    if (reduced) v.controls = true;

    var settled = false;
    function fail() {
      if (settled) return;
      settled = true;
      reel.setAttribute('data-failed', 'true');
      if (v.parentNode) v.parentNode.removeChild(v);
    }
    function label() {
      if (!reel.getAttribute('data-loaded')) return;
      frame.setAttribute('aria-label', (v.paused ? 'Play' : 'Pause') + ' clip: ' +
        (title ? title.textContent.trim() : 'footage'));
    }
    function ready() {
      if (settled) return;
      settled = true;
      if (empty) empty.remove();
      reel.setAttribute('data-loaded', 'true');
      frame.tabIndex = 0;
      frame.setAttribute('role', 'button');
      label();
    }
    v.addEventListener('play', label);
    v.addEventListener('pause', label);

    v.addEventListener('loadeddata', ready);
    v.addEventListener('error', fail);
    /* a missing file can also surface on the <source>, not the <video> */
    setTimeout(function () { if (!settled && v.readyState === 0) fail(); }, 6000);

    v.src = src;
    frame.insertBefore(v, frame.firstChild);

    pressable(frame);

    /* click, Enter or Space pauses or resumes a clip */
    function toggleClip() {
      if (!reel.getAttribute('data-loaded')) return;
      if (v.paused) { v.play().catch(function () {}); } else { v.pause(); }
    }
    frame.addEventListener('click', toggleClip);
    frame.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleClip(); }
    });
  });

  /* start buffering a clip well before it scrolls in, so it is already
     moving when it arrives rather than sitting on its poster */
  if (reels.length && 'IntersectionObserver' in window) {
    var warm = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var v = e.target.querySelector('video');
        if (v) v.preload = 'auto';
        warm.unobserve(e.target);
      });
    }, { rootMargin: '1200px 0px' });
    reels.forEach(function (r) { warm.observe(r); });
  }

  /* only let clips run while they are on screen */
  if (reels.length && !reduced && 'IntersectionObserver' in window) {
    var vo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target.querySelector('video');
        if (!v) return;
        if (e.isIntersecting) { v.play().catch(function () {}); }
        else { v.pause(); }
      });
    }, { threshold: 0.25 });
    reels.forEach(function (r) { vo.observe(r); });
  }

  /* ---------------------------------------------------------
     3. Roster reveal cards

     Tap flips the card. Character art lives on the back — drop a
     file at the path in its <img> and it appears; until then the
     back reads "portrait pending" rather than a broken image.
     --------------------------------------------------------- */
  $$('.slot--flip').forEach(function (card) {
    var back = $('.slot__face--back', card);
    var img = back ? $('img', back) : null;

    if (img) {
      var pending = function () { back.setAttribute('data-pending', 'true'); };
      if (img.complete && img.naturalWidth === 0) pending();
      img.addEventListener('error', pending);
    }

    pressable(card);

    card.addEventListener('click', function () {
      var open = card.getAttribute('data-flipped') === 'true';
      card.setAttribute('data-flipped', open ? 'false' : 'true');
      card.setAttribute('aria-pressed', open ? 'false' : 'true');
    });
  });

  /* ---------------------------------------------------------
     4. Placeholder links — swap the href in index.html and the
        toast stops firing for that link automatically.
     --------------------------------------------------------- */
  var COPY = {
    steam: 'The Steam page goes live with the trailer.',
    discord: 'The Discord opens alongside the demo.',
    presskit: 'The press kit ships with the trailer.',
    assets: 'Logos and screenshots ship with the press kit.',
    email: 'Studio contact opens with the press kit.',
    instagram: 'Instagram launches with the first devlog.',
    youtube: 'Channel launches with the first devlog.'
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
          'background:#17171d;color:#edeae3;border:1px solid #2a2a33;border-left:3px solid #e0b13a;' +
          'padding:.8rem 1.2rem;font:400 .76rem/1.4 "Chomage",sans-serif;border-radius:10px;letter-spacing:.14em;' +
          'text-transform:uppercase;z-index:999;opacity:0;transition:opacity .25s,transform .25s;' +
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

  /* ---------------------------------------------------------
     5. Gallery lightbox

     <dialog> gives the focus trap, the Escape key and focus
     restoration for free; we add paging and a backdrop click.
     --------------------------------------------------------- */
  var shots = $$('.shot');
  var lightbox = $('#lightbox');

  if (shots.length && lightbox && lightbox.showModal) {
    var lbImg = $('#lightboxImg');
    var lbCount = $('#lightboxCount');
    var current = 0;

    function show(i) {
      current = (i + shots.length) % shots.length;
      var thumb = $('img', shots[current]);
      var full = shots[current].getAttribute('data-full');
      /* the thumbnail is already decoded: show it at once, then swap in
         the full still when it lands, and fetch the neighbours ahead */
      if (thumb && thumb.currentSrc) lbImg.src = thumb.currentSrc;
      var hi = new Image();
      hi.onload = function () { if (shots[current].getAttribute('data-full') === full) lbImg.src = full; };
      hi.src = full;
      [current - 1, current + 1].forEach(function (k) {
        new Image().src = shots[(k + shots.length) % shots.length].getAttribute('data-full');
      });
      lbImg.alt = thumb ? thumb.alt : '';
      lbCount.textContent = (current + 1) + ' / ' + shots.length;
    }

    shots.forEach(function (btn, i) {
      pressable(btn);
      btn.addEventListener('click', function () { show(i); lightbox.showModal(); });
    });

    $('#lightboxPrev').addEventListener('click', function () { show(current - 1); });
    $('#lightboxNext').addEventListener('click', function () { show(current + 1); });
    $('#lightboxClose').addEventListener('click', function () { lightbox.close(); });

    lightbox.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
    });

    /* clicking the backdrop — anywhere outside the dialog's own box */
    lightbox.addEventListener('click', function (e) {
      var r = lightbox.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        lightbox.close();
      }
    });
  }
})();
