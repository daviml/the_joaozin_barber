/* ============================================================
   Função serverless (Vercel) — API de agendamentos
   ------------------------------------------------------------
   Guarda os agendamentos num arquivo de texto (JSON) no próprio
   repositório do GitHub. O token fica em Environment Variables da
   Vercel (process.env) e NUNCA é exposto ao navegador.

   Variáveis de ambiente (configurar na Vercel):
     GITHUB_TOKEN    (obrigatório)  token fine-grained com Contents: Read and write
     GITHUB_REPO     (obrigatório)  "usuario/repositorio"
     GITHUB_BRANCH   (opcional)     branch dos dados (padrão: "bookings-data")
     BOOKINGS_PATH   (opcional)     caminho do arquivo (padrão: "bookings.json")
     ADMIN_PASSWORD  (opcional)     senha para remover (padrão: "1234")

   Endpoints (mesma URL /api/bookings):
     GET     -> lista os agendamentos
     POST    -> cria um agendamento  { date, time, name, phone, service, barber }
     DELETE  -> remove por id         { id, password }
   ============================================================ */

var GH_API = "https://api.github.com";

function config() {
  return {
    token: process.env.GITHUB_TOKEN,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH || "bookings-data",
    path: process.env.BOOKINGS_PATH || "bookings.json",
    adminPassword: process.env.ADMIN_PASSWORD || "1234",
  };
}

function ghHeaders(token) {
  return {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "the-joaozin-barber",
  };
}

/* Lê o arquivo de agendamentos. Retorna { list, sha }.
   Se o arquivo ainda não existe (404), começa vazio. */
async function readBookings(cfg) {
  var url =
    GH_API +
    "/repos/" +
    cfg.repo +
    "/contents/" +
    encodeURIComponent(cfg.path) +
    "?ref=" +
    encodeURIComponent(cfg.branch) +
    "&_=" +
    Date.now(); // evita cache

  var res = await fetch(url, { headers: ghHeaders(cfg.token) });

  if (res.status === 404) {
    return { list: [], sha: null };
  }
  if (!res.ok) {
    throw new Error("GitHub read " + res.status + ": " + (await res.text()));
  }

  var data = await res.json();
  var content = Buffer.from(data.content, "base64").toString("utf8");
  var parsed;
  try {
    parsed = JSON.parse(content);
  } catch (_e) {
    parsed = { bookings: [] };
  }
  return { list: Array.isArray(parsed.bookings) ? parsed.bookings : [], sha: data.sha };
}

/* Grava a lista completa de volta no arquivo. */
async function writeBookings(cfg, list, sha, message) {
  var url =
    GH_API + "/repos/" + cfg.repo + "/contents/" + encodeURIComponent(cfg.path);
  var body = {
    message: message,
    content: Buffer.from(
      JSON.stringify({ bookings: list }, null, 2),
      "utf8"
    ).toString("base64"),
    branch: cfg.branch,
  };
  if (sha) body.sha = sha;

  return fetch(url, {
    method: "PUT",
    headers: ghHeaders(cfg.token),
    body: JSON.stringify(body),
  });
}

// Remove caracteres de controle, apara e limita o tamanho.
function sanitize(str, max) {
  return String(str == null ? "" : str)
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, max || 120);
}

function onlyDigits(str) {
  return String(str == null ? "" : str).replace(/\D/g, "");
}

function isValidDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}
function isValidTime(t) {
  return /^\d{2}:\d{2}$/.test(t);
}

function makeId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

/* Tenta gravar com retentativa em caso de conflito de sha (409). */
async function commitWithRetry(cfg, transform, message) {
  var lastErr = null;
  for (var attempt = 0; attempt < 4; attempt++) {
    var current = await readBookings(cfg);
    var result = transform(current.list);
    if (result.error) return { error: result.error, status: result.status || 400 };

    var res = await writeBookings(cfg, result.list, current.sha, message);
    if (res.ok) return { list: result.list, created: result.created };

    if (res.status === 409) {
      lastErr = "conflito de escrita";
      continue; // relê e tenta de novo
    }
    return { error: "GitHub write " + res.status + ": " + (await res.text()), status: 502 };
  }
  return { error: "Não foi possível gravar após várias tentativas: " + lastErr, status: 409 };
}

function sendJson(res, status, obj) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(status).send(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {
  var cfg = config();

  if (!cfg.token || !cfg.repo) {
    return sendJson(res, 500, {
      error:
        "Configuração ausente: defina GITHUB_TOKEN e GITHUB_REPO nas Environment Variables da Vercel.",
    });
  }

  try {
    /* -------- LISTAR -------- */
    if (req.method === "GET") {
      var listed = await readBookings(cfg);
      return sendJson(res, 200, { bookings: listed.list });
    }

    /* -------- CRIAR -------- */
    if (req.method === "POST") {
      var b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      var date = sanitize(b.date, 10);
      var time = sanitize(b.time, 5);
      var name = sanitize(b.name, 80);
      var phone = onlyDigits(b.phone).slice(0, 15);
      var service = sanitize(b.service, 80);
      var barber = sanitize(b.barber, 40);

      if (!isValidDate(date) || !isValidTime(time)) {
        return sendJson(res, 400, { error: "Data ou horário inválido." });
      }
      if (name.length < 2) {
        return sendJson(res, 400, { error: "Informe seu nome." });
      }
      if (phone.length < 10) {
        return sendJson(res, 400, { error: "Informe um WhatsApp válido com DDD." });
      }

      var outcome = await commitWithRetry(
        cfg,
        function (list) {
          // Cada barbeiro tem agenda própria: o mesmo horário pode existir
          // para barbeiros diferentes, mas não para o mesmo barbeiro.
          var taken = list.some(function (x) {
            return x.date === date && x.time === time && (x.barber || "") === barber;
          });
          if (taken) {
            return { error: "Esse horário acabou de ser reservado. Escolha outro.", status: 409 };
          }
          var booking = {
            id: makeId(),
            date: date,
            time: time,
            name: name,
            phone: phone,
            service: service || "Corte",
            barber: barber,
            createdAt: new Date().toISOString(),
          };
          return { list: list.concat([booking]), created: booking };
        },
        "Agendamento: " + name + " com " + (barber || "-") + " em " + date + " " + time
      );

      if (outcome.error) return sendJson(res, outcome.status || 400, { error: outcome.error });
      return sendJson(res, 201, { booking: outcome.created });
    }

    /* -------- REMOVER -------- */
    if (req.method === "DELETE") {
      var db = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      var id = sanitize(db.id, 40);
      var password = String(db.password == null ? "" : db.password);

      if (password !== cfg.adminPassword) {
        return sendJson(res, 401, { error: "Senha incorreta." });
      }
      if (!id) return sendJson(res, 400, { error: "id ausente." });

      var del = await commitWithRetry(
        cfg,
        function (list) {
          var next = list.filter(function (x) {
            return x.id !== id;
          });
          return { list: next };
        },
        "Remover agendamento " + id
      );

      if (del.error) return sendJson(res, del.status || 400, { error: del.error });
      return sendJson(res, 200, { ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return sendJson(res, 405, { error: "Método não permitido." });
  } catch (err) {
    return sendJson(res, 500, {
      error: "Erro interno: " + (err && err.message ? err.message : err),
    });
  }
};
