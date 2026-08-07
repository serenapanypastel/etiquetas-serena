/* =========================================================
   AUTH-GUARD.JS
   Protege una página: si no hay sesión activa, redirige a
   login.html. También conecta el botón "Cerrar sesión".
   Debe cargarse justo después de firebase-config.js.
   ========================================================= */

(function () {

    document.body.classList.add("verificando-sesion");

    auth.onAuthStateChanged((usuario) => {
        if (!usuario) {
            window.location.href = "login.html";
            return;
        }

        document.body.classList.remove("verificando-sesion");

        const spanCorreo = document.getElementById("correo-usuario");
        if (spanCorreo) spanCorreo.textContent = usuario.email;
    });

    document.addEventListener("DOMContentLoaded", () => {
        const botonSalir = document.getElementById("cerrar-sesion");

        if (botonSalir) {
            botonSalir.addEventListener("click", () => {
                auth.signOut();
            });
        }
    });

})();
