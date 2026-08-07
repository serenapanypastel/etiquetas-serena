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

    botonMostrarClave.addEventListener("click", () => {
        const esTexto = campoClave.type === "text";
        campoClave.type = esTexto ? "password" : "text";
        botonMostrarClave.textContent = esTexto ? "👁️" : "🙈";
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
