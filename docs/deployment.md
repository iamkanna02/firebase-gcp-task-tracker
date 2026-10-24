# Deployment

The app is a static site (HTML, CSS, JavaScript) served by **Firebase Hosting** over HTTPS.
The browser talks to **Cloud Firestore** and **Firebase Authentication** directly through the Firebase Web SDK;
there is no backend server.

## URLs

- Live: `https://cloud-task-tracker-309ce.web.app`
- Alternate: `https://cloud-task-tracker-309ce.firebaseapp.com`

## What gets deployed

| Target | Source | Command |
|--------|--------|---------|
| Hosting | `public/` folder | `firebase deploy --only hosting` |
| Firestore rules | `firestore.rules` | `firebase deploy --only firestore:rules` |
| Firestore indexes | `firestore.indexes.json` | `firebase deploy --only firestore:indexes` |

Configuration lives in `firebase.json`; the target project is set in `.firebaserc`.

## Manual deployment (from Codespaces)

```bash
# 1. Preview on a temporary URL that expires after 1 day
firebase hosting:channel:deploy preview --expires 1d

# 2. Check the preview URL, then deploy to the live site
firebase deploy --only hosting
```

From Phase 5 onwards, deployments to the live site happen automatically through GitHub Actions
when a pull request is merged into `main`.

## Rollback

Firebase Console > Hosting > Release history > choose an earlier release > **Roll back**.
This is instant because Hosting keeps previous releases.

## HTTP headers

Set in `firebase.json` for every response:

| Header | Purpose |
|--------|---------|
| `Content-Security-Policy` | Only allows scripts, styles, fonts and connections from this site, Google Fonts, and the Firebase APIs the app uses. Blocks injected scripts. |
| `X-Frame-Options: DENY` and `frame-ancestors 'none'` | Prevents the app being embedded in another site (clickjacking). |
| `X-Content-Type-Options: nosniff` | Stops browsers guessing file types. |
| `Referrer-Policy` | Limits what URL information is sent to other sites. |
| `Permissions-Policy` | Disables camera, microphone and location access. |
| `Cache-Control: no-cache` on HTML/JS/CSS | Browsers revalidate on each visit, so new deployments appear immediately. |

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Old version still showing | Browser cache; hard reload (Ctrl+Shift+R) |
| `Refused to load ... violates Content-Security-Policy` in console | A domain the app needs is missing from the CSP in `firebase.json` |
| `permission-denied` from Firestore | Rules not deployed, or data doesn't match the rules |
| Page shows Firebase's default "Welcome" page | `public/index.html` was overwritten during `firebase init hosting` |