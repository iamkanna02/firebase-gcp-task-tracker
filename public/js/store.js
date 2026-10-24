// store.js — data layer (Phase 3: Cloud Firestore version)
//
// Exports the same four functions as the in-memory version, so app.js is unchanged.
//
// Data model:  users/{uid}/tasks/{taskId}
// Each visitor is signed in anonymously and can only access their own tasks.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const STATUSES = ["todo", "in-progress", "done"];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Resolves once there is a signed-in user. On the first visit this creates an
// anonymous account; on later visits the SDK restores the same account from
// browser storage, so the visitor sees the same tasks after a reload.
const userReady = new Promise((resolve, reject) => {
  const unsubscribe = onAuthStateChanged(
    auth,
    async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
        return;
      }
      try {
        await signInAnonymously(auth); // triggers onAuthStateChanged again with the user
      } catch (err) {
        unsubscribe();
        reject(err);
      }
    },
    reject
  );
});

async function tasksCollection() {
  const user = await userReady;
  return collection(db, "users", user.uid, "tasks");
}

function toTask(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: data.title,
    description: data.description ?? "",
    status: data.status,
    // Firestore Timestamps -> JavaScript Dates (fallback covers pending server timestamps)
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  };
}

export async function listTasks() {
  const col = await tasksCollection();
  const snapshot = await getDocs(query(col, orderBy("createdAt", "desc")));
  return snapshot.docs.map(toTask);
}

export async function addTask({ title, description }) {
  const col = await tasksCollection();
  const ref = await addDoc(col, {
    title,
    description,
    status: "todo",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, title, description, status: "todo", createdAt: new Date(), updatedAt: new Date() };
}

export async function updateTask(id, changes) {
  const col = await tasksCollection();

  const allowed = {};
  if ("title" in changes) allowed.title = changes.title;
  if ("description" in changes) allowed.description = changes.description;
  if ("status" in changes) {
    if (!STATUSES.includes(changes.status)) throw new Error(`Invalid status: ${changes.status}`);
    allowed.status = changes.status;
  }

  // updateDoc fails if the document doesn't exist, which is what we want
  await updateDoc(doc(col, id), { ...allowed, updatedAt: serverTimestamp() });
}

export async function deleteTask(id) {
  const col = await tasksCollection();
  await deleteDoc(doc(col, id));
}