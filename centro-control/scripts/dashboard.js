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

const ZONAS = [
    "recepcion", "comedor", "escenario", "carpas",
    "enfermeria", "banos", "zona_deportiva", "otra"
];

const ESTADOS = [
    "en_atencion", "pendiente_seguimiento", "escalado", "solucionado", "cerrado"
];

// ==========================
// Utilidades
// ==========================

function humanizar(texto) {
    if (!texto) return "—";
    const limpio = String(texto).replace(/_/g, " ");
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function mostrarMensaje(elemento, texto, tipo) {
    elemento.textContent = texto;
    elemento.className = `mensaje mostrar ${tipo}`;
}

function ocultarMensaje(elemento) {
    elemento.className = "mensaje";
}

function formatearHora(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

function minutosDesde(fechaIso) {
    return Math.max(0, Math.round((Date.now() - new Date(fechaIso).getTime()) / 60000));
}

function minutosHasta(fechaIso) {
    return Math.round((new Date(fechaIso).getTime() - Date.now()) / 60000);
}

function llenarSelect(select, valores, etiquetaTodos) {
    select.innerHTML = `<option value="">${etiquetaTodos}</option>` +
        valores.map((v) => `<option value="${v}">${humanizar(v)}</option>`).join("");
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

    if (opciones.binario) return respuesta;

    const cuerpo = await respuesta.json();

    if (!respuesta.ok) throw new Error(cuerpo.mensaje || "Ocurrió un error inesperado");

    return cuerpo;

}

async function descargarArchivo(ruta, nombreArchivo) {

    const respuesta = await peticionApi(ruta, { binario: true });

    if (!respuesta.ok) {
        alert("No se pudo generar el archivo");
        return;
    }

    const blob = await respuesta.blob();
    const url = window.URL.createObjectURL(blob);

    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();

    window.URL.revokeObjectURL(url);

}

// ==========================
// Elementos
// ==========================

const pantallaLogin = document.getElementById("pantallaLogin");
const dashboard = document.getElementById("dashboard");
const formLogin = document.getElementById("formLogin");
const btnLogin = document.getElementById("btnLogin");
const mensajeLogin = document.getElementById("mensajeLogin");
const usuarioActual = document.getElementById("usuarioActual");
const btnCerrarSesion = document.getElementById("btnCerrarSesion");

let perfilActual = null;
let intervaloPolling = null;
let panelDetalleAbierto = false;
let mapaOperadores = {};

// ==========================
// Sesión
// ==========================

async function verificarSesion() {
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) {
        await iniciarDashboard();
    } else {
        mostrarLogin();
    }
}

function mostrarLogin() {
    pantallaLogin.classList.remove("oculto");
    dashboard.classList.add("oculto");
    if (intervaloPolling) clearInterval(intervaloPolling);
}

formLogin.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const email = document.getElementById("inputEmail").value.trim();
    const password = document.getElementById("inputPassword").value;

    btnLogin.disabled = true;
    ocultarMensaje(mensajeLogin);

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    btnLogin.disabled = false;

    if (error) {
        mostrarMensaje(mensajeLogin, "Correo o contraseña incorrectos", "fallo");
        return;
    }

    await iniciarDashboard();

});

btnCerrarSesion.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    mostrarLogin();
});

async function iniciarDashboard() {

    pantallaLogin.classList.add("oculto");
    dashboard.classList.remove("oculto");

    const { usuario } = await peticionApi("/api/centro-control/perfil");
    perfilActual = usuario;
    usuarioActual.textContent = `${usuario.nombre} · ${humanizar(usuario.rol)}`;

    document.getElementById("panelAdminCarpas").classList.toggle("oculto", usuario.rol !== "admin");

    llenarSelect(document.getElementById("inputCategoria"), CATEGORIAS, "Selecciona categoría");
    llenarSelect(document.getElementById("inputPrioridad"), PRIORIDADES, "Selecciona prioridad");
    llenarSelect(document.getElementById("inputZona"), ZONAS, "Selecciona zona");

    document.getElementById("filtroEstado").innerHTML += ESTADOS.map((e) => `<option value="${e}">${humanizar(e)}</option>`).join("");
    document.getElementById("filtroPrioridad").innerHTML += PRIORIDADES.map((p) => `<option value="${p}">${humanizar(p)}</option>`).join("");
    document.getElementById("filtroCategoria").innerHTML += CATEGORIAS.map((c) => `<option value="${c}">${humanizar(c)}</option>`).join("");
    document.getElementById("filtroZona").innerHTML += ZONAS.map((z) => `<option value="${z}">${humanizar(z)}</option>`).join("");

    const { operadores } = await peticionApi("/api/centro-control/operadores");
    mapaOperadores = Object.fromEntries(operadores.map((o) => [o.id, o.nombre]));
    document.getElementById("filtroResponsable").innerHTML += operadores.map((o) => `<option value="${o.id}">${o.nombre}</option>`).join("");

    if (usuario.rol === "admin") cargarCapacidadCarpas();

    await actualizarTodo();

    intervaloPolling = setInterval(actualizarTodo, POLLING_MS);

}

async function actualizarTodo() {

    await Promise.all([
        cargarPanel(),
        cargarActividad(),
        cargarGraficos(),
        cargarParticipantes(),
        panelDetalleAbierto ? Promise.resolve() : cargarIncidentes(),
        panelDetalleAbierto ? Promise.resolve() : cargarColaSeguimiento()
    ]);

}

// ==========================
// Panel de estadísticas y alertas
// ==========================

async function cargarPanel() {

    try {

        const datos = await peticionApi("/api/centro-control/panel");

        document.getElementById("statsParticipantes").innerHTML = `
            <div class="stat-tile"><div class="stat-numero">${datos.participantes.admitidos}</div><span class="stat-etiqueta">Admitidos</span></div>
            <div class="stat-tile"><div class="stat-numero">${datos.participantes.ingresados}</div><span class="stat-etiqueta">Ingresaron</span></div>
            <div class="stat-tile"><div class="stat-numero">${datos.participantes.pendientes}</div><span class="stat-etiqueta">Pendientes</span></div>
            <div class="stat-tile"><div class="stat-numero">${datos.participantes.retirados}</div><span class="stat-etiqueta">Retirados</span></div>
        `;

        document.getElementById("statsAlimentacion").innerHTML = `
            <div class="stat-tile"><div class="stat-numero">${datos.alimentacion.porTipo.desayuno}</div><span class="stat-etiqueta">Desayunos</span></div>
            <div class="stat-tile"><div class="stat-numero">${datos.alimentacion.porTipo.almuerzo}</div><span class="stat-etiqueta">Almuerzos</span></div>
            <div class="stat-tile"><div class="stat-numero">${datos.alimentacion.porTipo.cena}</div><span class="stat-etiqueta">Cenas</span></div>
            <div class="stat-tile"><div class="stat-numero">${datos.alimentacion.porTipo.refrigerio}</div><span class="stat-etiqueta">Refrigerios</span></div>
        `;

        document.getElementById("statsIncidentes").innerHTML = `
            <div class="stat-tile"><div class="stat-numero">${datos.incidentes.abiertos}</div><span class="stat-etiqueta">Activos</span></div>
            <div class="stat-tile"><div class="stat-numero">${datos.incidentes.enSeguimiento}</div><span class="stat-etiqueta">En seguimiento</span></div>
            <div class="stat-tile"><div class="stat-numero">${datos.incidentes.criticos}</div><span class="stat-etiqueta">Críticos</span></div>
            <div class="stat-tile"><div class="stat-numero">${datos.incidentes.tiempoPromedioResolucionMinutos ?? "—"}</div><span class="stat-etiqueta">Min. prom. resolución</span></div>
        `;

        document.getElementById("statsCarpas").innerHTML = `
            <div class="stat-tile"><div class="stat-numero">${datos.carpas.totalCarpas}</div><span class="stat-etiqueta">Total carpas</span></div>
            <div class="stat-tile"><div class="stat-numero">${datos.carpas.ocupacionTotal}</div><span class="stat-etiqueta">Ocupación</span></div>
            <div class="stat-tile"><div class="stat-numero">${datos.carpas.cuposDisponibles}</div><span class="stat-etiqueta">Cupos libres</span></div>
            <div class="stat-tile"><div class="stat-numero">${datos.carpas.lideresAsignados}</div><span class="stat-etiqueta">Líderes</span></div>
        `;

        renderizarAlertas(datos.alertas);

    } catch (error) {
        console.error(error);
    }

}

function renderizarAlertas(alertas) {

    const chips = [];

    if (alertas.criticos.length > 0) {
        chips.push(`<div class="alerta-chip critica" data-filtro-prioridad="critica"><span class="numero">${alertas.criticos.length}</span> incidentes críticos</div>`);
    }

    if (alertas.vencidos.length > 0) {
        chips.push(`<div class="alerta-chip critica" data-filtro-vencidos="true"><span class="numero">${alertas.vencidos.length}</span> seguimientos vencidos</div>`);
    }

    if (alertas.emergenciasMedicas.length > 0) {
        chips.push(`<div class="alerta-chip critica" data-filtro-categoria="emergencia_medica"><span class="numero">${alertas.emergenciasMedicas.length}</span> emergencias médicas</div>`);
    }

    if (alertas.sinResponsable.length > 0) {
        chips.push(`<div class="alerta-chip alta"><span class="numero">${alertas.sinResponsable.length}</span> incidentes sin responsable</div>`);
    }

    if (alertas.carpasSobreocupadas.length > 0) {
        chips.push(`<div class="alerta-chip alta"><span class="numero">${alertas.carpasSobreocupadas.length}</span> carpas sobreocupadas: ${alertas.carpasSobreocupadas.map((c) => c.nombre).join(", ")}</div>`);
    }

    if (alertas.participantesSinCarpa > 0) {
        chips.push(`<div class="alerta-chip info"><span class="numero">${alertas.participantesSinCarpa}</span> participantes sin carpa</div>`);
    }

    if (alertas.participantesSinIngreso > 0) {
        chips.push(`<div class="alerta-chip info"><span class="numero">${alertas.participantesSinIngreso}</span> participantes sin ingresar</div>`);
    }

    const contenedor = document.getElementById("alertasBarra");

    contenedor.innerHTML = chips.length > 0
        ? chips.join("")
        : `<div class="alerta-chip info">Sin alertas activas</div>`;

    contenedor.querySelectorAll(".alerta-chip").forEach((chip) => {

        chip.addEventListener("click", () => {

            if (chip.dataset.filtroPrioridad) document.getElementById("filtroPrioridad").value = chip.dataset.filtroPrioridad;
            if (chip.dataset.filtroCategoria) document.getElementById("filtroCategoria").value = chip.dataset.filtroCategoria;

            cargarIncidentes();
            document.querySelector(".layout-principal").scrollIntoView({ behavior: "smooth" });

        });

    });

}

// ==========================
// Filtros y tabla de incidentes
// ==========================

["filtroEstado", "filtroPrioridad", "filtroCategoria", "filtroZona", "filtroResponsable", "filtroFecha"]
    .forEach((id) => document.getElementById(id).addEventListener("change", () => cargarIncidentes()));

document.getElementById("btnLimpiarFiltros").addEventListener("click", () => {
    ["filtroEstado", "filtroPrioridad", "filtroCategoria", "filtroZona", "filtroResponsable", "filtroFecha"]
        .forEach((id) => { document.getElementById(id).value = ""; });
    cargarIncidentes();
});

function construirParametrosFiltro() {

    const parametros = new URLSearchParams();

    const estado = document.getElementById("filtroEstado").value;
    const prioridad = document.getElementById("filtroPrioridad").value;
    const categoria = document.getElementById("filtroCategoria").value;
    const zona = document.getElementById("filtroZona").value;
    const responsableId = document.getElementById("filtroResponsable").value;
    const fecha = document.getElementById("filtroFecha").value;

    if (estado) parametros.set("estado", estado);
    if (prioridad) parametros.set("prioridad", prioridad);
    if (categoria) parametros.set("categoria", categoria);
    if (zona) parametros.set("zona", zona);
    if (responsableId) parametros.set("responsableId", responsableId);
    if (fecha) parametros.set("fecha", fecha);

    return parametros;

}

async function cargarIncidentes() {

    try {

        const parametros = construirParametrosFiltro();
        const { incidentes } = await peticionApi(`/api/incidentes?${parametros.toString()}`);

        const cuerpo = document.getElementById("filasIncidentes");

        if (incidentes.length === 0) {
            cuerpo.innerHTML = `<tr><td colspan="9">No hay incidentes que coincidan con el filtro.</td></tr>`;
            return;
        }

        const ahora = Date.now();

        cuerpo.innerHTML = incidentes.map((incidente) => {

            const abierto = ["en_atencion", "pendiente_seguimiento", "escalado"].includes(incidente.estado);
            const vencido = abierto && incidente.proximo_seguimiento_en && new Date(incidente.proximo_seguimiento_en).getTime() <= ahora;

            return `
                <tr class="fila-${incidente.prioridad} ${vencido ? "fila-vencido" : ""}" data-id="${incidente.id}">
                    <td class="codigo-incidente">${incidente.codigo}</td>
                    <td>${formatearHora(incidente.creado_en)}</td>
                    <td>${incidente.lugar || humanizar(incidente.zona)}</td>
                    <td>${humanizar(incidente.categoria)}</td>
                    <td><span class="prioridad-badge ${incidente.prioridad}">${humanizar(incidente.prioridad)}</span></td>
                    <td><span class="estado-badge ${incidente.estado}">${humanizar(incidente.estado)}</span></td>
                    <td>${mapaOperadores[incidente.responsable_id] || "—"}</td>
                    <td>${minutosDesde(incidente.creado_en)} min</td>
                    <td>${abierto && incidente.proximo_seguimiento_en ? `${minutosHasta(incidente.proximo_seguimiento_en)} min` : "—"}</td>
                </tr>
            `;

        }).join("");

        cuerpo.querySelectorAll("tr[data-id]").forEach((fila) => {
            fila.addEventListener("click", () => abrirIncidente(fila.dataset.id));
        });

    } catch (error) {
        console.error(error);
    }

}

async function cargarColaSeguimiento() {

    try {

        const { incidentes } = await peticionApi("/api/incidentes/cola-seguimiento");
        const contenedor = document.getElementById("colaSeguimiento");

        if (incidentes.length === 0) {
            contenedor.innerHTML = `<p class="detalle">Sin casos pendientes de seguimiento.</p>`;
            return;
        }

        contenedor.innerHTML = incidentes.map((incidente) => {

            const restante = incidente.proximo_seguimiento_en ? minutosHasta(incidente.proximo_seguimiento_en) : null;
            const vencido = restante !== null && restante <= 0;

            return `
                <div class="fila-conteo" data-id="${incidente.id}" style="cursor:pointer;">
                    <span class="etiqueta">
                        <span class="prioridad-badge ${incidente.prioridad}">${humanizar(incidente.prioridad)}</span>
                        ${incidente.codigo}
                    </span>
                    <span class="valor" style="color:${vencido ? "var(--rojo)" : "inherit"};">
                        ${restante === null ? "—" : vencido ? `Vencido hace ${Math.abs(restante)} min` : `${restante} min`}
                    </span>
                </div>
            `;

        }).join("");

        contenedor.querySelectorAll("[data-id]").forEach((fila) => {
            fila.addEventListener("click", () => abrirIncidente(fila.dataset.id));
        });

    } catch (error) {
        console.error(error);
    }

}

async function cargarActividad() {

    try {

        const { actividad } = await peticionApi("/api/centro-control/actividad");
        const contenedor = document.getElementById("feedActividad");

        contenedor.innerHTML = actividad.length === 0
            ? `<p class="detalle">Sin actividad reciente.</p>`
            : actividad.map((item) => `
                <div class="feed-item">
                    <span class="hora">${formatearHora(item.creado_en)}</span>${item.descripcion}
                    <div class="usuario">Usuario: ${item.usuario_nombre || "—"}</div>
                </div>
            `).join("");

    } catch (error) {
        console.error(error);
    }

}

// ==========================
// Gráficos (Chart.js)
// ==========================

const graficos = {};

function crearOActualizarGrafico(idCanvas, tipo, labels, valores, color) {

    if (graficos[idCanvas]) {
        graficos[idCanvas].data.labels = labels;
        graficos[idCanvas].data.datasets[0].data = valores;
        graficos[idCanvas].update();
        return;
    }

    graficos[idCanvas] = new Chart(document.getElementById(idCanvas), {
        type: tipo,
        data: {
            labels,
            datasets: [{ data: valores, backgroundColor: color }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });

}

async function cargarGraficos() {

    try {

        const reportes = await peticionApi("/api/incidentes/reportes");

        crearOActualizarGrafico(
            "graficoCategoria", "bar",
            Object.keys(reportes.porCategoria).map(humanizar),
            Object.values(reportes.porCategoria),
            "#5B4B8A"
        );

        crearOActualizarGrafico(
            "graficoPrioridad", "bar",
            Object.keys(reportes.porPrioridad).map(humanizar),
            Object.values(reportes.porPrioridad),
            "#FF5D5D"
        );

        crearOActualizarGrafico(
            "graficoZona", "bar",
            Object.keys(reportes.porZona).map(humanizar),
            Object.values(reportes.porZona),
            "#1FB6A6"
        );

        const horas = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));

        crearOActualizarGrafico(
            "graficoHora", "bar",
            horas,
            horas.map((h) => reportes.porHora[h] || 0),
            "#FFC93C"
        );

    } catch (error) {
        console.error(error);
    }

}

// ==========================
// Registrar incidente
// ==========================

const btnAbrirFormIncidente = document.getElementById("btnAbrirFormIncidente");
const tarjetaFormIncidente = document.getElementById("tarjetaFormIncidente");
const formIncidente = document.getElementById("formIncidente");
const mensajeParticipanteIncidente = document.getElementById("mensajeParticipanteIncidente");
const mensajeIncidente = document.getElementById("mensajeIncidente");

let participanteVinculadoId = null;

btnAbrirFormIncidente.addEventListener("click", () => {
    tarjetaFormIncidente.classList.toggle("oculto");
    tarjetaFormIncidente.scrollIntoView({ behavior: "smooth" });
});

document.getElementById("inputCodigoParticipante").addEventListener("blur", async (evento) => {

    const codigo = evento.target.value.trim();
    participanteVinculadoId = null;
    ocultarMensaje(mensajeParticipanteIncidente);

    if (!codigo) return;

    try {

        const { resultados } = await peticionApi(`/api/centro-control/participantes/buscar?codigo=${encodeURIComponent(codigo)}`);

        if (resultados.length === 0) {
            mostrarMensaje(mensajeParticipanteIncidente, "No se encontró ningún participante con ese código", "fallo");
            return;
        }

        participanteVinculadoId = resultados[0].id;
        mostrarMensaje(mensajeParticipanteIncidente, `Vinculado a: ${resultados[0].nombre}`, "ok");

    } catch (error) {
        mostrarMensaje(mensajeParticipanteIncidente, error.message, "fallo");
    }

});

formIncidente.addEventListener("submit", async (evento) => {

    evento.preventDefault();
    ocultarMensaje(mensajeIncidente);

    try {

        await peticionApi("/api/incidentes", {
            method: "POST",
            body: JSON.stringify({
                categoria: document.getElementById("inputCategoria").value,
                descripcion: document.getElementById("inputDescripcion").value.trim(),
                prioridad: document.getElementById("inputPrioridad").value,
                zona: document.getElementById("inputZona").value,
                lugar: document.getElementById("inputLugar").value.trim(),
                reportadoPor: document.getElementById("inputReportadoPor").value.trim(),
                participanteId: participanteVinculadoId
            })
        });

        mostrarMensaje(mensajeIncidente, "Incidente registrado correctamente", "ok");
        formIncidente.reset();
        participanteVinculadoId = null;
        tarjetaFormIncidente.classList.add("oculto");

        await Promise.all([cargarIncidentes(), cargarColaSeguimiento(), cargarPanel(), cargarGraficos()]);

    } catch (error) {
        mostrarMensaje(mensajeIncidente, error.message, "fallo");
    }

});

// ==========================
// Búsqueda global
// ==========================

document.getElementById("btnEnfocarBusqueda").addEventListener("click", () => {
    document.getElementById("inputBusquedaGlobal").focus();
    document.getElementById("inputBusquedaGlobal").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("formBusquedaGlobal").addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const q = document.getElementById("inputBusquedaGlobal").value.trim();
    const contenedor = document.getElementById("resultadosGlobales");

    if (!q) return;

    try {

        const { participantes, incidentes } = await peticionApi(`/api/centro-control/buscar-global?q=${encodeURIComponent(q)}`);

        contenedor.classList.remove("oculto");

        if (participantes.length === 0 && incidentes.length === 0) {
            contenedor.innerHTML = `<p class="detalle">Sin resultados.</p>`;
            return;
        }

        contenedor.innerHTML = [
            ...participantes.map((p) => `
                <div class="resultado-item" data-tipo="participante" data-id="${p.id}">
                    <div><div class="nombre">${p.nombre}</div><div class="detalle">${p.documento} · Carpa: ${p.carpa_asignada || "sin asignar"}</div></div>
                    <span class="badge neutro">Participante</span>
                </div>
            `),
            ...incidentes.map((i) => `
                <div class="resultado-item" data-tipo="incidente" data-id="${i.id}">
                    <div><div class="nombre">${i.codigo}</div><div class="detalle">${i.descripcion}</div></div>
                    <span class="prioridad-badge ${i.prioridad}">${humanizar(i.prioridad)}</span>
                </div>
            `)
        ].join("");

        contenedor.querySelectorAll(".resultado-item").forEach((item) => {

            item.addEventListener("click", () => {

                if (item.dataset.tipo === "incidente") {
                    abrirIncidente(item.dataset.id);
                } else {
                    resaltarParticipante(item.dataset.id);
                }

            });

        });

    } catch (error) {
        contenedor.classList.remove("oculto");
        contenedor.innerHTML = `<p class="detalle">${error.message}</p>`;
    }

});

// ==========================
// Tabla de participantes
// ==========================

let ultimosParticipantes = [];

async function cargarParticipantes() {

    try {

        const { participantes } = await peticionApi("/api/centro-control/participantes/resumen");
        ultimosParticipantes = participantes;
        renderizarTablaParticipantes(participantes);

    } catch (error) {
        console.error(error);
    }

}

function renderizarTablaParticipantes(lista) {

    const cuerpo = document.getElementById("filasParticipantes");

    cuerpo.innerHTML = lista.map((p) => `
        <tr data-id="${p.id}">
            <td>${p.nombre}${p.retirado ? ' <span class="badge rojo">Retirado</span>' : ""}</td>
            <td>${p.municipio || "—"}</td>
            <td>${p.carpa_asignada || "—"}</td>
            <td>${p.es_lider_carpa ? "Sí" : "No"}</td>
            <td>${p.ingreso_registrado ? "🟢 Ingresó" : "🔴 Pendiente"}</td>
            <td>${p.entregas_alimentacion} entregas</td>
            <td>${p.incidentes_activos}</td>
            <td>${p.retirado ? "" : `<button class="boton pequeno" data-retirar="${p.id}">Marcar retirado</button>`}</td>
        </tr>
    `).join("");

    cuerpo.querySelectorAll("[data-retirar]").forEach((boton) => {
        boton.addEventListener("click", (evento) => {
            evento.stopPropagation();
            marcarRetirado(boton.dataset.retirar);
        });
    });

}

async function marcarRetirado(id) {

    if (!confirm("¿Confirmas que este participante se retira del evento?")) return;

    try {
        await peticionApi(`/api/centro-control/participantes/${id}/retirado`, { method: "POST" });
        await Promise.all([cargarParticipantes(), cargarPanel()]);
    } catch (error) {
        alert(error.message);
    }

}

function resaltarParticipante(id) {

    document.getElementById("resultadosGlobales").classList.add("oculto");

    const fila = document.querySelector(`#filasParticipantes tr[data-id="${id}"]`);

    document.querySelector('.tarjeta:has(#filasParticipantes)')?.scrollIntoView({ behavior: "smooth" });

    if (fila) {
        fila.style.outline = "3px solid var(--teal)";
        setTimeout(() => { fila.style.outline = "none"; }, 2500);
    }

}

// ==========================
// Panel de detalle del incidente
// ==========================

const panelDetalle = document.getElementById("panelDetalle");
const overlayDetalle = document.getElementById("overlayDetalle");

document.getElementById("btnCerrarDetalle").addEventListener("click", cerrarPanelDetalle);
overlayDetalle.addEventListener("click", cerrarPanelDetalle);

function cerrarPanelDetalle() {
    panelDetalle.classList.remove("abierto");
    overlayDetalle.classList.add("oculto");
    panelDetalleAbierto = false;
}

document.getElementById("btnImprimirIncidente").addEventListener("click", () => window.print());

async function abrirIncidente(id) {

    try {

        const { incidente, seguimientos } = await peticionApi(`/api/incidentes/${id}`);

        panelDetalle.classList.add("abierto");
        overlayDetalle.classList.remove("oculto");
        panelDetalleAbierto = true;

        document.getElementById("detalleIncidenteBadges").innerHTML = `
            <span class="prioridad-badge ${incidente.prioridad}">${humanizar(incidente.prioridad)}</span>
            <span class="estado-badge ${incidente.estado}">${humanizar(incidente.estado)}</span>
        `;

        document.getElementById("detalleIncidenteCodigo").textContent = incidente.codigo;
        document.getElementById("detalleIncidenteDescripcion").textContent = incidente.descripcion;

        document.getElementById("detalleIncidenteInfo").innerHTML = `
            <div class="dato"><span class="etiqueta">Categoría</span><span class="valor">${humanizar(incidente.categoria)}</span></div>
            <div class="dato"><span class="etiqueta">Zona</span><span class="valor">${humanizar(incidente.zona)}</span></div>
            <div class="dato"><span class="etiqueta">Lugar</span><span class="valor">${incidente.lugar || "—"}</span></div>
            <div class="dato"><span class="etiqueta">Reportado por</span><span class="valor">${incidente.reportado_por || "—"}</span></div>
            <div class="dato"><span class="etiqueta">Responsable</span><span class="valor">${mapaOperadores[incidente.responsable_id] || "—"}</span></div>
            <div class="dato"><span class="etiqueta">Registrado</span><span class="valor">${formatearHora(incidente.creado_en)}</span></div>
            <div class="dato"><span class="etiqueta">Cerrado</span><span class="valor">${formatearHora(incidente.cerrado_en)}</span></div>
        `;

        document.getElementById("bitacoraIncidente").innerHTML = seguimientos.map((s) => `
            <div class="bitacora-item">
                <span class="hora">${formatearHora(s.creado_en)}</span>
                <div>${humanizar(s.accion)}${s.observaciones ? `: ${s.observaciones}` : ""}</div>
                <div class="usuario">Usuario: ${s.usuario_nombre || "—"}</div>
            </div>
        `).join("");

        renderizarAccionesIncidente(incidente);
        ocultarMensaje(document.getElementById("mensajeDetalleIncidente"));

    } catch (error) {
        alert(error.message);
    }

}

function renderizarAccionesIncidente(incidente) {

    const contenedor = document.getElementById("accionesIncidente");
    const abierto = ["en_atencion", "pendiente_seguimiento", "escalado"].includes(incidente.estado);

    if (abierto) {
        contenedor.innerHTML = `
            <button class="boton pequeno terciario" data-resultado="pendiente">Registrar seguimiento</button>
            <button class="boton pequeno secundario" data-resultado="escalado">Escalar caso</button>
            <button class="boton pequeno" data-resultado="solucionado">Marcar solucionado</button>
        `;

        contenedor.querySelectorAll("button").forEach((boton) => {
            boton.addEventListener("click", () => registrarSeguimientoIncidente(incidente.id, boton.dataset.resultado));
        });

        return;
    }

    if (incidente.estado === "solucionado") {
        contenedor.innerHTML = `<button class="boton pequeno" id="btnCerrarIncidente">Cerrar caso</button>`;
        document.getElementById("btnCerrarIncidente").addEventListener("click", () => cerrarIncidente(incidente.id));
        return;
    }

    contenedor.innerHTML = `<button class="boton pequeno secundario" id="btnReabrirIncidente">Reabrir (solo administrador)</button>`;
    document.getElementById("btnReabrirIncidente").addEventListener("click", () => reabrirIncidente(incidente.id));

}

async function registrarSeguimientoIncidente(id, resultado) {

    const observaciones = document.getElementById("inputObservacionesSeguimiento").value.trim();
    const mensaje = document.getElementById("mensajeDetalleIncidente");

    try {

        await peticionApi(`/api/incidentes/${id}/seguimiento`, {
            method: "POST",
            body: JSON.stringify({ resultado, observaciones })
        });

        mostrarMensaje(mensaje, "Seguimiento registrado correctamente", "ok");
        document.getElementById("inputObservacionesSeguimiento").value = "";
        await abrirIncidente(id);
        await Promise.all([cargarIncidentes(), cargarColaSeguimiento(), cargarPanel(), cargarGraficos()]);

    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

}

async function cerrarIncidente(id) {

    const observaciones = document.getElementById("inputObservacionesSeguimiento").value.trim();
    const mensaje = document.getElementById("mensajeDetalleIncidente");

    try {

        await peticionApi(`/api/incidentes/${id}/cerrar`, {
            method: "POST",
            body: JSON.stringify({ observaciones })
        });

        mostrarMensaje(mensaje, "Incidente cerrado correctamente", "ok");
        await abrirIncidente(id);
        await Promise.all([cargarIncidentes(), cargarColaSeguimiento(), cargarPanel(), cargarGraficos()]);

    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

}

async function reabrirIncidente(id) {

    const observaciones = document.getElementById("inputObservacionesSeguimiento").value.trim();
    const mensaje = document.getElementById("mensajeDetalleIncidente");

    try {

        await peticionApi(`/api/incidentes/${id}/reabrir`, {
            method: "POST",
            body: JSON.stringify({ observaciones })
        });

        mostrarMensaje(mensaje, "Incidente reabierto correctamente", "ok");
        await abrirIncidente(id);
        await Promise.all([cargarIncidentes(), cargarColaSeguimiento(), cargarPanel(), cargarGraficos()]);

    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

}

// ==========================
// Exportaciones
// ==========================

document.getElementById("btnExportarExcel").addEventListener("click", () => {
    descargarArchivo("/api/incidentes/exportar/excel", "incidentes-campfest.xlsx");
});

document.getElementById("btnExportarPdf").addEventListener("click", () => {
    descargarArchivo("/api/incidentes/exportar/pdf", "incidentes-campfest.pdf");
});

// ==========================
// Configuración de capacidad de carpas (admin)
// ==========================

async function cargarCapacidadCarpas() {

    try {

        const { carpas } = await peticionApi("/api/centro-control/carpas");
        const contenedor = document.getElementById("listaCapacidadCarpas");

        contenedor.innerHTML = carpas.length === 0
            ? `<p class="detalle">Todavía no hay carpas configuradas.</p>`
            : carpas.map((c) => `
                <div class="fila-conteo">
                    <span class="etiqueta">${c.nombre}</span>
                    <span class="valor">Capacidad: ${c.capacidad}</span>
                </div>
            `).join("");

    } catch (error) {
        console.error(error);
    }

}

document.getElementById("formCapacidadCarpa").addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const mensaje = document.getElementById("mensajeCarpa");

    try {

        await peticionApi("/api/centro-control/carpas", {
            method: "POST",
            body: JSON.stringify({
                nombre: document.getElementById("inputNombreCarpa").value.trim(),
                capacidad: document.getElementById("inputCapacidadCarpa").value
            })
        });

        mostrarMensaje(mensaje, "Capacidad guardada correctamente", "ok");
        document.getElementById("formCapacidadCarpa").reset();
        await cargarCapacidadCarpas();
        await cargarPanel();

    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

});

// ==========================
// Arranque
// ==========================

verificarSesion();
