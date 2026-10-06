document.addEventListener("DOMContentLoaded", async () => {

    const formulario = document.getElementById("formulario-ficha");

    const campoPedido = document.getElementById("pedido");
    const campoCliente = document.getElementById("cliente");
    const campoTelefono = document.getElementById("telefono");

    const paresMolde = [
        {
            bizcochos: document.getElementById("bizcochos-1"),
            molde: document.getElementById("molde-1")
        },
        {
            bizcochos: document.getElementById("bizcochos-2"),
            molde: document.getElementById("molde-2")
        },
        {
            bizcochos: document.getElementById("bizcochos-3"),
            molde: document.getElementById("molde-3")
        }
    ];

    const campoSabor = document.getElementById("sabor");
    const campoRelleno = document.getElementById("relleno");

    /* PRODUCTO 1 */
    const campoTipoProducto = document.getElementById("tipoProducto");
    const campoCantidadProducto = document.getElementById("cantidadProducto");
    const campoDescripcionProducto = document.getElementById("descripcionProducto");

    /* PRODUCTO 2 */
    const campoTipoProducto1 = document.getElementById("tipoProducto1");
    const campoCantidadProducto1 = document.getElementById("cantidadProducto1");
    const campoDescripcionProducto1 = document.getElementById("descripcionProducto1");

    /* PRODUCTO 3 */
    const campoTipoProducto2 = document.getElementById("tipoProducto2");
    const campoCantidadProducto2 = document.getElementById("cantidadProducto2");
    const campoDescripcionProducto2 = document.getElementById("descripcionProducto2");

    /* PRODUCTO 4 */
    const campoTipoProducto3 = document.getElementById("tipoProducto3");
    const campoCantidadProducto3 = document.getElementById("cantidadProducto3");
    const campoDescripcionProducto3 = document.getElementById("descripcionProducto3");

    const campoEntrega = document.getElementById("fecha-entrega");
    const campoObservaciones = document.getElementById("observaciones");

    const numeroPedidoResumen = document.getElementById("numero-pedido");
    const estadoResumen = document.getElementById("estado");
    const entregaResumen = document.getElementById("resumen-entrega");

    const botonGuardar = formulario.querySelector(".boton-guardar");
    const botonImagen = document.getElementById("descargar-imagen");

    const idEditar = new URLSearchParams(window.location.search).get("id");

    let fichaActual = null;


    /* CARGAR FICHA O PREVISUALIZAR NÚMERO */

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


    /* RESUMEN DE ENTREGA */

    actualizarResumenEntrega();

    campoEntrega.addEventListener("change", actualizarResumenEntrega);


    /* GUARDAR FICHA */

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        if (!formulario.reportValidity()) {
            return;
        }

        botonGuardar.disabled = true;

        const textoOriginal = botonGuardar.textContent;

        botonGuardar.textContent = "Guardando...";


        try {

            const pedido = fichaActual
                ? fichaActual.pedido
                : await generarNumeroPedido();

            const moldes = leerMoldes();


            const ficha = {

                id: fichaActual ? fichaActual.id : null,

                pedido,

                cliente: campoCliente.value.trim(),

                telefono: campoTelefono.value.trim(),

                moldes,

                bizcochos: moldes[0]
                    ? moldes[0].bizcochos
                    : 0,

                molde: moldes[0]
                    ? moldes[0].molde
                    : "",


                /* SABOR Y RELLENO */

                sabor: campoSabor.value,

                relleno: campoRelleno.value,


                /* PRODUCTO 1 */

                tipoProducto: campoTipoProducto.value,

                cantidadProducto:
                    Number(campoCantidadProducto.value) || 0,

                descripcionProducto:
                    campoDescripcionProducto.value.trim(),


                /* PRODUCTO 2 */

                tipoProducto1: campoTipoProducto1.value,

                cantidadProducto1:
                    Number(campoCantidadProducto1.value) || 0,

                descripcionProducto1:
                    campoDescripcionProducto1.value.trim(),


                /* PRODUCTO 3 */

                tipoProducto2: campoTipoProducto2.value,

                cantidadProducto2:
                    Number(campoCantidadProducto2.value) || 0,

                descripcionProducto2:
                    campoDescripcionProducto2.value.trim(),


                /* PRODUCTO 4 */

                tipoProducto3: campoTipoProducto3.value,

                cantidadProducto3:
                    Number(campoCantidadProducto3.value) || 0,

                descripcionProducto3:
                    campoDescripcionProducto3.value.trim(),


                /* ENTREGA */

                fechaEntrega: campoEntrega.value,


                /* OBSERVACIONES */

                observaciones:
                    campoObservaciones.value.trim(),


                /* ESTADO */

                estado: "Guardada",


                /* FECHA */

                fechaCreacion: fichaActual
                    ? fichaActual.fechaCreacion
                    : new Date().toISOString()
            };


            const guardada = await guardarFicha(ficha);

            fichaActual = guardada;


            campoPedido.value = guardada.pedido;

            numeroPedidoResumen.textContent =
                guardada.pedido;

            estadoResumen.textContent =
                guardada.estado;


            mostrarToast(
                "Ficha " +
                guardada.pedido +
                " guardada correctamente."
            );


        } catch (error) {

            console.error(error);

            mostrarToast(
                "No se pudo guardar. Revisa tu conexión a internet."
            );

        } finally {

            botonGuardar.disabled = false;

            botonGuardar.textContent = textoOriginal;
        }

    });


    /* DESCARGAR COMANDA */

    botonImagen.addEventListener("click", () => {

        if (!formulario.reportValidity()) {

            mostrarToast(
                "Completa los campos requeridos antes de generar la comanda."
            );

            return;
        }


        if (!fichaActual || huboCambiosSinGuardar()) {

            mostrarToast(
                "Guarda la ficha antes de descargar la comanda."
            );

            return;
        }


        descargarEtiquetaComoImagen(fichaActual);
    });


    /* LIMPIAR FORMULARIO */

    formulario.addEventListener("reset", () => {

        setTimeout(async () => {

            fichaActual = null;

            botonGuardar.textContent =
                "💾 Guardar ficha";


            try {

                const pedidoPrevio =
                    await previsualizarNumeroPedido();

                campoPedido.value =
                    pedidoPrevio;

                numeroPedidoResumen.textContent =
                    pedidoPrevio;

            } catch (error) {

                console.error(error);
            }


            estadoResumen.textContent =
                "Borrador";

            actualizarResumenEntrega();

        }, 0);

    });


    /* CARGAR FICHA EN FORMULARIO */

    function cargarFichaEnFormulario(ficha) {

        campoPedido.value =
            ficha.pedido;

        campoCliente.value =
            ficha.cliente;

        campoTelefono.value =
            ficha.telefono || "";


        /* SABOR Y RELLENO */

        campoSabor.value =
            ficha.sabor;

        campoRelleno.value =
            ficha.relleno;


        /* PRODUCTO 1 */

        campoTipoProducto.value =
            ficha.tipoProducto || "";

        campoCantidadProducto.value =
            ficha.cantidadProducto || "";

        campoDescripcionProducto.value =
            ficha.descripcionProducto || "";


        /* PRODUCTO 2 */

        campoTipoProducto1.value =
            ficha.tipoProducto1 || "";

        campoCantidadProducto1.value =
            ficha.cantidadProducto1 || "";

        campoDescripcionProducto1.value =
            ficha.descripcionProducto1 || "";


        /* PRODUCTO 3 */

        campoTipoProducto2.value =
            ficha.tipoProducto2 || "";

        campoCantidadProducto2.value =
            ficha.cantidadProducto2 || "";

        campoDescripcionProducto2.value =
            ficha.descripcionProducto2 || "";


        /* PRODUCTO 4 */

        campoTipoProducto3.value =
            ficha.tipoProducto3 || "";

        campoCantidadProducto3.value =
            ficha.cantidadProducto3 || "";

        campoDescripcionProducto3.value =
            ficha.descripcionProducto3 || "";


        /* ENTREGA */

        campoEntrega.value =
            ficha.fechaEntrega;


        /* OBSERVACIONES */

        campoObservaciones.value =
            ficha.observaciones || "";


        /* MOLDES */

        const moldesGuardados =
            obtenerMoldesFicha(ficha);


        paresMolde.forEach((par, indice) => {

            const datos =
                moldesGuardados[indice];


            par.bizcochos.value =
                datos
                    ? datos.bizcochos
                    : "";


            par.molde.value =
                datos
                    ? datos.molde
                    : "";
        });


        numeroPedidoResumen.textContent =
            ficha.pedido;

        estadoResumen.textContent =
            ficha.estado;


        botonGuardar.textContent =
            "💾 Actualizar ficha";
    }


    /* LEER MOLDES */

    function leerMoldes() {

        return paresMolde

            .map((par) => ({

                bizcochos:
                    Number(par.bizcochos.value),

                molde:
                    par.molde.value

            }))

            .filter((item) =>
                item.molde &&
                item.bizcochos > 0
            );
    }


    /* ACTUALIZAR RESUMEN DE ENTREGA */

    function actualizarResumenEntrega() {

        entregaResumen.textContent =
            campoEntrega.value

                ? formatearFecha(
                    campoEntrega.value
                )

                : "Sin seleccionar";
    }


    /* DETECTAR CAMBIOS SIN GUARDAR */

    function huboCambiosSinGuardar() {

        if (!fichaActual) {
            return true;
        }


        return (

            fichaActual.cliente !==
            campoCliente.value.trim()


            ||

            fichaActual.telefono !==
            campoTelefono.value.trim()


            ||

            JSON.stringify(
                obtenerMoldesFicha(fichaActual)
            ) !==
            JSON.stringify(
                leerMoldes()
            )


            ||

            fichaActual.sabor !==
            campoSabor.value


            ||

            fichaActual.relleno !==
            campoRelleno.value


            /* PRODUCTO 1 */

            ||

            fichaActual.tipoProducto !==
            campoTipoProducto.value


            ||

            Number(
                fichaActual.cantidadProducto || 0
            ) !==
            Number(
                campoCantidadProducto.value || 0
            )


            ||

            (fichaActual.descripcionProducto || "") !==
            campoDescripcionProducto.value.trim()


            /* PRODUCTO 2 */

            ||

            (fichaActual.tipoProducto1 || "") !==
            campoTipoProducto1.value


            ||

            Number(
                fichaActual.cantidadProducto1 || 0
            ) !==
            Number(
                campoCantidadProducto1.value || 0
            )


            ||

            (fichaActual.descripcionProducto1 || "") !==
            campoDescripcionProducto1.value.trim()


            /* PRODUCTO 3 */

            ||

            (fichaActual.tipoProducto2 || "") !==
            campoTipoProducto2.value


            ||

            Number(
                fichaActual.cantidadProducto2 || 0
            ) !==
            Number(
                campoCantidadProducto2.value || 0
            )


            ||

            (fichaActual.descripcionProducto2 || "") !==
            campoDescripcionProducto2.value.trim()


            /* PRODUCTO 4 */

            ||

            (fichaActual.tipoProducto3 || "") !==
            campoTipoProducto3.value


            ||

            Number(
                fichaActual.cantidadProducto3 || 0
            ) !==
            Number(
                campoCantidadProducto3.value || 0
            )


            ||

            (fichaActual.descripcionProducto3 || "") !==
            campoDescripcionProducto3.value.trim()


            /* ENTREGA */

            ||

            fichaActual.fechaEntrega !==
            campoEntrega.value


            /* OBSERVACIONES */

            ||

            fichaActual.observaciones !==
            campoObservaciones.value.trim()
        );
    }

});
