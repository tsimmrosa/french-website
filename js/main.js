/* La Cour des Lavandes — minimal, dependency-free JS
   Handles: sticky nav, scroll reveal, lightbox, UTM capture,
   cookie consent + Meta Pixel loading, form submit + Lead event. */

(function () {
  "use strict";

  /* ============================================================
     CONFIG — fill these in before launch
     ============================================================ */
  var META_PIXEL_ID = "";            // e.g. "1234567890123456"
  var FORM_ENDPOINT = "/api/lead";   // Vercel serverless handler → Resend (key stays server-side)
  var isFrench = document.documentElement.lang === "fr";

  /* ---------- Sticky nav + mini price bar ---------- */
  var nav = document.querySelector(".nav");
  var pricebar = document.getElementById("pricebar");
  var hero = document.querySelector(".hero");
  var enquire = document.getElementById("enquire");
  var onScroll = function () {
    nav.classList.toggle("scrolled", window.scrollY > 40);
    if (pricebar) {
      var past = window.scrollY > (hero ? hero.offsetHeight * 0.85 : 600);
      var nearForm = enquire && enquire.getBoundingClientRect().top < window.innerHeight * 0.9;
      pricebar.classList.toggle("show", past && !nearForm);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var open = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Income count-up ---------- */
  var totalEl = document.querySelector(".income-total dd");
  if (totalEl && "IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var target = parseInt(totalEl.textContent.replace(/[^\d]/g, ""), 10);
    if (target) {
      var counted = false;
      var countIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !counted) {
            counted = true; countIO.disconnect();
            var start = null, dur = 1400;
            var tick = function (t) {
              if (!start) start = t;
              var p = Math.min((t - start) / dur, 1);
              totalEl.textContent = "€" + Math.floor(p * target).toLocaleString(isFrench ? "fr-FR" : "en-GB");
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      }, { threshold: 0.5 });
      countIO.observe(totalEl);
    }
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- Staggered image reveal ---------- */
  var media = Array.prototype.slice.call(document.querySelectorAll(
    ".g-item, .area-item, .chapter-media, .band-media"));
  media.forEach(function (el) { el.classList.add("io-img"); });
  document.querySelectorAll(".gallery-grid, .area-grid, .chapter-gallery").forEach(function (grid) {
    Array.prototype.slice.call(grid.querySelectorAll(".io-img")).forEach(function (k, i) {
      k.style.transitionDelay = Math.min(i * 70, 420) + "ms";
    });
  });
  if ("IntersectionObserver" in window) {
    var imgIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); imgIO.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    media.forEach(function (el) { imgIO.observe(el); });
  } else {
    media.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Per-section slideshows (chapter galleries) ---------- */
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function buildSlideshow(container) {
    var slides = Array.prototype.slice.call(container.children);
    if (slides.length < 1) return;
    container.classList.add("carousel");
    var track = document.createElement("div");
    track.className = "ss-track";
    slides.forEach(function (s) {
      s.classList.add("slide");
      // Upgrade to the full-res source (same file the lightbox opens).
      var big = s.getAttribute("href");
      var img = s.querySelector("img");
      var src = s.querySelector("picture source");
      if (big && img) {
        if (src) src.parentNode.removeChild(src);
        img.removeAttribute("srcset");
        img.src = big;
      }
      track.appendChild(s);
    });
    container.appendChild(track);
    if (slides.length < 2) { container.classList.add("single"); return; } // one photo — full width, no controls

    var prev = document.createElement("button");
    prev.className = "ss-btn ss-prev"; prev.setAttribute("aria-label", isFrench ? "Photos précédentes" : "Previous photos"); prev.innerHTML = "‹";
    var next = document.createElement("button");
    next.className = "ss-btn ss-next"; next.setAttribute("aria-label", isFrench ? "Photos suivantes" : "Next photos"); next.innerHTML = "›";
    container.appendChild(prev); container.appendChild(next);

    function stepSize() {
      var first = track.querySelector(".slide");
      var gap = parseFloat(getComputedStyle(track).columnGap) || 11;
      return first.getBoundingClientRect().width + gap;
    }
    function move(dir) {
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      var atStart = track.scrollLeft <= 2;
      if (dir > 0 && atEnd) track.scrollTo({ left: 0, behavior: "smooth" });
      else if (dir < 0 && atStart) track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
      else track.scrollBy({ left: dir * stepSize(), behavior: "smooth" });
    }
    var timer = null;
    function play() { if (!reducedMotion) timer = setInterval(function () { move(1); }, 3500); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); play(); }
    prev.addEventListener("click", function () { move(-1); restart(); });
    next.addEventListener("click", function () { move(1); restart(); });
    container.addEventListener("mouseenter", stop);
    container.addEventListener("mouseleave", play);
    play();
  }
  document.querySelectorAll(".chapter-gallery").forEach(buildSlideshow);

  /* ---------- Lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lbImg = lightbox.querySelector("img");
  var lbCaption = lightbox.querySelector(".lb-caption");
  var items = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
  var current = 0;

  function openLightbox(i) {
    current = (i + items.length) % items.length;
    lbImg.src = items[current].getAttribute("href");
    lbImg.alt = items[current].querySelector("img").alt;
    if (lbCaption) lbCaption.textContent = lbImg.alt;
    lightbox.hidden = false;
    requestAnimationFrame(function () { lightbox.classList.add("open"); });
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(function () { lightbox.hidden = true; lbImg.src = ""; }, 350);
  }
  items.forEach(function (a, i) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      openLightbox(i);
    });
  });
  lightbox.querySelector(".lb-close").addEventListener("click", closeLightbox);
  lightbox.querySelector(".lb-prev").addEventListener("click", function () { openLightbox(current - 1); });
  lightbox.querySelector(".lb-next").addEventListener("click", function () { openLightbox(current + 1); });
  lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
  var touchX = 0;
  lightbox.addEventListener("touchstart", function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
  lightbox.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) openLightbox(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
  document.addEventListener("keydown", function (e) {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") openLightbox(current - 1);
    if (e.key === "ArrowRight") openLightbox(current + 1);
  });

  /* ---------- Chapter slideshows ---------- */
  document.querySelectorAll("[data-slideshow]").forEach(function (slideshow) {
    var thumbs = Array.prototype.slice.call(slideshow.querySelectorAll("[data-slide-src]"));
    var currentLink = slideshow.querySelector(".slideshow-current");
    var currentImage = currentLink.querySelector("img");
    var caption = slideshow.querySelector(".slideshow-caption");
    var number = slideshow.querySelector("[data-slide-number]");
    var activeSlide = 0;

    function showSlide(index) {
      activeSlide = (index + thumbs.length) % thumbs.length;
      var thumb = thumbs[activeSlide];
      currentImage.src = thumb.getAttribute("data-slide-src");
      currentImage.alt = thumb.getAttribute("data-slide-alt");
      currentLink.href = thumb.getAttribute("data-slide-large");
      caption.textContent = thumb.getAttribute("data-slide-caption");
      number.textContent = activeSlide + 1;
      thumbs.forEach(function (button, i) {
        var selected = i === activeSlide;
        button.classList.toggle("is-active", selected);
        if (selected) button.setAttribute("aria-current", "true");
        else button.removeAttribute("aria-current");
      });
      thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }

    thumbs.forEach(function (thumb, index) {
      thumb.addEventListener("click", function () { showSlide(index); });
    });
    slideshow.querySelector(".slideshow-prev").addEventListener("click", function () { showSlide(activeSlide - 1); });
    slideshow.querySelector(".slideshow-next").addEventListener("click", function () { showSlide(activeSlide + 1); });
  });

  /* ---------- Compact photo carousels ---------- */
  document.querySelectorAll("[data-photo-carousel]").forEach(function (carousel) {
    var controls = carousel.previousElementSibling;
    if (!controls) return;
    var previous = controls.querySelector("[data-carousel-prev]");
    var next = controls.querySelector("[data-carousel-next]");

    function move(direction) {
      var photo = carousel.querySelector("a");
      var distance = photo ? photo.getBoundingClientRect().width + 12 : carousel.clientWidth * 0.75;
      carousel.scrollTo({ left: carousel.scrollLeft + direction * distance, behavior: "smooth" });
    }

    previous.addEventListener("click", function () { move(-1); });
    next.addEventListener("click", function () { move(1); });
  });

  /* ---------- UTM capture (Meta ads tracking) ---------- */
  var params = new URLSearchParams(window.location.search);
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (key) {
    var value = params.get(key) || sessionStorage.getItem(key) || "";
    if (params.get(key)) sessionStorage.setItem(key, params.get(key));
    var field = document.querySelector('input[name="' + key + '"]');
    if (field) field.value = value;
  });

  /* ---------- Cookie consent + Meta Pixel ---------- */
  var cookieBar = document.getElementById("cookieBar");
  var CONSENT_KEY = "lcdl_consent";

  function loadMetaPixel() {
    if (!META_PIXEL_ID) return; // placeholder — set META_PIXEL_ID above
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0";
      n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", META_PIXEL_ID);
    window.fbq("track", "PageView");
  }

  var consent = localStorage.getItem(CONSENT_KEY);
  if (consent === "granted") {
    loadMetaPixel();
  } else if (consent !== "denied") {
    cookieBar.hidden = false;
  }
  document.getElementById("cookieAccept").addEventListener("click", function () {
    localStorage.setItem(CONSENT_KEY, "granted");
    cookieBar.hidden = true;
    loadMetaPixel();
  });
  document.getElementById("cookieDecline").addEventListener("click", function () {
    localStorage.setItem(CONSENT_KEY, "denied");
    cookieBar.hidden = true;
  });

  /* ---------- Contact click tracking ---------- */
  document.querySelectorAll("[data-track]").forEach(function (el) {
    el.addEventListener("click", function () {
      if (window.fbq) window.fbq("track", "Contact", { method: el.getAttribute("data-track") });
    });
  });

  /* ---------- Enquiry form ---------- */
  var form = document.getElementById("enquiryForm");
  var status = form.querySelector(".form-status");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!form.name.value.trim() || !form.email.value.trim()) {
      status.textContent = isFrench ? "Merci d’indiquer votre nom et votre adresse e-mail afin que nous puissions vous répondre." : "Please add your name and email so we can reply.";
      return;
    }

    var submitBtn = form.querySelector(".btn-submit");
    submitBtn.disabled = true;
    status.textContent = isFrench ? "Envoi en cours…" : "Sending…";

    var data = new FormData(form);

    var done = function () {
      // Meta conversion event — the campaign's primary optimisation signal
      if (window.fbq) window.fbq("track", "Lead", { content_name: "Property enquiry" });
      form.reset();
      submitBtn.disabled = false;
      status.textContent = isFrench ? "Merci — nous avons bien reçu votre demande et vous répondrons personnellement, généralement sous 24 heures." : "Thank you — we've received your enquiry and will reply personally, usually within a day.";
    };

    if (FORM_ENDPOINT) {
      fetch(FORM_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(data)),
        headers: { "Content-Type": "application/json", Accept: "application/json" }
      }).then(function (res) {
        if (res.ok) { done(); }
        else { throw new Error("Bad response"); }
      }).catch(function () {
        submitBtn.disabled = false;
        status.textContent = isFrench ? "Une erreur s’est produite — veuillez réessayer dans quelques instants." : "Something went wrong — please try again shortly.";
      });
    }
  });

  /* ---------- Social share ---------- */
  document.querySelectorAll("[data-share]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var url = encodeURIComponent(window.location.href.split("?")[0]);
      var text = encodeURIComponent(isFrench ? "Une propriété de village composée de quatre bâtiments, avec deux gîtes, un beau jardin et une piscine — 475 000 €, vente entre particuliers." : "A French village property of four buildings with two income-producing gîtes, gardens and a pool — €475,000, private sale.");
      var map = {
        facebook: "https://www.facebook.com/sharer/sharer.php?u=" + url,
        x: "https://twitter.com/intent/tweet?url=" + url + "&text=" + text,
        email: "mailto:?subject=" + encodeURIComponent(isFrench ? "Une propriété française à découvrir" : "A French property worth a look") + "&body=" + text + "%0A%0A" + url
      };
      var target = map[el.getAttribute("data-share")];
      if (target) window.open(target, "_blank", "noopener");
    });
  });
})();

/* TEMP: font trial switcher — remove alongside the .font-trial markup/CSS */
(function () {
  var trial = document.getElementById("fontTrial");
  if (!trial) return;
  var KEY = "lcdl_font";
  function apply(name) {
    if (name) document.body.setAttribute("data-font", name);
    else document.body.removeAttribute("data-font");
    trial.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-font") === name);
    });
  }
  trial.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () {
      var name = b.getAttribute("data-font");
      localStorage.setItem(KEY, name);
      apply(name);
    });
  });
  apply(localStorage.getItem(KEY) || "");
})();
