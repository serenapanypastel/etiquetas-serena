/* =========================================================
   COMMON.JS
   Funciones compartidas: acceso a Firestore, utilidades y
   generación de la etiqueta imprimible.
   ========================================================= */

const COLECCION_FICHAS = "fichas";
const DOC_CONTADOR = "contadorPedidos";

/* ---------- Utilidades generales ---------- */

function formatearFecha(fechaISO) {
    if (!fechaISO) return "Sin definir";

    const [anio, mes, dia] = fechaISO.split("-");

    if (!anio || !mes || !dia) return fechaISO;

    return `${dia}/${mes}/${anio}`;
}

function formatearFechaHora(fechaISO) {
    if (!fechaISO) return "-";

    const fecha = new Date(fechaISO);

    if (isNaN(fecha)) return fechaISO;

    return fecha.toLocaleString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* ---------- Almacenamiento de fichas (Firestore) ---------- */

function refFichas() {
    return db.collection(COLECCION_FICHAS);
}

function refContador() {
    return db.collection("meta").doc(DOC_CONTADOR);
}

async function obtenerFichas() {
    const snapshot = await refFichas().get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function obtenerFichaPorId(id) {
    const doc = await refFichas().doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function guardarFicha(ficha) {
    const { id, ...datos } = ficha;

    if (id) {
        await refFichas().doc(id).set(datos, { merge: true });
        return { id, ...datos };
    }

    const referencia = await refFichas().add(datos);
    return { id: referencia.id, ...datos };
}

async function eliminarFicha(id) {
    await refFichas().doc(id).delete();
}

/* Genera y consume el siguiente número de pedido de forma atómica,
   así dos personas guardando al mismo tiempo no reciben el mismo número. */
async function generarNumeroPedido() {
    return db.runTransaction(async (transaccion) => {
        const doc = await transaccion.get(refContador());
        const actual = doc.exists ? doc.data().valor : 0;
        const siguiente = actual + 1;

        transaccion.set(refContador(), { valor: siguiente });

        return "PED-" + String(siguiente).padStart(4, "0");
    });
}

/* Muestra el próximo número de pedido sin consumir el contador,
   para previsualizarlo mientras se llena el formulario. */
async function previsualizarNumeroPedido() {
    const doc = await refContador().get();
    const actual = doc.exists ? doc.data().valor : 0;
    return "PED-" + String(actual + 1).padStart(4, "0");
}

/* ---------- Toast (aviso flotante) ---------- */

function mostrarToast(mensaje) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = mensaje;
    toast.classList.add("mostrar");

    clearTimeout(toast._temporizador);
    toast._temporizador = setTimeout(() => {
        toast.classList.remove("mostrar");
    }, 3000);
}

/* ---------- Etiqueta imprimible / PDF ---------- */

function construirHtmlEtiqueta(ficha) {
    return `
        <div class="etiqueta">
            <header class="etiqueta-encabezado">
                <span class="etiqueta-marca">Producción Serena</span>
                <span class="etiqueta-pedido">${ficha.pedido}</span>
            </header>

            <h3 class="etiqueta-cliente">${ficha.cliente}</h3>

            <table class="etiqueta-tabla">
                <tr><th>Teléfono</th><td>${ficha.telefono || "-"}</td></tr>
                <tr><th>Bizcochos</th><td>${ficha.bizcochos}</td></tr>
                <tr><th>Sabor</th><td>${ficha.sabor}</td></tr>
                <tr><th>Relleno</th><td>${ficha.relleno}</td></tr>
                <tr><th>Molde</th><td>${ficha.molde}</td></tr>
                <tr><th>Entrega</th><td>${formatearFecha(ficha.fechaEntrega)}</td></tr>
            </table>

            <p class="etiqueta-observaciones">
                <strong>Observaciones:</strong>
                ${ficha.observaciones ? ficha.observaciones : "Sin observaciones"}
            </p>

            <footer class="etiqueta-pie">
                Generado el ${formatearFechaHora(ficha.fechaCreacion)}
            </footer>
        </div>
    `;
}

function imprimirFicha(ficha) {
    if (!ficha) return;

    let contenedor = document.getElementById("etiqueta-imprimible");

    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "etiqueta-imprimible";
        contenedor.className = "etiqueta-imprimible";
        document.body.appendChild(contenedor);
    }

    contenedor.innerHTML = construirHtmlEtiqueta(ficha);

    // Cambiamos el título de la página para que, si el usuario elige
    // "Guardar como PDF" en el diálogo de impresión, el archivo se
    // descargue con el número de pedido como nombre (ej. PED-0001.pdf).
    const tituloOriginal = document.title;
    document.title = ficha.pedido;

    const restaurarTitulo = () => {
        document.title = tituloOriginal;
        window.removeEventListener("afterprint", restaurarTitulo);
    };
    window.addEventListener("afterprint", restaurarTitulo);

    window.print();
}
