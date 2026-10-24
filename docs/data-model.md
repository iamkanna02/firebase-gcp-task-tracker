# Data model and access control

## Firestore structure

```
users/{uid}/tasks/{taskId}
```

Each visitor is signed in with Firebase Anonymous Authentication and gets a unique `uid`.
Their tasks live in a subcollection under that `uid`, so data is separated per user by design.

## Task document

| Field         | Type      | Rules                                     |
|---------------|-----------|-------------------------------------------|
| `title`       | string    | Required, 1–100 characters                |
| `description` | string    | Required (may be empty), max 500 characters |
| `status`      | string    | One of `todo`, `in-progress`, `done`; new tasks must be `todo` |
| `createdAt`   | timestamp | Set by the server on create; cannot be changed |
| `updatedAt`   | timestamp | Set by the server on every write          |

No other fields are accepted.

## Access model

| Operation | Allowed when |
|-----------|--------------|
| Read / list | The signed-in user's `uid` matches `{uid}` in the path |
| Create | Owner, and the document passes validation |
| Update | Owner, only `title`, `description`, `status`, `updatedAt` change, and the result passes validation |
| Delete | Owner |
| Anything else | Denied by default |

## Why the Firebase config is in source control

The `firebaseConfig` values in `public/js/firebase-config.js` identify the project to the browser.
They are not secrets: every visitor's browser downloads them. Access is enforced by
Firestore security rules and Authentication, which run on Google's servers.

## Why anonymous authentication

Without authentication, security rules cannot tell one visitor from another, so any visitor
could read or delete everyone's tasks. Anonymous auth gives each visitor an identity with no
sign-up form, which keeps the project in scope while still enforcing per-user access.
Signing in with Google or email could be added later without changing the data model.