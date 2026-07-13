/* Service Worker — The Joãozin Barber
   Estratégia: pré-cache do essencial + cache-first para imagens/estáticos
   e network-first para o HTML (conteúdo sempre atualizado quando online). */
var CACHE = "joaozin-barber-v8";

var PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/style.css",
  "./assets/css/agendamento.css",
  "./assets/js/app.js",
  "./assets/js/agendamento.js",
  "./assets/img/logo.png",
  "./assets/img/joaozin.jpg",
  "./assets/img/fachada.jpg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  // Não intercepta terceiros (Google Fonts, Maps, gtag…)
  if (url.origin !== self.location.origin) return;
  // Nunca faz cache da API de agendamentos (dados sempre atuais)
  if (url.pathname.indexOf("/api/") === 0) return;

  // HTML: network-first com fallback para cache (funciona offline)
  if (req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1) {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match("./index.html");
        });
      })
    );
    return;
  }

  // Estáticos: cache-first com atualização em segundo plano
  event.respondWith(
    caches.match(req).then(function (cached) {
      var fetched = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || fetched;
    })
  );
});
