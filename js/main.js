/* La Cour des Lavandes — minimal, dependency-free JS
   Handles: sticky nav, scroll reveal, lightbox, UTM capture,
   cookie consent + Meta Pixel loading, form submit + Lead event. */

(function () {
  "use strict";

  /* ============================================================
     CONFIG — fill these in before launch
     ============================================================ */
  var META_PIXEL_ID = "";            // e.g. "1234567890123456"
  var FORM_ENDPOINT = "";            // e.g. "https://formspree.io/f/xxxxxx" or your own handler
  var OWNER_EMAIL   = "tsimmondsrosa@gmail.com";  // used as the fallback if no endpoint is set

  /* Until FORM_ENDPOINT is set, the form falls back to opening the visitor's
     email client with everything filled in — so enquiries still reach you.
     Also replace OWNER_EMAIL above and the mailto: links in index.html. */

  /* ---------- Sticky nav ---------- */
  var nav = document.querySelector(".nav");
  var onScroll = function () {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

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
    ".g-item, .area-item, .chapter-gallery a, .chapter-media, .band-media"));
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

  /* ---------- Lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lbImg = lightbox.querySelector("img");
  var items = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
  var current = 0;

  function openLightbox(i) {
    current = (i + items.length) % items.length;
    lbImg.src = items[current].getAttribute("href");
    lbImg.alt = items[current].querySelector("img").alt;
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
  document.addEventListener("keydown", function (e) {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") openLightbox(current - 1);
    if (e.key === "ArrowRight") openLightbox(current + 1);
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
      status.textContent = "Please add your name and email so we can reply.";
      return;
    }

    var submitBtn = form.querySelector(".btn-submit");
    submitBtn.disabled = true;
    status.textContent = "Sending…";

    var data = new FormData(form);

    var done = function () {
      // Meta conversion event — the campaign's primary optimisation signal
      if (window.fbq) window.fbq("track", "Lead", { content_name: "Property enquiry" });
      form.reset();
      submitBtn.disabled = false;
      status.textContent = "Thank you — we've received your enquiry and will reply personally, usually within a day.";
    };

    if (FORM_ENDPOINT) {
      fetch(FORM_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" }
      }).then(function (res) {
        if (res.ok) { done(); }
        else { throw new Error("Bad response"); }
      }).catch(function () {
        submitBtn.disabled = false;
        status.textContent = "Something went wrong — please email us directly at " + OWNER_EMAIL + ".";
      });
    } else {
      // No endpoint wired up yet. Rather than pretend the enquiry was sent,
      // hand it to the visitor's email client with everything filled in.
      sendByEmail(data);
    }
  });

  function sendByEmail(data) {
    var labels = {
      name: "Name", email: "Email", country_code: "Country code", phone: "Phone",
      contact_time: "Best time to call", timescale: "Timescale", mortgage: "Financing",
      message: "Message", utm_source: "Source", utm_medium: "Medium",
      utm_campaign: "Campaign", utm_content: "Content", utm_term: "Term"
    };
    var lines = [];
    Object.keys(labels).forEach(function (key) {
      var value = (data.get(key) || "").toString().trim();
      if (value) lines.push(labels[key] + ": " + value);
    });
    lines.push("", "Sent from " + window.location.href);

    var href = "mailto:" + OWNER_EMAIL +
      "?subject=" + encodeURIComponent("Enquiry — La Cour des Lavandes") +
      "&body=" + encodeURIComponent(lines.join("\n"));

    if (window.fbq) window.fbq("track", "Lead", { content_name: "Property enquiry" });
    window.location.href = href;

    form.querySelector(".btn-submit").disabled = false;
    status.textContent = "Opening your email app with the details filled in — press send and it comes straight to us.";
  }

  /* ---------- Social share ---------- */
  document.querySelectorAll("[data-share]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var url = encodeURIComponent(window.location.href.split("?")[0]);
      var text = encodeURIComponent("A French village property of four buildings with two income-producing gîtes, gardens and a pool — €475,000, private sale.");
      var map = {
        facebook: "https://www.facebook.com/sharer/sharer.php?u=" + url,
        x: "https://twitter.com/intent/tweet?url=" + url + "&text=" + text,
        email: "mailto:?subject=" + encodeURIComponent("A French property worth a look") + "&body=" + text + "%0A%0A" + url
      };
      var target = map[el.getAttribute("data-share")];
      if (target) window.open(target, "_blank", "noopener");
    });
  });
})();
