# The Joãozin Barber — Site + PWA + Agendamento

Site institucional moderno, **mobile-first**, com **PWA** (instalável no celular, funciona offline) e
**agendamento online** para a **The Joãozin Barber** — R. Feliciano de Morais, 647, Nossa Sra. Aparecida, Uberlândia-MG.

## Estrutura

```
index.html              Página única (hero, AGENDAMENTO, serviços, galeria, sobre, mapa, CTA)
manifest.webmanifest    Manifesto PWA (ícones, cores, atalhos)
sw.js                   Service worker (cache offline)
vercel.json             Config da Vercel (no-cache na /api)
AGENDAMENTO.md          Guia de configuração do agendamento (Vercel + token GitHub)
api/
  bookings.js           Função serverless: grava/lê os agendamentos no txt do GitHub
assets/
  css/style.css         Tema escuro preto & prata (cores da marca)
  css/agendamento.css   Estilos da seção de agendamento
  js/app.js             Menu, lightbox, reveal, instalação PWA, evento de conversão
  js/agendamento.js     Lógica do agendamento (config, UI, cliente da API)
  img/                  Fotos (galeria, fachada, dono, logo, imagem de compartilhamento)
  icons/                Ícones PWA (192/512), favicon, apple-touch-icon
```

## Rodar localmente

Qualquer servidor estático serve:

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Abra `http://localhost:8000`. Sem a API configurada, o agendamento roda em **modo demonstração**
(salva só no navegador) — ótimo pra apresentar. O service worker e a instalação do PWA exigem HTTPS
em produção (localhost é exceção).

## Publicar (grátis) — Vercel

O agendamento usa uma função serverless, então publique na **Vercel** (grátis, HTTPS automático):
importe o repositório em [vercel.com](https://vercel.com) e configure as variáveis de ambiente.
Passo a passo completo em **[AGENDAMENTO.md](AGENDAMENTO.md)**.

> Hospedagens só-estáticas (GitHub Pages, Cloudflare Pages) servem a landing, mas **o agendamento
> cai em modo demonstração** porque não executam a função `api/bookings.js`.

Depois, apontar um domínio próprio (ex.: `thejoaozinbarber.com.br`) e trocar as URLs de Open Graph
e a `<link rel="canonical">` no topo do `index.html`.

## Dados da barbearia (já preenchidos)

| Item | Valor |
|---|---|
| Nome | **The Joãozin Barber** (João Vitor Rodrigues) |
| WhatsApp | **(34) 99773-9176** → `5534997739176` |
| Instagram | **@the_joaozin_barber** |
| Endereço | R. Feliciano de Morais, 647 – Nossa Sra. Aparecida, Uberlândia-MG, 38400-684 |
| Horários | Seg–Sex 09:00–20:00 · Sáb 09:00–17:00 |

> ⚠️ **Preços dos serviços** no `index.html` (`#servicos`) e no `CONFIG` de `assets/js/agendamento.js`
> são valores de exemplo — **confirme a tabela final com a barbearia** antes de publicar.

## Checklist antes de entregar ao cliente

- [ ] Confirmar **tabela de preços** e serviços (em `index.html` e no `CONFIG`).
- [ ] **Configurar o agendamento** seguindo o [AGENDAMENTO.md](AGENDAMENTO.md) (Vercel + token).
- [ ] Trocar as URLs `og:*` / `canonical` no `index.html` pelo domínio real.
- [ ] (Opcional) Configurar Google Ads/Analytics (bloco `gtag` comentado no `index.html`).
- [ ] Conferir o link do Google Maps (o embed usa o endereço; ajuste para o "place" oficial se houver).

## Atualizações

- **Trocar fotos da galeria**: substituir `assets/img/corte-01.jpg` … `corte-06.jpg` (proporção 3:4).
- **Alterar preços/serviços (vitrine)**: editar os cards em `index.html`, seção `#servicos`.
- **Alterar horários/dias/serviços do agendamento**: editar o `CONFIG` no topo de
  `assets/js/agendamento.js` (ver [AGENDAMENTO.md](AGENDAMENTO.md)).
- Ao publicar mudanças, incremente a versão do cache em `sw.js` (`joaozin-barber-v1` → `v2`) para
  forçar atualização nos aparelhos que instalaram o PWA.
