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

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }));
}


async function obtenerFichaPorId(id) {

    const doc = await refFichas().doc(id).get();

    return doc.exists
        ? { id: doc.id, ...doc.data() }
        : null;
}


async function guardarFicha(ficha) {

    const { id, ...datos } = ficha;

    if (id) {

        await refFichas()
            .doc(id)
            .set(datos, { merge: true });

        return {
            id,
            ...datos
        };
    }

    const referencia = await refFichas().add(datos);

    return {
        id: referencia.id,
        ...datos
    };
}


async function eliminarFicha(id) {

    await refFichas()
        .doc(id)
        .delete();
}


/* Una ficha puede tener hasta 3 pares "bizcochos + molde"
   por pedido. Las fichas antiguas también son compatibles. */

function obtenerMoldesFicha(ficha) {

    if (Array.isArray(ficha.moldes) && ficha.moldes.length) {
        return ficha.moldes;
    }

    if (ficha.molde) {
        return [
            {
                bizcochos: ficha.bizcochos,
                molde: ficha.molde
            }
        ];
    }

    return [];
}


/* ---------- Ingredientes (Firestore) ---------- */

function refIngredientes() {

    return db.collection(COLECCION_INGREDIENTES);
}


async function obtenerIngredientes() {

    const snapshot = await refIngredientes()
        .orderBy("nombre")
        .get();

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }));
}


async function obtenerIngredientePorId(id) {

    const doc = await refIngredientes()
        .doc(id)
        .get();

    return doc.exists
        ? { id: doc.id, ...doc.data() }
        : null;
}


async function guardarIngrediente(ingrediente) {

    const { id, ...datos } = ingrediente;

    if (id) {

        await refIngredientes()
            .doc(id)
            .set(datos, { merge: true });

        return {
            id,
            ...datos
        };
    }

    const referencia = await refIngredientes().add(datos);

    return {
        id: referencia.id,
        ...datos
    };
}


async function eliminarIngrediente(id) {

    await refIngredientes()
        .doc(id)
        .delete();
}


/* Costo por unidad de compra */

function calcularCostoUnitario(ingrediente) {

    const precio = Number(ingrediente.precioPresentacion) || 0;
    const cantidad = Number(ingrediente.cantidadPresentacion) || 0;

    if (cantidad === 0) return 0;

    return precio / cantidad;
}


/* Algunos ingredientes se compran por unidad pero se
   usan por peso o volumen. */

function tieneEquivalencia(ingrediente) {

    return ingrediente.unidad === "unidad" &&
        Number(ingrediente.equivalenciaCantidad) > 0 &&
        !!ingrediente.equivalenciaUnidad;
}


/* Unidad real de uso del ingrediente */

function obtenerUnidadDeUso(ingrediente) {

    return tieneEquivalencia(ingrediente)
        ? ingrediente.equivalenciaUnidad
        : ingrediente.unidad;
}


/* Costo por unidad real de uso */

function calcularCostoPorUnidadDeUso(ingrediente) {

    const costoPorUnidadCompra =
        calcularCostoUnitario(ingrediente);

    if (!tieneEquivalencia(ingrediente)) {
        return costoPorUnidadCompra;
    }

    const equivalencia =
        Number(ingrediente.equivalenciaCantidad) || 0;

    if (equivalencia === 0) return 0;

    return costoPorUnidadCompra / equivalencia;
}


/* ---------- Recetas / calculadora de costos ---------- */

function refRecetas() {

    return db.collection(COLECCION_RECETAS);
}


async function obtenerRecetas() {

    const snapshot = await refRecetas().get();

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }));
}


async function obtenerRecetaPorId(id) {

    const doc = await refRecetas()
        .doc(id)
        .get();

    return doc.exists
        ? { id: doc.id, ...doc.data() }
        : null;
}


async function guardarReceta(receta) {

    const { id, ...datos } = receta;

    if (id) {

        await refRecetas()
            .doc(id)
            .set(datos, { merge: true });

        return {
            id,
            ...datos
        };
    }

    const referencia = await refRecetas().add(datos);

    return {
        id: referencia.id,
        ...datos
    };
}


async function eliminarReceta(id) {

    await refRecetas()
        .doc(id)
        .delete();
}


/* Suma el costo de cada ingrediente */

function calcularCostoIngredientes(itemsReceta) {

    return (itemsReceta ?? []).reduce(
        (total, item) =>
            total + (Number(item.costo) || 0),
        0
    );
}


/* Calcula precio de venta */

function calcularPrecioVenta(costoTotal, margenGanancia) {

    const margen = Number(margenGanancia) || 0;

    return costoTotal * (1 + margen / 100);
}


/* ---------- Número de pedido ---------- */

async function calcularNumeroPedidoDesdeFichas() {

    const fichas = await obtenerFichas();

    let maximo = 0;

    fichas.forEach((ficha) => {

        const coincidencia =
            /^PED-(\d+)$/.exec(ficha.pedido || "");

        if (!coincidencia) return;

        const numero =
            Number(coincidencia[1]);

        if (numero > maximo) {
            maximo = numero;
        }
    });

    return maximo;
}


/* Genera el siguiente número de pedido */

async function generarNumeroPedido() {

    return db.runTransaction(async (transaccion) => {

        const doc =
            await transaccion.get(refContador());

        const actual =
            doc.exists
                ? Number(doc.data().valor)
                : NaN;

        const base =
            Number.isFinite(actual)
                ? actual
                : await calcularNumeroPedidoDesdeFichas();

        const siguiente = base + 1;

        transaccion.set(
            refContador(),
            {
                valor: siguiente
            }
        );

        return "PED-" +
            String(siguiente).padStart(4, "0");
    });
}


/* Muestra el próximo número sin consumirlo */

async function previsualizarNumeroPedido() {

    const doc =
        await refContador().get();

    const actual =
        doc.exists
            ? Number(doc.data().valor)
            : NaN;

    const base =
        Number.isFinite(actual)
            ? actual
            : await calcularNumeroPedidoDesdeFichas();

    return "PED-" +
        String(base + 1).padStart(4, "0");
}


/* ---------- Toast ---------- */

function mostrarToast(mensaje) {

    const toast =
        document.getElementById("toast");

    if (!toast) return;

    toast.textContent = mensaje;

    toast.classList.add("mostrar");

    clearTimeout(toast._temporizador);

    toast._temporizador =
        setTimeout(() => {

            toast.classList.remove("mostrar");

        }, 3000);
}


/* ---------- Etiqueta imprimible / PDF ---------- */

function construirHtmlEtiqueta(ficha) {

    const filasMoldes = obtenerMoldesFicha(ficha)
        .map((item) =>
            `<tr>
                <td>${item.bizcochos}</td>
                <td>${item.molde}</td>
            </tr>`
        )
        .join("");


    const tablaMoldes = filasMoldes
        ? `
            <table class="etiqueta-tabla etiqueta-tabla-moldes">

                <tr>
                    <th>Bizcochos</th>
                    <th>Molde</th>
                </tr>

                ${filasMoldes}

            </table>
        `
        : "";


    /* ---------- Productos ---------- */

    const tablaProducto =
        ficha.tipoProducto || ficha.tipoProducto1
            ? `
                <table class="etiqueta-tabla etiqueta-tabla-productos">

                    ${ficha.tipoProducto ? `
                        <tr>
                            <th>Producto</th>
                            <td>${ficha.tipoProducto}</td>
                            <th>Cantidad</th>
                            <td>${ficha.cantidadProducto || 0}</td>
                        </tr>
                    ` : ""}

                    ${ficha.tipoProducto1 ? `
                        <tr>
                            <th>Producto</th>
                            <td>${ficha.tipoProducto1}</td>
                            <th>Cantidad</th>
                            <td>${ficha.cantidadProducto1 || 0}</td>
                        </tr>
                    ` : ""}

                </table>
            `
            : "";


    /* ---------- Contenido de la etiqueta ---------- */

    return `
        <div class="etiqueta">

            <header class="etiqueta-encabezado">

                <span class="etiqueta-marca">
                    Producción Serena
                </span>

                <span class="etiqueta-pedido">
                    ${ficha.pedido}
                </span>

            </header>


            <h3 class="etiqueta-cliente">
                ${ficha.cliente}
            </h3>


            <table class="etiqueta-tabla">

                <tr>
                    <th>Teléfono</th>
                    <td>${ficha.telefono || "-"}</td>
                </tr>

            </table>


            ${tablaMoldes}


            ${tablaProducto}


            <table class="etiqueta-tabla">

                <tr>
                    <th>Sabor</th>
                    <td>${ficha.sabor}</td>
                </tr>

                <tr>
                    <th>Relleno</th>
                    <td>${ficha.relleno}</td>
                </tr>

            </table>


            <table class="etiqueta-tabla">

                <tr>
                    <th>Entrega</th>
                    <td>
                        ${formatearFecha(ficha.fechaEntrega)}
                    </td>
                </tr>

            </table>


            <p class="etiqueta-observaciones">
                <strong>Observaciones:</strong><br>
                ${ficha.observaciones ? ficha.observaciones : "Sin observaciones"}
            </p>


            <footer class="etiqueta-pie">

                Generado el
                ${formatearFechaHora(ficha.fechaCreacion)}

            </footer>

        </div>
    `;
}


/* La P50 no aparece como impresora del sistema en Android/tablet.
   Genera un PNG para importarlo en Marklife. */

async function descargarEtiquetaComoImagen(ficha) {

    if (!ficha) return;


    if (typeof html2canvas === "undefined") {

        mostrarToast(
            "No se pudo generar la imagen: falta cargar html2canvas."
        );

        return;
    }


    let contenedor =
        document.getElementById("etiqueta-imprimible");


    if (!contenedor) {

        contenedor =
            document.createElement("div");

        contenedor.id =
            "etiqueta-imprimible";

        contenedor.className =
            "etiqueta-imprimible";

        document.body.appendChild(contenedor);
    }


    contenedor.innerHTML =
        construirHtmlEtiqueta(ficha);


    /* La colocamos fuera de la pantalla mientras
       html2canvas genera la imagen. */

    const estiloPrevio =
        contenedor.getAttribute("style") || "";

    contenedor.style.cssText =
        "display:block; position:absolute; left:-9999px; top:0;";


    try {

        const etiqueta =
            contenedor.querySelector(".etiqueta");


        const canvas =
            await html2canvas(etiqueta, {

                backgroundColor: "#ffffff",

                scale: 4

            });


        const enlace =
            document.createElement("a");


        enlace.href =
            canvas.toDataURL("image/png");


        enlace.download =
            ficha.pedido + ".png";


        document.body.appendChild(enlace);

        enlace.click();

        enlace.remove();


        mostrarToast(
            "Comanda " +
            ficha.pedido +
            " descargada."
        );

    } catch (error) {

        console.error(error);

        mostrarToast(
            "No se pudo generar la comanda."
        );

    } finally {

        if (estiloPrevio) {

            contenedor.setAttribute(
                "style",
                estiloPrevio
            );

        } else {

            contenedor.removeAttribute("style");

        }
    }
}