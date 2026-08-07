/* =========================================================
   FIREBASE-CONFIG.JS
   Credenciales del proyecto y arranque de Firestore.
   ========================================================= */

const firebaseConfig = {
    apiKey: "AIzaSyA-w0nRjDCrnp2Ch_OhD-bHqBRQrqZ2wTk",
    authDomain: "produccion-serena.firebaseapp.com",
    projectId: "produccion-serena",
    storageBucket: "produccion-serena.firebasestorage.app",
    messagingSenderId: "44647380431",
    appId: "1:44647380431:web:954a72d4fffb69de8b4eba",
    measurementId: "G-C8VQZ4CSXL"
};

firebase.initializeApp(firebaseConfig);

// Cada página carga solo los SDK de Firebase que necesita
// (por ejemplo, login.html no necesita Firestore), así que
// inicializamos cada servicio solo si su script fue cargado.
const db = typeof firebase.firestore === "function" ? firebase.firestore() : null;
const auth = typeof firebase.auth === "function" ? firebase.auth() : null;
