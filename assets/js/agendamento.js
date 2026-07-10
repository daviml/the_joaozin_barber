/* ============================================================
   The Joãozin Barber — Agendamento online
   ------------------------------------------------------------
   Fala com /api/bookings (função serverless da Vercel), que grava
   no txt do GitHub. Se a API não responder (ex.: rodando local com
   um servidor estático), cai em "modo demonstração" usando
   localStorage — a interface funciona igual pra você testar.
   ============================================================ */
(function () {
  "use strict";

  /* ================== CONFIGURAÇÃO (edite aqui) ================== */
  var CONFIG = {
    // Dias abertos: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
    DIAS_ABERTOS: [1, 2, 3, 4, 5, 6], // Segunda a sábado
    HORA_ABRE: 9,          // 09:00
    HORA_FECHA: 20,        // último horário começa antes das 20:00 (Seg–Sex)
    HORA_FECHA_SAB: 17,    // no sábado fecha mais cedo (último começa antes das 17:00)
    DURACAO_MIN: 60,       // 1 hora por horário
    MESES_A_FRENTE: 2,     // navegar do mês atual até +2 meses à frente

    // Cada profissional tem a SUA agenda (horários independentes) e a SUA
    // lista de serviços. Para mudar preço/serviço de um, edite só o bloco dele.
    // Com mais de um barbeiro, a etapa "escolher profissional" aparece sozinha;
    // com um só, ela some e ele já vem selecionado.
    BARBEIROS: [
      {
        id: "joaozin",
        nome: "Joãozin",
        foto: "assets/img/barbeiro-joaozin.jpg",
        servicos: [
          { nome: "Corte de cabelo", icone: "✂️", preco: "R$ 40,00", duracao: 45 },
          { nome: "Corte + Barba", icone: "💈", preco: "R$ 65,00", duracao: 60 },
          { nome: "Barba", icone: "🪒", preco: "R$ 30,00", duracao: 30 },
          { nome: "Acabamento (pezinho)", icone: "✨", preco: "R$ 20,00", duracao: 20 },
          { nome: "Sobrancelha", icone: "🧑‍🎨", preco: "R$ 15,00", duracao: 15 },
          { nome: "Pigmentação", icone: "🎨", preco: "R$ 30,00", duracao: 20 }
        ]
      },
      {
        id: "lucas",
        nome: "Lucas",
        foto: "assets/img/barbeiro-lucas.jpg",
        servicos: [
          { nome: "Corte de cabelo", icone: "✂️", preco: "R$ 40,00", duracao: 45 },
          { nome: "Corte + Barba", icone: "💈", preco: "R$ 65,00", duracao: 60 },
          { nome: "Barba", icone: "🪒", preco: "R$ 30,00", duracao: 30 },
          { nome: "Acabamento (pezinho)", icone: "✨", preco: "R$ 20,00", duracao: 20 },
          { nome: "Sobrancelha", icone: "🧑‍🎨", preco: "R$ 15,00", duracao: 15 },
          { nome: "Pigmentação", icone: "🎨", preco: "R$ 30,00", duracao: 20 }
        ]
      },
      {
        id: "daniel",
        nome: "Daniel",
        foto: "assets/img/barbeiro-daniel.jpg",
        servicos: [
          { nome: "Corte de cabelo", icone: "✂️", preco: "R$ 40,00", duracao: 45 },
          { nome: "Corte + Barba", icone: "💈", preco: "R$ 65,00", duracao: 60 },
          { nome: "Barba", icone: "🪒", preco: "R$ 30,00", duracao: 30 },
          { nome: "Acabamento (pezinho)", icone: "✨", preco: "R$ 20,00", duracao: 20 },
          { nome: "Sobrancelha", icone: "🧑‍🎨", preco: "R$ 15,00", duracao: 15 },
          { nome: "Pigmentação", icone: "🎨", preco: "R$ 30,00", duracao: 20 }
        ]
      }
    ],

    WHATS: "5534997739176", // WhatsApp da barbearia (só dígitos, com 55)
    SENHA_ADMIN: "1234"     // senha para remover horários (também exigida na API)
  };

  var API = "/api/bookings";
  var DEMO_KEY = "joaozin_demo_bookings";

  var DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  var DIAS_MINI = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  var MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  var MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  /* ================== ESTADO ================== */
  var state = {
    bookings: [],
    barbeiro: null,  // id do barbeiro escolhido (cada um tem sua agenda)
    servicos: [],    // pode escolher vários (Corte + Barba + ...)
    data: null,
    hora: null,
    demo: false,
    carregando: false,
    calAno: null,    // mês em exibição no calendário
    calMes: null,
    detalheSlot: null // { date, hora, barber } do horário aberto no modal de detalhe
  };

  /* ================== HELPERS ================== */
  function $(id) { return document.getElementById(id); }

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function dateKey(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function hojeKey() { return dateKey(new Date()); }

  function formatarDataLonga(key) {
    var p = key.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return DIAS_SEMANA[d.getDay()] + ", " + Number(p[2]) + " de " + MESES[Number(p[1]) - 1];
  }

  function formatarTelefone(v) {
    var d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }

  function barbeiroAtual() {
    return CONFIG.BARBEIROS.filter(function (b) { return b.id === state.barbeiro; })[0] || null;
  }

  function nomeBarbeiro(id) {
    var b = CONFIG.BARBEIROS.filter(function (x) { return x.id === id; })[0];
    return b ? b.nome : (id || "");
  }

  // Um horário só está ocupado para o barbeiro em questão — cada um tem agenda própria.
  function slotOcupado(data, hora, barber) {
    var bid = barber || state.barbeiro;
    return state.bookings.some(function (b) {
      return b.date === data && b.time === hora && b.barber === bid;
    });
  }

  /* ================== CLIENTE DA API (com fallback demo) ================== */
  function demoLoad() {
    try {
      var raw = localStorage.getItem(DEMO_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function demoSave(list) {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(list)); } catch (e) {}
  }

  async function apiListar() {
    try {
      var r = await fetch(API, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!r.ok) throw new Error("status " + r.status);
      var data = await r.json();
      state.demo = false;
      return Array.isArray(data.bookings) ? data.bookings : [];
    } catch (e) {
      state.demo = true;
      return demoLoad();
    }
  }

  async function apiCriar(payload) {
    if (!state.demo) {
      try {
        var r = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        var data = await r.json();
        if (!r.ok) return { error: data.error || "Falha ao agendar." };
        return { booking: data.booking };
      } catch (e) {
        state.demo = true; // caiu; segue em demo
      }
    }
    // Modo demonstração
    var list = demoLoad();
    if (list.some(function (b) { return b.date === payload.date && b.time === payload.time && b.barber === payload.barber; })) {
      return { error: "Esse horário acabou de ser reservado. Escolha outro." };
    }
    var booking = {
      id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      date: payload.date, time: payload.time, name: payload.name,
      phone: payload.phone, service: payload.service, barber: payload.barber,
      createdAt: new Date().toISOString()
    };
    list.push(booking);
    demoSave(list);
    return { booking: booking };
  }

  async function apiRemover(id, senha) {
    if (senha !== CONFIG.SENHA_ADMIN) return { error: "Senha incorreta." };
    if (!state.demo) {
      try {
        var r = await fetch(API, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: id, password: senha })
        });
        var data = await r.json();
        if (!r.ok) return { error: data.error || "Falha ao remover." };
        return { ok: true };
      } catch (e) {
        state.demo = true;
      }
    }
    var list = demoLoad().filter(function (b) { return b.id !== id; });
    demoSave(list);
    return { ok: true };
  }

  async function recarregar() {
    state.bookings = await apiListar();
    var demoBanner = $("ag-demo");
    if (demoBanner) demoBanner.hidden = !state.demo;
  }

  /* ================== RENDER ================== */
  function renderBarbeiros() {
    var box = $("ag-barbeiros");
    if (!box) return;

    // Só um profissional? Já seleciona e esconde a etapa (mantém tudo simples).
    if (CONFIG.BARBEIROS.length === 1) {
      state.barbeiro = CONFIG.BARBEIROS[0].id;
      var etapa = box.closest ? box.closest(".ag-step") : null;
      if (etapa) etapa.hidden = true;
      return;
    }

    box.innerHTML = "";
    CONFIG.BARBEIROS.forEach(function (barb) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "ag-barber";
      if (barb.id === state.barbeiro) card.classList.add("is-active");
      card.innerHTML =
        '<img class="ag-barber__foto" src="' + barb.foto + '" alt="' + barb.nome + '" loading="lazy" width="72" height="72">' +
        '<span class="ag-barber__nome">' + barb.nome + "</span>";
      card.addEventListener("click", function () {
        if (state.barbeiro === barb.id) return;
        // Trocar de barbeiro reinicia serviço e horário (listas e agenda são próprias dele).
        state.barbeiro = barb.id;
        state.servicos = [];
        state.hora = null;
        Array.prototype.forEach.call(box.children, function (c) { c.classList.remove("is-active"); });
        card.classList.add("is-active");
        renderServicos();
        renderHorarios();
        atualizarResumo();
      });
      box.appendChild(card);
    });
  }

  function renderServicos() {
    var box = $("ag-servicos");
    if (!box) return;
    box.innerHTML = "";
    var barb = barbeiroAtual();
    if (!barb) {
      box.innerHTML = '<p class="ag-hint">Escolha um profissional acima para ver os serviços.</p>';
      return;
    }
    barb.servicos.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ag-chip";
      if (state.servicos.indexOf(s.nome) !== -1) b.classList.add("is-active");
      b.innerHTML =
        '<span class="ag-chip__ic">' + s.icone + "</span>" +
        '<span class="ag-chip__txt">' +
        '<span class="ag-chip__nome">' + s.nome + "</span>" +
        '<span class="ag-chip__meta">' + s.preco + " · " + s.duracao + " min</span>" +
        "</span>";
      b.addEventListener("click", function () {
        // Multi-seleção: liga/desliga o serviço (mantém dia e horário já escolhidos)
        var i = state.servicos.indexOf(s.nome);
        if (i === -1) {
          state.servicos.push(s.nome);
          b.classList.add("is-active");
        } else {
          state.servicos.splice(i, 1);
          b.classList.remove("is-active");
        }
        atualizarResumo();
      });
      box.appendChild(b);
    });
  }

  function mesIndex(ano, mes) { return ano * 12 + mes; }

  function limitesMeses() {
    var base = new Date();
    var min = mesIndex(base.getFullYear(), base.getMonth());
    return { min: min, max: min + CONFIG.MESES_A_FRENTE };
  }

  function mudarMes(delta) {
    var lim = limitesMeses();
    var idx = mesIndex(state.calAno, state.calMes) + delta;
    if (idx < lim.min || idx > lim.max) return;
    state.calAno = Math.floor(idx / 12);
    state.calMes = idx % 12;
    renderDias();
  }

  // Monta a grade (linhas = semanas) do mês em exibição.
  function construirGrade(box, ano, mes) {
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    var grade = document.createElement("div");
    grade.className = "ag-cal__grade";

    DIAS_MINI.forEach(function (wd) {
      var h = document.createElement("span");
      h.className = "ag-cal__wd";
      h.textContent = wd;
      grade.appendChild(h);
    });

    var inicioSemana = new Date(ano, mes, 1).getDay(); // 0=Dom
    var diasNoMes = new Date(ano, mes + 1, 0).getDate();

    for (var i = 0; i < inicioSemana; i++) {
      var vazio = document.createElement("span");
      vazio.className = "ag-cal__vazio";
      grade.appendChild(vazio);
    }

    for (var dia = 1; dia <= diasNoMes; dia++) {
      var d = new Date(ano, mes, dia);
      var key = dateKey(d);
      var fechado = CONFIG.DIAS_ABERTOS.indexOf(d.getDay()) === -1;
      var passado = d < hoje;

      var cel = document.createElement("button");
      cel.type = "button";
      cel.className = "ag-cal__dia";
      cel.textContent = dia;

      if (key === hojeKey()) cel.classList.add("ag-cal__dia--hoje");

      if (fechado || passado) {
        cel.classList.add("is-disabled");
        cel.disabled = true;
        if (fechado && !passado) cel.title = "Fechado";
      } else {
        if (key === state.data) cel.classList.add("is-active");
        (function (k, btn) {
          btn.addEventListener("click", function () {
            state.data = k;
            state.hora = null;
            Array.prototype.forEach.call(
              box.querySelectorAll(".ag-cal__dia"),
              function (c) { c.classList.remove("is-active"); }
            );
            btn.classList.add("is-active");
            renderHorarios();
            atualizarResumo();
          });
        })(key, cel);
      }
      grade.appendChild(cel);
    }
    return grade;
  }

  function renderDias() {
    var box = $("ag-dias");
    if (!box) return;

    // Inicializa a visão no mês atual
    if (state.calAno == null) {
      var base = new Date();
      state.calAno = base.getFullYear();
      state.calMes = base.getMonth();
    }

    var lim = limitesMeses();
    var cur = mesIndex(state.calAno, state.calMes);

    box.innerHTML = "";
    box.className = "ag-cal";

    var card = document.createElement("div");
    card.className = "ag-cal__mes";

    // Cabeçalho com setas
    var nav = document.createElement("div");
    nav.className = "ag-cal__nav";

    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "ag-cal__seta";
    prev.innerHTML = "‹";
    prev.setAttribute("aria-label", "Mês anterior");
    prev.disabled = cur <= lim.min;
    prev.addEventListener("click", function () { mudarMes(-1); });

    var titulo = document.createElement("span");
    titulo.className = "ag-cal__titulo";
    titulo.textContent = MESES_LONGOS[state.calMes] + " " + state.calAno;

    var next = document.createElement("button");
    next.type = "button";
    next.className = "ag-cal__seta";
    next.innerHTML = "›";
    next.setAttribute("aria-label", "Próximo mês");
    next.disabled = cur >= lim.max;
    next.addEventListener("click", function () { mudarMes(1); });

    nav.appendChild(prev);
    nav.appendChild(titulo);
    nav.appendChild(next);
    card.appendChild(nav);
    card.appendChild(construirGrade(box, state.calAno, state.calMes));
    box.appendChild(card);
  }

  // Hora de fechamento do dia selecionado (sábado pode fechar mais cedo).
  function horaFechaDoDia(key) {
    if (!key) return CONFIG.HORA_FECHA;
    var p = key.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    if (d.getDay() === 6 && CONFIG.HORA_FECHA_SAB != null) return CONFIG.HORA_FECHA_SAB;
    return CONFIG.HORA_FECHA;
  }

  function horariosDoDia() {
    var horas = [];
    var fecha = horaFechaDoDia(state.data);
    for (var h = CONFIG.HORA_ABRE; h < fecha; h += CONFIG.DURACAO_MIN / 60) {
      horas.push(pad(Math.floor(h)) + ":" + pad((h % 1) * 60));
    }
    return horas;
  }

  function renderHorarios() {
    var box = $("ag-horarios");
    if (!box) return;
    box.innerHTML = "";
    if (!state.barbeiro) {
      box.innerHTML = '<p class="ag-hint">Escolha um profissional para ver os horários.</p>';
      return;
    }
    if (!state.data) {
      box.innerHTML = '<p class="ag-hint">Escolha um dia acima para ver os horários.</p>';
      return;
    }
    var agora = new Date();
    var ehHoje = state.data === hojeKey();
    var horas = horariosDoDia();
    horas.forEach(function (hora) {
      var ocupado = slotOcupado(state.data, hora);
      var passou = ehHoje && Number(hora.slice(0, 2)) <= agora.getHours();
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ag-time";
      if (passou) {
        // Horário que já passou: bloqueado de verdade
        b.textContent = hora;
        b.classList.add("is-disabled");
        b.disabled = true;
      } else if (ocupado) {
        // Reservado: clicável para o barbeiro ver os detalhes (com senha)
        b.innerHTML = hora + '<span class="ag-time__lock">🔒</span>';
        b.classList.add("is-ocupado");
        b.title = "Reservado — toque para ver quem marcou (barbeiro)";
        (function (h) {
          b.addEventListener("click", function () { abrirDetalheSlot(state.data, h); });
        })(hora);
      } else {
        b.textContent = hora;
        if (hora === state.hora) b.classList.add("is-active");
        b.addEventListener("click", function () {
          state.hora = hora;
          Array.prototype.forEach.call(box.children, function (c) { c.classList.remove("is-active"); });
          b.classList.add("is-active");
          atualizarResumo();
        });
      }
      box.appendChild(b);
    });
    // Só mostra o aviso quando não há NENHUM horário (nem livre, nem reservado)
    if (!box.children.length) {
      box.innerHTML = '<p class="ag-hint">Nenhum horário disponível nesse dia. Tente outro. 🙏</p>';
    }
  }

  function atualizarResumo() {
    var resumo = $("ag-resumo");
    var btn = $("ag-confirmar");
    var completo = state.barbeiro && state.servicos.length && state.data && state.hora;
    if (resumo) {
      if (completo) {
        resumo.innerHTML =
          "<strong>" + state.servicos.join(" + ") + "</strong> · com " + nomeBarbeiro(state.barbeiro) + "<br>" +
          formatarDataLonga(state.data) + " às <strong>" + state.hora + "</strong>";
        resumo.hidden = false;
      } else {
        resumo.hidden = true;
      }
    }
    if (btn) btn.disabled = !completo || state.carregando;
  }

  /* ================== AÇÕES ================== */
  function setMsg(texto, tipo) {
    var el = $("ag-msg");
    if (!el) return;
    el.textContent = texto || "";
    el.className = "ag-msg" + (tipo ? " ag-msg--" + tipo : "");
  }

  async function confirmar(e) {
    e.preventDefault();
    if (!(state.barbeiro && state.servicos.length && state.data && state.hora)) return;
    var nome = ($("ag-nome").value || "").trim();
    var whatsRaw = ($("ag-whats").value || "").replace(/\D/g, "");
    if (nome.length < 2) { setMsg("Digite seu nome.", "erro"); return; }
    if (whatsRaw.length < 10) { setMsg("Digite um WhatsApp válido com DDD.", "erro"); return; }

    state.carregando = true;
    setMsg("Confirmando seu horário...", "info");
    atualizarResumo();

    var res = await apiCriar({
      date: state.data, time: state.hora, name: nome,
      phone: whatsRaw, service: state.servicos.join(" + "), barber: state.barbeiro
    });

    state.carregando = false;
    if (res.error) {
      setMsg(res.error, "erro");
      await recarregar();
      renderHorarios();
      atualizarResumo();
      return;
    }
    setMsg("", null);
    await recarregar();
    mostrarSucesso(res.booking);
    // limpa seleção de horário (já reservado)
    state.hora = null;
    renderHorarios();
    atualizarResumo();
  }

  function mostrarSucesso(booking) {
    var modal = $("ag-sucesso");
    if (!modal) return;
    var corpo = $("ag-sucesso-corpo");
    corpo.innerHTML =
      '<div class="ag-ok__check">✓</div>' +
      "<h3>Horário confirmado!</h3>" +
      '<p class="ag-ok__resumo"><strong>' + booking.service + "</strong><br>com " + escapeHtml(nomeBarbeiro(booking.barber)) + "<br>" +
      formatarDataLonga(booking.date) + " às <strong>" + booking.time + "</strong></p>" +
      '<p class="ag-ok__nota">Te esperamos na R. Feliciano de Morais, 647 (Nossa Sra. Aparecida). Chegue uns minutinhos antes 💈</p>' +
      '<button type="button" class="btn btn--gold btn--lg" id="ag-sucesso-fechar">Fechar</button>';
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    $("ag-sucesso-fechar").addEventListener("click", fecharSucesso);
  }
  function fecharSucesso() {
    var modal = $("ag-sucesso");
    if (modal) modal.hidden = true;
    document.body.style.overflow = "";
  }

  /* ---------- Detalhe de um horário reservado (com senha) ---------- */
  function abrirDetalheSlot(date, hora) {
    var modal = $("ag-detalhe");
    if (!modal) return;
    state.detalheSlot = { date: date, hora: hora, barber: state.barbeiro };
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    renderDetalhe(false);
  }
  function fecharDetalhe() {
    var modal = $("ag-detalhe");
    if (modal) modal.hidden = true;
    document.body.style.overflow = "";
  }

  function renderDetalhe(autenticado) {
    var corpo = $("ag-detalhe-corpo");
    if (!corpo) return;
    var slot = state.detalheSlot || {};
    var quando = slot.date ? formatarDataLonga(slot.date) + " às " + slot.hora : "";

    if (!autenticado) {
      corpo.innerHTML =
        "<h3>Horário reservado</h3>" +
        '<p class="ag-ok__nota">' + quando + "</p>" +
        '<p class="ag-hint">Digite a senha do barbeiro para ver quem marcou.</p>' +
        '<input type="password" id="ag-det-senha" class="ag-input" placeholder="Senha" inputmode="numeric">' +
        '<p class="ag-msg" id="ag-det-msg"></p>' +
        '<div class="ag-modal__acoes">' +
        '<button type="button" class="btn btn--gold" id="ag-det-entrar">Ver detalhes</button>' +
        '<button type="button" class="btn btn--outline" id="ag-det-fechar">Fechar</button>' +
        "</div>";
      $("ag-det-fechar").addEventListener("click", fecharDetalhe);
      var entrar = function () {
        var senha = ($("ag-det-senha").value || "").trim();
        if (senha === CONFIG.SENHA_ADMIN) {
          renderDetalhe(true);
        } else {
          var m = $("ag-det-msg");
          if (m) { m.textContent = "Senha incorreta."; m.className = "ag-msg ag-msg--erro"; }
        }
      };
      $("ag-det-entrar").addEventListener("click", entrar);
      $("ag-det-senha").addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") entrar();
      });
      return;
    }

    // Autenticado: mostra os dados de quem marcou
    var b = state.bookings.find(function (x) {
      return x.date === slot.date && x.time === slot.hora && x.barber === slot.barber;
    });

    if (!b) {
      corpo.innerHTML =
        "<h3>Horário livre</h3>" +
        '<p class="ag-hint">Esse horário não está mais reservado.</p>' +
        '<div class="ag-modal__acoes"><button type="button" class="btn btn--outline" id="ag-det-fechar">Fechar</button></div>';
      $("ag-det-fechar").addEventListener("click", fecharDetalhe);
      return;
    }

    var wa = "https://wa.me/" + (b.phone.length > 11 ? b.phone : "55" + b.phone);
    corpo.innerHTML =
      "<h3>Quem marcou</h3>" +
      '<p class="ag-ok__resumo"><strong>' + quando + "</strong></p>" +
      '<div class="ag-det">' +
      '<div class="ag-det__linha"><span>Profissional</span><strong>' + escapeHtml(nomeBarbeiro(b.barber)) + "</strong></div>" +
      '<div class="ag-det__linha"><span>Nome</span><strong>' + escapeHtml(b.name) + "</strong></div>" +
      '<div class="ag-det__linha"><span>WhatsApp</span><a href="' + wa + '" target="_blank" rel="noopener">' + formatarTelefone(b.phone) + "</a></div>" +
      '<div class="ag-det__linha"><span>Serviço</span><strong>' + escapeHtml(b.service) + "</strong></div>" +
      "</div>" +
      '<p class="ag-msg" id="ag-det-msg"></p>' +
      '<div class="ag-modal__acoes">' +
      '<a class="btn btn--gold" href="' + wa + '" target="_blank" rel="noopener">Chamar no WhatsApp</a>' +
      '<button type="button" class="btn btn--del-full" id="ag-det-remover">Remover horário</button>' +
      '<button type="button" class="btn btn--outline" id="ag-det-fechar">Fechar</button>' +
      "</div>";
    $("ag-det-fechar").addEventListener("click", fecharDetalhe);
    $("ag-det-remover").addEventListener("click", async function () {
      var btn = $("ag-det-remover");
      btn.disabled = true;
      var res = await apiRemover(b.id, CONFIG.SENHA_ADMIN);
      var m = $("ag-det-msg");
      if (res.error) {
        if (m) { m.textContent = res.error; m.className = "ag-msg ag-msg--erro"; }
        btn.disabled = false;
        return;
      }
      await recarregar();
      renderHorarios();
      atualizarResumo();
      fecharDetalhe();
    });
  }

  /* ---------- Admin: gerenciar/remover ---------- */
  function abrirAdmin() {
    var modal = $("ag-admin");
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    renderAdmin(false);
  }
  function fecharAdmin() {
    var modal = $("ag-admin");
    if (modal) modal.hidden = true;
    document.body.style.overflow = "";
  }

  function renderAdmin(autenticado) {
    var corpo = $("ag-admin-corpo");
    if (!corpo) return;

    if (!autenticado) {
      corpo.innerHTML =
        "<h3>Gerenciar agendamentos</h3>" +
        '<p class="ag-hint">Digite a senha para ver e remover horários.</p>' +
        '<input type="password" id="ag-senha" class="ag-input" placeholder="Senha" inputmode="numeric">' +
        '<p class="ag-msg" id="ag-admin-msg"></p>' +
        '<div class="ag-modal__acoes">' +
        '<button type="button" class="btn btn--gold" id="ag-entrar">Entrar</button>' +
        '<button type="button" class="btn btn--outline" id="ag-admin-fechar">Fechar</button>' +
        "</div>";
      $("ag-admin-fechar").addEventListener("click", fecharAdmin);
      var entrar = function () {
        var senha = ($("ag-senha").value || "").trim();
        if (senha === CONFIG.SENHA_ADMIN) {
          renderAdmin(true);
        } else {
          var m = $("ag-admin-msg");
          if (m) { m.textContent = "Senha incorreta."; m.className = "ag-msg ag-msg--erro"; }
        }
      };
      $("ag-entrar").addEventListener("click", entrar);
      $("ag-senha").addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") entrar();
      });
      return;
    }

    // Autenticado: lista os agendamentos futuros
    var futuros = state.bookings
      .filter(function (b) { return b.date >= hojeKey(); })
      .sort(function (a, c) {
        return (a.date + a.time) < (c.date + c.time) ? -1 : 1;
      });

    var html =
      "<h3>Agendamentos" + (state.demo ? " (demonstração)" : "") + "</h3>";
    if (!futuros.length) {
      html += '<p class="ag-hint">Nenhum horário marcado. 🎉</p>';
    } else {
      html += '<ul class="ag-lista">';
      futuros.forEach(function (b) {
        var wa = "https://wa.me/" + (b.phone.length > 11 ? b.phone : "55" + b.phone);
        html +=
          '<li class="ag-lista__item" data-id="' + b.id + '">' +
          "<div><strong>" + formatarDataLonga(b.date) + " · " + b.time + " · " + escapeHtml(nomeBarbeiro(b.barber)) + "</strong><br>" +
          "<span>" + escapeHtml(b.name) + " — " + escapeHtml(b.service) + "</span><br>" +
          '<a href="' + wa + '" target="_blank" rel="noopener" class="ag-lista__wa">' +
          formatarTelefone(b.phone) + "</a></div>" +
          '<button type="button" class="ag-del" data-id="' + b.id + '" aria-label="Remover">🗑️</button>' +
          "</li>";
      });
      html += "</ul>";
    }
    html +=
      '<p class="ag-msg" id="ag-admin-msg"></p>' +
      '<div class="ag-modal__acoes">' +
      '<button type="button" class="btn btn--outline" id="ag-admin-fechar">Fechar</button>' +
      "</div>";
    var corpoEl = $("ag-admin-corpo");
    corpoEl.innerHTML = html;
    $("ag-admin-fechar").addEventListener("click", fecharAdmin);

    Array.prototype.forEach.call(corpoEl.querySelectorAll(".ag-del"), function (btn) {
      btn.addEventListener("click", async function () {
        var id = btn.getAttribute("data-id");
        btn.disabled = true;
        var res = await apiRemover(id, CONFIG.SENHA_ADMIN);
        var m = $("ag-admin-msg");
        if (res.error) {
          if (m) { m.textContent = res.error; m.className = "ag-msg ag-msg--erro"; }
          btn.disabled = false;
          return;
        }
        await recarregar();
        renderAdmin(true);
        renderHorarios();
        atualizarResumo();
      });
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ================== INIT ================== */
  async function init() {
    if (!$("ag-servicos")) return; // seção não existe nesta página

    // Máscara do telefone
    var whats = $("ag-whats");
    if (whats) {
      whats.addEventListener("input", function () {
        whats.value = formatarTelefone(whats.value);
      });
    }

    var form = $("ag-form");
    if (form) form.addEventListener("submit", confirmar);

    var gerenciar = $("ag-gerenciar");
    if (gerenciar) gerenciar.addEventListener("click", abrirAdmin);

    // Swipe no calendário (mobile): arrastar pro lado troca de mês
    var cal = $("ag-dias");
    if (cal) {
      var tx = 0, ty = 0;
      cal.addEventListener("touchstart", function (ev) {
        tx = ev.changedTouches[0].clientX;
        ty = ev.changedTouches[0].clientY;
      }, { passive: true });
      cal.addEventListener("touchend", function (ev) {
        var dx = ev.changedTouches[0].clientX - tx;
        var dy = ev.changedTouches[0].clientY - ty;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          mudarMes(dx < 0 ? 1 : -1); // arrastar pra esquerda = próximo mês
        }
      }, { passive: true });
    }

    // Fecha modais clicando no fundo ou Esc
    ["ag-admin", "ag-sucesso"].forEach(function (mid) {
      var m = $(mid);
      if (!m) return;
      m.addEventListener("click", function (ev) {
        if (ev.target === m) {
          m.hidden = true;
          document.body.style.overflow = "";
        }
      });
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape") return;
      ["ag-admin", "ag-sucesso", "ag-detalhe"].forEach(function (mid) {
        var m = $(mid);
        if (m && !m.hidden) { m.hidden = true; document.body.style.overflow = ""; }
      });
    });

    renderBarbeiros();
    renderServicos();
    renderDias();
    renderHorarios();
    atualizarResumo();
    await recarregar();
    renderHorarios(); // re-render com os ocupados já carregados
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
