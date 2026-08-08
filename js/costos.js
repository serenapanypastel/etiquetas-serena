/* =========================================================
   COSTOS.JS
   Calculadora de costos: arma una receta a partir de los
   ingredientes ya registrados, suma mano de obra y aplica un
   margen de ganancia para sugerir el precio de venta.
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    const formulario = document.getElementById("formulario-receta");
    const campoNombreReceta = document.getElementById("nombre-receta");

    const selectorIngrediente = document.getElementById("selector-ingrediente");
    const campoCantidadIngrediente = document.getElementById("cantidad-ingrediente");
    const unidadCantidadIngrediente = document.getElementById("unidad-cantidad-ingrediente");
    const botonAgregarIngrediente = document.getElementById("agregar-ingrediente");
    const avisoSinIngredientesBase = document.getElementById("aviso-sin-ingredientes-base");

    const listaIngredientesReceta = document.getElementById("lista-ingredientes-receta");
    const avisoSinIngredientesReceta = document.getElementById("sin-ingredientes-receta");

    const campoManoDeObra = document.getElementById("mano-de-obra");
    const campoMargen = document.getElementById("margen-ganancia");

    const resumenIngredientes = document.getElementById("resumen-ingredientes");
    const resumenManoObra = document.getElementById("resumen-mano-obra");
    const resumenCostoTotal = document.getElementById("resumen-costo-total");
    const resumenMargen = document.getElementById("resumen-margen");
    const resumenPrecioVenta = document.getElementById("resumen-precio-venta");

    const tituloFormulario = document.getElementById("titulo-formulario");
    const botonGuardar = document.getElementById("boton-guardar-receta");
    const botonCancelar = document.getElementById("cancelar-edicion-receta");

    const tablaRecetas = document.getElementById("tabla-recetas");
    const avisoSinRecetas = document.getElementById("sin-recetas");

    const modal = document.getElementById("modal-detalle-receta");
    const detalleReceta = document.getElementById("detalle-receta");
    const botonCerrarModal = document.getElementById("cerrar-modal-receta");

    let ingredientesBase = [];
    let itemsReceta = [];
    let recetas = [];
    let idEnEdicion = null;

    /* ---------- Carga inicial ---------- */

    try {
        [ingredientesBase, recetas] = await Promise.all([obtenerIngredientes(), obtenerRecetas()]);
        llenarSelectorIngredientes();
        dibujarTablaRecetas();
    } catch (error) {
        console.error(error);
        mostrarToast("No se pudo conectar con la base de datos.");
    }

    if (ingredientesBase.length === 0) {
        avisoSinIngredientesBase.style.display = "block";
        botonAgregarIngrediente.disabled = true;
    }

    actualizarResumen();

    function llenarSelectorIngredientes() {
        selectorIngrediente.innerHTML = '<option value="">Selecciona un ingrediente</option>' +
            ingredientesBase.map((ingrediente) => {
                const unidadUso = obtenerUnidadDeUso(ingrediente);
                const costoUso = calcularCostoPorUnidadDeUso(ingrediente);
                return `<option value="${ingrediente.id}">${escaparTexto(ingrediente.nombre)} (${formatearMoneda(costoUso)}/${unidadUso})</option>`;
            }).join("");
    }

    /* ---------- Mostrar la unidad real de uso al elegir un ingrediente ---------- */

    selectorIngrediente.addEventListener("change", () => {
        const ingrediente = ingredientesBase.find((item) => item.id === selectorIngrediente.value);
        unidadCantidadIngrediente.textContent = ingrediente ? `(${obtenerUnidadDeUso(ingrediente)})` : "";
    });

    /* ---------- Agregar ingrediente a la receta ---------- */

    botonAgregarIngrediente.addEventListener("click", () => {
        const ingredienteId = selectorIngrediente.value;
        const cantidad = Number(campoCantidadIngrediente.value);

        if (!ingredienteId) {
            mostrarToast("Selecciona un ingrediente.");
            return;
        }

        if (!cantidad || cantidad <= 0) {
            mostrarToast("Ingresa una cantidad válida.");
            return;
        }

        const ingrediente = ingredientesBase.find((item) => item.id === ingredienteId);
        if (!ingrediente) return;

        const costo = calcularCostoPorUnidadDeUso(ingrediente) * cantidad;

        itemsReceta.push({
            ingredienteId: ingrediente.id,
            nombre: ingrediente.nombre,
            unidad: obtenerUnidadDeUso(ingrediente),
            cantidad,
            costo,
        });

        selectorIngrediente.value = "";
        campoCantidadIngrediente.value = "";
        unidadCantidadIngrediente.textContent = "";

        dibujarListaReceta();
        actualizarResumen();
    });

    listaIngredientesReceta.addEventListener("click", (evento) => {
        const boton = evento.target.closest("button");
        if (!boton) return;

        const indice = Number(boton.dataset.indice);
        itemsReceta.splice(indice, 1);
        dibujarListaReceta();
        actualizarResumen();
    });

    function dibujarListaReceta() {
        avisoSinIngredientesReceta.style.display = itemsReceta.length === 0 ? "block" : "none";

        listaIngredientesReceta.innerHTML = itemsReceta.map((item, indice) => `
            <li>
                <span>
                    <span class="item-nombre">${escaparTexto(item.nombre)}</span><br>
                    <span class="item-detalle">${item.cantidad} ${item.unidad}</span>
                </span>
                <span class="item-costo">${formatearMoneda(item.costo)}</span>
                <button type="button" data-indice="${indice}" aria-label="Quitar ${escaparTexto(item.nombre)}">✖</button>
            </li>
        `).join("");
    }

    /* ---------- Resumen en vivo ---------- */

    [campoManoDeObra, campoMargen].forEach((campo) => {
        campo.addEventListener("input", actualizarResumen);
    });

    function actualizarResumen() {
        const costoIngredientes = calcularCostoIngredientes(itemsReceta);
        const manoDeObra = Number(campoManoDeObra.value) || 0;
        const margen = Number(campoMargen.value) || 0;
        const costoTotal = costoIngredientes + manoDeObra;
        const precioVenta = calcularPrecioVenta(costoTotal, margen);

        resumenIngredientes.textContent = formatearMoneda(costoIngredientes);
        resumenManoObra.textContent = formatearMoneda(manoDeObra);
        resumenCostoTotal.textContent = formatearMoneda(costoTotal);
        resumenMargen.textContent = `${margen}%`;
        resumenPrecioVenta.textContent = formatearMoneda(precioVenta);
    }

    /* ---------- Guardar / actualizar receta ---------- */

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        if (!campoNombreReceta.value.trim()) {
            mostrarToast("Ponle un nombre a la receta.");
            return;
        }

        if (itemsReceta.length === 0) {
            mostrarToast("Agrega al menos un ingrediente.");
            return;
        }

        botonGuardar.disabled = true;
        const textoOriginal = botonGuardar.textContent;
        botonGuardar.textContent = "Guardando...";

        try {
            const costoIngredientes = calcularCostoIngredientes(itemsReceta);
            const manoDeObra = Number(campoManoDeObra.value) || 0;
            const margen = Number(campoMargen.value) || 0;
            const costoTotal = costoIngredientes + manoDeObra;
            const precioVenta = calcularPrecioVenta(costoTotal, margen);

            const receta = {
                id: idEnEdicion,
                nombre: campoNombreReceta.value.trim(),
                ingredientes: itemsReceta,
                manoDeObra,
                margenGanancia: margen,
                costoIngredientes,
                costoTotal,
                precioVenta,
                fechaCreacion: idEnEdicion
                    ? (recetas.find((r) => r.id === idEnEdicion)?.fechaCreacion ?? new Date().toISOString())
                    : new Date().toISOString(),
            };

            const guardada = await guardarReceta(receta);

            if (idEnEdicion) {
                recetas = recetas.map((item) => (item.id === guardada.id ? guardada : item));
            } else {
                recetas.push(guardada);
            }

            dibujarTablaRecetas();
            mostrarToast(idEnEdicion ? "Receta actualizada." : "Receta guardada.");
            salirDeEdicion();
        } catch (error) {
            console.error(error);
            mostrarToast("No se pudo guardar. Revisa tu conexión a internet.");
        } finally {
            botonGuardar.disabled = false;
            botonGuardar.textContent = textoOriginal;
        }
    });

    botonCancelar.addEventListener("click", salirDeEdicion);

    function salirDeEdicion() {
        idEnEdicion = null;
        formulario.reset();
        itemsReceta = [];
        dibujarListaReceta();
        campoManoDeObra.value = 0;
        campoMargen.value = 40;
        actualizarResumen();

        tituloFormulario.textContent = "➕ Nueva receta";
        botonGuardar.textContent = "💾 Guardar receta";
        botonCancelar.style.display = "none";
    }

    /* ---------- Tabla de recetas guardadas ---------- */

    function dibujarTablaRecetas() {
        avisoSinRecetas.style.display = recetas.length === 0 ? "block" : "none";

        tablaRecetas.innerHTML = recetas.map((receta) => `
            <tr>
                <td>${escaparTexto(receta.nombre)}</td>
                <td>${formatearMoneda(receta.costoTotal)}</td>
                <td>${formatearMoneda(receta.precioVenta)}</td>
                <td class="acciones">
                    <button type="button" class="ver" data-id="${receta.id}">👁️ Ver</button>
                    <button type="button" class="editar" data-id="${receta.id}">✏️ Editar</button>
                    <button type="button" class="eliminar" data-id="${receta.id}">🗑️ Eliminar</button>
                </td>
            </tr>
        `).join("");
    }

    tablaRecetas.addEventListener("click", async (evento) => {
        const boton = evento.target.closest("button");
        if (!boton) return;

        const id = boton.dataset.id;
        const receta = recetas.find((item) => item.id === id);
        if (!receta) return;

        if (boton.classList.contains("ver")) {
            mostrarDetalle(receta);
        }

        if (boton.classList.contains("editar")) {
            cargarRecetaEnFormulario(receta);
        }

        if (boton.classList.contains("eliminar")) {
            const confirmar = window.confirm(`¿Eliminar la receta "${receta.nombre}"?`);
            if (!confirmar) return;

            try {
                await eliminarReceta(id);
                recetas = recetas.filter((item) => item.id !== id);
                dibujarTablaRecetas();
                mostrarToast("Receta eliminada.");
            } catch (error) {
                console.error(error);
                mostrarToast("No se pudo eliminar. Intenta de nuevo.");
            }
        }
    });

    function cargarRecetaEnFormulario(receta) {
        idEnEdicion = receta.id;
        campoNombreReceta.value = receta.nombre;
        itemsReceta = (receta.ingredientes ?? []).map((item) => ({ ...item }));
        campoManoDeObra.value = receta.manoDeObra ?? 0;
        campoMargen.value = receta.margenGanancia ?? 40;

        dibujarListaReceta();
        actualizarResumen();

        tituloFormulario.textContent = "✏️ Editar receta";
        botonGuardar.textContent = "💾 Actualizar receta";
        botonCancelar.style.display = "inline-block";
        formulario.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    /* ---------- Modal de detalle ---------- */

    function mostrarDetalle(receta) {
        const filasIngredientes = (receta.ingredientes ?? []).map((item) => `
            <div class="item-modal">
                <strong>${escaparTexto(item.nombre)}</strong> — ${item.cantidad} ${item.unidad}
                <span style="float:right;">${formatearMoneda(item.costo)}</span>
            </div>
        `).join("");

        detalleReceta.innerHTML = `
            ${filasIngredientes}
            <div class="item-modal">Mano de obra <span style="float:right;">${formatearMoneda(receta.manoDeObra)}</span></div>
            <div class="item-modal">Costo total <span style="float:right;">${formatearMoneda(receta.costoTotal)}</span></div>
            <div class="item-modal">Margen aplicado <span style="float:right;">${receta.margenGanancia}%</span></div>
            <div class="item-modal"><strong>Precio de venta sugerido</strong> <span style="float:right;">${formatearMoneda(receta.precioVenta)}</span></div>
        `;

        modal.showModal();
    }

    botonCerrarModal.addEventListener("click", () => modal.close());
    modal.addEventListener("click", (evento) => {
        if (evento.target === modal) modal.close();
    });

    /* ---------- Utilidades ---------- */

    function escaparTexto(valor) {
        const div = document.createElement("div");
        div.textContent = valor ?? "";
        return div.innerHTML;
    }

});
