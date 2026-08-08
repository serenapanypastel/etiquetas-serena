/* =========================================================
   INGREDIENTES.JS
   CRUD de ingredientes: registra el precio de la presentación
   comprada y calcula el costo por unidad base (g, ml o unidad).
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    const formulario = document.getElementById("formulario-ingrediente");

    const campoNombre = document.getElementById("nombre-ingrediente");
    const campoUnidad = document.getElementById("unidad-ingrediente");
    const campoCantidad = document.getElementById("cantidad-presentacion");
    const campoPrecio = document.getElementById("precio-presentacion");

    const grupoEquivalencia = document.getElementById("grupo-equivalencia");
    const ayudaEquivalencia = document.getElementById("ayuda-equivalencia");
    const campoEquivalenciaCantidad = document.getElementById("equivalencia-cantidad");
    const campoEquivalenciaUnidad = document.getElementById("equivalencia-unidad");

    const previsualizacion = document.getElementById("costo-unitario-preview");
    const tituloFormulario = document.getElementById("titulo-formulario");
    const botonGuardar = document.getElementById("boton-guardar-ingrediente");
    const botonCancelar = document.getElementById("cancelar-edicion");

    const cuerpoTabla = document.getElementById("tabla-ingredientes");
    const avisoSinIngredientes = document.getElementById("sin-ingredientes");
    const campoBuscar = document.getElementById("buscar");

    let ingredientes = [];
    let idEnEdicion = null;

    /* ---------- Carga inicial ---------- */

    try {
        ingredientes = await obtenerIngredientes();
        dibujarTabla(ingredientes);
    } catch (error) {
        console.error(error);
        mostrarToast("No se pudo conectar con la base de datos.");
    }

    actualizarVisibilidadEquivalencia();
    actualizarPrevisualizacion();

    /* ---------- Mostrar el campo de gramaje solo cuando se compra por unidad ---------- */

    campoUnidad.addEventListener("change", () => {
        actualizarVisibilidadEquivalencia();
        actualizarPrevisualizacion();
    });

    function actualizarVisibilidadEquivalencia() {
        const esPorUnidad = campoUnidad.value === "unidad";
        grupoEquivalencia.style.display = esPorUnidad ? "grid" : "none";
        ayudaEquivalencia.style.display = esPorUnidad ? "block" : "none";

        if (!esPorUnidad) {
            campoEquivalenciaCantidad.value = "";
        }
    }

    /* ---------- Previsualización en vivo del costo unitario ---------- */

    [campoCantidad, campoPrecio, campoUnidad, campoEquivalenciaCantidad, campoEquivalenciaUnidad].forEach((campo) => {
        campo.addEventListener("input", actualizarPrevisualizacion);
    });

    function actualizarPrevisualizacion() {
        const ingredienteBorrador = {
            precioPresentacion: campoPrecio.value,
            cantidadPresentacion: campoCantidad.value,
            unidad: campoUnidad.value || "unidad",
            equivalenciaCantidad: campoEquivalenciaCantidad.value,
            equivalenciaUnidad: campoEquivalenciaUnidad.value,
        };

        const costoBase = calcularCostoUnitario(ingredienteBorrador);
        let texto = `${formatearMoneda(costoBase)} por ${ingredienteBorrador.unidad}`;

        if (tieneEquivalencia(ingredienteBorrador)) {
            const costoDeUso = calcularCostoPorUnidadDeUso(ingredienteBorrador);
            texto += ` · ≈ ${formatearMoneda(costoDeUso)} por ${ingredienteBorrador.equivalenciaUnidad}`;
        }

        previsualizacion.textContent = texto;
    }

    /* ---------- Guardar / actualizar ---------- */

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        if (!formulario.reportValidity()) return;

        botonGuardar.disabled = true;
        const textoOriginal = botonGuardar.textContent;
        botonGuardar.textContent = "Guardando...";

        try {
            const esPorUnidad = campoUnidad.value === "unidad";

            const ingrediente = {
                id: idEnEdicion,
                nombre: campoNombre.value.trim(),
                unidad: campoUnidad.value,
                cantidadPresentacion: Number(campoCantidad.value),
                precioPresentacion: Number(campoPrecio.value),
                equivalenciaCantidad: esPorUnidad && campoEquivalenciaCantidad.value
                    ? Number(campoEquivalenciaCantidad.value)
                    : null,
                equivalenciaUnidad: esPorUnidad && campoEquivalenciaCantidad.value
                    ? campoEquivalenciaUnidad.value
                    : null,
            };

            const guardado = await guardarIngrediente(ingrediente);

            if (idEnEdicion) {
                ingredientes = ingredientes.map((item) => (item.id === guardado.id ? guardado : item));
            } else {
                ingredientes.push(guardado);
            }

            ingredientes.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
            dibujarTabla(filtrarIngredientes(campoBuscar.value));

            mostrarToast(idEnEdicion ? "Ingrediente actualizado." : "Ingrediente guardado.");
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
        actualizarVisibilidadEquivalencia();
        actualizarPrevisualizacion();
        tituloFormulario.textContent = "➕ Nuevo ingrediente";
        botonGuardar.textContent = "💾 Guardar ingrediente";
        botonCancelar.style.display = "none";
    }

    /* ---------- Editar / eliminar desde la tabla ---------- */

    cuerpoTabla.addEventListener("click", async (evento) => {
        const boton = evento.target.closest("button");
        if (!boton) return;

        const id = boton.dataset.id;
        const ingrediente = ingredientes.find((item) => item.id === id);
        if (!ingrediente) return;

        if (boton.classList.contains("editar")) {
            idEnEdicion = ingrediente.id;
            campoNombre.value = ingrediente.nombre;
            campoUnidad.value = ingrediente.unidad;
            campoCantidad.value = ingrediente.cantidadPresentacion;
            campoPrecio.value = ingrediente.precioPresentacion;
            campoEquivalenciaCantidad.value = ingrediente.equivalenciaCantidad ?? "";
            campoEquivalenciaUnidad.value = ingrediente.equivalenciaUnidad ?? "g";
            actualizarVisibilidadEquivalencia();
            actualizarPrevisualizacion();

            tituloFormulario.textContent = "✏️ Editar ingrediente";
            botonGuardar.textContent = "💾 Actualizar ingrediente";
            botonCancelar.style.display = "inline-block";
            formulario.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        if (boton.classList.contains("eliminar")) {
            const confirmar = window.confirm(`¿Eliminar "${ingrediente.nombre}"? Las recetas que ya lo usan no se modifican.`);
            if (!confirmar) return;

            try {
                await eliminarIngrediente(id);
                ingredientes = ingredientes.filter((item) => item.id !== id);
                dibujarTabla(filtrarIngredientes(campoBuscar.value));
                mostrarToast("Ingrediente eliminado.");
            } catch (error) {
                console.error(error);
                mostrarToast("No se pudo eliminar. Intenta de nuevo.");
            }
        }
    });

    /* ---------- Búsqueda ---------- */

    campoBuscar.addEventListener("input", () => {
        dibujarTabla(filtrarIngredientes(campoBuscar.value));
    });

    function filtrarIngredientes(texto) {
        const termino = texto.trim().toLowerCase();
        if (!termino) return ingredientes;
        return ingredientes.filter((item) => item.nombre.toLowerCase().includes(termino));
    }

    /* ---------- Tabla ---------- */

    function dibujarTabla(lista) {
        avisoSinIngredientes.style.display = lista.length === 0 ? "block" : "none";

        cuerpoTabla.innerHTML = lista.map((ingrediente) => {
            const costoBase = `${formatearMoneda(calcularCostoUnitario(ingrediente))} / ${ingrediente.unidad}`;
            const costoEquivalencia = tieneEquivalencia(ingrediente)
                ? `<br><small>≈ ${formatearMoneda(calcularCostoPorUnidadDeUso(ingrediente))} / ${ingrediente.equivalenciaUnidad}</small>`
                : "";
            const presentacion = tieneEquivalencia(ingrediente)
                ? `${ingrediente.cantidadPresentacion} ${ingrediente.unidad} (${ingrediente.equivalenciaCantidad}${ingrediente.equivalenciaUnidad} c/u) · ${formatearMoneda(ingrediente.precioPresentacion)}`
                : `${ingrediente.cantidadPresentacion} ${ingrediente.unidad} · ${formatearMoneda(ingrediente.precioPresentacion)}`;

            return `
                <tr>
                    <td>${escaparTexto(ingrediente.nombre)}</td>
                    <td>${presentacion}</td>
                    <td>${costoBase}${costoEquivalencia}</td>
                    <td class="acciones">
                        <button type="button" class="editar" data-id="${ingrediente.id}">✏️ Editar</button>
                        <button type="button" class="eliminar" data-id="${ingrediente.id}">🗑️ Eliminar</button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function escaparTexto(valor) {
        const div = document.createElement("div");
        div.textContent = valor ?? "";
        return div.innerHTML;
    }

});
