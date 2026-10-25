# VYLOC: Network Monitoring System

Uptime and latency monitoring for public websites and servers, with incident history, email alerts and a public status page.

- `server/` REST API + checking engine (Node.js, Express, MongoDB Atlas)
- `client/` React dashboard (coming next)

## What it monitors
- **HTTP/HTTPS:** UP when the response status is 2xx or 3xx (redirects are not followed). TLS errors are reported.
- **TCP port:** UP when a connection opens.
- **DNS:** UP when the domain resolves.

A monitor goes DOWN after 2 failed checks in a row (the second check is retried after 1 minute). Email alerts are sent on DOWN and on recovery.

## Security notes
- Targets are checked server-side, so private, loopback, link-local and reserved addresses are blocked (SSRF protection). The block is enforced at connection time, so DNS tricks and redirects can't bypass it.
- Passwords are hashed (bcrypt), tokens are JWT, input is validated (Zod), endpoints are rate limited.
- Email verification when email is configured.

## Run the API locally
```bash
cd server
npm install
copy .env.example .env      # then edit .env
npm run dev                 # http://localhost:5002  (the scheduler runs inside the server in dev)
```

## Scheduling in production
Free hosting sleeps when idle, so checks run from a **GitHub Actions** schedule instead (`.github/workflows/checks.yml`, every 5 minutes), which runs `npm run check` against the same database.
Add these repository secrets: `MONGODB_URI`, `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `APP_URL`.
Keep the repository public (free Actions minutes), and note GitHub pauses scheduled workflows after 60 days without repository activity.
