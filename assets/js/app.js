/* The Joãozin Barber — interações do site */
(function () {
  "use strict";

  /* ---------- Ano no footer ---------- */
  var ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();

  /* ---------- Menu mobile ---------- */
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Lightbox da galeria ---------- */
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var lbImg = lightbox.querySelector("img");
    document.querySelectorAll(".gallery img").forEach(function (img) {
      img.addEventListener("click", function () {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lightbox.hidden = false;
        document.body.style.overflow = "hidden";
      });
    });
    function closeLightbox() {
      lightbox.hidden = true;
      document.body.style.overflow = "";
    }
    lightbox.addEventListener("click", closeLightbox);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
    });
  }

  /* ---------- Conversão Google Ads: clique no WhatsApp ----------
     Quando o gtag estiver configurado (ver index.html + GOOGLE-ADS.md),
     cada clique em botão de WhatsApp dispara o evento de conversão.
     Substitua AW-XXXXXXXXXX/YYYYYYYYYY pelo rótulo real da conversão. */
  document.querySelectorAll(".js-whats").forEach(function (link) {
    link.addEventListener("click", function () {
      if (typeof window.gtag === "function") {
        window.gtag("event", "conversion", {
          send_to: "AW-XXXXXXXXXX/YYYYYYYYYY",
          event_category: "contato",
          event_label: "whatsapp_click"
        });
      }
    });
  });

  /* ---------- Service Worker (PWA) ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function (err) {
        console.warn("Service worker não registrado:", err);
      });
    });
  }

  /* ---------- Botão "Instalar app" ---------- */
  var installBtn = document.getElementById("installBtn");
  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) {
    installBtn.addEventListener("click", function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () {
        deferredPrompt = null;
        installBtn.hidden = true;
      });
    });
  }
  window.addEventListener("appinstalled", function () {
    if (installBtn) installBtn.hidden = true;
  });
})();
