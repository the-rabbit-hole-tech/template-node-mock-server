# template-node-mock-server 🧩

> 🧭 Starting point for a product's mock gateway: a standalone Node server that speaks the gateway's wire protocol with resettable invented data.

A product's clients (a staff web app, an admin console, a phone app) all talk to one gateway. Before
that gateway exists, or when nobody wants a whole cluster running to work on a screen, they talk to
this instead: one Node process on its own port that answers the same paths in the same shapes, from
invented data that every client shares and anyone can put back with one click. 🏷️ **A product
keeps the server and swaps the product:** the schema, the data and the resolvers live in
`src/product/`, and nothing in `src/core/` names a product.

## ✨ Highlights

- 🔌 **The gateway's wire protocol:** GraphQL at `POST /query` and `GET /query`, a websocket on the
  same path for subscriptions (`graphql-transport-ws`, and the older `graphql-ws` that some mobile
  clients still speak), sign-in under `/auth/*`, first-run setup under `/setup/*`, and the
  `/livez`, `/readyz` and `/healthz` probes.
- 📐 **Answers shaped by the real schema:** every operation runs against the product's own GraphQL
  schema, so clients get only the fields they asked for, and a query the gateway would refuse is
  refused here too, with the same error codes.
- 👥 **One state for every client:** a browser signs in with a cookie and a CSRF token, a phone
  with a bearer token, and both read and change the same invented data. A change one client makes
  reaches every open subscription.
- 🎛️ **A controls page at `/_mock`:** sign someone in, fail the next call (as a GraphQL error or
  an HTTP status), expire every session, put the sample data back, start fresh, or start as a new
  install. A product adds its own buttons.
- 🧪 **Usable from a client's tests:** start it on a free port, or call `handle` with a `Request`
  and no port at all.
- 🪶 **No build step:** Node 24 runs the TypeScript sources directly. Two runtime dependencies:
  `graphql` and `ws`.

## 🚀 Run it

### Before you start

- Node.js 24 or later (`.nvmrc` has the version CI uses).

### Steps

1. Install the dependencies. Always pass `--ignore-scripts`:

   ```bash
   npm ci --ignore-scripts
   ```

2. Start the mock:

   ```bash
   npm start
   ```

   It listens on `http://localhost:5180`. Pass `-- --port 0` for a free port; the ready line says
   which one it got.

3. Open the controls at `http://localhost:5180/_mock`, or sign in from a client with a person's
   username and the password set for them (the sample's are `<username>-password`, and the Users
   card on `/_mock` changes them), then any six digits except `000000`. A refused sign-in answers
   an `error` code and a `message` a client can show.

### Settings

| Variable                                      | What it does                                                                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                        | The HTTP port (default 5180). `--port` on the command line wins.                                                                        |
| `HOST`                                        | Where to listen. Loopback by default, because the controls have no sign-in; set `0.0.0.0` to reach it from a phone on the same network. |
| `HTTPS_PORT`, `MOCK_TLS_CERT`, `MOCK_TLS_KEY` | Also serve HTTPS, for a client that refuses plain HTTP (an iOS app). `--https-port` on the command line sets the port.                  |
| `MOCK_CORS_ORIGINS`                           | Comma-separated origins allowed to call it with credentials, for a web client served from another port without a proxy.                 |
| `MOCK_SESSION_COOKIE`                         | The session cookie's name, when a client reads the real gateway's name.                                                                 |
| `MOCK_FRESH_INSTALL`                          | `1` starts it as a new install, so clients walk first-run setup.                                                                        |
| `MOCK_SERVER_VERSION`                         | The version the probes report.                                                                                                          |
| `LOG_LEVEL`, `LOG_FORMAT`                     | `trace` to `error`; `console` or `json`.                                                                                                |

## 🎛️ Controls

`POST /_mock/controls` with a JSON body takes a `kind`; `GET /_mock/controls` returns what's going
on, `GET /_mock/state` the whole state, and `GET /_mock/people` the people who can sign in. Neither
ever includes a password: a person shows `hasPassword` instead, so a dev quick-login widget can
read the list live and offer exactly those people.

| Kind             | Body                                   | What it does                                                                                                                                                                           |
| ---------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sign-in`        | `personId`, `token`                    | A sign-in in one step with the person's own password, skipping the second factor, for a dev quick-login widget; `token: true` returns a bearer token. A refusal says why in `message`. |
| `fail-next`      | `mode` (`graphql` or `http`), `status` | The next GraphQL call fails once.                                                                                                                                                      |
| `expire-session` | `personId` (optional)                  | Ends sessions; open websockets close with 4401.                                                                                                                                        |
| `reset`          |                                        | The sample data back; everyone stays signed in.                                                                                                                                        |
| `fresh`          | `firstRun`                             | Back to first boot: everyone signed out, and first-run setup when `firstRun` is true.                                                                                                  |

The maintenance cycle has its own kinds, and its own card on the page:

| Kind                   | Body                            | What it does                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `maintenance-announce` | `startsAt`, `endsAt`, `message` | A window ahead, which every client reads.                                                                                                                                                                                                                          |
| `maintenance-start`    | `endsAt`, `message` (optional)  | Maintenance on now: the gateway paths answer 503 with a Retry-After and `/readyz` isn't ready, while `/livez`, `/healthz`, `/_mock` and the product's banner fields keep answering. A product with maintenance `scope: "graphql"` refuses only GraphQL operations. |
| `maintenance-update`   | `startsAt`, `endsAt`, `message` | Extend or change the window, announced or on.                                                                                                                                                                                                                      |
| `maintenance-end`      |                                 | Back to normal.                                                                                                                                                                                                                                                    |
| `maintenance-cancel`   |                                 | Drop an announcement that hasn't started.                                                                                                                                                                                                                          |

The people who can sign in have kinds of their own, and the Users card on the page:

| Kind            | Body                                                                                        | What it does                                                                               |
| --------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `person-add`    | `username`, and `name`, `email`, `roles`, `password`, `secondFactor`, `disabled` (optional) | Someone new who can sign in; `roles` is a list or a comma-separated string.                |
| `person-update` | `personId`, and any of the fields above                                                     | Changes what it's given. A password counts from the next sign-in; an empty one is ignored. |
| `person-remove` | `personId`                                                                                  | Takes the person out and ends their sessions.                                              |

A product's own person fields (`personFields`) are set the same way, by their key, and show in the
Users card. Reset and start fresh put the seed people back, and no maintenance. The sample product adds `add-item` and `finish-items`.

## 📦 Use it from a client's tests

From another repo, run it as its own process and point the client at the port it prints:

```bash
node ../<product>-mock-server/bin/mock-server.mjs --port 0
```

Between test cases, `POST /_mock/controls` with `{"kind":"fresh"}` puts everything back. Node
doesn't run TypeScript from inside `node_modules`, so installing the mock as a dependency won't
start it; a clone beside the client, or a container, will.

Inside this repo, `src/index.ts` exports `useProduct`, `startMockServer`, `handle` and `startFresh`
for tests that run it in-process: hand it a product first, then start it.

## 🧩 Start a product's mock from it

[TEMPLATE.md](TEMPLATE.md) says how a product clones the template, re-brands it and fills in its
own protocol and data, and how it takes the template's later fixes.

## 🛠 Develop

```bash
npm run lint       # oxlint, then oxfmt --check (npm run format fixes the formatting)
npm run typecheck  # tsc
npm test           # node --test, against a real server on a free port
```

## 🙏 Acknowledgements

template-node-mock-server was originally created by [@Bugs5382](https://github.com/Bugs5382).

## ⚖️ License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE); [AUTHORS](AUTHORS) lists who holds the
copyright.
