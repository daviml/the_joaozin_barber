# Sistema de Agendamento — configuração

O site tem agendamento online. Qualquer pessoa marca um horário; para **remover** um horário é preciso
a senha **1234**. Os agendamentos ficam num arquivo de texto (`bookings.json`) no próprio GitHub,
gravado por uma **função serverless da Vercel** que guarda o token com segurança (nunca aparece pro visitante).

> **Sem configurar nada, o site funciona em "modo demonstração"**: os agendamentos ficam salvos só no
> navegador de quem testa (localStorage). Ótimo pra apresentar a interface. Para valer (salvando no
> GitHub e compartilhado entre todos), siga os passos abaixo.

---

## Passo a passo (uma vez só)

### 1. Criar a branch de dados e o arquivo
No repositório do GitHub, crie uma branch chamada **`bookings-data`** e, nela, um arquivo
**`bookings.json`** com este conteúdo:

```json
{ "bookings": [] }
```

> Por que uma branch separada? Assim cada agendamento **não dispara um novo deploy** do site
> (que sai da branch `main`).

### 2. Criar o token do GitHub (fine-grained)
1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Repository access:** *Only select repositories* → escolha **apenas este repositório**.
3. **Permissions → Repository permissions → Contents:** **Read and write**.
4. Gere e **copie o token** (começa com `github_pat_...`). Guarde — só aparece uma vez.

### 3. Publicar na Vercel
1. Entre em [vercel.com](https://vercel.com) e **importe este repositório do GitHub**.
2. Framework preset: **Other** (é site estático + função). Pode deixar tudo no padrão e clicar em Deploy.
3. A função em `api/bookings.js` é detectada automaticamente (vira `https://SEU-SITE.vercel.app/api/bookings`).

### 4. Configurar as Environment Variables (na Vercel)
No projeto da Vercel → **Settings → Environment Variables**, adicione:

| Nome | Valor | Obrigatório |
|---|---|---|
| `GITHUB_TOKEN` | o token do passo 2 | ✅ |
| `GITHUB_REPO` | `seu-usuario/nome-do-repo` | ✅ |
| `GITHUB_BRANCH` | `bookings-data` | opcional (padrão já é esse) |
| `BOOKINGS_PATH` | `bookings.json` | opcional (padrão já é esse) |
| `ADMIN_PASSWORD` | `1234` | opcional (troque se quiser outra senha) |

Depois de salvar, faça um **Redeploy** para as variáveis valerem.

### 5. Testar
- Abra o site publicado, marque um horário → deve aparecer um **commit novo** em `bookings.json`
  na branch `bookings-data`.
- Abra em outro navegador/celular: o horário marcado aparece **indisponível** pra todo mundo.
- Clique em **"Gerenciar agendamentos"**, senha **1234**, e remova um horário.

---

## Como mudar horários, dias e serviços
Tudo fica no topo de [assets/js/agendamento.js](assets/js/agendamento.js), no objeto `CONFIG`:

```js
DIAS_ABERTOS: [1,2,3,4,5,6],  // 0=Dom ... 6=Sáb  (hoje: segunda a sábado)
HORA_ABRE: 9,                 // abre 09:00 (use fração: .5 = 30 min, ex.: 8.5 = 08:30)
HORA_FECHA: 20,               // Seg–Sex: último horário começa antes das 20:00
HORA_FECHA_SAB: 17,           // sábado fecha mais cedo (remova a linha p/ ignorar)
DURACAO_MIN: 60,              // 1 hora por horário
MESES_A_FRENTE: 2,            // navegar do mês atual até +2 meses à frente
BARBEIROS: [ ... ],           // um bloco por profissional (nome, foto e serviços)
SENHA_ADMIN: "1234"           // senha do front (troque junto com ADMIN_PASSWORD na Vercel)
```

### Um ou mais profissionais
Hoje há **3 profissionais** (Joãozin, Lucas e Daniel), então a etapa "escolher profissional" aparece
na hora de agendar. Cada profissional tem **agenda própria** (um horário ocupado com o Joãozin
continua livre com o Lucas) e **sua própria lista de serviços/preços**, no array `BARBEIROS`:

```js
BARBEIROS: [
  {
    id: "joaozin",                          // identificador interno (não repetir)
    nome: "Joãozin",                        // nome exibido no site
    foto: "assets/img/barbeiro-joaozin.jpg",// troque o arquivo para trocar a foto
    servicos: [
      { nome: "Corte de cabelo", icone: "✂️", preco: "R$ 40,00", duracao: 45 },
      // ... serviços deste profissional
    ]
  },
  { id: "lucas",  nome: "Lucas",  foto: "assets/img/barbeiro-lucas.jpg",  servicos: [ /* ... */ ] },
  { id: "daniel", nome: "Daniel", foto: "assets/img/barbeiro-daniel.jpg", servicos: [ /* ... */ ] }
]
```

> Para **remover um barbeiro**, apague o bloco dele. Se ficar **só um**, a etapa de escolha some
> sozinha e ele já vem selecionado.
> Os agendamentos guardam o `id` do barbeiro — evite trocar o `id` depois de já ter agenda marcada.
> Se trocar a senha, mude **nos dois lugares**: `SENHA_ADMIN` aqui **e** `ADMIN_PASSWORD` na Vercel.

## Rodar localmente com a API de verdade
Instale a CLI da Vercel e rode com as variáveis num arquivo `.env.local`:

```bash
npm i -g vercel
vercel dev
```

Sem isso, `python -m http.server` já mostra tudo em **modo demonstração** (localStorage).

## Observação de segurança
A senha 1234 é uma proteção **leve** (evita remoção acidental/casual), não é login seguro. Para uma
barbearia isso costuma bastar; se um dia quiser algo mais forte, dá pra evoluir para um login de verdade.
