import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB6YY_lcZSoEHEjwiJxAzHO7inKdYuAqoQ",
  authDomain: "allenamento-palestra-pesi-2.firebaseapp.com",
  projectId: "allenamento-palestra-pesi-2",
  storageBucket: "allenamento-palestra-pesi-2.firebasestorage.app",
  messagingSenderId: "205798196468",
  appId: "1:205798196468:web:3037da5d41af79c212caa1",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const WORKOUTS_COL = "workouts_v2";
const BODY_LOGS_COL = "body_logs_v2";
const CONFIG_DOC = "app_config/main";

// Carica tutto: ogni allenamento e ogni rilevazione corporea sono documenti
// indipendenti, letti in blocco solo all'apertura dell'app.
export async function loadGymData() {
  try {
    const [workoutsSnap, bodyLogsSnap, configSnap] = await Promise.all([
      getDocs(collection(db, WORKOUTS_COL)),
      getDocs(collection(db, BODY_LOGS_COL)),
      getDoc(doc(db, CONFIG_DOC)),
    ]);
    const workouts = workoutsSnap.docs.map((d) => d.data());
    const body_logs = bodyLogsSnap.docs.map((d) => d.data());
    const config = configSnap.exists() ? configSnap.data() : {};
    return {
      workouts,
      body_logs,
      exercises: config.exercises || [],
      splits: config.splits || [],
    };
  } catch (error) {
    console.error("Errore nel caricamento dati:", error.message);
    return null;
  }
}

// Salva UN SOLO allenamento come documento a sé stante: non tocca gli altri.
export async function saveWorkoutDoc(workout) {
  try {
    await setDoc(doc(db, WORKOUTS_COL, workout.id), workout);
  } catch (error) {
    console.error("Errore nel salvataggio allenamento:", error.message);
  }
}

export async function deleteWorkoutDoc(id) {
  try {
    await deleteDoc(doc(db, WORKOUTS_COL, id));
  } catch (error) {
    console.error("Errore nella cancellazione allenamento:", error.message);
  }
}

// Salva UNA SOLA rilevazione corporea come documento a sé stante.
export async function saveBodyLogDoc(entry) {
  try {
    await setDoc(doc(db, BODY_LOGS_COL, entry.id), entry);
  } catch (error) {
    console.error("Errore nel salvataggio rilevazione corporea:", error.message);
  }
}

export async function deleteBodyLogDoc(id) {
  try {
    await deleteDoc(doc(db, BODY_LOGS_COL, id));
  } catch (error) {
    console.error("Errore nella cancellazione rilevazione corporea:", error.message);
  }
}

// Esercizi e split settimanali restano un unico documento di configurazione:
// sono liste che si modificano/riordinano nel loro insieme, non un log che
// cresce nel tempo, quindi non hanno lo stesso rischio degli allenamenti.
export async function saveConfigDoc(exercises, splits) {
  try {
    await setDoc(doc(db, CONFIG_DOC), { exercises, splits });
  } catch (error) {
    console.error("Errore nel salvataggio configurazione:", error.message);
  }
}
