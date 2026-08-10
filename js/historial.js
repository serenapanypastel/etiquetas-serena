/* =========================================================
   HISTORIAL.JS
   Lista, busca, muestra, imprime y elimina fichas guardadas.
   Se mantiene sincronizado en tiempo real con Firestore.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const cuerpoTabla = document.getElementById("tabla-fichas");
    const campoBuscar = document.getElementById("buscar");
    const modalDetalle = document.getElementById("modal-detalle");
    const contenedorDetalle = document.getElementById("detalle-ficha");
    const botonCerrarModal = document.getElementById("cerrar-modal");

    let todasLasFichas = [];

    cuerpoTabla.innerHTML = `
        <tr><td colspan="4" class="sin-fichas">Cargando fichas...</td></tr>
    `;

    /* ---------- Suscripción en tiempo real a Firestore ---------- */

    refFichas().onSnapshot(
        (snapshot) => {
            todasLasFichas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            aplicarFiltro();
        },
        (error) => {
            console.error(error);
            cuerpoTabla.innerHTML = `
                <tr><td colspan="4" class="sin-fichas">
                    No se pudo conectar con la base de datos.
                </td></tr>
            `;
        }
    );

    /* ---------- Buscar ---------- */

    campoBuscar.addEventListener("input", aplicarFiltro);

    /* ---------- Acciones de cada fila (delegación de eventos) ---------- */

    cuerpoTabla.addEventListener("click", async (evento) => {
        const boton = evento.target.closest("button[data-accion]");
        if (!boton) return;

        const { accion, id } = boton.dataset;
        const ficha = todasLasFichas.find((f) => f.id === id);
        if (!ficha) return;

        if (accion === "ver") verFicha(ficha);
        if (accion === "imprimir") imprimirFicha(ficha);
        if (accion === "editar") window.location.href = "nuevaficha.html?id=" + id;
        if (accion === "eliminar") await confirmarEliminar(ficha);
    });

    /* ---------- Modal ---------- */

    if (botonCerrarModal) {
        botonCerrarModal.addEventListener("click", () => modalDetalle.close());
    }

    if (modalDetalle) {
        modalDetalle.addEventListener("click", (evento) => {
            if (evento.target === modalDetalle) modalDetalle.close();
        });
    }

    /* ---------- Funciones auxiliares ---------- */

    function aplicarFiltro() {
        const termino = campoBuscar.value.trim().toLowerCase();

        const filtradas = todasLasFichas.filter((ficha) =>
            ficha.pedido.toLowerCase().includes(termino) ||
            ficha.cliente.toLowerCase().includes(termino)
        );

        renderizarTabla(filtradas);
    }

    function renderizarTabla(fichas) {
        if (!fichas.length) {
            cuerpoTabla.innerHTML = `
                <tr>
                    <td colspan="4" class="sin-fichas">
                        No hay fichas registradas todavía.
                    </td>
                </tr>
            `;
            return;
        }

        const filasOrdenadas = [...fichas].sort((a, b) =>
            (b.fechaCreacion || "").localeCompare(a.fechaCreacion || "")
        );

        cuerpoTabla.innerHTML = filasOrdenadas.map((ficha) => `
            <tr>
                <td data-etiqueta="Pedido">${ficha.pedido}</td>
                <td data-etiqueta="Cliente">${ficha.cliente}</td>
                <td data-etiqueta="Entrega">${formatearFecha(ficha.fechaEntrega)}</td>
                <td class="acciones" data-etiqueta="Acciones">
                    <button type="button" data-accion="ver" data-id="${ficha.id}" title="Ver detalle">👁️</button>
                    <button type="button" data-accion="imprimir" data-id="${ficha.id}" title="Descargar PDF">📄</button>
                    <button type="button" data-accion="editar" data-id="${ficha.id}" title="Editar">✏️</button>
                    <button type="button" class="eliminar" data-accion="eliminar" data-id="${ficha.id}" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `).join("");
    }

    function verFicha(ficha) {
        if (!modalDetalle || !contenedorDetalle) return;

        const moldes = obtenerMoldesFicha(ficha);
        const listaMoldes = moldes.length
            ? moldes.map((item) => `${item.bizcochos} bizcocho${Number(item.bizcochos) === 1 ? "" : "s"} · molde ${item.molde}`).join("<br>")
            : "-";

        contenedorDetalle.innerHTML = `
            <div class="item-modal"><strong>Pedido:</strong> ${ficha.pedido}</div>
            <div class="item-modal"><strong>Cliente:</strong> ${ficha.cliente}</div>
            <div class="item-modal"><strong>Teléfono:</strong> ${ficha.telefono || "-"}</div>
            <div class="item-modal"><strong>Moldes:</strong> ${listaMoldes}</div>
            <div class="item-modal"><strong>Sabor:</strong> ${ficha.sabor}</div>
            <div class="item-modal"><strong>Relleno:</strong> ${ficha.relleno}</div>
            <div class="item-modal"><strong>Entrega:</strong> ${formatearFecha(ficha.fechaEntrega)}</div>
            <div class="item-modal"><strong>Observaciones:</strong> ${ficha.observaciones || "Sin observaciones"}</div>
            <div class="item-modal"><strong>Creada:</strong> ${formatearFechaHora(ficha.fechaCreacion)}</div>
        `;

        modalDetalle.showModal();
    }

    async function confirmarEliminar(ficha) {
        const confirmado = window.confirm(
            `¿Eliminar la ficha ${ficha.pedido} de ${ficha.cliente}? Esta acción no se puede deshacer.`
        );

        if (!confirmado) return;

        try {
            await eliminarFicha(ficha.id);
            mostrarToast("Ficha " + ficha.pedido + " eliminada.");
            // onSnapshot actualiza la tabla automáticamente.
        } catch (error) {
            console.error(error);
            mostrarToast("No se pudo eliminar. Revisa tu conexión a internet.");
        }
    }

});
