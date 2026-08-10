/* =========================================================
   COMMON.JS
   Funciones compartidas: acceso a Firestore, utilidades y
   generación de la etiqueta imprimible.
   ========================================================= */

const COLECCION_FICHAS = "fichas";
const DOC_CONTADOR = "contadorPedidos";
const COLECCION_INGREDIENTES = "ingredientes";
const COLECCION_RECETAS = "recetas";

/* ---------- Utilidades generales ---------- */

function formatearFecha(fechaISO) {
    if (!fechaISO) return "Sin definir";

    const [anio, mes, dia] = fechaISO.split("-");

    if (!anio || !mes || !dia) return fechaISO;

    return `${dia}/${mes}/${anio}`;
}

function formatearMoneda(numero) {
    const valor = Number(numero) || 0;
    return "$" + Math.round(valor).toLocaleString("es-CO");
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

/* Una ficha puede tener hasta 3 pares "bizcochos + molde" (campo
   ficha.moldes). Las fichas guardadas antes de admitir varios moldes solo
   tienen los campos sueltos ficha.bizcochos / ficha.molde: este helper
   normaliza ambos casos a un mismo arreglo para no duplicar esa lógica
   en cada pantalla que muestra o imprime una ficha. */
function obtenerMoldesFicha(ficha) {
    if (Array.isArray(ficha.moldes) && ficha.moldes.length) return ficha.moldes;
    if (ficha.molde) return [{ bizcochos: ficha.bizcochos, molde: ficha.molde }];
    return [];
}

/* ---------- Ingredientes (Firestore) ---------- */

function refIngredientes() {
    return db.collection(COLECCION_INGREDIENTES);
}

async function obtenerIngredientes() {
    const snapshot = await refIngredientes().orderBy("nombre").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function obtenerIngredientePorId(id) {
    const doc = await refIngredientes().doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function guardarIngrediente(ingrediente) {
    const { id, ...datos } = ingrediente;

    if (id) {
        await refIngredientes().doc(id).set(datos, { merge: true });
        return { id, ...datos };
    }

    const referencia = await refIngredientes().add(datos);
    return { id: referencia.id, ...datos };
}

async function eliminarIngrediente(id) {
    await refIngredientes().doc(id).delete();
}

/* Costo por unidad de compra (por gramo, mililitro o unidad), a partir de lo
   que costó la presentación completa que se compró. Ej: bolsa de harina de
   1000 g por $3.500 → cuesta $3.5 por gramo. */
function calcularCostoUnitario(ingrediente) {
    const precio = Number(ingrediente.precioPresentacion) || 0;
    const cantidad = Number(ingrediente.cantidadPresentacion) || 0;
    if (cantidad === 0) return 0;
    return precio / cantidad;
}

/* Algunos ingredientes se compran por unidad (una barra, una bolsa) pero se
   usan en las recetas por peso o volumen (gramos, mililitros). Cuando el
   ingrediente tiene esa equivalencia guardada (cuánto pesa/mide UNA unidad),
   las recetas deben medirse y costearse en esa unidad real de uso en vez de
   en "unidades" sueltas. */
function tieneEquivalencia(ingrediente) {
    return ingrediente.unidad === "unidad" &&
        Number(ingrediente.equivalenciaCantidad) > 0 &&
        !!ingrediente.equivalenciaUnidad;
}

/* Unidad en la que se debe medir este ingrediente dentro de una receta. */
function obtenerUnidadDeUso(ingrediente) {
    return tieneEquivalencia(ingrediente) ? ingrediente.equivalenciaUnidad : ingrediente.unidad;
}

/* Costo por gramo/mililitro/unidad, ya en la unidad real de uso. */
function calcularCostoPorUnidadDeUso(ingrediente) {
    const costoPorUnidadCompra = calcularCostoUnitario(ingrediente);

    if (!tieneEquivalencia(ingrediente)) return costoPorUnidadCompra;

    const equivalencia = Number(ingrediente.equivalenciaCantidad) || 0;
    if (equivalencia === 0) return 0;

    return costoPorUnidadCompra / equivalencia;
}

/* ---------- Recetas / calculadora de costos (Firestore) ---------- */

function refRecetas() {
    return db.collection(COLECCION_RECETAS);
}

async function obtenerRecetas() {
    const snapshot = await refRecetas().get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function obtenerRecetaPorId(id) {
    const doc = await refRecetas().doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function guardarReceta(receta) {
    const { id, ...datos } = receta;

    if (id) {
        await refRecetas().doc(id).set(datos, { merge: true });
        return { id, ...datos };
    }

    const referencia = await refRecetas().add(datos);
    return { id: referencia.id, ...datos };
}

async function eliminarReceta(id) {
    await refRecetas().doc(id).delete();
}

/* Suma el costo de cada línea de ingrediente ya calculada (item.costo). */
function calcularCostoIngredientes(itemsReceta) {
    return (itemsReceta ?? []).reduce((total, item) => total + (Number(item.costo) || 0), 0);
}

/* costoTotal = ingredientes + mano de obra. precioVenta aplica el margen
   de ganancia sobre ese costo total, igual que en la fórmula de GigiAd:
   costo + mano de obra, y encima el % de ganancia deseado. */
function calcularPrecioVenta(costoTotal, margenGanancia) {
    const margen = Number(margenGanancia) || 0;
    return costoTotal * (1 + margen / 100);
}

/* Si el contador no existe o quedó con un valor inválido (por eso salía
   "PED-0NaN"), reconstruye el número a partir del pedido más alto ya
   guardado, para no reiniciar la numeración y crear pedidos duplicados. */
async function calcularNumeroPedidoDesdeFichas() {
    const fichas = await obtenerFichas();
    let maximo = 0;

    fichas.forEach((ficha) => {
        const coincidencia = /^PED-(\d+)$/.exec(ficha.pedido || "");
        if (!coincidencia) return;

        const numero = Number(coincidencia[1]);
        if (numero > maximo) maximo = numero;
    });

    return maximo;
}

/* Genera y consume el siguiente número de pedido de forma atómica,
   así dos personas guardando al mismo tiempo no reciben el mismo número. */
async function generarNumeroPedido() {
    return db.runTransaction(async (transaccion) => {
        const doc = await transaccion.get(refContador());
        const actual = doc.exists ? Number(doc.data().valor) : NaN;
        const base = Number.isFinite(actual) ? actual : await calcularNumeroPedidoDesdeFichas();
        const siguiente = base + 1;

        transaccion.set(refContador(), { valor: siguiente });

        return "PED-" + String(siguiente).padStart(4, "0");
    });
}

/* Muestra el próximo número de pedido sin consumir el contador,
   para previsualizarlo mientras se llena el formulario. */
async function previsualizarNumeroPedido() {
    const doc = await refContador().get();
    const actual = doc.exists ? Number(doc.data().valor) : NaN;
    const base = Number.isFinite(actual) ? actual : await calcularNumeroPedidoDesdeFichas();
    return "PED-" + String(base + 1).padStart(4, "0");
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
    const filasMoldes = obtenerMoldesFicha(ficha)
        .map((item) => `<tr><td>${item.bizcochos}</td><td>${item.molde}</td></tr>`)
        .join("");

    const tablaMoldes = filasMoldes
        ? `
            <table class="etiqueta-tabla etiqueta-tabla-moldes">
                <tr><th>Bizcochos</th><th>Molde</th></tr>
                ${filasMoldes}
            </table>
        `
        : "";

    return `
        <div class="etiqueta">
            <header class="etiqueta-encabezado">
                <span class="etiqueta-marca">Producción Serena</span>
                <span class="etiqueta-pedido">${ficha.pedido}</span>
            </header>

            <h3 class="etiqueta-cliente">${ficha.cliente}</h3>

            <table class="etiqueta-tabla">
                <tr><th>Teléfono</th><td>${ficha.telefono || "-"}</td></tr>
            </table>

            ${tablaMoldes}

            <table class="etiqueta-tabla">
                <tr><th>Sabor</th><td>${ficha.sabor}</td></tr>
                <tr><th>Relleno</th><td>${ficha.relleno}</td></tr>
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

/* La P50 usa rollo continuo de 55mm de ancho, sin alto fijo: el alto de
   cada etiqueta debe ajustarse a su contenido para que la impresora corte
   justo donde termina y no desperdicie papel ni la parta en dos páginas. */
const ANCHO_ETIQUETA_MM = 50;
const MARGEN_ETIQUETA_MM = 2;

function ajustarAltoPaginaEtiqueta(contenedor) {
    // Medimos el alto real fuera de pantalla, sin afectar el layout visible.
    const estiloPrevio = contenedor.getAttribute("style") || "";
    contenedor.style.cssText = "display:block; position:absolute; left:-9999px; top:0; visibility:hidden;";

    const etiqueta = contenedor.querySelector(".etiqueta");
    const altoPx = etiqueta ? etiqueta.getBoundingClientRect().height : 0;

    if (estiloPrevio) {
        contenedor.setAttribute("style", estiloPrevio);
    } else {
        contenedor.removeAttribute("style");
    }

    const altoContenidoMm = (altoPx * 25.4) / 96;
    const altoPaginaMm = Math.ceil(altoContenidoMm + (MARGEN_ETIQUETA_MM * 2) + 2);

    let estiloPagina = document.getElementById("estilo-pagina-etiqueta");
    if (!estiloPagina) {
        estiloPagina = document.createElement("style");
        estiloPagina.id = "estilo-pagina-etiqueta";
        document.head.appendChild(estiloPagina);
    }

    estiloPagina.textContent =
        `@page { size: ${ANCHO_ETIQUETA_MM}mm ${altoPaginaMm}mm; margin: ${MARGEN_ETIQUETA_MM}mm; }`;
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

    ajustarAltoPaginaEtiqueta(contenedor);

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
