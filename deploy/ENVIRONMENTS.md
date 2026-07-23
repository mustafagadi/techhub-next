# Environments

Three ways to run this frontend, each with its own compose file:

| Environment | Compose file | Points at |
|---|---|---|
| Local dev | `../docker-compose.yml` (repo root) | Whatever `.env` sets, typically a locally-running backend |
| Staging | `docker-compose.staging.yml` | The **staging** backend instance |
| Production | `docker-compose.production.yml` | The **production** backend instance |

The backend (`CleanApigeePortal`) is a separate repository with its own deployment (see its own
`deploy/ENVIRONMENTS.md`) — these compose files run the Next.js frontend alone.
`BACKEND_URL`/`API_BASE_SERVER` in each environment's `.env.*` must point at the matching backend
instance (staging frontend → staging backend, production frontend → production backend).

## Build-time vs. runtime configuration

- `BACKEND_URL`, `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_GA_ID` are **build-time** — they get inlined
  into the compiled client bundle and Next's rewrite rules. Changing one of these requires a
  rebuild (`--build`), not just a container restart.
- `API_BASE_SERVER` is **runtime** — read by server components on each request, so it can be
  changed and take effect with just a restart.

## Bringing an environment up

```bash
# Staging
cp deploy/.env.staging.example deploy/.env.staging      # fill in real values
docker compose -f deploy/docker-compose.staging.yml --env-file deploy/.env.staging up -d --build

# Production
cp deploy/.env.production.example deploy/.env.production
docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env.production up -d --build
```

Each file declares its own Compose project `name:` (`techhub-frontend-staging` /
`techhub-frontend-production`), so container names and volumes never collide with each other or
with local dev.

## Deploys and rollback

Both server compose files use `image: techhub-frontend:${IMAGE_TAG:-staging|production}`. Deploy
with `IMAGE_TAG=$(git rev-parse --short HEAD)` (the GitLab CI `deploy-staging`/`deploy-production`
jobs already do this) so every build stays on the host under its own tag. Rolling back is then just
setting `IMAGE_TAG` to the previous SHA and running `up -d` **without** `--build`. Pushing built
images to the GitLab Container Registry via CI and pulling them here instead of rebuilding on the
server is the better end state once that's wired up — this is the minimum that makes "which code is
running" answerable and rollback possible today.

## Health checks

The image already declares a Docker `HEALTHCHECK` (`GET /` via `wget`). `docker compose ps` reports
the container as `healthy`/`unhealthy` once it's been up for its `start_period`.

## Verifying after standing one up

- [ ] The site loads, and the catalog shows real services from the matching backend (not the
  sample-data fallback — see `src/app/services/page.js`, which shows placeholder cards only when
  the backend is unreachable)
- [ ] Login works, and redirects go to the right places for admin vs. partner
- [ ] Arabic/English toggle and RTL layout both render correctly
- [ ] Admin dashboard KPIs and traffic chart load

## Secrets hygiene

`.gitignore` at the repo root excludes `deploy/.env.*` (except the `.example` files). Neither
`.env.staging` nor `.env.production` in this frontend holds anything as sensitive as the backend's
(no DB password, no JWT signing key) — but the backend origin URLs still shouldn't be treated as
public, and should never be committed alongside real infrastructure hostnames.

## What's still a template, not a finished deployment

- A reverse proxy / TLS termination in front of the container port (it doesn't terminate HTTPS
  itself)
- DNS for whatever hostname each environment is served under
- CI/CD variables in GitLab (`DEPLOY_SSH_KEY`, `DEPLOY_STAGING_HOST`, `DEPLOY_PRODUCTION_HOST`,
  `DEPLOY_STAGING_PATH`, `DEPLOY_PRODUCTION_PATH`) if the pipeline's manual deploy jobs are used
- Coordinating deploys with the backend repo — this frontend and its matching backend should be
  brought up/updated together per environment, since a mismatched API contract between them isn't
  guarded against automatically
