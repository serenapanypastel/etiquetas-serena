/* =========================================================
   NUEVAFICHA.JS
   Lógica del formulario para crear o editar una ficha.
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    const formulario = document.getElementById("formulario-ficha");

    const campoPedido = document.getElementById("pedido");
    const campoCliente = document.getElementById("cliente");
    const campoTelefono = document.getElementById("telefono");

    // Hasta 3 pares "bizcochos + molde" por pedido. El 1 es obligatorio,
    // el 2 y el 3 son opcionales (se ignoran si quedan vacíos).
    const paresMolde = [
        { bizcochos: document.getElementById("bizcochos-1"), molde: document.getElementById("molde-1") },
        { bizcochos: document.getElementById("bizcochos-2"), molde: document.getElementById("molde-2") },
        { bizcochos: document.getElementById("bizcochos-3"), molde: document.getElementById("molde-3") }
    ];

    const campoSabor = document.getElementById("sabor");
    const campoRelleno = document.getElementById("relleno");
    const campoEntrega = document.getElementById("fecha-entrega");
    const campoObservaciones = document.getElementById("observaciones");

    const numeroPedidoResumen = document.getElementById("numero-pedido");
    const estadoResumen = document.getElementById("estado");
    const entregaResumen = document.getElementById("resumen-entrega");

    const botonGuardar = formulario.querySelector(".boton-guardar");
    const botonPdf = document.getElementById("descargar-pdf");

    const idEditar = new URLSearchParams(window.location.search).get("id");
    let fichaActual = null;

    /* ---------- Inicialización ---------- */

    try {
        if (idEditar) {
            fichaActual = await obtenerFichaPorId(idEditar);
        }

        if (fichaActual) {
            cargarFichaEnFormulario(fichaActual);
        } else {
            const pedidoPrevio = await previsualizarNumeroPedido();
            campoPedido.value = pedidoPrevio;
            numeroPedidoResumen.textContent = pedidoPrevio;
        }
    } catch (error) {
        console.error(error);
        mostrarToast("No se pudo conectar con la base de datos.");
    }

    actualizarResumenEntrega();

    /* ---------- Eventos que actualizan el resumen en vivo ---------- */

    campoEntrega.addEventListener("change", actualizarResumenEntrega);

    /* ---------- Guardar / actualizar ficha ---------- */

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        if (!formulario.reportValidity()) return;

        botonGuardar.disabled = true;
        const textoOriginal = botonGuardar.textContent;
        botonGuardar.textContent = "Guardando...";

        try {
            const pedido = fichaActual ? fichaActual.pedido : await generarNumeroPedido();
            const moldes = leerMoldes();

            const ficha = {
                id: fichaActual ? fichaActual.id : null,
                pedido,
                cliente: campoCliente.value.trim(),
                telefono: campoTelefono.value.trim(),
                moldes,
                // Se mantienen por compatibilidad con fichas guardadas antes
                // de admitir varios moldes (siempre reflejan el molde 1).
                bizcochos: moldes[0] ? moldes[0].bizcochos : 0,
                molde: moldes[0] ? moldes[0].molde : "",
                sabor: campoSabor.value,
                relleno: campoRelleno.value,
                fechaEntrega: campoEntrega.value,
                observaciones: campoObservaciones.value.trim(),
                estado: "Guardada",
                fechaCreacion: fichaActual ? fichaActual.fechaCreacion : new Date().toISOString()
            };

            const guardada = await guardarFicha(ficha);
            fichaActual = guardada;

            campoPedido.value = guardada.pedido;
            numeroPedidoResumen.textContent = guardada.pedido;
            estadoResumen.textContent = guardada.estado;

            mostrarToast("Ficha " + guardada.pedido + " guardada correctamente.");
        } catch (error) {
            console.error(error);
            mostrarToast("No se pudo guardar. Revisa tu conexión a internet.");
        } finally {
            botonGuardar.disabled = false;
            botonGuardar.textContent = textoOriginal;
        }
    });

    /* ---------- Descargar / imprimir como PDF ---------- */

    botonPdf.addEventListener("click", () => {
        if (!formulario.reportValidity()) {
            mostrarToast("Completa los campos requeridos antes de generar el PDF.");
            return;
        }

        if (!fichaActual || huboCambiosSinGuardar()) {
            mostrarToast("Guarda la ficha antes de descargarla en PDF.");
            return;
        }

        imprimirFicha(fichaActual);
    });

    /* ---------- Limpiar formulario ---------- */

    formulario.addEventListener("reset", () => {
        setTimeout(async () => {
            fichaActual = null;
            botonGuardar.textContent = "💾 Guardar ficha";

            try {
                const pedidoPrevio = await previsualizarNumeroPedido();
                campoPedido.value = pedidoPrevio;
                numeroPedidoResumen.textContent = pedidoPrevio;
            } catch (error) {
                console.error(error);
            }

            estadoResumen.textContent = "Borrador";
            actualizarResumenEntrega();
        }, 0);
    });

    /* ---------- Funciones auxiliares ---------- */

    function cargarFichaEnFormulario(ficha) {
        campoPedido.value = ficha.pedido;
        campoCliente.value = ficha.cliente;
        campoTelefono.value = ficha.telefono || "";
        campoSabor.value = ficha.sabor;
        campoRelleno.value = ficha.relleno;
        campoEntrega.value = ficha.fechaEntrega;
        campoObservaciones.value = ficha.observaciones || "";

        const moldesGuardados = obtenerMoldesFicha(ficha);
        paresMolde.forEach((par, indice) => {
            const datos = moldesGuardados[indice];
            par.bizcochos.value = datos ? datos.bizcochos : "";
            par.molde.value = datos ? datos.molde : "";
        });

        numeroPedidoResumen.textContent = ficha.pedido;
        estadoResumen.textContent = ficha.estado;

        botonGuardar.textContent = "💾 Actualizar ficha";
    }

    /* Lee los pares "bizcochos + molde" llenos del formulario (el 1 es
       obligatorio; el 2 y el 3 se ignoran si quedan vacíos). */
    function leerMoldes() {
        return paresMolde
            .map((par) => ({
                bizcochos: Number(par.bizcochos.value),
                molde: par.molde.value
            }))
            .filter((item) => item.molde && item.bizcochos > 0);
    }

    function actualizarResumenEntrega() {
        entregaResumen.textContent = campoEntrega.value
            ? formatearFecha(campoEntrega.value)
            : "Sin seleccionar";
    }

    function huboCambiosSinGuardar() {
        if (!fichaActual) return true;

        return (
            fichaActual.cliente !== campoCliente.value.trim() ||
            fichaActual.telefono !== campoTelefono.value.trim() ||
            JSON.stringify(obtenerMoldesFicha(fichaActual)) !== JSON.stringify(leerMoldes()) ||
            fichaActual.sabor !== campoSabor.value ||
            fichaActual.relleno !== campoRelleno.value ||
            fichaActual.fechaEntrega !== campoEntrega.value ||
            fichaActual.observaciones !== campoObservaciones.value.trim()
        );
    }

});
