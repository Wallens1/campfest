// ==========================
// Configuración
// ==========================
// Ajusta estos tres valores según el entorno donde quede publicada esta página.

const API_BASE = "https://campfest-api-production.up.railway.app";
const SUPABASE_URL = "https://lazarmjxajhdjvuhtzcl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhemFybWp4YWpoZGp2dWh0emNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDY4MzQsImV4cCI6MjA5OTM4MjgzNH0.j3muJDelPhZibma-yeuIhvjrvQ01e7DN0B-4UaYyCFM";


const POLLING_MS = 7000;

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIAS = [
    "inconveniente", "queja", "reclamo", "sugerencia", "accidente",
    "emergencia_medica", "convivencia", "disciplina", "logistica",
    "alimentacion", "objetos_perdidos", "seguridad", "otro"
];

const PRIORIDADES = ["baja", "media", "alta", "critica"];

function humanizar(texto) {
    if (!texto) return "—";
    const limpio = String(texto).replace(/_/g, " ");
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// ==========================
// Elementos
// ==========================

const pantallaLogin = document.getElementById("pantallaLogin");
const pantallaPanel = document.getElementById("pantallaPanel");

const formLogin = document.getElementById("formLogin");
const btnLogin = document.getElementById("btnLogin");
const mensajeLogin = document.getElementById("mensajeLogin");

const usuarioActual = document.getElementById("usuarioActual");
const btnCerrarSesion = document.getElementById("btnCerrarSesion");

const tabsBusqueda = document.querySelectorAll(".tab-busqueda");
const formBuscar = document.getElementById("formBuscar");
const inputBusqueda = document.getElementById("inputBusqueda");
const mensajeBusqueda = document.getElementById("mensajeBusqueda");
const resultados = document.getElementById("resultados");

const ficha = document.getElementById("ficha");
const badges = document.getElementById("badges");
const fichaNombre = document.getElementById("fichaNombre");
const fichaDocumento = document.getElementById("fichaDocumento");
const gridInfo = document.getElementById("gridInfo");
const bloqueIngreso = document.getElementById("bloqueIngreso");
const formAsignacion = document.getElementById("formAsignacion");
const gridCarpas = document.getElementById("gridCarpas");
const checkboxLider = document.getElementById("checkboxLider");
const tituloAlimentacion = document.getElementById("tituloAlimentacion");
const checklistAlimentacion = document.getElementById("checklistAlimentacion");
const historial = document.getElementById("historial");
const mensajeFicha = document.getElementById("mensajeFicha");

let campoBusquedaActivo = "codigo";
let participanteActualId = null;
let carpaSeleccionada = null;
let intervaloPolling = null;

// ==========================
// Utilidades
// ==========================

function mostrarMensaje(elemento, texto, tipo) {
    elemento.textContent = texto;
    elemento.className = `mensaje mostrar ${tipo}`;
}

function ocultarMensaje(elemento) {
    elemento.className = "mensaje";
}

function formatearHora(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleTimeString("es-CO", {
        hour: "numeric",
        minute: "2-digit"
    });
}

async function peticionApi(ruta, opciones = {}) {

    const { data: sesion } = await supabaseClient.auth.getSession();
    const token = sesion?.session?.access_token;

    const respuesta = await fetch(`${API_BASE}${ruta}`, {
        ...opciones,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(opciones.headers || {})
        }
    });

    const cuerpo = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(cuerpo.mensaje || "Ocurrió un error inesperado");
    }

    return cuerpo;

}

// ==========================
// Sesión
// ==========================

async function verificarSesion() {

    const { data } = await supabaseClient.auth.getSession();

    if (data?.session) {
        mostrarPanel(data.session);
    } else {
        mostrarLogin();
    }

}

function mostrarLogin() {
    pantallaLogin.classList.remove("oculto");
    pantallaPanel.classList.add("oculto");
    if (intervaloPolling) clearInterval(intervaloPolling);
}

function mostrarPanel(sesion) {
    pantallaLogin.classList.add("oculto");
    pantallaPanel.classList.remove("oculto");
    usuarioActual.textContent = sesion.user.email;

    llenarSelect(document.getElementById("inputCategoria"), CATEGORIAS, "Selecciona categoría");
    llenarSelect(document.getElementById("inputPrioridad"), PRIORIDADES, "Selecciona prioridad");
    cargarZonas();
    cargarCarpas();

    cargarMisIncidentes();
    intervaloPolling = setInterval(cargarMisIncidentes, POLLING_MS);
}

function llenarSelect(select, valores, etiquetaTodos) {
    select.innerHTML = `<option value="">${etiquetaTodos}</option>` +
        valores.map((v) => `<option value="${v}">${humanizar(v)}</option>`).join("");
}

formLogin.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const email = document.getElementById("inputEmail").value.trim();
    const password = document.getElementById("inputPassword").value;

    btnLogin.disabled = true;
    ocultarMensaje(mensajeLogin);

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    btnLogin.disabled = false;

    if (error) {
        mostrarMensaje(mensajeLogin, "Correo o contraseña incorrectos", "fallo");
        return;
    }

    mostrarPanel(data.session);

});

btnCerrarSesion.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    ficha.classList.add("oculto");
    resultados.innerHTML = "";
    inputBusqueda.value = "";
    mostrarLogin();
});

// ==========================
// Búsqueda de participantes
// ==========================

tabsBusqueda.forEach((tab) => {

    tab.addEventListener("click", () => {

        tabsBusqueda.forEach((t) => t.classList.remove("activo"));
        tab.classList.add("activo");

        campoBusquedaActivo = tab.dataset.campo;

        const placeholders = {
            codigo: "Ingresa el código enviado por WhatsApp",
            documento: "Ingresa el número de documento",
            nombre: "Ingresa el nombre del participante"
        };

        inputBusqueda.placeholder = placeholders[campoBusquedaActivo];

    });

});

formBuscar.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const valor = inputBusqueda.value.trim();

    if (!valor) return;

    ocultarMensaje(mensajeBusqueda);
    resultados.innerHTML = "";
    ficha.classList.add("oculto");

    try {

        const parametros = new URLSearchParams({ [campoBusquedaActivo]: valor });
        const respuesta = await peticionApi(`/api/logistica/buscar?${parametros.toString()}`);

        if (respuesta.resultados.length === 0) {
            mostrarMensaje(mensajeBusqueda, "No se encontraron participantes", "fallo");
            return;
        }

        renderizarResultados(respuesta.resultados);

    } catch (error) {
        mostrarMensaje(mensajeBusqueda, error.message, "fallo");
    }

});

function renderizarResultados(lista) {

    resultados.innerHTML = "";

    lista.forEach((participante) => {

        const item = document.createElement("div");
        item.className = "resultado-item";
        item.innerHTML = `
            <div>
                <div class="nombre">${participante.nombre}</div>
                <div class="detalle">${participante.documento} · ${participante.municipio || ""}</div>
            </div>
        `;

        item.addEventListener("click", () => seleccionarParticipante(participante.id));

        resultados.appendChild(item);

    });

}

// ==========================
// Ficha del participante
// ==========================

async function seleccionarParticipante(id) {

    try {

        const respuesta = await peticionApi(`/api/logistica/participante/${id}`);
        participanteActualId = id;
        renderizarFicha(respuesta);
        ficha.classList.remove("oculto");
        ocultarMensaje(mensajeFicha);

    } catch (error) {
        mostrarMensaje(mensajeBusqueda, error.message, "fallo");
    }

}

function renderizarFicha(datos) {

    const { participante, servicios, entregas, totalServicios, entregasRealizadas, historial: eventos } = datos;

    fichaNombre.textContent = participante.nombre;
    fichaDocumento.textContent = `Documento: ${participante.documento}`;

    renderizarBadges(participante, entregasRealizadas, totalServicios);
    renderizarInfo(participante);
    renderizarIngreso(participante);

    carpaSeleccionada = participante.carpa_asignada || null;
    renderizarGridCarpas();
    checkboxLider.checked = !!participante.es_lider_carpa;

    actualizarMensajeParticipanteVinculado();

    tituloAlimentacion.textContent = `Alimentación (${entregasRealizadas}/${totalServicios})`;
    renderizarAlimentacion(servicios, entregas);

    renderizarHistorial(eventos);

}

function renderizarBadges(participante, entregasRealizadas, totalServicios) {

    const ingresoBadge = participante.ingreso_registrado
        ? `<span class="badge verde">🟢 Ingresó</span>`
        : `<span class="badge rojo">🔴 Pendiente de ingreso</span>`;

    const alimentacionBadge = `<span class="badge neutro">${entregasRealizadas}/${totalServicios} entregas</span>`;

    const carpaBadge = `<span class="badge neutro">Carpa: ${participante.carpa_asignada || "sin asignar"}</span>`;

    const liderBadge = `<span class="badge neutro">Líder de carpa: ${participante.es_lider_carpa ? "Sí" : "No"}</span>`;

    badges.innerHTML = ingresoBadge + alimentacionBadge + carpaBadge + liderBadge;

}

function contactoCompleto(nombre, telefono) {
    const partes = [nombre, telefono].filter(Boolean);
    return partes.length > 0 ? partes.join(" · ") : null;
}

function siONoConDetalle(participante, campoBooleano, campoDetalle) {

    if (!participante[campoBooleano]) {
        return { valor: "No", alerta: false };
    }

    const detalle = participante[campoDetalle];

    return { valor: detalle ? `Sí: ${detalle}` : "Sí", alerta: true };

}

function renderizarInfo(participante) {

    const condicionMedica = siONoConDetalle(participante, "tiene_condicion_medica", "condicion_medica_detalle");
    const restriccionAlimentaria = siONoConDetalle(participante, "tiene_restricciones_alimentarias", "restricciones_alimentarias_detalle");
    const alergiaMedicamento = siONoConDetalle(participante, "alergia_medicamento", "alergia_medicamento_detalle");
    const alergiaAlimento = siONoConDetalle(participante, "alergia_alimento", "alergia_alimento_detalle");

    const campos = [
        { etiqueta: "Tipo de documento", valor: participante.tipo_documento },
        { etiqueta: "Fecha de nacimiento", valor: participante.fecha_nacimiento },
        { etiqueta: "Edad", valor: participante.edad },
        { etiqueta: "Municipio", valor: participante.municipio },
        { etiqueta: "Zona", valor: participante.zona_rural_urbana },
        { etiqueta: "Teléfono personal", valor: participante.telefono },
        { etiqueta: "Correo personal", valor: participante.correo_personal },
        { etiqueta: "Contacto de emergencia 1", valor: contactoCompleto(participante.contacto_emergencia_nombre, participante.contacto_emergencia_telefono) },
        { etiqueta: "Contacto de emergencia 2", valor: contactoCompleto(participante.contacto_emergencia_2_nombre, participante.contacto_emergencia_2_telefono) },
        { etiqueta: "RH", valor: participante.rh },
        { etiqueta: "Condición médica/discapacidad", valor: condicionMedica.valor, alerta: condicionMedica.alerta },
        { etiqueta: "Restricción alimentaria", valor: restriccionAlimentaria.valor, alerta: restriccionAlimentaria.alerta },
        { etiqueta: "Alergia a medicamento", valor: alergiaMedicamento.valor, alerta: alergiaMedicamento.alerta },
        { etiqueta: "Alergia a alimento", valor: alergiaAlimento.valor, alerta: alergiaAlimento.alerta },
        { etiqueta: "EPS", valor: participante.eps },
        {
            etiqueta: "Certificado EPS",
            valor: participante.certificado_eps_url
                ? `<a href="${participante.certificado_eps_url}" target="_blank" rel="noopener">Ver certificado</a>`
                : null
        },
        { etiqueta: "Carpa propia", valor: participante.carpa_propia ? "Sí" : "No" },
        { etiqueta: "Instancia del Subsistema", valor: participante.subsistema_instancia },
        { etiqueta: "Estado de admisión", valor: participante.estado_admision },
        { etiqueta: "Código", valor: participante.codigo }
    ];

    gridInfo.innerHTML = campos.map(({ etiqueta, valor, alerta }) => `
        <div class="dato ${alerta ? "alerta" : ""}">
            <span class="etiqueta">${etiqueta}</span>
            <span class="valor">${valor || "—"}</span>
        </div>
    `).join("");

}

function renderizarIngreso(participante) {

    if (participante.ingreso_registrado) {
        bloqueIngreso.innerHTML = `<span class="badge verde">Ingresó a las ${formatearHora(participante.hora_ingreso)}</span>`;
        return;
    }

    bloqueIngreso.innerHTML = `<button class="boton pequeno" id="btnRegistrarIngreso">Registrar ingreso</button>`;

    document.getElementById("btnRegistrarIngreso").addEventListener("click", async () => {

        try {
            await peticionApi(`/api/logistica/participante/${participanteActualId}/ingreso`, { method: "POST" });
            mostrarMensaje(mensajeFicha, "Ingreso registrado correctamente", "ok");
            await seleccionarParticipante(participanteActualId);
        } catch (error) {
            mostrarMensaje(mensajeFicha, error.message, "fallo");
        }

    });

}

formAsignacion.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    if (!carpaSeleccionada) {
        mostrarMensaje(mensajeFicha, "Selecciona una carpa en la grid", "fallo");
        return;
    }

    try {

        await peticionApi(`/api/logistica/participante/${participanteActualId}/asignacion`, {
            method: "POST",
            body: JSON.stringify({ carpa: carpaSeleccionada, esLiderCarpa: checkboxLider.checked })
        });

        mostrarMensaje(mensajeFicha, "Asignación guardada correctamente", "ok");
        await seleccionarParticipante(participanteActualId);

    } catch (error) {
        mostrarMensaje(mensajeFicha, error.message, "fallo");
    }

});

// ==========================
// Grid de carpas (definidas por el admin, con ocupación en vivo)
// ==========================

let carpasDisponibles = [];

async function cargarCarpas() {

    try {
        const { carpas } = await peticionApi("/api/centro-control/carpas");
        carpasDisponibles = carpas;
        renderizarGridCarpas();
    } catch (error) {
        gridCarpas.innerHTML = `<p class="detalle">${error.message}</p>`;
    }

}

function renderizarGridCarpas() {

    if (carpasDisponibles.length === 0) {
        gridCarpas.innerHTML = `<p class="detalle">El administrador todavía no ha configurado carpas.</p>`;
        return;
    }

    gridCarpas.innerHTML = carpasDisponibles.map((carpa) => {

        const esSeleccionada = carpa.nombre === carpaSeleccionada;
        const llena = carpa.ocupacion >= carpa.capacidad && !esSeleccionada;

        return `
            <div class="carpa-card ${esSeleccionada ? "seleccionada" : ""} ${llena ? "llena" : ""}" data-nombre="${carpa.nombre}">
                <div class="nombre">${carpa.nombre}</div>
                <div class="ocupacion">${carpa.ocupacion}/${carpa.capacidad}</div>
            </div>
        `;

    }).join("");

    gridCarpas.querySelectorAll(".carpa-card").forEach((card) => {

        card.addEventListener("click", () => {
            carpaSeleccionada = card.dataset.nombre;
            renderizarGridCarpas();
        });

    });

}

// ==========================
// Reportar incidente
// ==========================

const btnAbrirFormIncidente = document.getElementById("btnAbrirFormIncidente");
const tarjetaFormIncidente = document.getElementById("tarjetaFormIncidente");
const formIncidente = document.getElementById("formIncidente");
const mensajeIncidente = document.getElementById("mensajeIncidente");

btnAbrirFormIncidente.addEventListener("click", () => {
    tarjetaFormIncidente.classList.toggle("oculto");
    actualizarMensajeParticipanteVinculado();
    tarjetaFormIncidente.scrollIntoView({ behavior: "smooth" });
});

function actualizarMensajeParticipanteVinculado() {

    const elemento = document.getElementById("mensajeParticipanteVinculado");

    if (tarjetaFormIncidente.classList.contains("oculto")) return;

    if (participanteActualId) {
        mostrarMensaje(elemento, `Se vinculará a: ${fichaNombre.textContent}`, "ok");
    } else {
        mostrarMensaje(elemento, "Sin participante vinculado (incidente general)", "ok");
    }

}

async function cargarZonas() {

    try {
        const { zonas } = await peticionApi("/api/centro-control/zonas");
        const select = document.getElementById("inputZona");
        select.innerHTML = `<option value="">Selecciona zona</option>` +
            zonas.map((z) => `<option value="${z.nombre}">${humanizar(z.nombre)}</option>`).join("");
    } catch (error) {
        console.error(error);
    }

}

formIncidente.addEventListener("submit", async (evento) => {

    evento.preventDefault();
    ocultarMensaje(mensajeIncidente);

    try {

        await peticionApi("/api/incidentes", {
            method: "POST",
            body: JSON.stringify({
                categoria: document.getElementById("inputCategoria").value,
                descripcion: document.getElementById("inputDescripcionIncidente").value.trim(),
                prioridad: document.getElementById("inputPrioridad").value,
                zona: document.getElementById("inputZona").value,
                lugar: document.getElementById("inputLugar").value.trim(),
                participanteId: participanteActualId
            })
        });

        mostrarMensaje(mensajeIncidente, "Incidente enviado al Centro de Control", "ok");
        formIncidente.reset();
        await cargarMisIncidentes();

        setTimeout(() => {
            tarjetaFormIncidente.classList.add("oculto");
            ocultarMensaje(mensajeIncidente);
        }, 1500);

    } catch (error) {
        mostrarMensaje(mensajeIncidente, error.message, "fallo");
    }

});

async function cargarMisIncidentes() {

    try {

        const { incidentes } = await peticionApi("/api/incidentes/mios");
        const contenedor = document.getElementById("listaMisIncidentes");

        contenedor.innerHTML = incidentes.length === 0
            ? `<p class="detalle">Todavía no has reportado ningún incidente.</p>`
            : incidentes.map((incidente) => `
                <div class="incidente-mini">
                    <div>
                        <span class="codigo">${incidente.codigo}</span>
                        <div class="descripcion">${incidente.descripcion}</div>
                    </div>
                    <div>
                        <span class="prioridad-badge ${incidente.prioridad}">${humanizar(incidente.prioridad)}</span>
                        <span class="estado-badge ${incidente.estado}">${humanizar(incidente.estado)}</span>
                    </div>
                </div>
            `).join("");

    } catch (error) {
        console.error(error);
    }

}

function renderizarAlimentacion(servicios, entregas) {

    checklistAlimentacion.innerHTML = "";

    servicios.forEach((servicio) => {

        const entrega = entregas.find((e) => e.servicio === servicio.id);

        const item = document.createElement("div");
        item.className = `item-servicio ${entrega ? "entregado" : ""}`;

        if (entrega) {
            item.innerHTML = `
                <span>${servicio.label}</span>
                <span class="marcado">Entregado · ${formatearHora(entrega.hora)}</span>
            `;
        } else {
            item.innerHTML = `<span>${servicio.label}</span>`;

            const boton = document.createElement("button");
            boton.textContent = "Marcar";
            boton.addEventListener("click", () => marcarAlimentacion(servicio.id));
            item.appendChild(boton);
        }

        checklistAlimentacion.appendChild(item);

    });

}

async function marcarAlimentacion(servicioId) {

    try {

        await peticionApi(`/api/logistica/participante/${participanteActualId}/alimentacion`, {
            method: "POST",
            body: JSON.stringify({ servicio: servicioId })
        });

        mostrarMensaje(mensajeFicha, "Entrega registrada correctamente", "ok");
        await seleccionarParticipante(participanteActualId);

    } catch (error) {
        mostrarMensaje(mensajeFicha, error.message, "fallo");
    }

}

function renderizarHistorial(eventos) {

    if (!eventos || eventos.length === 0) {
        historial.innerHTML = `<p class="detalle">Sin eventos registrados todavía.</p>`;
        return;
    }

    historial.innerHTML = eventos.map((evento) => `
        <div class="historial-item">
            <span class="hora">${formatearHora(evento.creado_en)}</span>
            <div class="descripcion">${evento.descripcion}</div>
            <div class="usuario">Usuario: ${evento.usuario_nombre || "—"}</div>
        </div>
    `).join("");

}

// ==========================
// Arranque
// ==========================

verificarSesion();
