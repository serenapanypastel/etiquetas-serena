/* =========================================================
   LOGIN.JS
   Inicio de sesión con Firebase Authentication.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("formulario-login");
    const campoCorreo = document.getElementById("correo");
    const campoClave = document.getElementById("clave");
    const botonMostrarClave = document.getElementById("mostrar-clave");
    const botonOlvideClave = document.getElementById("olvide-clave");
    const mensajeError = document.getElementById("mensaje-error");
    const mensajeExito = document.getElementById("mensaje-exito");
    const botonLogin = document.getElementById("boton-login");

    // Si ya hay una sesión activa, no tiene sentido quedarse en login.
    auth.onAuthStateChanged((usuario) => {
        if (usuario) {
            window.location.href = "index.html";
        }
    });

    /* ---------- Mostrar / ocultar contraseña ---------- */

    const iconoOjo = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

    const iconoOjoTachado = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 8 11 8a9.26 9.26 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path></svg>`;

    botonMostrarClave.addEventListener("click", () => {
        const esTexto = campoClave.type === "text";
        campoClave.type = esTexto ? "password" : "text";
        botonMostrarClave.innerHTML = esTexto ? iconoOjo : iconoOjoTachado;
        botonMostrarClave.setAttribute(
            "aria-label",
            esTexto ? "Mostrar contraseña" : "Ocultar contraseña"
        );
    });

    /* ---------- Iniciar sesión ---------- */

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        limpiarMensajes();
        botonLogin.disabled = true;
        botonLogin.textContent = "Ingresando...";

        try {
            await auth.signInWithEmailAndPassword(
                campoCorreo.value.trim(),
                campoClave.value
            );
            window.location.href = "index.html";
        } catch (error) {
            mensajeError.textContent = traducirError(error.code);
            botonLogin.disabled = false;
            botonLogin.textContent = "Iniciar sesión";
        }
    });

    /* ---------- Olvidé mi contraseña ---------- */

    botonOlvideClave.addEventListener("click", async () => {
        limpiarMensajes();

        const correo = campoCorreo.value.trim();

        if (!correo) {
            mensajeError.textContent = "Escribe tu correo arriba para poder enviarte el enlace.";
            campoCorreo.focus();
            return;
        }

        try {
            await auth.sendPasswordResetEmail(correo);
            mensajeExito.textContent = "Te enviamos un correo con el enlace para restablecer tu contraseña.";
        } catch (error) {
            mensajeError.textContent = traducirError(error.code);
        }
    });

    /* ---------- Auxiliares ---------- */

    function limpiarMensajes() {
        mensajeError.textContent = "";
        mensajeExito.textContent = "";
    }

    function traducirError(codigo) {
        const mensajes = {
            "auth/invalid-email": "El correo no es válido.",
            "auth/user-disabled": "Esta cuenta está deshabilitada.",
            "auth/user-not-found": "No existe una cuenta con ese correo.",
            "auth/wrong-password": "La contraseña es incorrecta.",
            "auth/invalid-credential": "Correo o contraseña incorrectos.",
            "auth/too-many-requests": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
            "auth/network-request-failed": "No hay conexión a internet."
        };

        return mensajes[codigo] || "No se pudo completar la solicitud. Inténtalo de nuevo.";
    }

});
