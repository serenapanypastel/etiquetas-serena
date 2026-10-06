document.addEventListener("DOMContentLoaded", () => {

    const cuerpoTabla = document.getElementById("cuerpo-tabla");
    const campoBuscar = document.getElementById("buscar");
    const modalDetalle = document.getElementById("modal-detalle");
    const contenedorDetalle = document.getElementById("contenedor-detalle");
    const botonCerrarModal = document.getElementById("cerrar-modal");

    let fichas = [];

    /* =========================
       CARGAR FICHAS
    ========================= */

    refFichas()
        .orderBy("fechaCreacion", "desc")
        .onSnapshot((snapshot) => {

            fichas = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            renderizarTabla();
        }, (error) => {

            console.error(error);

            mostrarToast(
                "No se pudieron cargar las fichas."
            );
        });


    /* =========================
       BUSCADOR
    ========================= */

    campoBuscar.addEventListener("input", renderizarTabla);


    /* =========================
       CERRAR MODAL
    ========================= */

    botonCerrarModal.addEventListener("click", () => {
        modalDetalle.close();
    });


    /* =========================
       MOSTRAR DETALLE
    ========================= */

    window.verFicha = function (ficha) {

        if (!modalDetalle || !contenedorDetalle) {
            return;
        }

        const moldes = obtenerMoldesFicha(ficha);

        const listaMoldes = moldes.length
            ? moldes
                .map((item) =>
                    `${item.bizcochos} bizcocho${Number(item.bizcochos) === 1 ? "" : "s"} · molde ${item.molde}`
                )
                .join("<br>")
            : "-";


        /* =========================
           PRODUCTOS
        ========================= */

        const productos = [
            {
                tipo: ficha.tipoProducto,
                cantidad: ficha.cantidadProducto,
                descripcion: ficha.descripcionProducto
            },
            {
                tipo: ficha.tipoProducto1,
                cantidad: ficha.cantidadProducto1,
                descripcion: ficha.descripcionProducto1
            },
            {
                tipo: ficha.tipoProducto2,
                cantidad: ficha.cantidadProducto2,
                descripcion: ficha.descripcionProducto2
            },
            {
                tipo: ficha.tipoProducto3,
                cantidad: ficha.cantidadProducto3,
                descripcion: ficha.descripcionProducto3
            }
        ];


        const listaProductos = productos
            .filter((producto) => producto.tipo)
            .map((producto) => `
                <section class="producto-modal">

                    <div class="item-modal">
                        <strong>Producto:</strong> ${producto.tipo}
                    </div>

                    <div class="item-modal">
                        <strong>Cantidad:</strong> ${producto.cantidad || 0}
                    </div>

                    ${producto.descripcion ? `
                        <div class="item-modal">
                            <strong>Descripción:</strong> ${producto.descripcion}
                        </div>
                    ` : ""}

                </section>
            `)
            .join("");


        /* =========================
           CONTENIDO DEL MODAL
        ========================= */

        contenedorDetalle.innerHTML = `

            <div class="item-modal">
                <strong>Pedido:</strong> ${ficha.pedido}
            </div>

            <div class="item-modal">
                <strong>Cliente:</strong> ${ficha.cliente}
            </div>

            <div class="item-modal">
                <strong>Teléfono:</strong> ${ficha.telefono || "-"}
            </div>

            <div class="item-modal">
                <strong>Moldes:</strong> ${listaMoldes}
            </div>

            ${listaProductos}

            <div class="item-modal">
                <strong>Sabor:</strong> ${ficha.sabor}
            </div>

            <div class="item-modal">
                <strong>Relleno:</strong> ${ficha.relleno}
            </div>

            <div class="item-modal">
                <strong>Entrega:</strong>
                ${formatearFecha(ficha.fechaEntrega)}
            </div>

            <div class="item-modal">
                <strong>Observaciones:</strong>
                ${ficha.observaciones || "Sin observaciones"}
            </div>

            <div class="item-modal">
                <strong>Creada:</strong>
                ${formatearFechaHora(ficha.fechaCreacion)}
            </div>

        `;

        modalDetalle.showModal();
    };


    /* =========================
       RENDERIZAR TABLA
    ========================= */

    function renderizarTabla() {

        const texto = campoBuscar.value
            .trim()
            .toLowerCase();

        const fichasFiltradas = fichas.filter((ficha) => {

            const pedido =
                String(ficha.pedido || "")
                    .toLowerCase();

            const cliente =
                String(ficha.cliente || "")
                    .toLowerCase();

            return (
                pedido.includes(texto) ||
                cliente.includes(texto)
            );
        });


        cuerpoTabla.innerHTML = "";


        if (!fichasFiltradas.length) {

            cuerpoTabla.innerHTML = `
                <tr>
                    <td colspan="6">
                        No hay fichas para mostrar.
                    </td>
                </tr>
            `;

            return;
        }


        fichasFiltradas.forEach((ficha) => {

            const fila = document.createElement("tr");

            fila.innerHTML = `

                <td>
                    ${ficha.pedido}
                </td>

                <td>
                    ${ficha.cliente}
                </td>

                <td>
                    ${ficha.telefono || "-"}
                </td>

                <td>
                    ${formatearFecha(ficha.fechaEntrega)}
                </td>

                <td>
                    ${ficha.estado || "Guardada"}
                </td>

                <td class="acciones-tabla">

                    <button
                        type="button"
                        class="boton-ver"
                        title="Ver ficha"
                    >
                        👁️
                    </button>

                    <button
                        type="button"
                        class="boton-imagen"
                        title="Descargar comanda"
                    >
                        🖼️
                    </button>

                    <button
                        type="button"
                        class="boton-editar"
                        title="Editar ficha"
                    >
                        ✏️
                    </button>

                    <button
                        type="button"
                        class="boton-eliminar"
                        title="Eliminar ficha"
                    >
                        🗑️
                    </button>

                </td>
            `;


            /* =========================
               VER
            ========================= */

            fila.querySelector(".boton-ver")
                .addEventListener("click", () => {

                    verFicha(ficha);
                });


            /* =========================
               IMAGEN
            ========================= */

            fila.querySelector(".boton-imagen")
                .addEventListener("click", () => {

                    descargarEtiquetaComoImagen(ficha);
                });


            /* =========================
               EDITAR
            ========================= */

            fila.querySelector(".boton-editar")
                .addEventListener("click", () => {

                    window.location.href =
                        `nuevaficha.html?id=${ficha.id}`;
                });


            /* =========================
               ELIMINAR
            ========================= */

            fila.querySelector(".boton-eliminar")
                .addEventListener("click", () => {

                    confirmarEliminar(ficha);
                });


            cuerpoTabla.appendChild(fila);
        });
    }


    /* =========================
       CONFIRMAR ELIMINACIÓN
    ========================= */

    async function confirmarEliminar(ficha) {

        const confirmar = confirm(
            `¿Seguro que deseas eliminar la ficha ${ficha.pedido}?`
        );

        if (!confirmar) {
            return;
        }


        try {

            await eliminarFicha(ficha.id);

            mostrarToast(

                `Ficha ${ficha.pedido} eliminada correctamente.`
            );

        } catch (error) {

            console.error(error);

            mostrarToast(
                "No se pudo eliminar la ficha."
            );
        }
    }
});