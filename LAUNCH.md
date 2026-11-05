# VYLOC launch checklist

Do not launch until every item is done. Items marked (auto) are checked by `npm run prelaunch`.

## 1. Custom domain (manual)
- Buy a domain, then add it to the Vercel project (Settings, Domains) and follow the DNS records Vercel shows.
- Add the new site address to `CLIENT_URL` on Render (comma separated with any other allowed addresses) and set `APP_URL` to it.
- Optional: use a domain mailbox as the Brevo sender, and authenticate the domain in Brevo so emails reach inboxes.
- Rebuild the client after setting the production `VITE_API_URL`.

## 2. Favicon (auto)
`public/favicon.svg` exists and is linked in `index.html`. Check it in a browser tab after deploying.

## 3. No "made with" tag (auto)
The build is searched for "made with", "built with AI" and similar text. Also look at the live site yourself, including the footer of every page.

## 4. Privacy Policy and Terms pages (auto + manual)
- Fill in `src/config.js`: `operatorName`, `contactEmail`, `policiesUpdated`.
- Read both pages in full. Every statement must match what the app really does. If you change what the app collects or which services it uses, change the pages.
- Have them reviewed by someone qualified, and confirm your registration duties with Kenya's Office of the Data Protection Commissioner.
- Only then set `policiesReviewed: true`.

## 5. Content rules (auto where possible)
- No em dashes, gradients, pill-shaped radii or placeholder text in the source.
- No stock or AI generated photos, no fake reviews, no invented numbers. Every number shown comes from the database.
- No scroll or cursor animations.

## Run the automated checks
```bash
VITE_API_URL=https://your-api.example.com npm run build
npm run prelaunch
```
(On Windows PowerShell: `$env:VITE_API_URL="https://your-api.example.com"; npm run build; npm run prelaunch`)

## Manual checks before launch
- Create a fresh account with a real email, confirm it from the email, and sign in.
- Add one HTTP, one TCP and one DNS monitor. Confirm they show UP.
- Try adding `http://192.168.1.1`. It must be refused.
- Point a monitor at an address that does not exist, confirm it goes DOWN and that the alert email arrives, then recover it.
- Open a public status page while signed out.
- Check every page on a phone.
- Confirm the GitHub Actions workflow runs on schedule and the secrets are set.
