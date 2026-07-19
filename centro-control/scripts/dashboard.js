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

const ROLES = ["admin", "control", "logistica"];

const ESTADOS = [
    "en_atencion", "pendiente_seguimiento", "escalado", "solucionado", "cerrado"
];

const OBJETIVOS_MATERIAL = ["logistica", "entretenimiento", "auxilios", "decoracion", "emergencias", "utilidades"];

const MUNICIPIOS_VALLE = [
    "Alcalá", "Andalucía", "Ansermanuevo", "Argelia", "Bolívar", "Buenaventura",
    "Guadalajara de Buga", "Bugalagrande", "Caicedonia", "Cali", "Calima (El Darién)",
    "Candelaria", "Cartago", "Dagua", "El Águila", "El Cairo", "El Cerrito", "El Dovio",
    "Florida", "Ginebra", "Guacarí", "Jamundí", "La Cumbre", "La Unión", "La Victoria",
    "Obando", "Palmira", "Pradera", "Restrepo", "Riofrío", "Roldanillo", "San Pedro",
    "Sevilla", "Toro", "Trujillo", "Tuluá", "Ulloa", "Versalles", "Vijes", "Yotoco",
    "Yumbo", "Zarzal"
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

// Deshabilita el botón de enviar (y lo marca "Guardando...") mientras dura la
// petición, para dar feedback y evitar doble clic en formularios largos.
async function conBotonDeshabilitado(formulario, funcion) {
    const boton = formulario.querySelector('button[type="submit"]');
    const textoOriginal = boton ? boton.textContent : null;
    if (boton) { boton.disabled = true; boton.textContent = "Guardando..."; }
    try {
        await funcion();
    } finally {
        if (boton) { boton.disabled = false; boton.textContent = textoOriginal; }
    }
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

let zonasDisponibles = [];

async function cargarZonasSelects() {

    try {

        const { zonas } = await peticionApi("/api/centro-control/zonas");
        zonasDisponibles = zonas;

        const nombres = zonas.map((z) => z.nombre);

        llenarSelect(document.getElementById("inputZona"), nombres, "Selecciona zona");

        document.getElementById("filtroZona").innerHTML = `<option value="">Todas las zonas</option>` +
            nombres.map((n) => `<option value="${n}">${humanizar(n)}</option>`).join("");

    } catch (error) {
        console.error(error);
    }

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

async function subirArchivo(ruta, formData) {

    const { data: sesion } = await supabaseClient.auth.getSession();
    const token = sesion?.session?.access_token;

    const respuesta = await fetch(`${API_BASE}${ruta}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
    });

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
let ramasDisponibles = [];
let mapaRamas = {};

async function cargarResponsablesPorCategoria(categoria, contenedor) {

    if (!categoria) {
        contenedor.classList.add("oculto");
        contenedor.innerHTML = "";
        return;
    }

    try {

        const { responsables } = await peticionApi(`/api/centro-control/responsables?categoria=${encodeURIComponent(categoria)}`);

        contenedor.classList.remove("oculto");

        if (responsables.length === 0) {
            contenedor.innerHTML = `<p class="detalle">Ninguna rama tiene asignada esta categoría todavía.</p>`;
            return;
        }

        contenedor.innerHTML = responsables.map((r) => `
            <div class="fila-conteo">
                <span class="etiqueta">
                    ${r.rol_en_rama === "lider" ? "⭐" : "•"} ${r.nombre} · ${r.rama_nombre}
                </span>
                <span class="valor">${r.telefono || "sin teléfono"} · ${r.zona ? humanizar(r.zona) : "sin zona"}</span>
            </div>
        `).join("");

    } catch (error) {
        console.error(error);
    }

}

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

// ==========================
// Navegación entre pestañas
// ==========================

document.querySelectorAll(".tab-modulo").forEach((tab) => {

    tab.addEventListener("click", () => {

        document.querySelectorAll(".tab-modulo").forEach((t) => t.classList.remove("activo"));
        tab.classList.add("activo");

        const vista = tab.dataset.vista;

        document.getElementById("vistaPanel").classList.toggle("oculto", vista !== "panel");
        document.getElementById("vistaCronograma").classList.toggle("oculto", vista !== "cronograma");
        document.getElementById("vistaInventario").classList.toggle("oculto", vista !== "inventario");
        document.getElementById("vistaInscripciones").classList.toggle("oculto", vista !== "inscripciones");
        document.getElementById("vistaNotificaciones").classList.toggle("oculto", vista !== "notificaciones");
        document.getElementById("vistaAdministracion").classList.toggle("oculto", vista !== "administracion");

        if (vista === "cronograma") {
            cargarActividades();
            if (perfilActual?.rol === "admin") {
                cargarAnaliticaAdmin();
                cargarMaterialesParaNuevaActividad();
                poblarSelectLideres(document.getElementById("inputResponsableActividad"), "Sin materiales para esta actividad");
            } else {
                cargarResumenControl();
            }
        }

        if (vista === "inventario") {
            cargarInventario();
            if (perfilActual?.rol === "admin") {
                cargarLideresParaLote();
                cargarActividadesParaLote();
                cargarSolicitudesMaterialAdmin();
            }
        }

        if (vista === "notificaciones") {
            cargarAnunciosAdmin();
        }

        if (vista === "inscripciones") {
            mostrandoEliminadosInscripcion = false;
            document.getElementById("btnVerEliminadosInscripcion").textContent = "Ver eliminados";
            cargarInscripciones();
            cargarEstadisticasInscripciones();
        }

    });

});

async function iniciarDashboard() {

    pantallaLogin.classList.add("oculto");
    dashboard.classList.remove("oculto");

    const { usuario } = await peticionApi("/api/centro-control/perfil");
    perfilActual = usuario;
    usuarioActual.textContent = `${usuario.nombre} · ${humanizar(usuario.rol)}`;

    document.getElementById("tabAdministracion").classList.toggle("oculto", usuario.rol !== "admin");
    document.getElementById("tarjetaCronogramaAdmin").classList.toggle("oculto", usuario.rol !== "admin");
    document.getElementById("tarjetaAnaliticaAdmin").classList.toggle("oculto", usuario.rol !== "admin");
    document.getElementById("tarjetaResumenControl").classList.toggle("oculto", usuario.rol === "admin");

    document.getElementById("bloqueGestionInventarioAdmin").classList.toggle("oculto", usuario.rol !== "admin");
    document.getElementById("bloqueCrearLoteAdmin").classList.toggle("oculto", usuario.rol !== "admin");
    document.getElementById("bloqueSolicitudesMaterialAdmin").classList.toggle("oculto", usuario.rol !== "admin");
    document.getElementById("bloqueExportarInventarioAdmin").classList.toggle("oculto", usuario.rol !== "admin");

    document.getElementById("btnEnviarCorreoMasivo").classList.toggle("oculto", usuario.rol !== "admin");
    document.getElementById("bloqueCorreoPruebaLibre").classList.toggle("oculto", usuario.rol !== "admin");
    llenarSelect(document.getElementById("filtroMunicipioInscripcion"), MUNICIPIOS_VALLE, "Todos los municipios");

    llenarSelect(document.getElementById("filtroObjetivoMaterial"), OBJETIVOS_MATERIAL, "Todos los objetivos");
    document.getElementById("inputObjetivoMaterial").innerHTML = OBJETIVOS_MATERIAL
        .map((o) => `<option value="${o}">${humanizar(o)}</option>`).join("");

    llenarSelect(document.getElementById("inputCategoria"), CATEGORIAS, "Selecciona categoría");
    llenarSelect(document.getElementById("inputPrioridad"), PRIORIDADES, "Selecciona prioridad");
    await cargarZonasSelects();

    document.getElementById("filtroEstado").innerHTML += ESTADOS.map((e) => `<option value="${e}">${humanizar(e)}</option>`).join("");
    document.getElementById("filtroPrioridad").innerHTML += PRIORIDADES.map((p) => `<option value="${p}">${humanizar(p)}</option>`).join("");
    document.getElementById("filtroCategoria").innerHTML += CATEGORIAS.map((c) => `<option value="${c}">${humanizar(c)}</option>`).join("");

    const { operadores } = await peticionApi("/api/centro-control/operadores");
    mapaOperadores = Object.fromEntries(operadores.map((o) => [o.id, o.nombre]));
    document.getElementById("filtroResponsable").innerHTML += operadores.map((o) => `<option value="${o.id}">${o.nombre}</option>`).join("");

    const { ramas: todasLasRamas } = await peticionApi("/api/centro-control/ramas");
    mapaRamas = Object.fromEntries(todasLasRamas.map((r) => [r.id, r.nombre]));

    if (usuario.rol === "admin") {
        cargarCapacidadCarpas();
        cargarZonasAdmin();
        await cargarRamasAdmin();
        cargarUsuariosAdmin();
        llenarSelect(document.getElementById("inputRolNuevoUsuario"), ROLES, "Selecciona rol");
        document.getElementById("inputRamaNuevoUsuario").innerHTML = `<option value="">Sin rama</option>` +
            Object.entries(mapaRamas).map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join("");
    }

    await actualizarTodo();

    intervaloPolling = setInterval(actualizarTodo, POLLING_MS);

}

async function actualizarTodo() {

    await Promise.all([
        cargarPanel(),
        cargarActividad(),
        cargarGraficos(),
        cargarParticipantes(),
        cargarSolicitudesInternas(),
        panelDetalleAbierto ? Promise.resolve() : cargarIncidentes(),
        panelDetalleAbierto ? Promise.resolve() : cargarColaSeguimiento(),
        cargarEstadoEvento()
    ]);

}

async function cargarEstadoEvento() {

    try {

        const estado = await peticionApi("/api/estado-evento");
        const banner = document.getElementById("bannerAlertaExtrema");

        if (estado.alertaActiva) {
            document.getElementById("textoBannerAlertaExtrema").textContent = `🚨 ALERTA EXTREMA: ${estado.alertaMensaje}`;
            banner.classList.remove("oculto");
        } else {
            banner.classList.add("oculto");
        }

    } catch (error) {
        console.error(error);
    }

}

async function cargarSolicitudesInternas() {

    try {

        const { tareas } = await peticionApi("/api/tareas?tipo=solicitud");
        const contenedor = document.getElementById("listaSolicitudesInternas");

        contenedor.innerHTML = tareas.length === 0
            ? `<p class="detalle">Sin solicitudes internas registradas.</p>`
            : tareas.slice(0, 20).map((t) => `
                <div class="feed-item">
                    <span class="hora">${formatearHora(t.creado_en)}</span>
                    ${mapaRamas[t.rama_origen_id] || "—"} → ${t.rama_id ? (mapaRamas[t.rama_id] || "—") : "🆘 todas las ramas"} · ${t.titulo}
                    ${t.cantidad_personas ? ` (${t.checks_count || 0}/${t.cantidad_personas})` : ""}
                    <div class="usuario"><span class="estado-badge ${t.estado}">${humanizar(t.estado)}</span></div>
                </div>
            `).join("");

    } catch (error) {
        console.error(error);
    }

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
            <div class="stat-tile"><div class="stat-numero">${datos.participantes.ocupacionActual}</div><span class="stat-etiqueta">Actualmente en el camp</span></div>
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
        revisarIncidentesCriticosNuevos(datos.alertas.criticos);

    } catch (error) {
        console.error(error);
    }

}

// ==========================
// Alerta de incidentes críticos (sonido + banner)
// ==========================

const idsCriticosVistos = new Set();

function reproducirBeepCritico() {

    try {
        const contexto = new (window.AudioContext || window.webkitAudioContext)();
        const oscilador = contexto.createOscillator();
        const volumen = contexto.createGain();
        oscilador.type = "square";
        oscilador.frequency.value = 880;
        volumen.gain.value = 0.15;
        oscilador.connect(volumen);
        volumen.connect(contexto.destination);
        oscilador.start();
        setTimeout(() => { oscilador.stop(); contexto.close(); }, 400);
    } catch (error) {
        console.error(error);
    }

}

function revisarIncidentesCriticosNuevos(alertasCriticasYAltas) {

    const nuevos = alertasCriticasYAltas.filter((i) => i.prioridad === "critica" && !idsCriticosVistos.has(i.id));

    if (nuevos.length === 0) return;

    nuevos.forEach((i) => idsCriticosVistos.add(i.id));

    reproducirBeepCritico();

    const banner = document.getElementById("bannerCritico");
    document.getElementById("textoBannerCritico").textContent =
        `🚨 ${nuevos.length} incidente${nuevos.length > 1 ? "s" : ""} crítico${nuevos.length > 1 ? "s" : ""} nuevo${nuevos.length > 1 ? "s" : ""}: ${nuevos.map((i) => i.codigo).join(", ")}`;
    banner.classList.remove("oculto");

}

// ==========================
// Modo evento y alerta extrema (admin) — protegidos por una clave adicional
// a la del rol, conocida solo por quien administra el sistema.
// ==========================

document.getElementById("btnActivarModoEvento").addEventListener("click", async () => {

    const clave = prompt("Clave de administrador extremo:");
    if (!clave) return;

    if (!confirm("¿Confirmas activar el modo evento? El sitio público mostrará el portal de inicio de sesión del campista en vez de la página normal.")) return;

    const mensaje = document.getElementById("mensajeModoEvento");

    try {
        const resultado = await peticionApi("/api/centro-control/modo-evento/activar", { method: "POST", body: JSON.stringify({ clave }) });
        mostrarMensaje(mensaje, resultado.mensaje, "ok");
    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

});

document.getElementById("btnDesactivarModoEvento").addEventListener("click", async () => {

    const clave = prompt("Clave de administrador extremo:");
    if (!clave) return;

    const mensaje = document.getElementById("mensajeModoEvento");

    try {
        const resultado = await peticionApi("/api/centro-control/modo-evento/desactivar", { method: "POST", body: JSON.stringify({ clave }) });
        mostrarMensaje(mensaje, resultado.mensaje, "ok");
    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

});

document.getElementById("btnActivarAlertaExtrema").addEventListener("click", async () => {

    const clave = prompt("Clave de administrador extremo:");
    if (!clave) return;

    const textoAlerta = prompt("Mensaje de la alerta (lo verán logística, centro de control y los campistas):");
    if (!textoAlerta || !textoAlerta.trim()) return;

    const mensaje = document.getElementById("mensajeModoEvento");

    try {
        const resultado = await peticionApi("/api/centro-control/alerta-extrema/activar", { method: "POST", body: JSON.stringify({ clave, mensaje: textoAlerta }) });
        mostrarMensaje(mensaje, resultado.mensaje, "ok");
        await cargarEstadoEvento();
    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

});

document.getElementById("btnDesactivarAlertaExtrema").addEventListener("click", async () => {

    const clave = prompt("Clave de administrador extremo:");
    if (!clave) return;

    const mensaje = document.getElementById("mensajeModoEvento");

    try {
        const resultado = await peticionApi("/api/centro-control/alerta-extrema/desactivar", { method: "POST", body: JSON.stringify({ clave }) });
        mostrarMensaje(mensaje, resultado.mensaje, "ok");
        await cargarEstadoEvento();
    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

});

async function cargarAnunciosAdmin() {

    try {

        const { anuncios } = await peticionApi("/api/centro-control/anuncios-evento");
        const contenedor = document.getElementById("listaAnunciosAdmin");
        const esAdmin = perfilActual?.rol === "admin";

        contenedor.innerHTML = anuncios.length === 0
            ? `<p class="detalle">Sin avisos publicados.</p>`
            : anuncios.map((a) => `
                <div class="feed-item">
                    <span class="hora">${new Date(a.creado_en).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    ${a.mensaje}
                    ${esAdmin ? `<button class="boton pequeno secundario" data-eliminar-anuncio="${a.id}" style="width:auto; padding:4px 10px; font-size:11px; margin-left:8px;">Eliminar</button>` : ""}
                </div>
            `).join("");

        contenedor.querySelectorAll("[data-eliminar-anuncio]").forEach((boton) => {
            boton.addEventListener("click", () => eliminarAnuncio(boton.dataset.eliminarAnuncio));
        });

    } catch (error) {
        console.error(error);
    }

}

async function eliminarAnuncio(id) {

    if (!confirm("¿Eliminar este aviso? Ya no se mostrará en el portal del campista.")) return;

    const mensaje = document.getElementById("mensajeAnuncios");

    try {
        await peticionApi(`/api/centro-control/anuncios-evento/${id}`, { method: "DELETE" });
        mostrarMensaje(mensaje, "Aviso eliminado", "ok");
        await cargarAnunciosAdmin();
    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

}

document.getElementById("formNuevoAnuncio").addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const input = document.getElementById("inputNuevoAnuncio");
    const mensaje = document.getElementById("mensajeAnuncios");

    if (!input.value.trim()) return;

    try {
        await peticionApi("/api/centro-control/anuncios-evento", { method: "POST", body: JSON.stringify({ mensaje: input.value.trim() }) });
        input.value = "";
        mostrarMensaje(mensaje, "Aviso publicado", "ok");
        await cargarAnunciosAdmin();
    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

});

document.getElementById("btnCerrarBannerCritico").addEventListener("click", () => {
    document.getElementById("bannerCritico").classList.add("oculto");
});

document.getElementById("btnAyudaRoles").addEventListener("click", () => {
    document.getElementById("panelAyudaRoles").classList.toggle("oculto");
});

document.getElementById("btnCerrarAyudaRoles").addEventListener("click", () => {
    document.getElementById("panelAyudaRoles").classList.add("oculto");
});

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

const PALETA_PASTEL = ["#5B4B8A", "#1FB6A6", "#FF5D5D", "#FFC93C", "#1FB65D", "#E23D3D", "#1A1A2E"];

function crearOActualizarGraficoPastel(idCanvas, labels, valores) {

    if (graficos[idCanvas]) {
        graficos[idCanvas].data.labels = labels;
        graficos[idCanvas].data.datasets[0].data = valores;
        graficos[idCanvas].update();
        return;
    }

    graficos[idCanvas] = new Chart(document.getElementById(idCanvas), {
        type: "pie",
        data: {
            labels,
            datasets: [{ data: valores, backgroundColor: labels.map((_, i) => PALETA_PASTEL[i % PALETA_PASTEL.length]) }]
        },
        options: {
            plugins: { legend: { display: true, position: "bottom", labels: { font: { size: 10 } } } }
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

document.getElementById("inputCategoria").addEventListener("change", (evento) => {
    cargarResponsablesPorCategoria(evento.target.value, document.getElementById("responsablesCategoria"));
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
            <td>${p.nombre}${p.retirado ? ' <span class="badge rojo">Retirado</span>' : ""}${p.salidaLibreActiva ? ` <span class="badge neutro">🚶 Salida libre (${p.salidaLibreActiva.motivo})</span>` : ""}</td>
            <td>${p.municipio || "—"}</td>
            <td>${p.carpa_asignada || "—"}</td>
            <td>${p.es_lider_carpa ? "Sí" : "No"}</td>
            <td>${p.ingreso_registrado ? "🟢 Ingresó" : "🔴 Pendiente"}</td>
            <td>${p.entregas_alimentacion} entregas</td>
            <td>${p.incidentes_activos}</td>
            <td>
                ${p.retirado ? "" : `<button class="boton pequeno" data-retirar="${p.id}">Marcar retirado</button>`}
                ${p.salidaLibreActiva ? `<button class="boton pequeno secundario" data-regreso-salida="${p.id}" style="margin-top:4px;">Registrar regreso</button>` : ""}
            </td>
        </tr>
    `).join("");

    cuerpo.querySelectorAll("[data-retirar]").forEach((boton) => {
        boton.addEventListener("click", (evento) => {
            evento.stopPropagation();
            marcarRetirado(boton.dataset.retirar);
        });
    });

    cuerpo.querySelectorAll("[data-regreso-salida]").forEach((boton) => {
        boton.addEventListener("click", (evento) => {
            evento.stopPropagation();
            registrarRegresoSalidaLibre(boton.dataset.regresoSalida);
        });
    });

}

async function registrarRegresoSalidaLibre(id) {

    if (!confirm("¿Confirmas registrar el regreso de este participante de su salida libre?")) return;

    try {
        await peticionApi(`/api/centro-control/participantes/${id}/salida-libre/regreso`, { method: "POST" });
        await cargarParticipantes();
    } catch (error) {
        alert(error.message);
    }

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
        cargarResponsablesPorCategoria(incidente.categoria, document.getElementById("detalleResponsablesCategoria"));
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
                    <span class="valor">
                        Capacidad: ${c.capacidad}
                        <button class="boton pequeno secundario" data-eliminar-carpa="${c.nombre}" style="margin-left:8px;">Eliminar</button>
                    </span>
                </div>
            `).join("");

        contenedor.querySelectorAll("[data-eliminar-carpa]").forEach((boton) => {
            boton.addEventListener("click", () => eliminarCarpa(boton.dataset.eliminarCarpa));
        });

    } catch (error) {
        console.error(error);
    }

}

async function eliminarCarpa(nombre) {

    if (!confirm(`¿Eliminar la carpa "${nombre}"?`)) return;

    try {
        await peticionApi(`/api/centro-control/carpas/${encodeURIComponent(nombre)}`, { method: "DELETE" });
        await cargarCapacidadCarpas();
        await cargarPanel();
    } catch (error) {
        alert(error.message);
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
// Importar participantes (admin)
// ==========================

document.getElementById("formImportarParticipantes").addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const mensaje = document.getElementById("mensajeImportarParticipantes");
    const input = document.getElementById("inputArchivoParticipantes");
    const boton = document.getElementById("btnImportarParticipantes");

    if (!input.files[0]) return;

    const formData = new FormData();
    formData.append("archivo", input.files[0]);

    boton.disabled = true;
    ocultarMensaje(mensaje);

    try {

        const resultado = await subirArchivo("/api/centro-control/participantes/importar", formData);

        const detalleErrores = resultado.errores.length > 0
            ? ` · ${resultado.errores.length} con error (fila ${resultado.errores.map((e) => e.fila).join(", ")})`
            : "";

        mostrarMensaje(
            mensaje,
            `${resultado.insertados} nuevos importados · ${resultado.omitidos} ya existían${detalleErrores}`,
            "ok"
        );

        document.getElementById("formImportarParticipantes").reset();
        await Promise.all([cargarPanel(), cargarParticipantes()]);

    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    } finally {
        boton.disabled = false;
    }

});

// ==========================
// Completar datos faltantes desde Excel (admin) — no inserta, solo rellena
// huecos de participantes que ya existen.
// ==========================

document.getElementById("formCompletarDatosParticipantes").addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const mensaje = document.getElementById("mensajeCompletarDatosParticipantes");
    const input = document.getElementById("inputArchivoCompletarDatos");
    const boton = document.getElementById("btnCompletarDatosParticipantes");

    if (!input.files[0]) return;

    const formData = new FormData();
    formData.append("archivo", input.files[0]);

    boton.disabled = true;
    ocultarMensaje(mensaje);

    try {

        const resultado = await subirArchivo("/api/centro-control/participantes/completar-datos", formData);

        mostrarMensaje(
            mensaje,
            `${resultado.actualizados} actualizados · ${resultado.sinCambios} sin cambios · ${resultado.noEncontrados} no encontrados`,
            "ok"
        );

        document.getElementById("formCompletarDatosParticipantes").reset();
        await Promise.all([cargarInscripciones(), cargarEstadisticasInscripciones()]);

    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    } finally {
        boton.disabled = false;
    }

});

// ==========================
// Zonas (admin)
// ==========================

async function cargarZonasAdmin() {

    try {

        const { zonas } = await peticionApi("/api/centro-control/zonas");
        const contenedor = document.getElementById("listaZonas");

        contenedor.innerHTML = zonas.length === 0
            ? `<p class="detalle">Todavía no hay zonas configuradas.</p>`
            : zonas.map((z) => `
                <div class="fila-conteo">
                    <span class="etiqueta">${humanizar(z.nombre)}</span>
                    <span class="valor">
                        <button class="boton pequeno secundario" data-eliminar-zona="${z.nombre}">Eliminar</button>
                    </span>
                </div>
            `).join("");

        contenedor.querySelectorAll("[data-eliminar-zona]").forEach((boton) => {
            boton.addEventListener("click", () => eliminarZona(boton.dataset.eliminarZona));
        });

    } catch (error) {
        console.error(error);
    }

}

async function eliminarZona(nombre) {

    if (!confirm(`¿Eliminar la zona "${humanizar(nombre)}"?`)) return;

    try {
        await peticionApi(`/api/centro-control/zonas/${encodeURIComponent(nombre)}`, { method: "DELETE" });
        await cargarZonasAdmin();
        await cargarZonasSelects();
    } catch (error) {
        alert(error.message);
    }

}

document.getElementById("formZona").addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const mensaje = document.getElementById("mensajeZona");
    const input = document.getElementById("inputNombreZona");

    try {

        await peticionApi("/api/centro-control/zonas", {
            method: "POST",
            body: JSON.stringify({ nombre: input.value.trim().toLowerCase().replace(/\s+/g, "_") })
        });

        mostrarMensaje(mensaje, "Zona agregada correctamente", "ok");
        input.value = "";
        await cargarZonasAdmin();
        await cargarZonasSelects();

    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

});

// ==========================
// Ramas de logística (admin)
// ==========================

function renderizarCheckboxesCategorias(contenedor, seleccionadas, prefijo) {

    contenedor.innerHTML = CATEGORIAS.map((c) => `
        <label style="display:flex; align-items:center; gap:5px; font-size:12.5px; font-weight:600;">
            <input type="checkbox" name="${prefijo}" value="${c}" ${seleccionadas.includes(c) ? "checked" : ""}>
            ${humanizar(c)}
        </label>
    `).join("");

}

renderizarCheckboxesCategorias(document.getElementById("categoriasRama"), [], "categoriaNueva");

document.getElementById("formRama").addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const mensaje = document.getElementById("mensajeRama");
    const nombre = document.getElementById("inputNombreRama").value.trim();

    const categorias = [...document.querySelectorAll('#categoriasRama input[type="checkbox"]:checked')]
        .map((c) => c.value);

    try {

        await peticionApi("/api/centro-control/ramas", {
            method: "POST",
            body: JSON.stringify({ nombre, categorias })
        });

        mostrarMensaje(mensaje, "Rama guardada correctamente", "ok");
        document.getElementById("formRama").reset();
        renderizarCheckboxesCategorias(document.getElementById("categoriasRama"), [], "categoriaNueva");
        await cargarRamasAdmin();
        await cargarUsuariosAdmin();

    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

});

async function cargarRamasAdmin() {

    try {

        const { ramas } = await peticionApi("/api/centro-control/ramas");
        ramasDisponibles = ramas;

        const contenedor = document.getElementById("listaRamas");

        contenedor.innerHTML = ramas.length === 0
            ? `<p class="detalle">Todavía no hay ramas configuradas.</p>`
            : ramas.map((r) => `
                <div class="tarjeta" style="margin-bottom:10px; box-shadow:none; border-width:2px;" data-rama="${r.id}">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <strong>${r.nombre}</strong>
                        <div>
                            <button class="boton pequeno" data-guardar-rama="${r.id}">Guardar</button>
                            <button class="boton pequeno secundario" data-eliminar-rama="${r.id}">Eliminar</button>
                        </div>
                    </div>
                    <div class="categorias-rama" style="display:flex; flex-wrap:wrap; gap:10px;"></div>
                </div>
            `).join("");

        ramas.forEach((r) => {
            const contenedorCategorias = contenedor.querySelector(`[data-rama="${r.id}"] .categorias-rama`);
            renderizarCheckboxesCategorias(contenedorCategorias, r.categorias || [], `categoria-${r.id}`);
        });

        contenedor.querySelectorAll("[data-guardar-rama]").forEach((boton) => {

            boton.addEventListener("click", async () => {

                const id = boton.dataset.guardarRama;
                const categorias = [...contenedor.querySelectorAll(`[data-rama="${id}"] input[type="checkbox"]:checked`)]
                    .map((c) => c.value);
                const nombre = contenedor.querySelector(`[data-rama="${id}"] strong`).textContent;

                try {
                    await peticionApi(`/api/centro-control/ramas/${id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ nombre, categorias })
                    });
                    await cargarUsuariosAdmin();
                } catch (error) {
                    alert(error.message);
                }

            });

        });

        contenedor.querySelectorAll("[data-eliminar-rama]").forEach((boton) => {

            boton.addEventListener("click", async () => {

                if (!confirm("¿Eliminar esta rama? Los usuarios asignados quedarán sin rama.")) return;

                try {
                    await peticionApi(`/api/centro-control/ramas/${boton.dataset.eliminarRama}`, { method: "DELETE" });
                    await cargarRamasAdmin();
                    await cargarUsuariosAdmin();
                } catch (error) {
                    alert(error.message);
                }

            });

        });

    } catch (error) {
        console.error(error);
    }

}

// ==========================
// Usuarios (admin)
// ==========================

document.getElementById("formNuevoUsuario").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    const mensaje = document.getElementById("mensajeNuevoUsuario");

    await conBotonDeshabilitado(evento.target, async () => {

        try {

            await peticionApi("/api/centro-control/usuarios", {
                method: "POST",
                body: JSON.stringify({
                    nombre: document.getElementById("inputNombreNuevoUsuario").value.trim(),
                    email: document.getElementById("inputEmailNuevoUsuario").value.trim(),
                    password: document.getElementById("inputPasswordNuevoUsuario").value,
                    rol: document.getElementById("inputRolNuevoUsuario").value,
                    telefono: document.getElementById("inputTelefonoNuevoUsuario").value.trim(),
                    ramaId: document.getElementById("inputRamaNuevoUsuario").value || null,
                    rolEnRama: document.getElementById("inputRolEnRamaNuevoUsuario").value
                })
            });

            mostrarMensaje(mensaje, "Usuario creado correctamente — comunícale la contraseña por fuera del sistema", "ok");
            document.getElementById("formNuevoUsuario").reset();
            await cargarUsuariosAdmin();

        } catch (error) {
            mostrarMensaje(mensaje, error.message, "fallo");
        }

    });

});

async function cargarUsuariosAdmin() {

    try {

        const { usuarios } = await peticionApi("/api/centro-control/usuarios");
        const cuerpo = document.getElementById("filasUsuarios");

        const estiloCampo = "padding:6px 8px; border:2px solid #ddd; border-radius:8px; font-family:inherit; width:100%;";

        cuerpo.innerHTML = usuarios.map((u) => `
            <tr data-id="${u.id}">
                <td><input type="text" class="input-nombre-usuario" value="${u.nombre}" style="${estiloCampo}"></td>
                <td>${u.email || "—"}</td>
                <td>
                    <select class="select-rol-usuario" style="${estiloCampo}">
                        ${ROLES.map((r) => `<option value="${r}" ${r === u.rol ? "selected" : ""}>${humanizar(r)}</option>`).join("")}
                    </select>
                </td>
                <td><input type="text" class="input-telefono-usuario" value="${u.telefono || ""}" placeholder="300..." style="${estiloCampo}"></td>
                <td>
                    <select class="select-rama-usuario" style="${estiloCampo}">
                        <option value="">Sin rama</option>
                        ${ramasDisponibles.map((r) => `<option value="${r.id}" ${r.id === u.rama_id ? "selected" : ""}>${r.nombre}</option>`).join("")}
                    </select>
                </td>
                <td>
                    <select class="select-rol-rama-usuario" style="${estiloCampo}">
                        <option value="miembro" ${u.rol_en_rama === "miembro" ? "selected" : ""}>Miembro</option>
                        <option value="lider" ${u.rol_en_rama === "lider" ? "selected" : ""}>Líder</option>
                    </select>
                </td>
                <td>
                    <select class="select-zona-usuario" style="${estiloCampo}">
                        <option value="">Sin zona</option>
                        ${zonasDisponibles.map((z) => `<option value="${z.nombre}" ${z.nombre === u.zona ? "selected" : ""}>${humanizar(z.nombre)}</option>`).join("")}
                    </select>
                </td>
                <td><button class="boton pequeno" data-guardar-usuario="${u.id}">Guardar</button></td>
            </tr>
        `).join("");

        cuerpo.querySelectorAll("[data-guardar-usuario]").forEach((boton) => {

            boton.addEventListener("click", () => {

                const fila = boton.closest("tr");

                guardarUsuario(boton.dataset.guardarUsuario, {
                    nombre: fila.querySelector(".input-nombre-usuario").value.trim(),
                    rol: fila.querySelector(".select-rol-usuario").value,
                    telefono: fila.querySelector(".input-telefono-usuario").value.trim(),
                    ramaId: fila.querySelector(".select-rama-usuario").value,
                    rolEnRama: fila.querySelector(".select-rol-rama-usuario").value,
                    zona: fila.querySelector(".select-zona-usuario").value
                });

            });

        });

    } catch (error) {
        console.error(error);
    }

}

async function guardarUsuario(id, datos) {

    const mensaje = document.getElementById("mensajeUsuarios");

    try {

        await peticionApi(`/api/centro-control/usuarios/${id}`, {
            method: "PATCH",
            body: JSON.stringify(datos)
        });

        mostrarMensaje(mensaje, "Usuario actualizado correctamente", "ok");

        if (id === perfilActual?.id) {
            perfilActual.nombre = datos.nombre;
            perfilActual.rol = datos.rol;
            usuarioActual.textContent = `${datos.nombre} · ${humanizar(datos.rol)}`;
        }

    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

}

// ==========================
// Cronograma (actividades)
// ==========================

function formatearFechaHora(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleString("es-CO", {
        day: "2-digit", month: "2-digit", hour: "numeric", minute: "2-digit"
    });
}

async function cargarActividades() {

    try {

        const { actividades } = await peticionApi("/api/actividades");
        const contenedor = document.getElementById("listaActividades");

        contenedor.innerHTML = actividades.length === 0
            ? `<p class="detalle">Todavía no hay actividades programadas.</p>`
            : actividades.map((a) => `
                <div class="incidente-item ${a.cancelada ? "fila-vencido" : ""}" data-actividad="${a.id}">
                    <div class="fila-superior">
                        <span class="codigo-incidente">${a.titulo}</span>
                        <span>
                            ${a.cancelada ? `<span class="badge rojo">Cancelada</span>` : ""}
                            <span class="badge ${a.montaje_completado ? "verde" : "neutro"}">${a.montaje_completado ? "Montaje listo" : "Montaje pendiente"}</span>
                            <span class="badge ${a.finalizada ? "verde" : "neutro"}">${a.finalizada ? "Finalizada" : "Sin finalizar"}</span>
                        </span>
                    </div>
                    <div class="descripcion">${formatearFechaHora(a.hora_inicio)} — ${formatearFechaHora(a.hora_fin)} ${a.espacio_usado ? `· ${a.espacio_usado}` : ""}</div>
                </div>
            `).join("");

        contenedor.querySelectorAll("[data-actividad]").forEach((card) => {
            card.addEventListener("click", () => abrirDetalleActividad(card.dataset.actividad));
        });

    } catch (error) {
        console.error(error);
    }

}

async function cargarMaterialesParaNuevaActividad() {

    try {
        const { materiales } = await peticionApi("/api/materiales");
        renderizarChecklistMaterialesNuevaActividad(materiales);
    } catch (error) {
        console.error(error);
    }

}

function renderizarChecklistMaterialesNuevaActividad(materiales) {

    const contenedor = document.getElementById("checklistMaterialesNuevaActividad");

    contenedor.innerHTML = materiales.length === 0
        ? `<p class="detalle">No hay materiales en el inventario todavía (se pueden crear en la pestaña Inventario).</p>`
        : materiales.map((m) => `
            <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
                <input type="checkbox" class="checkbox-material-nueva-actividad" value="${m.id}">
                <span style="flex:1; font-size:13px;">${m.nombre} <span style="color:#888; font-size:11.5px;">(disponible: ${m.disponible})</span></span>
                <input type="number" class="cantidad-material-nueva-actividad" min="1" max="${m.disponible}" placeholder="Cant." style="width:70px; padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
            </div>
        `).join("");

}

document.getElementById("formActividad").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    const mensaje = document.getElementById("mensajeActividad");

    const fecha = document.getElementById("inputFechaActividad").value;
    const horaInicio = document.getElementById("inputHoraInicioActividad").value;
    const horaFin = document.getElementById("inputHoraFinActividad").value;

    const items = [];
    document.querySelectorAll(".checkbox-material-nueva-actividad:checked").forEach((checkbox) => {
        const fila = checkbox.closest("div");
        const cantidad = fila.querySelector(".cantidad-material-nueva-actividad").value;
        if (cantidad && Number(cantidad) > 0) {
            items.push({ materialId: checkbox.value, cantidad: Number(cantidad) });
        }
    });

    const liderId = document.getElementById("inputResponsableActividad").value;

    if (items.length > 0 && !liderId) {
        mostrarMensaje(mensaje, "Elige el responsable que recibe los materiales marcados", "fallo");
        return;
    }

    await conBotonDeshabilitado(evento.target, async () => {

        try {

            const { actividad } = await peticionApi("/api/actividades", {
                method: "POST",
                body: JSON.stringify({
                    titulo: document.getElementById("inputTituloActividad").value.trim(),
                    descripcion: document.getElementById("inputDescripcionActividad").value.trim(),
                    fecha,
                    horaInicio: new Date(`${fecha}T${horaInicio}`).toISOString(),
                    horaFin: new Date(`${fecha}T${horaFin}`).toISOString(),
                    espacioUsado: document.getElementById("inputEspacioActividad").value.trim(),
                    cantidadAsistentesEstimada: document.getElementById("inputAsistentesActividad").value || null,
                    encargadosMetodologicos: document.getElementById("inputEncargadosMetodologicosActividad").value.trim()
                })
            });

            if (items.length > 0) {
                await peticionApi("/api/materiales/lotes", {
                    method: "POST",
                    body: JSON.stringify({ liderId, actividadId: actividad.id, items })
                });
            }

            mostrarMensaje(mensaje, "Actividad creada correctamente" + (items.length > 0 ? " y materiales asignados" : ""), "ok");
            document.getElementById("formActividad").reset();
            await Promise.all([cargarActividades(), cargarMaterialesParaNuevaActividad()]);

        } catch (error) {
            mostrarMensaje(mensaje, error.message, "fallo");
        }

    });

});

let actividadAbiertaId = null;

async function abrirDetalleActividad(id) {

    try {

        const { actividad, tareas } = await peticionApi(`/api/actividades/${id}`);
        actividadAbiertaId = id;

        const contenedor = document.getElementById("tarjetaDetalleActividad");
        contenedor.classList.remove("oculto");
        contenedor.scrollIntoView({ behavior: "smooth" });

        document.getElementById("detalleActividadTitulo").textContent = actividad.titulo;

        document.getElementById("detalleActividadInfo").innerHTML = `
            <div class="dato"><span class="etiqueta">Fecha</span><span class="valor">${actividad.fecha}</span></div>
            <div class="dato"><span class="etiqueta">Horario</span><span class="valor">${formatearFechaHora(actividad.hora_inicio)} — ${formatearFechaHora(actividad.hora_fin)}</span></div>
            <div class="dato"><span class="etiqueta">Espacio</span><span class="valor">${actividad.espacio_usado || "—"}</span></div>
            <div class="dato"><span class="etiqueta">Asistentes estimados</span><span class="valor">${actividad.cantidad_asistentes_estimada ?? "—"}</span></div>
            <div class="dato"><span class="etiqueta">Encargados metodológicos</span><span class="valor">${actividad.encargados_metodologicos || "—"}</span></div>
            ${actividad.materiales_usados ? `<div class="dato"><span class="etiqueta">Materiales (nota antigua)</span><span class="valor">${actividad.materiales_usados}</span></div>` : ""}
        `;

        renderizarFasesActividad(actividad);

        document.getElementById("btnCancelarActividad").classList.toggle(
            "oculto",
            perfilActual?.rol !== "admin" || actividad.cancelada
        );

        document.getElementById("bloqueCrearTareaActividad").classList.toggle("oculto", perfilActual?.rol !== "admin" || actividad.cancelada);

        if (perfilActual?.rol === "admin") {
            document.getElementById("ramasTareaActividad").innerHTML = ramasDisponibles.map((r) => `
                <label style="display:flex; align-items:center; gap:5px; font-size:12.5px; font-weight:600;">
                    <input type="checkbox" name="ramaNuevaTarea" value="${r.id}">
                    ${r.nombre}
                </label>
            `).join("");
        }

        renderizarTareasPorRama(tareas);

        document.getElementById("bloqueAsignarMaterialActividad").classList.toggle("oculto", perfilActual?.rol !== "admin" || actividad.cancelada);

        if (perfilActual?.rol === "admin") {
            await poblarSelectLideres(document.getElementById("inputLiderMaterialActividad"));
        }

        cargarMaterialesDeActividad(id);

        try {
            const { resumen } = await peticionApi(`/api/actividades/${id}/resumen`);
            const contenedorResumen = document.getElementById("detalleActividadResumen");

            contenedorResumen.innerHTML = resumen.length === 0
                ? `<p class="detalle">Sin tareas registradas todavía.</p>`
                : resumen.map((r) => `
                    <div class="fila-conteo" style="margin-top:4px;">
                        <span class="etiqueta">${r.rama}</span>
                        <span class="valor">✅ ${r.aTiempo} a tiempo · ⏰ ${r.tarde} tarde · ⬜ ${r.pendientes} pendientes</span>
                    </div>
                `).join("");
        } catch (error) {
            console.error(error);
        }

    } catch (error) {
        alert(error.message);
    }

}

function renderizarFasesActividad(actividad) {

    const contenedor = document.getElementById("detalleActividadFases");

    const puedeGestionar = perfilActual?.rol === "admin" && !actividad.cancelada;

    contenedor.innerHTML = `
        <h3>Cierre de la actividad</h3>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <span class="badge ${actividad.montaje_completado ? "verde" : "neutro"}">
                ${actividad.montaje_completado ? "Montaje listo" : "Montaje pendiente"}
            </span>
            <span class="badge ${actividad.finalizada ? "verde" : "neutro"}">
                ${actividad.finalizada ? "Actividad finalizada" : "Actividad no finalizada"}
            </span>
            ${puedeGestionar && !actividad.montaje_completado ? `<button class="boton pequeno secundario" id="btnMarcarMontaje" style="width:auto;">Marcar montaje listo</button>` : ""}
            ${puedeGestionar && actividad.montaje_completado && !actividad.finalizada ? `<button class="boton pequeno" id="btnMarcarFinalizada" style="width:auto;">Marcar actividad terminada</button>` : ""}
        </div>
        <div class="mensaje" id="mensajeFasesActividad"></div>
    `;

    const btnMontaje = document.getElementById("btnMarcarMontaje");
    if (btnMontaje) {
        btnMontaje.addEventListener("click", () => marcarFaseActividad(actividad.id, "montaje"));
    }

    const btnFinalizada = document.getElementById("btnMarcarFinalizada");
    if (btnFinalizada) {
        btnFinalizada.addEventListener("click", () => marcarFaseActividad(actividad.id, "finalizar"));
    }

}

async function marcarFaseActividad(actividadId, fase) {

    const mensaje = document.getElementById("mensajeFasesActividad");

    try {
        await peticionApi(`/api/actividades/${actividadId}/${fase}`, { method: "POST" });
        await abrirDetalleActividad(actividadId);
        await cargarActividades();
    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

}

document.getElementById("btnCerrarDetalleActividad").addEventListener("click", () => {
    document.getElementById("tarjetaDetalleActividad").classList.add("oculto");
    actividadAbiertaId = null;
});

document.getElementById("btnCancelarActividad").addEventListener("click", async () => {

    if (!confirm("¿Cancelar esta actividad? Los materiales ya asignados para ella se liberarán automáticamente.")) return;

    try {
        await peticionApi(`/api/actividades/${actividadAbiertaId}/cancelar`, { method: "POST" });
        await abrirDetalleActividad(actividadAbiertaId);
        await cargarActividades();
    } catch (error) {
        alert(error.message);
    }

});

function renderizarTareasPorRama(tareas) {

    const contenedor = document.getElementById("listaTareasActividad");

    if (tareas.length === 0) {
        contenedor.innerHTML = `<p class="detalle">Todavía no se han asignado tareas a ninguna rama.</p>`;
        return;
    }

    contenedor.innerHTML = tareas.map((t) => {

        const nombresRamas = (t.ramas && t.ramas.length > 0 ? t.ramas : [t.rama_id])
            .map((idRama) => mapaRamas[idRama] || "Sin rama").join(", ");

        return `
            <div class="fila-conteo" data-tarea-actividad="${t.id}" style="margin-top:6px; cursor:pointer; flex-direction:column; align-items:stretch; gap:4px;">
                <div style="display:flex; justify-content:space-between; width:100%; gap:8px;">
                    <span class="etiqueta">${t.titulo}</span>
                    <span class="estado-badge ${t.estado}">${humanizar(t.estado)}</span>
                </div>
                <div class="detalle">
                    Ramas: ${nombresRamas}${t.hora_programada ? ` · Listo a las ${formatearFechaHora(t.hora_programada)}` : ""}
                </div>
                <div class="oculto" id="detalleTareaActividad-${t.id}"></div>
            </div>
        `;

    }).join("");

    contenedor.querySelectorAll("[data-tarea-actividad]").forEach((fila) => {
        fila.addEventListener("click", (evento) => {
            // Mismo motivo que en el panel de logística: el detalle expandido
            // vive dentro de esta misma fila, así que cualquier clic ahí
            // adentro no debe volver a colapsarlo.
            if (evento.target.closest('[id^="detalleTareaActividad-"]')) return;
            abrirDetalleTareaEnActividad(fila.dataset.tareaActividad);
        });
    });

}

async function abrirDetalleTareaEnActividad(tareaId) {

    const contenedor = document.getElementById(`detalleTareaActividad-${tareaId}`);

    if (!contenedor.classList.contains("oculto")) {
        contenedor.classList.add("oculto");
        return;
    }

    try {

        const [{ tarea, ramas }, { subtareas }] = await Promise.all([
            peticionApi(`/api/tareas/${tareaId}`),
            peticionApi(`/api/tareas/${tareaId}/subtareas`)
        ]);

        const miembrosPorRama = await Promise.all(
            ramas.map((r) => peticionApi(`/api/centro-control/ramas/${r.id}/miembros`).then((res) => res.miembros))
        );
        const miembros = [...new Map(miembrosPorRama.flat().map((m) => [m.id, m])).values()];

        const filasSubtareas = subtareas.length === 0
            ? `<p class="detalle">Sin subtareas asignadas.</p>`
            : subtareas.map((s) => `
                <div class="fila-conteo" style="margin-top:4px;">
                    <span class="etiqueta">${s.estado === "hecha" ? "✅" : "⬜"} ${s.titulo}${s.asignado_a_nombre ? ` · ${s.asignado_a_nombre}` : ""}</span>
                </div>
            `).join("");

        const formularioSubtareaAdmin = tarea.estado === "pendiente" ? `
            <form class="form-nueva-subtarea-admin" style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
                <input type="text" placeholder="Nueva subtarea" class="input-titulo-subtarea-admin" style="flex:1; min-width:120px; padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
                <select class="select-asignado-subtarea-admin" style="padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
                    <option value="">Sin asignar</option>
                    ${miembros.map((m) => `<option value="${m.id}">${m.nombre}</option>`).join("")}
                </select>
                <button type="submit" class="boton pequeno" style="width:auto;">Agregar</button>
            </form>
        ` : `<p class="detalle" style="margin-top:6px;">Esta tarea ya está cerrada; no se le pueden asignar subtareas nuevas.</p>`;

        contenedor.innerHTML = `
            <div style="margin-top:8px; padding-top:8px; border-top:1px solid #ddd;">
                <strong style="font-size:12px;">Subtareas:</strong>
                ${filasSubtareas}
                ${formularioSubtareaAdmin}
            </div>
            <div style="margin-top:14px; padding-top:8px; border-top:1px solid #ddd;">
                <strong style="font-size:12px;">Reasignar ramas:</strong>
                <div class="checkboxes-reasignar-rama" style="display:flex; flex-wrap:wrap; gap:10px; margin-top:6px;">
                    ${ramasDisponibles.map((r) => `
                        <label style="display:flex; align-items:center; gap:5px; font-size:12.5px; font-weight:600;">
                            <input type="checkbox" value="${r.id}" ${ramas.some((asignada) => asignada.id === r.id) ? "checked" : ""}>
                            ${r.nombre}
                        </label>
                    `).join("")}
                </div>
                <button class="boton pequeno secundario" data-guardar-ramas="1" style="width:auto; margin-top:8px;">Guardar ramas</button>
            </div>
        `;

        contenedor.classList.remove("oculto");

        const formSubtareaAdmin = contenedor.querySelector(".form-nueva-subtarea-admin");
        if (formSubtareaAdmin) {
            formSubtareaAdmin.addEventListener("submit", (evento) => {
                evento.preventDefault();
                evento.stopPropagation();
                const form = evento.target;
                crearSubtareaEnActividad(
                    tareaId,
                    form.querySelector(".input-titulo-subtarea-admin").value.trim(),
                    form.querySelector(".select-asignado-subtarea-admin").value
                );
            });
        }

        contenedor.querySelector("[data-guardar-ramas]").addEventListener("click", (evento) => {
            evento.stopPropagation();
            const seleccionadas = [...contenedor.querySelectorAll(".checkboxes-reasignar-rama input:checked")].map((c) => c.value);
            reasignarRamasTarea(tareaId, seleccionadas);
        });

    } catch (error) {
        alert(error.message);
    }

}

async function crearSubtareaEnActividad(tareaId, titulo, asignadoA) {

    if (!titulo) return;

    try {
        await peticionApi(`/api/tareas/${tareaId}/subtareas`, {
            method: "POST",
            body: JSON.stringify({ titulo, asignadoA: asignadoA || null })
        });
        document.getElementById(`detalleTareaActividad-${tareaId}`).classList.add("oculto");
        await abrirDetalleTareaEnActividad(tareaId);
    } catch (error) {
        alert(error.message);
    }

}

async function reasignarRamasTarea(tareaId, ramaIds) {

    if (ramaIds.length === 0) {
        alert("Debes dejar al menos una rama marcada");
        return;
    }

    try {
        await peticionApi(`/api/tareas/${tareaId}/ramas`, {
            method: "PATCH",
            body: JSON.stringify({ ramaIds })
        });
        await abrirDetalleActividad(actividadAbiertaId);
    } catch (error) {
        alert(error.message);
    }

}

document.getElementById("formTareaActividad").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    const mensaje = document.getElementById("mensajeTareaActividad");
    const hora = document.getElementById("inputHoraTareaActividad").value;

    const ramaIds = [...document.querySelectorAll('input[name="ramaNuevaTarea"]:checked')].map((c) => c.value);

    if (ramaIds.length === 0) {
        mostrarMensaje(mensaje, "Marca al menos una rama responsable", "fallo");
        return;
    }

    try {

        const { actividad } = await peticionApi(`/api/actividades/${actividadAbiertaId}`);

        await peticionApi("/api/tareas", {
            method: "POST",
            body: JSON.stringify({
                tipo: "tarea",
                actividadId: actividadAbiertaId,
                ramaIds,
                titulo: document.getElementById("inputTituloTareaActividad").value.trim(),
                horaProgramada: hora ? new Date(`${actividad.fecha}T${hora}`).toISOString() : null
            })
        });

        mostrarMensaje(mensaje, "Tarea asignada correctamente (el líder de cada rama ya quedó como responsable)", "ok");
        document.getElementById("formTareaActividad").reset();
        await abrirDetalleActividad(actividadAbiertaId);

    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

});

// ==========================
// Analítica de cumplimiento (admin) y resumen reducido (control)
// ==========================

async function cargarAnaliticaAdmin() {

    try {

        const [{ ramas: cumplimientoRamas }, { porHora }, { destacadosPositivos, destacadosNegativos }] = await Promise.all([
            peticionApi("/api/actividades/reportes/ramas"),
            peticionApi("/api/actividades/reportes/horas"),
            peticionApi("/api/actividades/reportes/personas")
        ]);

        crearOActualizarGrafico(
            "graficoCumplimientoRamas", "bar",
            cumplimientoRamas.map((r) => r.rama),
            cumplimientoRamas.map((r) => r.porcentajeCumplimiento),
            "#1FB6A6"
        );

        crearOActualizarGraficoPastel(
            "graficoPastelRamas",
            cumplimientoRamas.map((r) => r.rama),
            cumplimientoRamas.map((r) => r.completadas)
        );

        const totalCompletadas = cumplimientoRamas.reduce((s, r) => s + r.completadas, 0);

        document.getElementById("listaPorcentajesRamas").innerHTML = cumplimientoRamas.length === 0
            ? `<p class="detalle">Todavía no hay tareas registradas.</p>`
            : cumplimientoRamas.map((r) => `
                <div class="fila-conteo">
                    <span class="etiqueta">${r.rama}</span>
                    <span class="valor">
                        ${r.completadas}/${r.total} tareas hechas
                        ${totalCompletadas > 0 ? ` · ${Math.round((r.completadas / totalCompletadas) * 100)}% del total completado` : ""}
                        · ${r.porcentajeCumplimiento}% a tiempo
                    </span>
                </div>
            `).join("");

        const horas = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));

        crearOActualizarGrafico(
            "graficoTareasPorHora", "bar",
            horas,
            horas.map((h) => porHora[h] || 0),
            "#5B4B8A"
        );

        const contenedorPositivos = document.getElementById("listaDestacadosPositivos");
        const contenedorNegativos = document.getElementById("listaDestacadosNegativos");

        contenedorPositivos.innerHTML = destacadosPositivos.length === 0
            ? `<p class="detalle">Todavía no hay suficientes datos.</p>`
            : destacadosPositivos.map((p) => `
                <div class="fila-conteo" style="margin-top:4px;">
                    <span class="etiqueta">${p.nombre}</span>
                    <span class="valor">${p.porcentaje}% a tiempo (${p.aTiempo}/${p.total})</span>
                </div>
            `).join("");

        contenedorNegativos.innerHTML = destacadosNegativos.length === 0
            ? `<p class="detalle">Todavía no hay suficientes datos.</p>`
            : destacadosNegativos.map((p) => `
                <div class="fila-conteo" style="margin-top:4px;">
                    <span class="etiqueta">${p.nombre}</span>
                    <span class="valor">${p.porcentaje}% a tiempo (${p.tarde} tarde de ${p.total})</span>
                </div>
            `).join("");

    } catch (error) {
        console.error(error);
    }

}

async function cargarResumenControl() {

    try {

        const [{ actividades }, { ramas: cumplimientoRamas }] = await Promise.all([
            peticionApi("/api/actividades"),
            peticionApi("/api/actividades/reportes/ramas")
        ]);

        const promedioGeneral = cumplimientoRamas.length === 0
            ? null
            : Math.round(cumplimientoRamas.reduce((s, r) => s + r.porcentajeCumplimiento, 0) / cumplimientoRamas.length);

        document.getElementById("statsResumenControl").innerHTML = `
            <div class="stat-tile">
                <div class="stat-numero">${promedioGeneral ?? "—"}${promedioGeneral !== null ? "%" : ""}</div>
                <span class="stat-etiqueta">Cumplimiento general del cronograma</span>
            </div>
        `;

        const ahora = Date.now();
        const proximas = [];
        const enCurso = [];
        const terminadas = [];

        actividades.forEach((a) => {
            if (a.cancelada) return;
            const inicio = new Date(a.hora_inicio).getTime();
            const fin = new Date(a.hora_fin).getTime();
            if (ahora < inicio) proximas.push(a);
            else if (ahora >= inicio && ahora <= fin) enCurso.push(a);
            else terminadas.push(a);
        });

        const filaActividad = (a) => `
            <div class="fila-conteo" style="margin-top:4px;">
                <span class="etiqueta">${a.titulo}</span>
                <span class="valor">${formatearFechaHora(a.hora_inicio)}</span>
            </div>
        `;

        document.getElementById("listaActividadesProximas").innerHTML = proximas.length === 0
            ? `<p class="detalle">Ninguna.</p>` : proximas.map(filaActividad).join("");

        document.getElementById("listaActividadesEnCurso").innerHTML = enCurso.length === 0
            ? `<p class="detalle">Ninguna.</p>` : enCurso.map(filaActividad).join("");

        document.getElementById("listaActividadesTerminadas").innerHTML = terminadas.length === 0
            ? `<p class="detalle">Ninguna.</p>` : terminadas.map(filaActividad).join("");

    } catch (error) {
        console.error(error);
    }

}

// ==========================
// Inventario de materiales
// ==========================

let materialesInventario = [];

document.getElementById("filtroObjetivoMaterial").addEventListener("change", cargarInventario);
document.getElementById("filtroUbicacionMaterial").addEventListener("input", () => {
    clearTimeout(window._filtroMaterialTimeout);
    window._filtroMaterialTimeout = setTimeout(cargarInventario, 350);
});

async function cargarInventario() {

    try {

        const objetivo = document.getElementById("filtroObjetivoMaterial").value;
        const ubicacion = document.getElementById("filtroUbicacionMaterial").value.trim();

        const params = new URLSearchParams();
        if (objetivo) params.set("objetivo", objetivo);
        if (ubicacion) params.set("ubicacion", ubicacion);

        const { materiales } = await peticionApi(`/api/materiales?${params.toString()}`);
        materialesInventario = materiales;

        renderizarListaInventario(materiales);

        if (perfilActual?.rol === "admin") {
            renderizarChecklistMaterialesLote(materiales);
        }

    } catch (error) {
        console.error(error);
    }

}

function renderizarListaInventario(materiales) {

    const contenedor = document.getElementById("listaInventario");

    contenedor.innerHTML = materiales.length === 0
        ? `<p class="detalle">Todavía no hay materiales registrados.</p>`
        : materiales.map((m) => `
            <div class="tarjeta" style="margin-bottom:10px; box-shadow:none; border-width:2px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                    <strong>${m.nombre}</strong>
                    <span class="badge ${m.disponible > 0 ? "verde" : "rojo"}">${m.disponible}/${m.cantidad_total} disponibles</span>
                </div>
                <div style="font-size:12px; color:#777; margin-top:4px;">
                    ${humanizar(m.objetivo)}${m.ubicacion ? ` · ${m.ubicacion}` : ""}${m.danadaOPerdida > 0 ? ` · ${m.danadaOPerdida} dañados/perdidos` : ""}
                </div>
                ${m.tenedores.length > 0 ? `<div style="font-size:12px; color:#777; margin-top:2px;">Tienen: ${m.tenedores.map((t) => `${t.liderNombre} (${t.cantidad})`).join(", ")}</div>` : ""}
                ${perfilActual?.rol === "admin" ? `<button class="boton pequeno secundario" data-eliminar-material="${m.id}" style="width:auto; margin-top:8px; padding:6px 12px; font-size:11px;">Eliminar</button>` : ""}
            </div>
        `).join("");

    if (perfilActual?.rol === "admin") {
        contenedor.querySelectorAll("[data-eliminar-material]").forEach((boton) => {
            boton.addEventListener("click", () => eliminarMaterial(boton.dataset.eliminarMaterial));
        });
    }

}

async function eliminarMaterial(id) {
    if (!confirm("¿Eliminar este material del inventario?")) return;
    try {
        await peticionApi(`/api/materiales/${id}`, { method: "DELETE" });
        await cargarInventario();
    } catch (error) {
        alert(error.message);
    }
}

document.getElementById("formNuevoMaterial").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    const mensaje = document.getElementById("mensajeNuevoMaterial");

    await conBotonDeshabilitado(evento.target, async () => {

        try {

            await peticionApi("/api/materiales", {
                method: "POST",
                body: JSON.stringify({
                    nombre: document.getElementById("inputNombreMaterial").value.trim(),
                    descripcion: document.getElementById("inputDescripcionMaterial").value.trim(),
                    objetivo: document.getElementById("inputObjetivoMaterial").value,
                    ubicacion: document.getElementById("inputUbicacionMaterial").value.trim(),
                    cantidadTotal: document.getElementById("inputCantidadMaterial").value
                })
            });

            mostrarMensaje(mensaje, "Material creado correctamente", "ok");
            document.getElementById("formNuevoMaterial").reset();
            await cargarInventario();

        } catch (error) {
            mostrarMensaje(mensaje, error.message, "fallo");
        }

    });

});

async function poblarSelectLideres(select, etiquetaVacio) {

    try {
        const { usuarios } = await peticionApi("/api/centro-control/usuarios");
        const lideres = usuarios.filter((u) => u.rol_en_rama === "lider");

        select.innerHTML = `<option value="">${etiquetaVacio || "Selecciona un líder"}</option>` +
            lideres.map((l) => `<option value="${l.id}">${l.nombre}${l.rama_id && mapaRamas[l.rama_id] ? ` (${mapaRamas[l.rama_id]})` : ""}</option>`)
                .join("");
    } catch (error) {
        console.error(error);
    }

}

function cargarLideresParaLote() {
    return poblarSelectLideres(document.getElementById("inputLiderLote"));
}

async function cargarActividadesParaLote() {

    try {
        const { actividades } = await peticionApi("/api/actividades");

        document.getElementById("inputActividadLote").innerHTML = `<option value="">Sin actividad</option>` +
            actividades.filter((a) => !a.cancelada).map((a) => `<option value="${a.id}">${a.titulo}</option>`).join("");
    } catch (error) {
        console.error(error);
    }

}

function renderizarChecklistMaterialesLote(materiales) {

    const contenedor = document.getElementById("checklistMaterialesLote");

    contenedor.innerHTML = materiales.length === 0
        ? `<p class="detalle">No hay materiales para asignar.</p>`
        : materiales.map((m) => `
            <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
                <input type="checkbox" class="checkbox-material-lote" value="${m.id}">
                <span style="flex:1; font-size:13px;">${m.nombre} <span style="color:#888; font-size:11.5px;">(disponible: ${m.disponible})</span></span>
                <input type="number" class="cantidad-material-lote" min="1" max="${m.disponible}" placeholder="Cant." style="width:70px; padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
            </div>
        `).join("");

}

async function cargarMaterialesDeActividad(actividadId) {

    try {

        const { lotes } = await peticionApi(`/api/materiales/lotes/actividad/${actividadId}`);
        const contenedor = document.getElementById("listaMaterialesActividad");

        contenedor.innerHTML = lotes.length === 0
            ? `<p class="detalle">Todavía no se han asignado materiales a esta actividad.</p>`
            : lotes.map((l) => `
                <div class="fila-conteo" style="margin-top:4px; flex-direction:column; align-items:stretch;">
                    <strong style="font-size:12.5px;">${l.liderNombre}</strong>
                    ${l.lineas.map((linea) => `
                        <span style="font-size:12px; color:#666;">
                            ${linea.materialNombre} — ${linea.pendiente > 0 ? `${linea.pendiente} pendiente de devolver` : "devuelto"}
                        </span>
                    `).join("")}
                </div>
            `).join("");

        if (perfilActual?.rol === "admin") {
            const { materiales } = await peticionApi("/api/materiales");
            renderizarChecklistMaterialesActividad(materiales);
        }

    } catch (error) {
        console.error(error);
    }

}

function renderizarChecklistMaterialesActividad(materiales) {

    const contenedor = document.getElementById("checklistMaterialesActividad");

    contenedor.innerHTML = materiales.length === 0
        ? `<p class="detalle">No hay materiales en el inventario.</p>`
        : materiales.map((m) => `
            <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
                <input type="checkbox" class="checkbox-material-actividad" value="${m.id}">
                <span style="flex:1; font-size:13px;">${m.nombre} <span style="color:#888; font-size:11.5px;">(disponible: ${m.disponible})</span></span>
                <input type="number" class="cantidad-material-actividad" min="1" max="${m.disponible}" placeholder="Cant." style="width:70px; padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
            </div>
        `).join("");

}

document.getElementById("formMaterialActividad").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    const mensaje = document.getElementById("mensajeMaterialActividad");

    const items = [];
    document.querySelectorAll(".checkbox-material-actividad:checked").forEach((checkbox) => {
        const fila = checkbox.closest("div");
        const cantidad = fila.querySelector(".cantidad-material-actividad").value;
        if (cantidad && Number(cantidad) > 0) {
            items.push({ materialId: checkbox.value, cantidad: Number(cantidad) });
        }
    });

    if (items.length === 0) {
        mostrarMensaje(mensaje, "Marca al menos un material con una cantidad válida", "fallo");
        return;
    }

    await conBotonDeshabilitado(evento.target, async () => {

        try {

            await peticionApi("/api/materiales/lotes", {
                method: "POST",
                body: JSON.stringify({
                    liderId: document.getElementById("inputLiderMaterialActividad").value,
                    actividadId: actividadAbiertaId,
                    items
                })
            });

            mostrarMensaje(mensaje, "Materiales asignados correctamente", "ok");
            document.getElementById("formMaterialActividad").reset();
            await cargarMaterialesDeActividad(actividadAbiertaId);

        } catch (error) {
            mostrarMensaje(mensaje, error.message, "fallo");
        }

    });

});

document.getElementById("formCrearLote").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    const mensaje = document.getElementById("mensajeCrearLote");

    const items = [];
    document.querySelectorAll(".checkbox-material-lote:checked").forEach((checkbox) => {
        const fila = checkbox.closest("div");
        const cantidad = fila.querySelector(".cantidad-material-lote").value;
        if (cantidad && Number(cantidad) > 0) {
            items.push({ materialId: checkbox.value, cantidad: Number(cantidad) });
        }
    });

    if (items.length === 0) {
        mostrarMensaje(mensaje, "Marca al menos un material con una cantidad válida", "fallo");
        return;
    }

    await conBotonDeshabilitado(evento.target, async () => {

        try {

            await peticionApi("/api/materiales/lotes", {
                method: "POST",
                body: JSON.stringify({
                    liderId: document.getElementById("inputLiderLote").value,
                    actividadId: document.getElementById("inputActividadLote").value || null,
                    items
                })
            });

            mostrarMensaje(mensaje, "Lote asignado correctamente", "ok");
            document.getElementById("formCrearLote").reset();
            await cargarInventario();

        } catch (error) {
            mostrarMensaje(mensaje, error.message, "fallo");
        }

    });

});

async function cargarSolicitudesMaterialAdmin() {

    try {

        const { solicitudes: todas } = await peticionApi("/api/materiales/solicitudes");
        const solicitudes = todas.filter((s) => s.estado === "pendiente" || s.estado === "aprobada");
        const contenedor = document.getElementById("listaSolicitudesMaterial");

        contenedor.innerHTML = solicitudes.length === 0
            ? `<p class="detalle">No hay solicitudes pendientes.</p>`
            : solicitudes.map((s) => `
                <div class="tarjeta" style="margin-bottom:10px; box-shadow:none; border-width:2px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                        <strong>${s.solicitante_nombre}</strong>
                        <span style="display:flex; align-items:center; gap:8px;">
                            <span class="badge ${s.estado === "aprobada" ? "verde" : "neutro"}">${humanizar(s.estado)}</span>
                            <span style="font-size:11.5px; color:#777;">${new Date(s.creado_en).toLocaleString("es-CO")}</span>
                        </span>
                    </div>
                    <div style="font-size:12.5px; margin-top:4px;">
                        ${s.items.map((i) => `${i.materialNombre} × ${i.cantidad}`).join(", ")}
                    </div>
                    ${s.notas ? `<div style="font-size:12px; color:#777; margin-top:4px;">${s.notas}</div>` : ""}
                    <div style="display:flex; gap:8px; margin-top:10px;">
                        ${s.estado === "pendiente" ? `<button class="boton pequeno" data-aprobar-solicitud="${s.id}" style="width:auto;">Aprobar</button>` : ""}
                        ${s.estado === "aprobada" ? `<button class="boton pequeno" data-entregar-solicitud="${s.id}" style="width:auto;">Entregar</button>` : ""}
                        <button class="boton pequeno secundario" data-rechazar-solicitud="${s.id}" style="width:auto;">Rechazar</button>
                    </div>
                </div>
            `).join("");

        contenedor.querySelectorAll("[data-aprobar-solicitud]").forEach((boton) => {
            boton.addEventListener("click", () => resolverSolicitudMaterial(boton.dataset.aprobarSolicitud, "aprobar"));
        });

        contenedor.querySelectorAll("[data-entregar-solicitud]").forEach((boton) => {
            boton.addEventListener("click", () => resolverSolicitudMaterial(boton.dataset.entregarSolicitud, "entregar"));
        });

        contenedor.querySelectorAll("[data-rechazar-solicitud]").forEach((boton) => {
            boton.addEventListener("click", () => {
                const motivo = prompt("Motivo del rechazo (opcional):") || "";
                resolverSolicitudMaterial(boton.dataset.rechazarSolicitud, "rechazar", motivo);
            });
        });

    } catch (error) {
        console.error(error);
    }

}

async function resolverSolicitudMaterial(id, accion, motivo) {

    try {
        await peticionApi(`/api/materiales/solicitudes/${id}/resolver`, {
            method: "POST",
            body: JSON.stringify({ accion, motivo })
        });
        await Promise.all([cargarSolicitudesMaterialAdmin(), cargarInventario()]);
    } catch (error) {
        alert(error.message);
    }

}

document.getElementById("btnExportarTodo").addEventListener("click", () => {
    descargarArchivo("/api/centro-control/exportar/todo", "campfest-respaldo-completo.xlsx");
});

document.getElementById("btnExportarInventarioExcel").addEventListener("click", () => {
    descargarArchivo("/api/materiales/exportar/excel", "inventario-campfest.xlsx");
});

document.getElementById("btnExportarInventarioPdf").addEventListener("click", () => {
    descargarArchivo("/api/materiales/exportar/pdf", "inventario-campfest.pdf");
});

document.getElementById("btnExportarHistorialMaterial").addEventListener("click", () => {
    descargarArchivo("/api/materiales/exportar/historial", "historial-materiales-campfest.xlsx");
});

// ==========================
// Inscripciones (formulario nativo de registro)
// ==========================

let mostrandoEliminadosInscripcion = false;
let ultimasInscripciones = [];

const GRAFICOS_INSCRIPCION = [
    { campo: "municipio", tipo: "bar", titulo: "Municipio" },
    { campo: "edad", tipo: "bar", titulo: "Edad" },
    { campo: "esMenorDeEdad", tipo: "pastel", titulo: "Menor de edad" },
    { campo: "zonaRuralUrbana", tipo: "pastel", titulo: "Zona" },
    { campo: "estadoAdmision", tipo: "pastel", titulo: "Estado de admisión" },
    { campo: "tipoDocumento", tipo: "bar", titulo: "Tipo de documento" },
    { campo: "rh", tipo: "bar", titulo: "RH" },
    { campo: "eps", tipo: "bar", titulo: "EPS" },
    { campo: "tieneCondicionMedica", tipo: "pastel", titulo: "Condición médica" },
    { campo: "tieneRestriccionesAlimentarias", tipo: "pastel", titulo: "Restricciones alimentarias" },
    { campo: "alergiaMedicamento", tipo: "pastel", titulo: "Alergia a medicamento" },
    { campo: "alergiaAlimento", tipo: "pastel", titulo: "Alergia a alimento" },
    { campo: "carpaPropia", tipo: "pastel", titulo: "Carpa propia" },
    { campo: "comoSeEntero", tipo: "bar", titulo: "Cómo se enteraron" },
    { campo: "subsistemaInstancia", tipo: "bar", titulo: "Instancia del subsistema" },
    { campo: "aceptaTratamientoDatos", tipo: "pastel", titulo: "Acepta tratamiento de datos" },
    { campo: "aceptaUsoImagen", tipo: "pastel", titulo: "Acepta uso de imagen" },
    { campo: "aceptaExencionResponsabilidad", tipo: "pastel", titulo: "Acepta exención de responsabilidad" }
];

document.getElementById("btnVerEliminadosInscripcion").addEventListener("click", () => {
    mostrandoEliminadosInscripcion = !mostrandoEliminadosInscripcion;
    document.getElementById("btnVerEliminadosInscripcion").textContent = mostrandoEliminadosInscripcion
        ? "Ver activas" : "Ver eliminados";
    cargarInscripciones();
});

["filtroEstadoInscripcion", "filtroMunicipioInscripcion", "filtroZonaInscripcion", "filtroMenorInscripcion"].forEach((id) => {
    document.getElementById(id).addEventListener("change", cargarInscripciones);
});

document.getElementById("filtroBusquedaInscripcion").addEventListener("input", () => {
    clearTimeout(window._filtroInscripcionTimeout);
    window._filtroInscripcionTimeout = setTimeout(cargarInscripciones, 350);
});

async function cargarInscripciones() {

    try {

        const params = new URLSearchParams();

        const estado = document.getElementById("filtroEstadoInscripcion").value;
        const municipio = document.getElementById("filtroMunicipioInscripcion").value;
        const zona = document.getElementById("filtroZonaInscripcion").value;
        const menor = document.getElementById("filtroMenorInscripcion").value;
        const q = document.getElementById("filtroBusquedaInscripcion").value.trim();

        if (estado) params.set("estado", estado);
        if (municipio) params.set("municipio", municipio);
        if (zona) params.set("zonaRuralUrbana", zona);
        if (menor) params.set("esMenorDeEdad", menor);
        if (q) params.set("q", q);
        if (mostrandoEliminadosInscripcion) params.set("soloEliminados", "true");

        const { participantes } = await peticionApi(`/api/centro-control/inscripciones?${params.toString()}`);

        ultimasInscripciones = participantes;
        renderizarTablaInscripciones(participantes);

    } catch (error) {
        console.error(error);
    }

}

const EDAD_MINIMA_PERMITIDA = 14;
const EDAD_MAXIMA_PERMITIDA = 28;

function edadFueraDeRango(edad) {
    return edad != null && (edad < EDAD_MINIMA_PERMITIDA || edad > EDAD_MAXIMA_PERMITIDA);
}

function actualizarAvisoEdadInscripciones(participantes) {

    const aviso = document.getElementById("avisoEdadInscripciones");
    const fueraDeRango = participantes.filter((p) => edadFueraDeRango(p.edad));

    if (fueraDeRango.length === 0) {
        aviso.classList.remove("mostrar");
        aviso.innerHTML = "";
        return;
    }

    const nombres = fueraDeRango.slice(0, 5).map((p) => `${p.nombre} (${p.edad} años)`).join(", ");
    const extra = fueraDeRango.length > 5 ? ` y ${fueraDeRango.length - 5} más` : "";

    aviso.innerHTML = `⚠️ ${fueraDeRango.length} inscripción${fueraDeRango.length === 1 ? "" : "es"} fuera del rango de edad permitido (${EDAD_MINIMA_PERMITIDA}–${EDAD_MAXIMA_PERMITIDA} años): ${nombres}${extra}.`;
    aviso.classList.add("mostrar");

}

function renderizarTablaInscripciones(participantes) {

    const cuerpo = document.getElementById("filasInscripciones");
    const esAdmin = perfilActual?.rol === "admin";

    actualizarAvisoEdadInscripciones(participantes);

    if (participantes.length === 0) {
        cuerpo.innerHTML = `<tr><td colspan="9">No hay inscripciones que coincidan con el filtro.</td></tr>`;
        return;
    }

    cuerpo.innerHTML = participantes.map((p) => `
        <tr data-fila-inscripcion="${p.id}">
            <td style="white-space:nowrap;">${p.creado_en ? new Date(p.creado_en).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</td>
            <td>${p.nombre}${p.esMenorDeEdad ? ' <span class="badge neutro">Menor</span>' : ""}${edadFueraDeRango(p.edad) ? ' <span class="badge rojo">⚠ Edad fuera de rango</span>' : ""}</td>
            <td>${p.documento}</td>
            <td>${p.municipio}${p.municipio === "Otro" && p.municipio_otro ? ` (${p.municipio_otro})` : ""}</td>
            <td>${p.edad ?? "—"}</td>
            <td>${p.telefono || "—"}</td>
            <td>${mostrandoEliminadosInscripcion
                ? humanizar(p.estado_admision)
                : `<select class="select-admision-inscripcion" data-id="${p.id}" data-anterior="${p.estado_admision}" style="padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
                        <option value="pendiente" ${p.estado_admision === "pendiente" ? "selected" : ""}>Pendiente</option>
                        <option value="admitido" ${p.estado_admision === "admitido" ? "selected" : ""}>Admitido</option>
                        <option value="no_admitido" ${p.estado_admision === "no_admitido" ? "selected" : ""}>No admitido</option>
                        <option value="desertor" ${p.estado_admision === "desertor" ? "selected" : ""}>Deserción</option>
                   </select>`}
            </td>
            <td>
                <span class="badge ${p.correo_confirmacion_estado === "enviado" ? "verde" : p.correo_confirmacion_estado === "fallo" ? "rojo" : "neutro"}" ${p.correo_confirmacion_estado === "fallo" && p.correo_confirmacion_error ? `title="${p.correo_confirmacion_error.replace(/"/g, "&quot;")}"` : ""}>
                    ${p.correo_confirmacion_estado === "enviado" ? "✅ Enviado" : p.correo_confirmacion_estado === "fallo" ? "⚠️ Falló" : "No enviado"}
                </span>
                ${!mostrandoEliminadosInscripcion && p.correo_confirmacion_estado !== "enviado" && esAdmin
                    ? `<button class="boton pequeno secundario" data-enviar-correo="${p.id}" style="width:auto; padding:4px 10px; font-size:11px; margin-top:4px;">Enviar prueba</button>`
                    : ""}
                ${!mostrandoEliminadosInscripcion && p.correo_confirmacion_estado === "fallo" && esAdmin
                    ? `<button class="boton pequeno secundario" data-editar-correo="${p.id}" data-correo-actual="${p.correo_personal || ""}" style="width:auto; padding:4px 10px; font-size:11px; margin-top:4px;">Editar correo</button>`
                    : ""}
            </td>
            <td style="white-space:nowrap;">
                <button class="boton pequeno secundario" data-detalle-inscripcion="${p.id}" style="width:auto; padding:6px 10px; font-size:11px;">Ver</button>
                ${mostrandoEliminadosInscripcion
                    ? `<button class="boton pequeno" data-restaurar="${p.id}" style="width:auto; padding:6px 10px; font-size:11px;">Restaurar</button>`
                    : (esAdmin ? `<button class="boton pequeno secundario" data-eliminar="${p.id}" style="width:auto; padding:6px 10px; font-size:11px;">Eliminar</button>` : "")}
            </td>
        </tr>
        <tr class="oculto" id="filaDetalleInscripcion-${p.id}"><td colspan="9"><div id="detalleInscripcion-${p.id}"></div></td></tr>
    `).join("");

    cuerpo.querySelectorAll(".select-admision-inscripcion").forEach((select) => {
        select.addEventListener("change", () => {
            let motivo = "";
            if (select.value === "no_admitido" || select.value === "desertor") {
                motivo = prompt(select.value === "no_admitido" ? "Motivo del rechazo (se incluye en el correo al participante):" : "Motivo de la deserción (opcional, solo uso interno):") || "";
            }
            actualizarAdmisionInscripcion(select.dataset.id, select.value, motivo);
        });
    });

    cuerpo.querySelectorAll("[data-enviar-correo]").forEach((boton) => {
        boton.addEventListener("click", () => {
            if (!confirm("¿Seguro que quieres enviar el correo de confirmación a este participante?")) return;
            enviarCorreoPruebaInscripcion(boton.dataset.enviarCorreo);
        });
    });

    cuerpo.querySelectorAll("[data-editar-correo]").forEach((boton) => {
        boton.addEventListener("click", () => {
            const nuevo = prompt("Corregir correo del participante:", boton.dataset.correoActual || "");
            if (nuevo === null || nuevo.trim() === "") return;
            editarCorreoInscripcion(boton.dataset.editarCorreo, nuevo.trim());
        });
    });

    cuerpo.querySelectorAll("[data-eliminar]").forEach((boton) => {
        boton.addEventListener("click", () => eliminarInscripcion(boton.dataset.eliminar));
    });

    cuerpo.querySelectorAll("[data-restaurar]").forEach((boton) => {
        boton.addEventListener("click", () => restaurarInscripcion(boton.dataset.restaurar));
    });

    cuerpo.querySelectorAll("[data-detalle-inscripcion]").forEach((boton) => {
        boton.addEventListener("click", () => alternarDetalleInscripcion(boton.dataset.detalleInscripcion));
    });

}

function alternarDetalleInscripcion(id) {

    const fila = document.getElementById(`filaDetalleInscripcion-${id}`);
    const contenedor = document.getElementById(`detalleInscripcion-${id}`);

    if (!fila.classList.contains("oculto")) {
        fila.classList.add("oculto");
        return;
    }

    const p = ultimasInscripciones.find((x) => x.id === id);
    if (!p) return;

    contenedor.innerHTML = `
        <div class="grid-info" style="margin:10px 0 0;">
            <div class="dato"><span class="etiqueta">Correo personal</span><span class="valor">${p.correo_personal || "—"}</span></div>
            ${p.motivo_rechazo ? `<div class="dato"><span class="etiqueta">Motivo (rechazo/deserción)</span><span class="valor">${p.motivo_rechazo}</span></div>` : ""}
            <div class="dato"><span class="etiqueta">Zona</span><span class="valor">${p.zona_rural_urbana || "—"}</span></div>
            <div class="dato"><span class="etiqueta">Contacto de emergencia 1</span><span class="valor">${p.contacto_emergencia_nombre || "—"} · ${p.contacto_emergencia_telefono || "—"}</span></div>
            <div class="dato"><span class="etiqueta">Contacto de emergencia 2</span><span class="valor">${p.contacto_emergencia_2_nombre || "—"} · ${p.contacto_emergencia_2_telefono || "—"}</span></div>
            <div class="dato"><span class="etiqueta">RH</span><span class="valor">${p.rh || "—"}</span></div>
            <div class="dato"><span class="etiqueta">EPS</span><span class="valor">${p.eps || "—"}</span></div>
            <div class="dato"><span class="etiqueta">Condición médica</span><span class="valor">${p.tiene_condicion_medica ? (p.condicion_medica_detalle || "Sí") : "No"}</span></div>
            <div class="dato"><span class="etiqueta">Restricciones alimentarias</span><span class="valor">${p.tiene_restricciones_alimentarias ? (p.restricciones_alimentarias_detalle || "Sí") : "No"}</span></div>
            <div class="dato"><span class="etiqueta">Alergia a medicamento</span><span class="valor">${p.alergia_medicamento ? (p.alergia_medicamento_detalle || "Sí") : "No"}</span></div>
            <div class="dato"><span class="etiqueta">Alergia a alimento</span><span class="valor">${p.alergia_alimento ? (p.alergia_alimento_detalle || "Sí") : "No"}</span></div>
            <div class="dato"><span class="etiqueta">Carpa propia</span><span class="valor">${p.carpa_propia ? "Sí" : "No"}</span></div>
            <div class="dato"><span class="etiqueta">Subsistema — instancia</span><span class="valor">${p.subsistema_instancia || "—"}</span></div>
            <div class="dato"><span class="etiqueta">Cómo se enteró</span><span class="valor">${(p.como_se_entero || []).join(", ") || "—"}</span></div>
            <div class="dato"><span class="etiqueta">Invitado por</span><span class="valor">${p.invitado_por || "—"}</span></div>
        </div>
        ${p.municipio !== "Bugalagrande" ? `
        <div style="margin-top:14px; padding-top:10px; border-top:1px solid #eee;">
            <strong style="font-size:12px;">Liderazgo y motivación</strong>
            <p class="detalle" style="margin-top:6px;"><strong>Experiencia en liderazgo:</strong> ${p.experiencia_liderazgo || "—"}</p>
            <p class="detalle"><strong>Incidencia como líder social:</strong> ${p.incidencia_lider_social || "—"}</p>
            <p class="detalle"><strong>Beneficio personal:</strong> ${p.beneficio_personal_liderazgo || "—"}</p>
            <p class="detalle"><strong>Expectativa post-campamento:</strong> ${p.expectativa_post_campamento || "—"}</p>
        </div>
        ` : `<p class="detalle" style="margin-top:10px;">Es de Bugalagrande — no aplica el bloque de liderazgo.</p>`}
    `;

    fila.classList.remove("oculto");

}

async function actualizarAdmisionInscripcion(id, estado, motivo) {
    try {
        await peticionApi(`/api/centro-control/inscripciones/${id}/admision`, {
            method: "PATCH",
            body: JSON.stringify({ estado, motivo })
        });
        await Promise.all([cargarInscripciones(), cargarEstadisticasInscripciones()]);
    } catch (error) {
        alert(error.message);
        cargarInscripciones();
    }
}

async function eliminarInscripcion(id) {
    if (!confirm("¿Eliminar esta inscripción? Se puede restaurar después desde \"Ver eliminados\".")) return;
    try {
        await peticionApi(`/api/centro-control/inscripciones/${id}`, { method: "DELETE" });
        await Promise.all([cargarInscripciones(), cargarEstadisticasInscripciones()]);
    } catch (error) {
        alert(error.message);
    }
}

async function restaurarInscripcion(id) {
    try {
        await peticionApi(`/api/centro-control/inscripciones/${id}/restaurar`, { method: "POST" });
        await Promise.all([cargarInscripciones(), cargarEstadisticasInscripciones()]);
    } catch (error) {
        alert(error.message);
    }
}

async function enviarCorreoPruebaInscripcion(id) {
    try {
        await peticionApi(`/api/centro-control/inscripciones/${id}/enviar-correo`, { method: "POST" });
        await cargarInscripciones();
    } catch (error) {
        alert(error.message);
        cargarInscripciones();
    }
}

async function editarCorreoInscripcion(id, correo) {
    try {
        await peticionApi(`/api/centro-control/inscripciones/${id}/correo`, {
            method: "PATCH",
            body: JSON.stringify({ correo })
        });
        await cargarInscripciones();
    } catch (error) {
        alert(error.message);
    }
}

document.getElementById("btnEnviarCorreoPruebaLibre").addEventListener("click", async () => {

    const input = document.getElementById("correoPruebaLibre");
    const correo = input.value.trim();
    const mensaje = document.getElementById("mensajeInscripciones");

    if (!correo) {
        mostrarMensaje(mensaje, "Escribe una dirección de correo para probar.", "fallo");
        return;
    }

    const estado = document.getElementById("estadoPruebaLibre").value;
    const motivo = document.getElementById("motivoPruebaLibre").value.trim();

    try {
        await peticionApi("/api/centro-control/inscripciones/enviar-correo-prueba-libre", {
            method: "POST",
            body: JSON.stringify({ correo, estado, motivo })
        });
        mostrarMensaje(mensaje, `Correo de prueba (${estado}) enviado a ${correo}. Esto no afecta ninguna inscripción real.`, "ok");
    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

});

document.getElementById("estadoPruebaLibre").addEventListener("change", (evento) => {
    document.getElementById("campoMotivoPruebaLibre").classList.toggle("oculto", evento.target.value !== "no_admitido");
});

document.getElementById("btnEnviarCorreoMasivo").addEventListener("click", async () => {

    if (!confirm("Esto envía el correo de confirmación a TODOS los que todavía no lo han recibido. ¿Ya probaste el envío individual y funcionó? ¿Continuar?")) return;

    const mensaje = document.getElementById("mensajeInscripciones");

    try {
        const resultado = await peticionApi("/api/centro-control/inscripciones/enviar-correo-masivo", { method: "POST" });
        mostrarMensaje(mensaje, `Envío masivo terminado: ${resultado.enviados} enviados, ${resultado.fallidos} fallidos.`, resultado.fallidos > 0 ? "fallo" : "ok");
        await cargarInscripciones();
    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

});

async function cargarEstadisticasInscripciones() {

    try {

        const estadisticas = await peticionApi("/api/centro-control/inscripciones/estadisticas");

        renderizarTilesInscripciones(estadisticas);
        renderizarGraficosInscripciones(estadisticas);

    } catch (error) {
        console.error(error);
    }

}

function renderizarTilesInscripciones(estadisticas) {

    const contenedor = document.getElementById("tilesInscripciones");
    const estado = estadisticas.estadoAdmision || {};
    const menor = estadisticas.esMenorDeEdad || {};
    const total = (estado.pendiente || 0) + (estado.admitido || 0) + (estado.no_admitido || 0);
    const cupo = estadisticas.cupoBugalagrande || { admitidos: 0, enEspera: 0, maximo: 100 };

    contenedor.innerHTML = `
        <div class="stat-tile" data-tile-total="true" style="cursor:pointer;"><div class="stat-numero">${total}</div><span class="stat-etiqueta">Total inscritos</span></div>
        <div class="stat-tile" data-tile-estado="pendiente" style="cursor:pointer;"><div class="stat-numero">${estado.pendiente || 0}</div><span class="stat-etiqueta">Pendientes</span></div>
        <div class="stat-tile" data-tile-estado="admitido" style="cursor:pointer;"><div class="stat-numero">${estado.admitido || 0}</div><span class="stat-etiqueta">Admitidos</span></div>
        <div class="stat-tile" data-tile-estado="no_admitido" style="cursor:pointer;"><div class="stat-numero">${estado.no_admitido || 0}</div><span class="stat-etiqueta">No admitidos</span></div>
        <div class="stat-tile" data-tile-menor="true" style="cursor:pointer;"><div class="stat-numero">${menor["Sí"] || 0}</div><span class="stat-etiqueta">Menores de edad</span></div>
        <div class="stat-tile" data-tile-bugalagrande="true" style="cursor:pointer;"><div class="stat-numero">${cupo.admitidos}/${cupo.maximo}</div><span class="stat-etiqueta">Cupo Bugalagrande${cupo.enEspera > 0 ? ` (${cupo.enEspera} en espera)` : ""}</span></div>
    `;

    const tileTotal = contenedor.querySelector("[data-tile-total]");
    if (tileTotal) {
        tileTotal.addEventListener("click", () => {
            mostrandoEliminadosInscripcion = false;
            document.getElementById("btnVerEliminadosInscripcion").textContent = "Ver eliminados";
            document.getElementById("filtroEstadoInscripcion").value = "";
            document.getElementById("filtroMenorInscripcion").value = "";
            cargarInscripciones();
        });
    }

    contenedor.querySelectorAll("[data-tile-estado]").forEach((tile) => {
        tile.addEventListener("click", () => {
            mostrandoEliminadosInscripcion = false;
            document.getElementById("btnVerEliminadosInscripcion").textContent = "Ver eliminados";
            document.getElementById("filtroEstadoInscripcion").value = tile.dataset.tileEstado;
            document.getElementById("filtroMenorInscripcion").value = "";
            cargarInscripciones();
        });
    });

    const tileMenor = contenedor.querySelector("[data-tile-menor]");
    if (tileMenor) {
        tileMenor.addEventListener("click", () => {
            mostrandoEliminadosInscripcion = false;
            document.getElementById("btnVerEliminadosInscripcion").textContent = "Ver eliminados";
            document.getElementById("filtroEstadoInscripcion").value = "";
            document.getElementById("filtroMenorInscripcion").value = "true";
            cargarInscripciones();
        });
    }

    const tileBugalagrande = contenedor.querySelector("[data-tile-bugalagrande]");
    if (tileBugalagrande) {
        tileBugalagrande.addEventListener("click", () => {
            mostrandoEliminadosInscripcion = false;
            document.getElementById("btnVerEliminadosInscripcion").textContent = "Ver eliminados";
            document.getElementById("filtroEstadoInscripcion").value = "";
            document.getElementById("filtroMenorInscripcion").value = "";
            document.getElementById("filtroMunicipioInscripcion").value = "Bugalagrande";
            cargarInscripciones();
        });
    }

}

function renderizarGraficosInscripciones(estadisticas) {

    const contenedor = document.getElementById("graficosInscripciones");

    contenedor.innerHTML = GRAFICOS_INSCRIPCION.map((g) => `
        <div class="grafico-tarjeta">
            <h3>${g.titulo}</h3>
            <canvas id="graficoInscripcion_${g.campo}"></canvas>
        </div>
    `).join("");

    GRAFICOS_INSCRIPCION.forEach((g) => {

        const idCanvas = `graficoInscripcion_${g.campo}`;
        delete graficos[idCanvas];

        const datos = estadisticas[g.campo] || {};
        const labels = Object.keys(datos);
        const valores = Object.values(datos);

        if (g.tipo === "pastel") {
            crearOActualizarGraficoPastel(idCanvas, labels, valores);
        } else {
            crearOActualizarGrafico(idCanvas, "bar", labels, valores, "#5B4B8A");
        }

    });

}

// ==========================
// Arranque
// ==========================

verificarSesion();
