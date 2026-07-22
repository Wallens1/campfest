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

const OBJETIVOS_MATERIAL = ["logistica", "entretenimiento", "auxilios", "decoracion", "emergencias", "utilidades"];

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
const seccionSalidaLibre = document.getElementById("seccionSalidaLibre");
const bloqueSalidaLibre = document.getElementById("bloqueSalidaLibre");
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
// Reemplaza al viejo global único: cada lista de tarjetas expandibles
// (solicitudesRecibidas/solicitudesEnviadas/tareas/actividad) puede tener su
// propio detalle abierto a la vez, sin pisarse entre sí.
const detallesTareaAbiertos = {};
let intervaloPolling = null;
let perfilActual = null;
let ramasDisponibles = [];
let mapaRamas = {};

// ==========================
// Utilidades
// ==========================

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
    return new Date(fechaIso).toLocaleTimeString("es-CO", {
        hour: "numeric",
        minute: "2-digit"
    });
}

// ==========================
// Aviso de "sin conexión" — antes, si el polling (cada 7s) fallaba por un
// problema de red, no había ningún indicio visible más que un
// console.error; el panel se veía "colgado" sin que nadie supiera si es
// culpa del wifi, del servidor o si simplemente no ha pasado nada nuevo.
// Solo un FALLO DE RED (fetch nunca llegó a responder) cuenta para esto —
// una respuesta HTTP de error real (400/403/500...) es un problema
// distinto que cada acción ya reporta por su lado.
// ==========================

let fallosDeRedConsecutivos = 0;
const UMBRAL_AVISO_SIN_CONEXION = 2;

function marcarConexionOk() {
    fallosDeRedConsecutivos = 0;
    document.getElementById("bannerSinConexion")?.classList.add("oculto");
}

function marcarFalloDeRed() {
    fallosDeRedConsecutivos++;
    if (fallosDeRedConsecutivos >= UMBRAL_AVISO_SIN_CONEXION) {
        document.getElementById("bannerSinConexion")?.classList.remove("oculto");
    }
}

async function peticionApi(ruta, opciones = {}) {

    const { data: sesion } = await supabaseClient.auth.getSession();
    const token = sesion?.session?.access_token;

    let respuesta;

    try {
        respuesta = await fetch(`${API_BASE}${ruta}`, {
            ...opciones,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(opciones.headers || {})
            }
        });
    } catch (errorRed) {
        marcarFalloDeRed();
        throw new Error("No se pudo conectar con el servidor. Revisa tu conexión a internet.");
    }

    marcarConexionOk();

    if (opciones.binario) return respuesta;

    const cuerpo = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(cuerpo.mensaje || "Ocurrió un error inesperado");
    }

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

async function mostrarPanel(sesion) {

    usuarioActual.textContent = sesion.user.email;

    try {

        const { usuario } = await peticionApi("/api/centro-control/perfil");

        // Antes cualquier cuenta válida podía entrar aquí: un admin/control
        // entraba al Panel Logístico y no veía casi nada útil por no tener
        // rama_id, sin ningún aviso de que este no es su panel.
        if (usuario.rol !== "logistica") {
            alert("Tu cuenta es de administración/control — te llevamos al Centro de Control.");
            window.location.href = "../../centro-control/";
            return;
        }

        perfilActual = usuario;
        usuarioActual.textContent = `${usuario.nombre} · ${humanizar(usuario.rol)}`;

    } catch (error) {
        console.error(error);
    }

    pantallaLogin.classList.add("oculto");
    pantallaPanel.classList.remove("oculto");

    llenarSelect(document.getElementById("inputCategoria"), CATEGORIAS, "Selecciona categoría");
    llenarSelect(document.getElementById("inputPrioridad"), PRIORIDADES, "Selecciona prioridad");
    cargarZonas();
    cargarCarpas();
    await cargarRamas();

    // Ojo: esto es "para MI rama" — el admin no tiene una rama propia, así
    // que estas herramientas son solo para líderes; el admin gestiona todo
    // esto (cualquier rama) desde la pestaña Cronograma del Centro de Control.
    const puedeCrearTareas = !!perfilActual && perfilActual.rol_en_rama === "lider" && !!perfilActual.rama_id;
    document.getElementById("tarjetaCrearTarea").classList.toggle("oculto", !puedeCrearTareas);
    document.getElementById("tarjetaEscribirObservacion").classList.toggle("oculto", !puedeCrearTareas);
    document.getElementById("tarjetaPedirAyuda").classList.toggle("oculto", !puedeCrearTareas);

    // Los materiales solo se ASIGNAN a líderes (por eso "Mis lotes" sigue
    // siendo solo para ellos), pero cualquier miembro de una rama puede
    // avisar que necesita algo — al entregarse, el lote de todas formas
    // termina a nombre del líder de esa rama.
    const perteneceARama = !!perfilActual && !!perfilActual.rama_id;
    document.getElementById("tarjetaMisLotesMaterial").classList.toggle("oculto", !puedeCrearTareas);
    document.getElementById("tarjetaSolicitarMaterial").classList.toggle("oculto", !perteneceARama);
    document.getElementById("tarjetaMisSolicitudesMaterial").classList.toggle("oculto", !perteneceARama);

    llenarSelect(document.getElementById("filtroObjetivoMaterialLogistica"), OBJETIVOS_MATERIAL, "Todos los objetivos");

    if (puedeCrearTareas && perfilActual.rama_id) {
        try {
            const { miembros } = await peticionApi(`/api/centro-control/ramas/${perfilActual.rama_id}/miembros`);
            document.getElementById("inputMiembroObservacion").innerHTML = miembros
                .filter((m) => m.id !== perfilActual.id)
                .map((m) => `<option value="${m.id}">${m.nombre}</option>`).join("");
        } catch (error) {
            console.error(error);
        }
    }

    actualizarTodoPolling();
    intervaloPolling = setInterval(actualizarTodoPolling, POLLING_MS);

    iniciarOnboardingSiEsNecesario();
}

function actualizarTodoPolling() {
    cargarMisIncidentes();
    cargarSolicitudes();
    cargarTareas();
    cargarObservaciones();
    cargarEstadoEvento();
    cargarAvisosInternos();
    cargarObjetosPerdidosLogistica();
}

// Avisos dirigidos puntualmente a este usuario (ej. "tu actividad fue
// cancelada") — separado de la barra de solicitudes de ayuda entre ramas
// para no pisarse con ella.
async function cargarAvisosInternos() {

    try {

        const { avisos } = await peticionApi("/api/avisos-internos");
        const contenedor = document.getElementById("avisosInternosBarra");

        contenedor.innerHTML = avisos.map((a) => `
            <div class="alerta-chip" data-aviso-interno="${a.id}">
                <span>🔔 ${a.mensaje}</span>
            </div>
        `).join("");

        contenedor.querySelectorAll("[data-aviso-interno]").forEach((chip) => {
            chip.addEventListener("click", async () => {
                await peticionApi(`/api/avisos-internos/${chip.dataset.avisoInterno}/leido`, { method: "POST" }).catch(() => {});
                chip.remove();
            });
        });

    } catch (error) {
        console.error(error);
    }

}

// Solo lectura — activar/desactivar la alerta extrema es exclusivo de admin
// desde el panel de Centro de Control.
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

async function cargarRamas() {

    try {
        const { ramas } = await peticionApi("/api/centro-control/ramas");
        ramasDisponibles = ramas;
        mapaRamas = Object.fromEntries(ramas.map((r) => [r.id, r.nombre]));

        document.getElementById("inputRamaDestinoSolicitud").innerHTML =
            ramas.map((r) => `<option value="${r.id}">${r.nombre}</option>`).join("") +
            `<option value="todas">🆘 Todas las ramas (urgente)</option>`;

    } catch (error) {
        console.error(error);
    }

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
        fetch(`${API_BASE}/api/intentos-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        }).catch(() => {});
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

document.getElementById("btnAyudaRoles").addEventListener("click", () => {
    document.getElementById("panelAyudaRoles").classList.toggle("oculto");
});

document.getElementById("btnCerrarAyudaRoles").addEventListener("click", () => {
    document.getElementById("panelAyudaRoles").classList.add("oculto");
});

// ==========================
// Tour guiado — resalta el elemento REAL de la pantalla que se está
// explicando (con un resplandor + el resto de la pantalla oscurecido) y un
// cuadro de texto que flota al lado suyo, en vez de un modal genérico
// centrado. Se muestra solo una vez por dispositivo/navegador (no hay nada
// que sincronizar con el servidor), y se puede volver a abrir con 🎓. Al
// terminar (o saltar), todo vuelve exactamente a como estaba: se quita el
// resaltado, se borra cualquier texto de ejemplo que se haya puesto, y se
// vuelve a la pestaña donde estaba el usuario antes de empezar.
// ==========================

const PASOS_TOUR = [

    // ===== Bienvenida =====
    {
        titulo: "Bienvenido al Panel Logístico",
        texto: "Este tour recorre TODO el panel, sección por sección — resaltando cada botón real de la pantalla cuando está visible. Si algo depende de tener un participante seleccionado o de que seas líder de tu rama, te lo explica igual aunque no lo veas resaltado en este momento. Puedes saltarlo cuando quieras y volver a verlo con el botón 🎓.",
        selector: null
    },

    // ===== Barra superior (siempre visible) =====
    {
        titulo: "Tus 5 pestañas",
        texto: "Registro, Comunicación, Tareas, Mi cronograma y Materiales. Vamos a recorrer cada una a fondo, en ese orden.",
        selector: ".tabs-modulo",
        vista: "registro"
    },
    {
        titulo: "Este mismo botón: el tour",
        texto: "El 🎓 abre este tour guiado cuando quieras repasarlo — la primera vez se abre solo, después de eso solo aparece si lo pulsas.",
        selector: "#btnVerTour",
        vista: null
    },
    {
        titulo: "Checklist de turno",
        texto: "El 📋 abre un checklist con dos listas de chequeo — \"Al empezar el turno\" y \"Antes de irte\" — para no olvidar nada. Se guarda solo en tu celular y se reinicia cada día; no es un registro del sistema.",
        selector: "#btnChecklistTurno",
        vista: null
    },
    {
        titulo: "Encuesta de satisfacción (staff)",
        texto: "El 📝 abre tu propia encuesta de satisfacción como parte del equipo — organización, herramientas, comunicación, carga de trabajo. Puedes reenviarla si quieres actualizar tus respuestas.",
        selector: "#btnEncuestaStaff",
        vista: null
    },
    {
        titulo: "¿Qué puedo hacer con mi rol?",
        texto: "El botón \"?\" te recuerda la diferencia entre ser miembro y líder de tu rama, y qué puede hacer cada uno en este panel.",
        selector: "#btnAyudaRoles",
        vista: null
    },
    {
        titulo: "Cerrar sesión",
        texto: "Te saca del panel y vuelve a la pantalla de inicio de sesión.",
        selector: "#btnCerrarSesion",
        vista: null
    },

    // ===== Pestaña Registro: búsqueda =====
    {
        titulo: "Registro — cómo buscar a alguien",
        texto: "Elige si vas a buscar por código, documento o nombre, según el dato que tengas a mano en ese momento.",
        selector: ".tabs-busqueda",
        vista: "registro"
    },
    {
        titulo: "Escribe y pulsa Buscar",
        texto: "Por ejemplo, así se vería si alguien te dice su código por WhatsApp — escribes el dato y pulsas \"Buscar\":",
        selector: "#formBuscar",
        vista: "registro",
        accion: () => {
            const input = document.getElementById("inputBusqueda");
            input.dataset.valorOriginalTour = input.value;
            input.value = "CF-0001";
        },
        revertir: () => {
            const input = document.getElementById("inputBusqueda");
            input.value = input.dataset.valorOriginalTour || "";
            delete input.dataset.valorOriginalTour;
        }
    },
    {
        titulo: "O escanea el QR de la insignia",
        texto: "Más rápido en la llegada masiva: no hay que escribir nada, apuntas la cámara al QR de la insignia del campista y la búsqueda se hace sola.",
        selector: "#btnEscanearQR",
        vista: "registro"
    },
    {
        titulo: "Escanear código de salida",
        texto: "Este es distinto: no busca a nadie, confirma la salida final del evento en un solo paso. Se usa con el código/QR que le aparece al campista al terminar su encuesta de satisfacción (obligatoria para poder salir) — apuntas la cámara y sigue escaneando al siguiente de la fila solo.",
        selector: "#btnEscanearSalida",
        vista: "registro"
    },
    {
        titulo: "Resultados de la búsqueda",
        texto: "Aquí aparece la lista de coincidencias — toca el resultado correcto para abrir su ficha completa.",
        selector: "#resultados",
        vista: "registro"
    },

    // ===== Pestaña Registro: la ficha =====
    {
        titulo: "La ficha del participante",
        texto: "Al abrir a alguien, arriba de todo ves badges rápidos: si ya ingresó, cuántas entregas de alimentación lleva, en qué carpa está, si es líder de carpa, si está retirado, y si tiene alimentación especial.",
        selector: "#badges",
        vista: "registro"
    },
    {
        titulo: "Datos personales y de salud",
        texto: "Documento, edad, municipio, contactos de emergencia, RH, EPS, condición médica, restricciones alimentarias y alergias — resaltado en rojo lo que necesita atención especial.",
        selector: "#gridInfo",
        vista: "registro"
    },
    {
        titulo: "Ingreso, con requisa policial",
        texto: "Al pulsar \"Registrar ingreso\" se abre primero un mini-formulario de requisa: si no se encontró nada, solo confirmas; si se confiscó algo, lo agregas (objeto, cantidad, descripción) antes de confirmar, y queda guardado en el \"baúl\" con tu nombre.",
        selector: "#bloqueIngreso",
        vista: "registro"
    },
    {
        titulo: "Infracciones",
        texto: "Registras cualquier falta al reglamento con una descripción. Al llegar a la 3ra infracción, aparece un aviso en rojo: se puede descargar el acta de expulsión mutua en PDF (para firmar en papel), y admin/control pueden confirmar la expulsión desde aquí mismo.",
        selector: "#listaInfracciones",
        vista: "registro"
    },
    {
        titulo: "Salida libre",
        texto: "Solo aparece para participantes de Bugalagrande en zona urbana — pueden salir a comer, dormir o trabajar en su casa durante el evento. Registras la salida (con el motivo) y, cuando vuelve, el regreso. No se puede abrir una segunda salida libre mientras la anterior siga activa.",
        selector: "#seccionSalidaLibre",
        vista: "registro"
    },
    {
        titulo: "Asignación de carpa",
        texto: "Tocas la carpa en la cuadrícula (las que ya están llenas se ven distintas y no dejan seleccionarse), marcas si es líder de esa carpa, opcionalmente el motivo si es un cambio, y guardas.",
        selector: "#gridCarpas",
        vista: "registro"
    },
    {
        titulo: "Corregir datos de contacto/salud",
        texto: "Si detectas un dato mal cargado — teléfono, contacto de emergencia, condición médica, restricción alimentaria — lo corriges directamente aquí, y la corrección queda registrada en el historial del participante.",
        selector: "#formDatosCriticos",
        vista: "registro"
    },
    {
        titulo: "Alimentación",
        texto: "La lista de las 9 comidas del evento (desayunos, almuerzos, cenas y refrigerios). Pulsas \"Marcar\" junto a la que acabas de entregar — queda con la hora exacta y ya no se puede desmarcar por error.",
        selector: "#checklistAlimentacion",
        vista: "registro"
    },
    {
        titulo: "Salida final del evento",
        texto: "Es la contraparte del ingreso, al terminar el camp. Ahora exige que el participante ya haya completado su encuesta de satisfacción — si no la completó, este botón se bloquea y te lo avisa. Lo más rápido para registrar la salida es escanear su código (📤, ya lo vimos) en vez de usar este botón manual, que es más bien un respaldo por si el escaneo falla.",
        selector: "#bloqueSalidaEvento",
        vista: "registro"
    },
    {
        titulo: "Historial",
        texto: "El registro cronológico de todo lo que se ha hecho con ese participante — ingreso, requisa, carpa, alimentación, infracciones, salidas — con quién lo hizo y a qué hora.",
        selector: "#historial",
        vista: "registro"
    },

    // ===== Pestaña Comunicación =====
    {
        titulo: "Comunicación — reportar un incidente",
        texto: "El puente con el Centro de Control: elige categoría (te muestra automáticamente quién lo atiende), prioridad, zona y lugar específico, opcionalmente vincula a un campista afectado, y describe qué pasó.",
        selector: "#btnAbrirFormIncidente",
        vista: "comunicacion"
    },
    {
        titulo: "Mis incidentes reportados",
        texto: "Todo lo que tú personalmente has reportado, con su código, descripción, prioridad y estado actual — para seguirle el pulso sin preguntarle a nadie.",
        selector: "#listaMisIncidentes",
        vista: "comunicacion"
    },
    {
        titulo: "Objetos perdidos",
        texto: "Distinto de lo confiscado en una requisa: esto es para algo que encontraste suelto en el evento. Lo describes, dices dónde lo encontraste, y queda disponible para que alguien lo reclame.",
        selector: "#formObjetoPerdido",
        vista: "comunicacion"
    },
    {
        titulo: "Pedir ayuda a otra rama",
        texto: "Exclusivo de líderes de rama: pides ayuda a otro equipo (cuántas personas necesitas, para qué, y opcionalmente el detalle) — les llega como una solicitud que pueden aceptar.",
        selector: "#tarjetaPedirAyuda",
        vista: "comunicacion"
    },
    {
        titulo: "Solicitudes para mi rama",
        texto: "Las peticiones de ayuda que otras ramas te han hecho a ti — cada una es una tarjeta que se despliega con el detalle y quién ya se anotó a ayudar.",
        selector: "#listaSolicitudesRecibidas",
        vista: "comunicacion"
    },
    {
        titulo: "Solicitudes que yo pedí",
        texto: "El estado de las ayudas que tu rama ha pedido a otras — cuántos se han anotado y si ya se completó.",
        selector: "#listaSolicitudesEnviadas",
        vista: "comunicacion"
    },

    // ===== Pestaña Tareas =====
    {
        titulo: "Tareas — crear una nueva",
        texto: "Exclusivo de líderes: le asignas una tarea a tu propia rama, con título, detalle y opcionalmente la hora en que debe estar lista.",
        selector: "#tarjetaCrearTarea",
        vista: "tareas"
    },
    {
        titulo: "Tareas de mi rama",
        texto: "Cada tarea es una tarjeta que se despliega al tocarla: quién ya participó, las subtareas, y los comentarios. Si tienes una subtarea asignada a tu nombre, la marcas como hecha desde ahí mismo.",
        selector: "#listaTareas",
        vista: "tareas"
    },
    {
        titulo: "Escribir una observación",
        texto: "Exclusivo de líderes: le dejas una nota sobre el desempeño de alguien de tu rama (positiva, neutral o negativa) — esa persona puede responderla y confirmar que la leyó.",
        selector: "#tarjetaEscribirObservacion",
        vista: "tareas"
    },
    {
        titulo: "Mis observaciones",
        texto: "Las observaciones que tu líder te ha escrito a ti — puedes responderlas y marcarlas como leídas.",
        selector: "#listaObservaciones",
        vista: "tareas"
    },

    // ===== Pestaña Mi cronograma =====
    {
        titulo: "Mi cumplimiento",
        texto: "Exclusivo de líderes: un indicador de cuántas subtareas de tu rama se completaron a tiempo versus tarde — para tener una idea rápida de cómo va el equipo.",
        selector: "#tarjetaMiCumplimiento",
        vista: "cronograma"
    },
    {
        titulo: "Actividades del evento",
        texto: "La lista completa del cronograma, con horarios y si el montaje/finalización ya quedaron listos. Al tocar una actividad se abre su detalle con las tareas de tu rama para esa actividad puntual, y (si eres líder) los botones para marcar montaje y finalización.",
        selector: "#listaActividadesCronograma",
        vista: "cronograma"
    },

    // ===== Pestaña Materiales =====
    {
        titulo: "Inventario de materiales",
        texto: "El catálogo completo, filtrable por objetivo y ubicación — qué hay, cuánto, y quién lo tiene actualmente asignado.",
        selector: "#listaCatalogoMateriales",
        vista: "materiales"
    },
    {
        titulo: "Mis lotes asignados",
        texto: "Exclusivo de líderes: los materiales que tu rama ya tiene en su poder. Desde aquí devuelves lo que ya no necesitas, reportando cuánto vuelve en buen estado, dañado o perdido.",
        selector: "#tarjetaMisLotesMaterial",
        vista: "materiales"
    },
    {
        titulo: "Solicitar materiales",
        texto: "Cualquier miembro de una rama puede pedir materiales: marcas lo que necesitas y la cantidad, opcionalmente lo vinculas a una actividad y dices para cuándo lo necesitas. Cuando se entrega, el lote queda a nombre del líder de tu rama, sin importar quién lo pidió.",
        selector: "#tarjetaSolicitarMaterial",
        vista: "materiales"
    },
    {
        titulo: "Solicitudes de materiales",
        texto: "El estado de lo que tu rama ha pedido — pendiente, aprobada o entregada (o rechazada) — con la opción de ver solo las tuyas o las de toda tu rama.",
        selector: "#tarjetaMisSolicitudesMaterial",
        vista: "materiales"
    },

    // ===== Cierre =====
    {
        titulo: "¡Listo, ya viste todo el panel!",
        texto: "Repasaste las 5 pestañas completas, la ficha del participante entera, y todos los botones de la barra superior. Puedes volver a ver este tour cuando quieras con el botón 🎓 de arriba.",
        selector: null
    }

];

let indiceTourActual = 0;
let elementoResaltadoTour = null;
let vistaAntesDelTour = null;

function limpiarPasoTourActual() {

    if (elementoResaltadoTour) {
        elementoResaltadoTour.classList.remove("tour-resaltado");
        elementoResaltadoTour = null;
    }

    const pasoQueSeVa = PASOS_TOUR[indiceTourActual];
    if (pasoQueSeVa && pasoQueSeVa.revertir) pasoQueSeVa.revertir();

}

function posicionarCuadroTour(target) {

    const cuadro = document.getElementById("tourCuadro");
    cuadro.classList.remove("oculto");
    const cuadroRect = cuadro.getBoundingClientRect();

    if (!target) {
        cuadro.style.transform = "translate(-50%, -50%)";
        cuadro.style.top = "50%";
        cuadro.style.left = "50%";
        return;
    }

    cuadro.style.transform = "none";

    const rect = target.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - rect.bottom;
    const ponerArriba = espacioAbajo < (cuadroRect.height + 20) && rect.top > espacioAbajo;

    const top = ponerArriba
        ? Math.max(10, rect.top - cuadroRect.height - 14)
        : Math.min(rect.bottom + 14, window.innerHeight - cuadroRect.height - 10);

    const left = Math.min(Math.max(10, rect.left), window.innerWidth - cuadroRect.width - 10);

    cuadro.style.top = `${top}px`;
    cuadro.style.left = `${left}px`;

}

// Muchas secciones del panel solo existen mientras hay un participante
// seleccionado (ficha) o son exclusivas de líder de rama — en vez de que el
// paso falle o resalte algo invisible, se revisa si el elemento (o algún
// contenedor suyo) tiene "oculto"; si es así, el paso cae solo al modo
// centrado, con el mismo texto explicando el concepto de todas formas.
function elementoTourVisible(selector) {

    if (!selector) return null;

    const elemento = document.querySelector(selector);
    if (!elemento) return null;

    let nodo = elemento;
    while (nodo) {
        if (nodo.classList && nodo.classList.contains("oculto")) return null;
        nodo = nodo.parentElement;
    }

    return elemento;

}

function irAPasoTour(indice) {

    limpiarPasoTourActual();
    indiceTourActual = indice;

    const paso = PASOS_TOUR[indice];

    if (paso.vista) {
        const tab = document.querySelector(`.tab-modulo[data-vista="${paso.vista}"]`);
        if (tab && !tab.classList.contains("activo")) tab.click();
    }

    document.getElementById("pasoTourNumero").textContent = `Paso ${indice + 1} de ${PASOS_TOUR.length}`;
    document.getElementById("tourTitulo").textContent = paso.titulo;
    document.getElementById("tourTexto").textContent = paso.texto;
    document.getElementById("btnAnteriorTour").classList.toggle("oculto", indice === 0);
    document.getElementById("btnSiguienteTour").textContent = indice === PASOS_TOUR.length - 1 ? "Terminar" : "Siguiente";

    const target = elementoTourVisible(paso.selector);
    const fondo = document.getElementById("tourFondo");

    if (target) {

        fondo.classList.add("oculto");
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("tour-resaltado");
        elementoResaltadoTour = target;

        // Se espera a que termine el scroll suave antes de medir dónde
        // quedó el elemento — si se mide antes, el cuadro queda mal ubicado.
        setTimeout(() => posicionarCuadroTour(target), 320);

    } else {

        fondo.classList.remove("oculto");
        posicionarCuadroTour(null);

    }

    if (paso.accion) paso.accion();

}

function abrirTour() {
    vistaAntesDelTour = document.querySelector(".tab-modulo.activo")?.dataset.vista || "registro";
    irAPasoTour(0);
}

function cerrarTour() {

    limpiarPasoTourActual();

    document.getElementById("tourFondo").classList.add("oculto");
    document.getElementById("tourCuadro").classList.add("oculto");

    if (vistaAntesDelTour) {
        const tab = document.querySelector(`.tab-modulo[data-vista="${vistaAntesDelTour}"]`);
        if (tab && !tab.classList.contains("activo")) tab.click();
    }

    localStorage.setItem("cf_onboarding_completado", "true");

}

function iniciarOnboardingSiEsNecesario() {
    if (!localStorage.getItem("cf_onboarding_completado")) abrirTour();
}

document.getElementById("btnVerTour").addEventListener("click", abrirTour);
document.getElementById("btnSaltarTour").addEventListener("click", cerrarTour);

document.getElementById("btnSiguienteTour").addEventListener("click", () => {
    if (indiceTourActual === PASOS_TOUR.length - 1) {
        cerrarTour();
        return;
    }
    irAPasoTour(indiceTourActual + 1);
});

document.getElementById("btnAnteriorTour").addEventListener("click", () => {
    if (indiceTourActual === 0) return;
    irAPasoTour(indiceTourActual - 1);
});

// ==========================
// Checklist de apertura/cierre de turno — recordatorio personal guardado en
// este dispositivo (localStorage), se reinicia cada día; no es un registro
// del sistema, así que no necesita ningún endpoint nuevo en el backend.
// ==========================

const CHECKLIST_APERTURA = [
    "Probé que la cámara abre para escanear el QR de las insignias",
    "Revisé si hay una alerta extrema o modo evento activo",
    "Revisé los materiales ya asignados a mi rama (pestaña Materiales)",
    "Revisé las tareas pendientes de mi rama"
];

const CHECKLIST_CIERRE = [
    "No quedan participantes con ingreso a medias por registrar",
    "Devolví o dejé anotado lo que falta devolver de materiales",
    "Le avisé al Centro de Control cualquier novedad pendiente",
    "Revisé que no queden solicitudes de ayuda de mi rama sin responder"
];

function claveChecklistHoy() {
    const hoy = new Date().toISOString().slice(0, 10);
    return `cf_checklist_turno_${hoy}`;
}

function cargarEstadoChecklist() {
    try {
        return JSON.parse(localStorage.getItem(claveChecklistHoy())) || {};
    } catch (error) {
        return {};
    }
}

function renderizarChecklistTurno() {

    const estado = cargarEstadoChecklist();

    const renderGrupo = (contenedorId, items, prefijo) => {
        document.getElementById(contenedorId).innerHTML = items.map((texto, indice) => {
            const clave = `${prefijo}${indice}`;
            const marcado = !!estado[clave];
            return `
                <label style="display:flex; align-items:flex-start; gap:8px; padding:6px 0; font-size:13.5px; cursor:pointer;">
                    <input type="checkbox" data-checklist="${clave}" ${marcado ? "checked" : ""} style="margin-top:3px;">
                    <span style="${marcado ? "text-decoration:line-through; color:#999;" : ""}">${texto}</span>
                </label>
            `;
        }).join("");
    };

    renderGrupo("checklistApertura", CHECKLIST_APERTURA, "apertura-");
    renderGrupo("checklistCierre", CHECKLIST_CIERRE, "cierre-");

    document.querySelectorAll("#overlayChecklist [data-checklist]").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            const estadoActual = cargarEstadoChecklist();
            estadoActual[checkbox.dataset.checklist] = checkbox.checked;
            localStorage.setItem(claveChecklistHoy(), JSON.stringify(estadoActual));
            renderizarChecklistTurno();
        });
    });

}

document.getElementById("btnChecklistTurno").addEventListener("click", () => {
    renderizarChecklistTurno();
    document.getElementById("overlayChecklist").classList.remove("oculto");
});

document.getElementById("btnCerrarChecklist").addEventListener("click", () => {
    document.getElementById("overlayChecklist").classList.add("oculto");
});

// ==========================
// Encuesta de satisfacción (staff) — mismo motor de preguntas dinámicas que
// el portal del campista, pero con las clases de esta app (.boton en vez de
// .cf-btn). El estado "seleccionado" se marca con estilos inline, sin tocar
// la hoja de estilos compartida.
// ==========================

let respuestasEncuestaStaff = {};

function marcarBotonEncuestaSeleccionado(boton) {
    const grupo = boton.parentElement;
    grupo.querySelectorAll(".boton-encuesta").forEach((b) => {
        b.style.background = "";
        b.style.color = "";
    });
    boton.style.background = "var(--morado)";
    boton.style.color = "#fff";
}

function renderizarPreguntaEncuestaStaff(pregunta, valorActual) {

    let opciones = "";

    if (pregunta.tipo === "rating" || pregunta.tipo === "nps") {
        const max = pregunta.tipo === "rating" ? 5 : 10;
        const min = pregunta.tipo === "rating" ? 1 : 0;
        for (let i = min; i <= max; i++) {
            const activo = valorActual === i;
            opciones += `<button type="button" class="boton pequeno secundario boton-encuesta" data-valor="${i}" style="width:auto; padding:6px 12px;${activo ? " background:var(--morado); color:#fff;" : ""}">${i}</button>`;
        }
    } else if (pregunta.tipo === "opcion") {
        pregunta.opciones.forEach((op) => {
            const activo = valorActual === op;
            opciones += `<button type="button" class="boton pequeno secundario boton-encuesta" data-valor="${op}" style="width:auto; padding:6px 12px;${activo ? " background:var(--morado); color:#fff;" : ""}">${op}</button>`;
        });
    }

    if (pregunta.tipo === "texto") {
        return `
            <div class="dato" data-pregunta-staff="${pregunta.codigo}" style="margin-bottom:14px;">
                <span class="etiqueta">${pregunta.texto}</span>
                <textarea class="input-texto-encuesta-staff" rows="3" style="width:100%; margin-top:6px; padding:8px; border:2px solid #ddd; border-radius:8px; font-family:inherit;">${valorActual || ""}</textarea>
            </div>
        `;
    }

    return `
        <div class="dato" data-pregunta-staff="${pregunta.codigo}" style="margin-bottom:14px;">
            <span class="etiqueta">${pregunta.texto}</span>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">${opciones}</div>
        </div>
    `;

}

async function cargarEncuestaStaff() {

    const contenedor = document.getElementById("contenedorEncuestaStaff");

    try {

        const [{ preguntas }, { respuesta: yaRespondida }] = await Promise.all([
            peticionApi("/api/encuestas/staff/preguntas"),
            peticionApi("/api/encuestas/staff/mi-respuesta")
        ]);

        respuestasEncuestaStaff = yaRespondida ? { ...yaRespondida.respuestas } : {};

        const aviso = yaRespondida
            ? `<div class="mensaje mostrar ok" style="margin-bottom:12px;">Ya respondiste esta encuesta — puedes actualizarla y reenviarla.</div>`
            : "";

        contenedor.innerHTML = aviso
            + preguntas.map((p) => renderizarPreguntaEncuestaStaff(p, respuestasEncuestaStaff[p.codigo])).join("")
            + `<button class="boton pequeno" id="btnEnviarEncuestaStaff" style="margin-top:6px;">Enviar encuesta</button>
               <div class="mensaje" id="mensajeEncuestaStaff"></div>`;

        preguntas.forEach((pregunta) => {

            const bloque = contenedor.querySelector(`[data-pregunta-staff="${pregunta.codigo}"]`);

            if (pregunta.tipo === "texto") {
                bloque.querySelector(".input-texto-encuesta-staff").addEventListener("input", (evento) => {
                    respuestasEncuestaStaff[pregunta.codigo] = evento.target.value;
                });
                return;
            }

            bloque.querySelectorAll(".boton-encuesta").forEach((boton) => {
                boton.addEventListener("click", () => {
                    marcarBotonEncuestaSeleccionado(boton);
                    respuestasEncuestaStaff[pregunta.codigo] = pregunta.tipo === "opcion" ? boton.dataset.valor : Number(boton.dataset.valor);
                });
            });

        });

        document.getElementById("btnEnviarEncuestaStaff").addEventListener("click", async () => {

            const mensaje = document.getElementById("mensajeEncuestaStaff");

            try {
                await peticionApi("/api/encuestas/staff", {
                    method: "POST",
                    body: JSON.stringify({ respuestas: respuestasEncuestaStaff })
                });
                mostrarMensaje(mensaje, "¡Gracias por responder la encuesta!", "ok");
            } catch (error) {
                mostrarMensaje(mensaje, error.message, "fallo");
            }

        });

    } catch (error) {
        contenedor.innerHTML = `<p class="detalle">No se pudo cargar la encuesta.</p>`;
    }

}

document.getElementById("btnEncuestaStaff").addEventListener("click", () => {
    document.getElementById("overlayEncuestaStaff").classList.remove("oculto");
    cargarEncuestaStaff();
});

document.getElementById("btnCerrarEncuestaStaff").addEventListener("click", () => {
    document.getElementById("overlayEncuestaStaff").classList.add("oculto");
});

// ==========================
// Navegación entre pestañas
// ==========================

document.querySelectorAll(".tab-modulo").forEach((tab) => {

    tab.addEventListener("click", () => {

        document.querySelectorAll(".tab-modulo").forEach((t) => t.classList.remove("activo"));
        tab.classList.add("activo");

        const vista = tab.dataset.vista;

        document.getElementById("vistaRegistro").classList.toggle("oculto", vista !== "registro");
        document.getElementById("vistaComunicacion").classList.toggle("oculto", vista !== "comunicacion");
        document.getElementById("vistaTareas").classList.toggle("oculto", vista !== "tareas");
        document.getElementById("vistaCronograma").classList.toggle("oculto", vista !== "cronograma");
        document.getElementById("vistaMateriales").classList.toggle("oculto", vista !== "materiales");

        if (vista === "cronograma") cargarCronograma();
        if (vista === "materiales") cargarMateriales();

    });

});

// ==========================
// Búsqueda de participantes
// ==========================

const PLACEHOLDERS_BUSQUEDA = {
    codigo: "Ingresa el código enviado por WhatsApp",
    documento: "Ingresa el número de documento",
    nombre: "Ingresa el nombre del participante"
};

function activarCampoBusqueda(campo) {

    tabsBusqueda.forEach((t) => t.classList.toggle("activo", t.dataset.campo === campo));
    campoBusquedaActivo = campo;
    inputBusqueda.placeholder = PLACEHOLDERS_BUSQUEDA[campoBusquedaActivo];

}

tabsBusqueda.forEach((tab) => {
    tab.addEventListener("click", () => activarCampoBusqueda(tab.dataset.campo));
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
                <div class="nombre">${participante.nombre}${participante.retirado ? ` <span class="estado-badge escalado">Retirado</span>` : ""}</div>
                <div class="detalle">${participante.documento} · ${participante.municipio || ""}</div>
            </div>
        `;

        item.addEventListener("click", () => seleccionarParticipante(participante.id));

        resultados.appendChild(item);

    });

}

// ==========================
// Escaneo de QR por cámara — antes el registro de ingreso era 100% búsqueda
// manual de texto (código/documento/nombre escrito a mano), lo más lento de
// todo el panel justo en el momento de mayor volumen (llegada masiva). La
// insignia descargable del portal del campista ahora incluye un QR con el
// código CF-; esto lo lee con la cámara del celular y dispara la misma
// búsqueda por código automáticamente. Usa jsQR (vendorizado en
// scripts/jsQR.js, sin CDN) para decodificar cada frame del video.
// ==========================

const overlayEscanerQR = document.getElementById("overlayEscanerQR");
const videoEscanerQR = document.getElementById("videoEscanerQR");
const btnEscanearQR = document.getElementById("btnEscanearQR");
const btnCerrarEscanerQR = document.getElementById("btnCerrarEscanerQR");
const mensajeEscanerQR = document.getElementById("mensajeEscanerQR");

const canvasEscanerQR = document.createElement("canvas");
const ctxEscanerQR = canvasEscanerQR.getContext("2d", { willReadFrequently: true });

let streamEscanerQR = null;
let escaneando = false;

async function abrirEscanerQR() {

    if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
        mostrarMensaje(mensajeBusqueda, "Este navegador no permite acceso a la cámara. Busca manualmente.", "fallo");
        return;
    }

    overlayEscanerQR.classList.remove("oculto");
    ocultarMensaje(mensajeEscanerQR);

    try {

        streamEscanerQR = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        videoEscanerQR.srcObject = streamEscanerQR;
        await videoEscanerQR.play();

        escaneando = true;
        requestAnimationFrame(cicloEscanerQR);

    } catch (error) {
        mostrarMensaje(mensajeEscanerQR, "No se pudo abrir la cámara: " + error.message, "fallo");
    }

}

function cerrarEscanerQR() {

    escaneando = false;
    overlayEscanerQR.classList.add("oculto");

    if (streamEscanerQR) {
        streamEscanerQR.getTracks().forEach((track) => track.stop());
        streamEscanerQR = null;
    }

}

function cicloEscanerQR() {

    if (!escaneando) return;

    if (videoEscanerQR.readyState === videoEscanerQR.HAVE_ENOUGH_DATA) {

        canvasEscanerQR.width = videoEscanerQR.videoWidth;
        canvasEscanerQR.height = videoEscanerQR.videoHeight;
        ctxEscanerQR.drawImage(videoEscanerQR, 0, 0, canvasEscanerQR.width, canvasEscanerQR.height);

        const imagen = ctxEscanerQR.getImageData(0, 0, canvasEscanerQR.width, canvasEscanerQR.height);
        const resultado = jsQR(imagen.data, imagen.width, imagen.height);

        if (resultado && resultado.data) {

            const codigo = resultado.data.trim();
            cerrarEscanerQR();

            activarCampoBusqueda("codigo");
            inputBusqueda.value = codigo;
            formBuscar.requestSubmit();

            return;

        }

    }

    requestAnimationFrame(cicloEscanerQR);

}

btnEscanearQR.addEventListener("click", abrirEscanerQR);
btnCerrarEscanerQR.addEventListener("click", cerrarEscanerQR);

// ==========================
// Escaneo del código de salida — se genera cuando el campista termina la
// encuesta de satisfacción (obligatoria antes de poder irse). A diferencia
// del escáner de ingreso, este no busca ni abre una ficha: confirma la
// salida directamente con un solo escaneo, pensado para una fila de gente
// saliendo al mismo tiempo. Mismo mecanismo de cámara + jsQR que el de
// arriba, duplicado a propósito para no arriesgar el escáner de ingreso
// que ya funciona.
// ==========================

const overlayEscanerSalida = document.getElementById("overlayEscanerSalida");
const videoEscanerSalida = document.getElementById("videoEscanerSalida");
const btnEscanearSalida = document.getElementById("btnEscanearSalida");
const btnCerrarEscanerSalida = document.getElementById("btnCerrarEscanerSalida");
const mensajeEscanerSalida = document.getElementById("mensajeEscanerSalida");

const canvasEscanerSalida = document.createElement("canvas");
const ctxEscanerSalida = canvasEscanerSalida.getContext("2d", { willReadFrequently: true });

let streamEscanerSalida = null;
let escaneandoSalida = false;

async function abrirEscanerSalida() {

    if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
        mostrarMensaje(mensajeEscanerSalida, "Este navegador no permite acceso a la cámara.", "fallo");
        return;
    }

    overlayEscanerSalida.classList.remove("oculto");
    ocultarMensaje(mensajeEscanerSalida);

    try {

        streamEscanerSalida = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        videoEscanerSalida.srcObject = streamEscanerSalida;
        await videoEscanerSalida.play();

        escaneandoSalida = true;
        requestAnimationFrame(cicloEscanerSalida);

    } catch (error) {
        mostrarMensaje(mensajeEscanerSalida, "No se pudo abrir la cámara: " + error.message, "fallo");
    }

}

function cerrarEscanerSalida() {

    escaneandoSalida = false;
    overlayEscanerSalida.classList.add("oculto");

    if (streamEscanerSalida) {
        streamEscanerSalida.getTracks().forEach((track) => track.stop());
        streamEscanerSalida = null;
    }

}

function cicloEscanerSalida() {

    if (!escaneandoSalida) return;

    if (videoEscanerSalida.readyState === videoEscanerSalida.HAVE_ENOUGH_DATA) {

        canvasEscanerSalida.width = videoEscanerSalida.videoWidth;
        canvasEscanerSalida.height = videoEscanerSalida.videoHeight;
        ctxEscanerSalida.drawImage(videoEscanerSalida, 0, 0, canvasEscanerSalida.width, canvasEscanerSalida.height);

        const imagen = ctxEscanerSalida.getImageData(0, 0, canvasEscanerSalida.width, canvasEscanerSalida.height);
        const resultado = jsQR(imagen.data, imagen.width, imagen.height);

        if (resultado && resultado.data) {
            escaneandoSalida = false; // se pausa mientras se confirma; se reactiva sola abajo
            confirmarSalidaEscaneada(resultado.data.trim());
            return;
        }

    }

    requestAnimationFrame(cicloEscanerSalida);

}

async function confirmarSalidaEscaneada(codigo) {

    try {

        const resultado = await peticionApi("/api/logistica/salida-por-codigo", {
            method: "POST",
            body: JSON.stringify({ codigo })
        });

        mostrarMensaje(mensajeEscanerSalida, `✅ Salida registrada: ${resultado.nombre}`, "ok");

    } catch (error) {
        mostrarMensaje(mensajeEscanerSalida, error.message, "fallo");
    }

    // Sigue escaneando al siguiente en la fila sin que el staff tenga que
    // volver a pulsar nada — la cámara nunca se cierra entre una persona y la siguiente.
    setTimeout(() => {
        if (!overlayEscanerSalida.classList.contains("oculto")) {
            escaneandoSalida = true;
            requestAnimationFrame(cicloEscanerSalida);
        }
    }, 2200);

}

btnEscanearSalida.addEventListener("click", abrirEscanerSalida);
btnCerrarEscanerSalida.addEventListener("click", cerrarEscanerSalida);

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

    const {
        participante, servicios, entregas, totalServicios, entregasRealizadas, historial: eventos,
        elegibleSalidaLibre, salidaLibreActiva, infracciones, totalInfracciones, objetosConfiscados,
        encuestaCompletada
    } = datos;

    fichaNombre.textContent = participante.nombre;
    fichaDocumento.textContent = `Documento: ${participante.documento}`;

    renderizarBadges(participante, entregasRealizadas, totalServicios);
    renderizarInfo(participante);
    document.getElementById("inputTelefonoCritico").value = participante.telefono || "";
    document.getElementById("inputContactoEmergenciaNombreCritico").value = participante.contacto_emergencia_nombre || "";
    document.getElementById("inputContactoEmergenciaTelefonoCritico").value = participante.contacto_emergencia_telefono || "";
    document.getElementById("inputCondicionMedicaCritico").value = participante.condicion_medica_detalle || "";
    document.getElementById("inputRestriccionAlimentariaCritico").value = participante.restricciones_alimentarias_detalle || "";
    renderizarIngreso(participante, objetosConfiscados || []);
    renderizarInfracciones(infracciones || [], totalInfracciones || 0, participante);
    renderizarSalidaLibre(elegibleSalidaLibre, salidaLibreActiva);

    carpaSeleccionada = participante.carpa_asignada || null;
    renderizarGridCarpas();
    checkboxLider.checked = !!participante.es_lider_carpa;

    actualizarMensajeParticipanteVinculado();

    tituloAlimentacion.textContent = `Alimentación (${entregasRealizadas}/${totalServicios})`
        + (participante.tiene_restricciones_alimentarias ? ` — ⚠️ ${participante.restricciones_alimentarias_detalle || "restricción alimentaria"}` : "");
    renderizarAlimentacion(servicios, entregas);

    renderizarSalidaEvento(participante, encuestaCompletada);

    renderizarHistorial(eventos);

}

function renderizarBadges(participante, entregasRealizadas, totalServicios) {

    const ingresoBadge = participante.ingreso_registrado
        ? `<span class="badge verde">🟢 Ingresó</span>`
        : `<span class="badge rojo">🔴 Pendiente de ingreso</span>`;

    const alimentacionBadge = `<span class="badge neutro">${entregasRealizadas}/${totalServicios} entregas</span>`;

    const carpaBadge = `<span class="badge neutro">Carpa: ${participante.carpa_asignada || "sin asignar"}</span>`;

    const liderBadge = `<span class="badge neutro">Líder de carpa: ${participante.es_lider_carpa ? "Sí" : "No"}</span>`;

    const retiradoBadge = participante.retirado ? `<span class="badge rojo">⚠️ Retirado</span>` : "";
    const alimentacionEspecialBadge = participante.tiene_restricciones_alimentarias ? `<span class="badge rojo">🍽️ Alimentación especial</span>` : "";

    badges.innerHTML = retiradoBadge + ingresoBadge + alimentacionBadge + carpaBadge + liderBadge + alimentacionEspecialBadge;

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

function filaObjetoRequisaHtml() {
    return `
        <div class="fila-objeto-requisa" style="display:flex; gap:6px; margin-bottom:6px; flex-wrap:wrap; align-items:end;">
            <input type="text" class="input-objeto-requisa" placeholder="Objeto" style="flex:2; min-width:120px; padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
            <input type="number" class="input-cantidad-requisa" placeholder="Cant." value="1" min="1" style="width:70px; padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
            <input type="text" class="input-descripcion-requisa" placeholder="Descripción (opcional)" style="flex:2; min-width:120px; padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
            <button type="button" class="boton pequeno secundario btn-quitar-objeto-requisa" style="width:auto; padding:4px 10px; font-size:11px;">Quitar</button>
        </div>
    `;
}

function agregarFilaObjetoRequisa() {

    const contenedor = document.getElementById("filasObjetosRequisa");
    contenedor.insertAdjacentHTML("beforeend", filaObjetoRequisaHtml());

    const filas = contenedor.querySelectorAll(".fila-objeto-requisa");
    const nueva = filas[filas.length - 1];

    nueva.querySelector(".btn-quitar-objeto-requisa").addEventListener("click", () => nueva.remove());

}

function renderizarIngreso(participante, objetosConfiscados) {

    if (participante.ingreso_registrado) {

        const listaObjetos = objetosConfiscados.length === 0
            ? ""
            : `
                <div style="margin-top:8px;">
                    <span class="etiqueta">Objetos confiscados en la requisa</span>
                    ${objetosConfiscados.map((o) => `
                        <div class="incidente-mini">
                            <div>
                                <span class="codigo">${o.objeto} (x${o.cantidad})</span>
                                ${o.descripcion ? `<div class="descripcion">${o.descripcion}</div>` : ""}
                            </div>
                            <span class="badge ${o.devuelto ? "verde" : "neutro"}">${o.devuelto ? "Devuelto" : "En baúl"}</span>
                        </div>
                    `).join("")}
                </div>
            `;

        bloqueIngreso.innerHTML = `<span class="badge verde">Ingresó a las ${formatearHora(participante.hora_ingreso)}</span>${listaObjetos}`;
        return;

    }

    bloqueIngreso.innerHTML = `
        <button class="boton pequeno" id="btnRegistrarIngreso">Registrar ingreso</button>
        <div class="oculto" id="formRequisaIngreso" style="margin-top:10px;">
            <p class="detalle" style="margin-bottom:6px;">Requisa policial — si se encontró algo, agrégalo antes de confirmar el ingreso.</p>
            <div id="filasObjetosRequisa"></div>
            <button type="button" class="boton pequeno secundario" id="btnAgregarObjetoRequisa" style="width:auto; margin-top:4px;">+ Agregar objeto</button>
            <div style="margin-top:10px;">
                <button type="button" class="boton pequeno" id="btnConfirmarIngresoConRequisa" style="width:auto;">Confirmar ingreso</button>
            </div>
        </div>
    `;

    document.getElementById("btnRegistrarIngreso").addEventListener("click", (evento) => {
        evento.target.classList.add("oculto");
        document.getElementById("formRequisaIngreso").classList.remove("oculto");
    });

    document.getElementById("btnAgregarObjetoRequisa").addEventListener("click", agregarFilaObjetoRequisa);

    document.getElementById("btnConfirmarIngresoConRequisa").addEventListener("click", async () => {

        const objetos = Array.from(document.querySelectorAll(".fila-objeto-requisa")).map((fila) => ({
            objeto: fila.querySelector(".input-objeto-requisa").value.trim(),
            cantidad: fila.querySelector(".input-cantidad-requisa").value,
            descripcion: fila.querySelector(".input-descripcion-requisa").value.trim()
        })).filter((o) => o.objeto !== "");

        try {
            await peticionApi(`/api/logistica/participante/${participanteActualId}/ingreso`, {
                method: "POST",
                body: JSON.stringify({ objetosConfiscados: objetos })
            });
            mostrarMensaje(mensajeFicha, "Ingreso registrado correctamente", "ok");
            await seleccionarParticipante(participanteActualId);
        } catch (error) {
            mostrarMensaje(mensajeFicha, error.message, "fallo");
        }

    });

}

//==========================
// Infracciones — a la 3ra se debe firmar el acta de expulsión mutua.
//==========================

function renderizarInfracciones(infracciones, totalInfracciones, participante) {

    const lista = document.getElementById("listaInfracciones");
    const alerta = document.getElementById("alertaExpulsion");

    lista.innerHTML = infracciones.length === 0
        ? `<p class="detalle">Sin infracciones registradas.</p>`
        : infracciones.map((i) => `
            <div class="incidente-mini">
                <div>
                    <span class="codigo">${formatearHora(i.creado_en)}</span>
                    <div class="descripcion">${i.descripcion}</div>
                </div>
                <span class="badge neutro">${i.registrado_por_nombre || "—"}</span>
            </div>
        `).join("");

    if (totalInfracciones >= 3 && !participante.retirado) {

        const puedeConfirmar = perfilActual?.rol === "admin" || perfilActual?.rol === "control";

        alerta.classList.remove("oculto");
        alerta.innerHTML = `
            <div class="alerta-chip" style="display:flex; flex-direction:column; gap:8px; align-items:flex-start; cursor:default;">
                <span>⚠️ Este participante llegó a ${totalInfracciones} infracciones — se debe firmar el acta de expulsión mutua.</span>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="boton pequeno secundario" id="btnDescargarActaExpulsion" style="width:auto;">Descargar acta (PDF)</button>
                    ${puedeConfirmar ? `<button class="boton pequeno" id="btnConfirmarExpulsion" style="width:auto;">Confirmar expulsión firmada</button>` : ""}
                </div>
            </div>
        `;

        document.getElementById("btnDescargarActaExpulsion").addEventListener("click", () => {
            descargarArchivo(`/api/infracciones/participante/${participante.id}/expulsion/pdf`, `Acta-Expulsion-${participante.codigo || participante.id}.pdf`);
        });

        if (puedeConfirmar) {
            document.getElementById("btnConfirmarExpulsion").addEventListener("click", async () => {

                if (!confirm("¿Confirmas que el acta de expulsión mutua ya fue firmada? El participante quedará marcado como retirado.")) return;

                try {
                    await peticionApi(`/api/infracciones/participante/${participante.id}/expulsion/confirmar`, { method: "POST" });
                    mostrarMensaje(mensajeFicha, "Expulsión confirmada", "ok");
                    await seleccionarParticipante(participanteActualId);
                } catch (error) {
                    mostrarMensaje(mensajeFicha, error.message, "fallo");
                }

            });
        }

    } else {
        alerta.classList.add("oculto");
        alerta.innerHTML = "";
    }

    const formNuevaInfraccion = document.getElementById("formNuevaInfraccion");
    formNuevaInfraccion.onsubmit = async (evento) => {

        evento.preventDefault();
        const input = document.getElementById("inputDescripcionInfraccion");
        const descripcion = input.value.trim();
        if (!descripcion) return;

        try {
            await peticionApi("/api/infracciones", {
                method: "POST",
                body: JSON.stringify({ participanteId: participante.id, descripcion })
            });
            input.value = "";
            mostrarMensaje(mensajeFicha, "Infracción registrada correctamente", "ok");
            await seleccionarParticipante(participanteActualId);
        } catch (error) {
            mostrarMensaje(mensajeFicha, error.message, "fallo");
        }

    };

}

const MOTIVOS_SALIDA_LIBRE = [
    { valor: "comer", etiqueta: "Salió a comer" },
    { valor: "dormir", etiqueta: "Salió a dormir" },
    { valor: "trabajar", etiqueta: "Salió a trabajar" }
];

function renderizarSalidaLibre(elegible, salidaActiva) {

    if (!elegible) {
        seccionSalidaLibre.classList.add("oculto");
        return;
    }

    seccionSalidaLibre.classList.remove("oculto");

    if (salidaActiva) {

        bloqueSalidaLibre.innerHTML = `
            <span class="badge neutro">En salida libre desde ${formatearHora(salidaActiva.salida_en)} (motivo: ${salidaActiva.motivo})</span>
            <button class="boton pequeno" id="btnRegresoSalidaLibre" style="margin-top:8px;">Registrar regreso</button>
        `;

        document.getElementById("btnRegresoSalidaLibre").addEventListener("click", async () => {

            if (!confirm("¿Confirmas el regreso de este participante de su salida libre?")) return;

            try {
                await peticionApi(`/api/logistica/participante/${participanteActualId}/salida-libre/regreso`, { method: "POST" });
                mostrarMensaje(mensajeFicha, "Regreso registrado correctamente", "ok");
                await seleccionarParticipante(participanteActualId);
            } catch (error) {
                mostrarMensaje(mensajeFicha, error.message, "fallo");
            }

        });

        return;

    }

    bloqueSalidaLibre.innerHTML = MOTIVOS_SALIDA_LIBRE.map(({ valor, etiqueta }) =>
        `<button class="boton pequeno secundario" data-motivo-salida="${valor}" style="margin-right:8px;">${etiqueta}</button>`
    ).join("");

    bloqueSalidaLibre.querySelectorAll("[data-motivo-salida]").forEach((boton) => {
        boton.addEventListener("click", async () => {

            if (!confirm(`¿Confirmas registrar la salida libre (${boton.textContent.trim()})?`)) return;

            try {
                await peticionApi(`/api/logistica/participante/${participanteActualId}/salida-libre`, {
                    method: "POST",
                    body: JSON.stringify({ motivo: boton.dataset.motivoSalida })
                });
                mostrarMensaje(mensajeFicha, "Salida libre registrada correctamente", "ok");
                await seleccionarParticipante(participanteActualId);
            } catch (error) {
                mostrarMensaje(mensajeFicha, error.message, "fallo");
            }

        });
    });

}

// La contraparte del ingreso, al terminar el evento — distinta de "salida
// libre" (excursión de un día) y de "retirado" (salida anticipada).
function renderizarSalidaEvento(participante, encuestaCompletada) {

    const bloque = document.getElementById("bloqueSalidaEvento");

    if (!participante.ingreso_registrado) {
        bloque.innerHTML = `<p class="detalle">Aún no ha registrado el ingreso — no aplica todavía.</p>`;
        return;
    }

    if (participante.retirado) {
        bloque.innerHTML = `<p class="detalle">Este participante ya está marcado como retirado.</p>`;
        return;
    }

    if (!participante.salida_evento_registrada && !encuestaCompletada) {
        bloque.innerHTML = `<p class="detalle" style="color:var(--coral); font-weight:600;">⚠️ Todavía no completó la encuesta de satisfacción — es obligatoria antes de poder registrar su salida. Lo más rápido es escanear su código de salida cuando la termine (📤 arriba).</p>`;
        return;
    }

    if (participante.salida_evento_registrada) {
        bloque.innerHTML = `
            <span class="badge verde">Salió del evento a las ${formatearHora(participante.salida_evento_en)}</span>
            ${participante.salida_evento_con ? `<div class="detalle" style="margin-top:6px;">Se fue con: ${participante.salida_evento_con}</div>` : ""}
        `;
        return;
    }

    bloque.innerHTML = `
        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:end;">
            <input type="text" id="inputConQuienSaleEvento" placeholder="¿Con quién se va? (opcional)" style="flex:1; min-width:160px; padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
            <button class="boton pequeno" id="btnRegistrarSalidaEvento" style="width:auto;">Registrar salida del evento</button>
        </div>
    `;

    document.getElementById("btnRegistrarSalidaEvento").addEventListener("click", async () => {

        if (!confirm("¿Confirmas que este participante se va del evento? Esta acción marca su salida final.")) return;

        const conQuienSeVa = document.getElementById("inputConQuienSaleEvento").value.trim();

        try {
            await peticionApi(`/api/logistica/participante/${participanteActualId}/salida-evento`, {
                method: "POST",
                body: JSON.stringify({ conQuienSeVa })
            });
            mostrarMensaje(mensajeFicha, "Salida del evento registrada correctamente", "ok");
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
            body: JSON.stringify({
                carpa: carpaSeleccionada,
                esLiderCarpa: checkboxLider.checked,
                motivo: document.getElementById("inputMotivoCambioCarpa").value.trim()
            })
        });

        mostrarMensaje(mensajeFicha, "Asignación guardada correctamente", "ok");
        document.getElementById("inputMotivoCambioCarpa").value = "";
        await seleccionarParticipante(participanteActualId);

    } catch (error) {
        mostrarMensaje(mensajeFicha, error.message, "fallo");
    }

});

document.getElementById("formDatosCriticos").addEventListener("submit", async (evento) => {

    evento.preventDefault();

    try {

        await peticionApi(`/api/logistica/participante/${participanteActualId}/datos-criticos`, {
            method: "PATCH",
            body: JSON.stringify({
                telefono: document.getElementById("inputTelefonoCritico").value.trim(),
                contacto_emergencia_nombre: document.getElementById("inputContactoEmergenciaNombreCritico").value.trim(),
                contacto_emergencia_telefono: document.getElementById("inputContactoEmergenciaTelefonoCritico").value.trim(),
                condicion_medica_detalle: document.getElementById("inputCondicionMedicaCritico").value.trim(),
                restricciones_alimentarias_detalle: document.getElementById("inputRestriccionAlimentariaCritico").value.trim()
            })
        });

        mostrarMensaje(mensajeFicha, "Datos corregidos correctamente", "ok");
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
const formIncidente = document.getElementById("formIncidente");
const mensajeIncidente = document.getElementById("mensajeIncidente");

// Campista vinculado al incidente que se está redactando (independiente de
// si hay una ficha abierta en la pestaña Registro). Se puede precargar desde
// esa ficha como atajo, pero siempre se puede buscar/cambiar/quitar aquí mismo.
let participanteVinculadoIncidente = null;

btnAbrirFormIncidente.addEventListener("click", () => {

    formIncidente.classList.toggle("oculto");

    if (!formIncidente.classList.contains("oculto") && !participanteVinculadoIncidente && participanteActualId) {
        participanteVinculadoIncidente = { id: participanteActualId, nombre: fichaNombre.textContent };
    }

    actualizarMensajeParticipanteVinculado();
    formIncidente.scrollIntoView({ behavior: "smooth" });

});

function actualizarMensajeParticipanteVinculado() {

    const elemento = document.getElementById("mensajeParticipanteVinculado");

    if (participanteVinculadoIncidente) {
        elemento.innerHTML = "";
        mostrarMensaje(elemento, `Vinculado a: ${participanteVinculadoIncidente.nombre}`, "ok");
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "boton pequeno secundario";
        boton.style.width = "auto";
        boton.style.marginLeft = "8px";
        boton.style.padding = "2px 10px";
        boton.style.fontSize = "11px";
        boton.textContent = "Quitar";
        boton.addEventListener("click", () => {
            participanteVinculadoIncidente = null;
            actualizarMensajeParticipanteVinculado();
        });
        elemento.appendChild(boton);
    } else {
        mostrarMensaje(elemento, "Sin participante vinculado (incidente general)", "ok");
    }

}

function detectarCampoBusquedaParticipante(valor) {
    if (/^cf-/i.test(valor)) return "codigo";
    if (/^\d+$/.test(valor)) return "documento";
    return "nombre";
}

document.getElementById("btnBuscarParticipanteIncidente").addEventListener("click", async () => {

    const valor = document.getElementById("inputBuscarParticipanteIncidente").value.trim();
    const contenedor = document.getElementById("resultadosParticipanteIncidente");

    if (!valor) {
        contenedor.innerHTML = "";
        return;
    }

    try {

        const campo = detectarCampoBusquedaParticipante(valor);
        const parametros = new URLSearchParams({ [campo]: valor });
        const { resultados } = await peticionApi(`/api/logistica/buscar?${parametros.toString()}`);

        contenedor.innerHTML = resultados.length === 0
            ? `<p class="detalle">No se encontraron participantes.</p>`
            : resultados.map((p) => `
                <div class="resultado-item" data-participante="${p.id}" data-nombre="${p.nombre}" style="margin-bottom:6px;">
                    <div>
                        <div class="nombre">${p.nombre}</div>
                        <div class="detalle">${p.documento}</div>
                    </div>
                </div>
            `).join("");

        contenedor.querySelectorAll("[data-participante]").forEach((fila) => {
            fila.addEventListener("click", () => {
                participanteVinculadoIncidente = { id: fila.dataset.participante, nombre: fila.dataset.nombre };
                contenedor.innerHTML = "";
                document.getElementById("inputBuscarParticipanteIncidente").value = "";
                actualizarMensajeParticipanteVinculado();
            });
        });

    } catch (error) {
        contenedor.innerHTML = `<p class="detalle">${error.message}</p>`;
    }

});

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

document.getElementById("inputCategoria").addEventListener("change", async (evento) => {

    const contenedor = document.getElementById("responsablesCategoria");
    const categoria = evento.target.value;

    if (!categoria) {
        contenedor.classList.add("oculto");
        contenedor.innerHTML = "";
        return;
    }

    try {

        const { responsables } = await peticionApi(`/api/centro-control/responsables?categoria=${encodeURIComponent(categoria)}`);

        contenedor.classList.remove("oculto");

        contenedor.innerHTML = responsables.length === 0
            ? `<p class="detalle">Ninguna rama tiene asignada esta categoría todavía.</p>`
            : responsables.map((r) => `
                <div class="incidente-mini">
                    <div>
                        <span class="codigo">${r.rol_en_rama === "lider" ? "⭐" : "•"} ${r.nombre}</span>
                        <div class="descripcion">${r.rama_nombre}</div>
                    </div>
                    <div class="descripcion">${r.telefono || "sin teléfono"} · ${r.zona ? humanizar(r.zona) : "sin zona"}</div>
                </div>
            `).join("");

    } catch (error) {
        console.error(error);
    }

});

formIncidente.addEventListener("submit", async (evento) => {

    evento.preventDefault();
    ocultarMensaje(mensajeIncidente);

    await conBotonDeshabilitado(evento.target, async () => {

        try {

            await peticionApi("/api/incidentes", {
                method: "POST",
                body: JSON.stringify({
                    categoria: document.getElementById("inputCategoria").value,
                    descripcion: document.getElementById("inputDescripcionIncidente").value.trim(),
                    prioridad: document.getElementById("inputPrioridad").value,
                    zona: document.getElementById("inputZona").value,
                    lugar: document.getElementById("inputLugar").value.trim(),
                    participanteId: participanteVinculadoIncidente?.id || null
                })
            });

            mostrarMensaje(mensajeIncidente, "Incidente enviado al Centro de Control", "ok");
            formIncidente.reset();
            participanteVinculadoIncidente = null;
            document.getElementById("resultadosParticipanteIncidente").innerHTML = "";
            actualizarMensajeParticipanteVinculado();
            await cargarMisIncidentes();

            setTimeout(() => {
                formIncidente.classList.add("oculto");
                ocultarMensaje(mensajeIncidente);
            }, 1500);

        } catch (error) {
            mostrarMensaje(mensajeIncidente, error.message, "fallo");
        }

    });

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

async function cargarObjetosPerdidosLogistica() {

    try {

        const { objetos } = await peticionApi("/api/objetos-perdidos?reclamado=false");
        const contenedor = document.getElementById("listaObjetosPerdidosLogistica");

        contenedor.innerHTML = objetos.length === 0
            ? `<p class="detalle">Sin objetos perdidos sin reclamar.</p>`
            : objetos.map((o) => `
                <div class="incidente-mini">
                    <div>
                        <span class="codigo">${o.descripcion}</span>
                        <div class="descripcion">${o.lugar_encontrado ? `Encontrado en: ${o.lugar_encontrado} · ` : ""}Por: ${o.encontrado_por_nombre || "—"}</div>
                    </div>
                </div>
            `).join("");

    } catch (error) {
        console.error(error);
    }

}

document.getElementById("formObjetoPerdido").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    const mensaje = document.getElementById("mensajeObjetoPerdido");

    await conBotonDeshabilitado(evento.target, async () => {

        try {

            await peticionApi("/api/objetos-perdidos", {
                method: "POST",
                body: JSON.stringify({
                    descripcion: document.getElementById("inputDescripcionObjetoPerdido").value.trim(),
                    lugarEncontrado: document.getElementById("inputLugarObjetoPerdido").value.trim()
                })
            });

            mostrarMensaje(mensaje, "Objeto perdido registrado", "ok");
            document.getElementById("formObjetoPerdido").reset();
            await cargarObjetosPerdidosLogistica();

        } catch (error) {
            mostrarMensaje(mensaje, error.message, "fallo");
        }

    });

});

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
// Solicitudes internas y tareas (misma UI, filtradas por tipo)
// ==========================

function renderizarListaTareas(contenedor, tareas, contenedorKey) {

    if (tareas.length === 0) {
        contenedor.innerHTML = `<p class="detalle">Nada por aquí todavía.</p>`;
        return;
    }

    const idAbierto = detallesTareaAbiertos[contenedorKey];

    // La tarjeta que ya estaba abierta se dibuja abierta desde el primer
    // instante (con un placeholder), no colapsada — si no, cada refresco del
    // polling la mostraba cerrada durante el viaje de ida y vuelta a la API
    // (más largo con mala conexión), como si el usuario la hubiera cerrado.
    contenedor.innerHTML = tareas.map((t) => {
        const abierta = t.id === idAbierto;
        return `
        <div class="tarjeta-expandible ${abierta ? "abierta" : ""}" data-tarea="${t.id}">
            <div class="fila-encabezado">
                <span class="codigo">${t.titulo}</span>
                <span class="estado-badge ${t.estado}">${humanizar(t.estado)}</span>
            </div>
            ${t.descripcion ? `<div class="descripcion">${t.descripcion}</div>` : ""}
            <div class="descripcion">
                ${t.tipo === "solicitud" ? `De ${mapaRamas[t.rama_origen_id] || "—"} para ${t.rama_id ? (mapaRamas[t.rama_id] || "—") : "🆘 todas las ramas"}` : `Rama: ${mapaRamas[t.rama_id] || "—"}`}
                ${t.hora_programada ? ` · Listo antes de: ${formatearHora(t.hora_programada)}` : ""}
                ${t.cantidad_personas ? ` · ${t.checks_count || 0}/${t.cantidad_personas} aceptaron` : ""}
            </div>
            <div class="${abierta ? "" : "oculto"}" id="detalleTarea-${contenedorKey}-${t.id}">${abierta ? '<p class="detalle">Actualizando…</p>' : ""}</div>
        </div>
    `;
    }).join("");

    contenedor.querySelectorAll("[data-tarea]").forEach((card) => {
        card.addEventListener("click", (evento) => {
            // El detalle expandido vive DENTRO de esta misma tarjeta; cualquier
            // clic ahí adentro (un texto, un espacio, no solo los botones) no
            // debe volver a alternar el colapsado, o se cierra apenas se
            // intenta interactuar con lo que hay dentro.
            if (evento.target.closest('[id^="detalleTarea-"]')) return;
            abrirDetalleTarea(card.dataset.tarea, false, contenedorKey);
        });
    });

    // El polling reconstruye esta lista cada pocos segundos; si había un
    // detalle abierto EN ESTE CONTENEDOR, se refrescan sus datos en silencio
    // (ya se dibujó abierto arriba, así que esto solo reemplaza el
    // placeholder — no hay alert si falla, para no interrumpir cada 7s por
    // una conexión inestable).
    if (idAbierto && tareas.some((t) => t.id === idAbierto)) {
        abrirDetalleTarea(idAbierto, true, contenedorKey, true);
    }

}

async function abrirDetalleTarea(id, forzar, contenedorKey, silencioso) {

    const contenedor = document.getElementById(`detalleTarea-${contenedorKey}-${id}`);

    // El contenedor puede no existir todavía (p. ej. la alerta cambia de
    // pestaña y dispara esto antes de que esa lista se haya renderizado).
    if (!contenedor) return;

    if (!forzar && !contenedor.classList.contains("oculto")) {
        contenedor.classList.add("oculto");
        contenedor.closest(".tarjeta-expandible")?.classList.remove("abierta");
        delete detallesTareaAbiertos[contenedorKey];
        return;
    }

    // Si el polling intenta forzar un refresh mientras el usuario está
    // escribiendo dentro de ESTE detalle (comentario o nueva subtarea), no lo
    // reconstruimos: perdería el texto y el foco a mitad de escritura.
    if (forzar && contenedor.contains(document.activeElement)) {
        return;
    }

    detallesTareaAbiertos[contenedorKey] = id;

    try {

        const { tarea, checks, ramas } = await peticionApi(`/api/tareas/${id}`);
        const ramaIdsTarea = ramas && ramas.length > 0 ? ramas.map((r) => r.id) : [tarea.rama_id];

        // Subtareas y comentarios se piden aparte: si una de las dos falla
        // (por ejemplo, si todavía no se corrió esa migración en Supabase),
        // no debe tumbar el resto del detalle.
        const [comentarios, subtareas] = await Promise.all([
            peticionApi(`/api/tareas/${id}/comentarios`).then((r) => r.comentarios).catch(() => []),
            tarea.tipo === "tarea"
                ? peticionApi(`/api/tareas/${id}/subtareas`).then((r) => r.subtareas).catch(() => [])
                : Promise.resolve(null)
        ]);

        const yaMarcado = checks.some((c) => c.usuario_id === perfilActual?.id);

        // "Quitar check"/subtareas los gestiona el líder de la rama que ayuda
        // (vigila a su propia gente); "dar el check final" en una solicitud
        // lo hace el líder que PIDIÓ la ayuda, no el que la atendió.
        const esLiderRamaDestino = !!perfilActual && (perfilActual.rol === "admin" || (ramaIdsTarea.includes(perfilActual.rama_id) && perfilActual.rol_en_rama === "lider"));
        const esLider = esLiderRamaDestino;
        const puedeCompletar = tarea.tipo === "solicitud"
            ? !!perfilActual && (perfilActual.rol === "admin" || perfilActual.id === tarea.creado_por || (perfilActual.rama_id === tarea.rama_origen_id && perfilActual.rol_en_rama === "lider"))
            : esLiderRamaDestino;

        const cupoLleno = !!tarea.cantidad_personas && checks.length >= tarea.cantidad_personas;

        const filasChecks = checks.length === 0
            ? `<p class="detalle">Nadie se ha marcado todavía.</p>`
            : checks.map((c) => `
                <div class="fila-conteo">
                    <span class="nombre-fila-conteo">${c.nombre}</span>
                    ${esLider ? `<button class="boton pequeno secundario" data-quitar-check="${c.usuario_id}" style="width:auto; padding:4px 10px; font-size:11px;">Quitar</button>` : ""}
                </div>
            `).join("");

        const cupoTexto = tarea.cantidad_personas
            ? `<p class="detalle" style="margin-top:4px;">${checks.length}/${tarea.cantidad_personas} personas necesarias${cupoLleno ? " · cupo cubierto" : ""}</p>`
            : "";

        const botonMarcarHtml = yaMarcado
            ? `<span class="badge verde">Ya marcaste tu participación</span>`
            : cupoLleno
                ? `<span class="badge rojo">Cupo cubierto, ya no se necesita más gente</span>`
                : `<button class="boton pequeno" data-marcar="1">Marqué que ayudé</button>`;

        const acciones = tarea.estado !== "pendiente"
            ? `<p class="detalle" style="margin-top:8px;">Cerrado ${formatearHora(tarea.completada_en)}</p>`
            : `
                ${cupoTexto}
                <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                    ${botonMarcarHtml}
                    ${puedeCompletar ? `<button class="boton pequeno secundario" data-completar="1">Dar check final</button>` : ""}
                </div>
            `;

        const puedeMarcarSubtarea = (s) => perfilActual && (perfilActual.id === s.asignado_a || esLider);

        // Las subtareas por persona solo tienen sentido para "tarea" (deberes
        // dentro de mi propia rama); una "solicitud" de ayuda a otra rama se
        // resuelve con el mecanismo de checks, no con subtareas individuales.
        const bloqueSubtareas = tarea.tipo !== "tarea" ? "" : (() => {

            const filasSubtareas = subtareas.length === 0
                ? `<p class="detalle">Sin subtareas asignadas.</p>`
                : subtareas.map((s) => `
                    <div class="fila-conteo">
                        <span class="nombre-fila-conteo">
                            ${s.estado === "hecha" ? "✅" : "⬜"} ${s.titulo}${s.asignado_a_nombre ? ` · ${s.asignado_a_nombre}` : ""}
                        </span>
                        ${s.estado === "pendiente" && puedeMarcarSubtarea(s) ? `<button class="boton pequeno" data-hecha-subtarea="${s.id}" style="width:auto; padding:4px 10px; font-size:11px;">Marcar hecha</button>` : ""}
                    </div>
                `).join("");

            const formularioSubtarea = esLider && tarea.estado === "pendiente" ? `
                <form class="form-nueva-subtarea" style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
                    <input type="text" placeholder="Nueva subtarea" class="input-titulo-subtarea" style="flex:1; min-width:120px; padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
                    <select class="select-asignado-subtarea" style="padding:6px 8px; border:2px solid #ddd; border-radius:8px;"></select>
                    <button type="submit" class="boton pequeno" style="width:auto;">Agregar</button>
                </form>
            ` : "";

            return `
                <div style="margin-top:14px; padding-top:8px; border-top:1px solid #ddd;">
                    <strong style="font-size:12px;">Subtareas:</strong>
                    ${filasSubtareas}
                    ${formularioSubtarea}
                </div>
            `;

        })();

        const filasComentarios = comentarios.length === 0
            ? `<p class="detalle">Sin comentarios todavía.</p>`
            : comentarios.map((c) => `
                <div class="historial-item">
                    <span class="hora">${formatearHora(c.creado_en)}</span>
                    <div class="descripcion">${c.texto}</div>
                    <div class="usuario">${c.nombre || "—"}</div>
                </div>
            `).join("");

        const lineaRamas = tarea.tipo === "tarea" && ramaIdsTarea.length > 1
            ? `<p class="detalle" style="margin-top:4px;">Ramas responsables: ${ramaIdsTarea.map((idRama) => mapaRamas[idRama] || "—").join(", ")}</p>`
            : "";

        contenedor.innerHTML = `
            ${lineaRamas}
            <div style="margin-top:8px; padding-top:8px; border-top:1px solid #ddd;">
                <strong style="font-size:12px;">Participaron:</strong>
                ${filasChecks}
                ${acciones}
            </div>
            ${bloqueSubtareas}
            <div style="margin-top:14px; padding-top:8px; border-top:1px solid #ddd;">
                <strong style="font-size:12px;">Comentarios:</strong>
                ${filasComentarios}
                <form class="form-nuevo-comentario" style="display:flex; gap:6px; margin-top:8px;">
                    <input type="text" placeholder="Escribe un comentario" class="input-nuevo-comentario" style="flex:1; padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
                    <button type="submit" class="boton pequeno" style="width:auto;">Comentar</button>
                </form>
            </div>
        `;

        contenedor.classList.remove("oculto");
        contenedor.closest(".tarjeta-expandible")?.classList.add("abierta");

        contenedor.querySelectorAll("[data-quitar-check]").forEach((boton) => {
            boton.addEventListener("click", (evento) => {
                evento.stopPropagation();
                quitarParticipacionTarea(id, boton.dataset.quitarCheck, contenedorKey);
            });
        });

        const botonMarcar = contenedor.querySelector("[data-marcar]");
        if (botonMarcar) {
            botonMarcar.addEventListener("click", (evento) => {
                evento.stopPropagation();
                marcarParticipacionTarea(id, contenedorKey);
            });
        }

        const botonCompletar = contenedor.querySelector("[data-completar]");
        if (botonCompletar) {
            botonCompletar.addEventListener("click", (evento) => {
                evento.stopPropagation();
                completarTarea(id, contenedorKey);
            });
        }

        contenedor.querySelectorAll("[data-hecha-subtarea]").forEach((boton) => {
            boton.addEventListener("click", (evento) => {
                evento.stopPropagation();
                marcarSubtareaHecha(id, boton.dataset.hechaSubtarea, contenedorKey);
            });
        });

        const selectAsignado = contenedor.querySelector(".select-asignado-subtarea");
        if (selectAsignado) {
            peticionApi(`/api/centro-control/ramas/${tarea.rama_id}/miembros`).then(({ miembros }) => {
                selectAsignado.innerHTML = `<option value="">Sin asignar</option>` +
                    miembros.map((m) => `<option value="${m.id}">${m.nombre}</option>`).join("");
            }).catch(() => {});
        }

        const formSubtarea = contenedor.querySelector(".form-nueva-subtarea");
        if (formSubtarea) {
            formSubtarea.addEventListener("submit", (evento) => {
                evento.preventDefault();
                evento.stopPropagation();
                crearSubtarea(
                    id,
                    formSubtarea.querySelector(".input-titulo-subtarea").value.trim(),
                    formSubtarea.querySelector(".select-asignado-subtarea").value,
                    contenedorKey
                );
            });
        }

        const formComentario = contenedor.querySelector(".form-nuevo-comentario");
        formComentario.addEventListener("submit", (evento) => {
            evento.preventDefault();
            evento.stopPropagation();
            crearComentario(id, formComentario.querySelector(".input-nuevo-comentario").value.trim(), contenedorKey);
        });

    } catch (error) {
        if (silencioso) console.error(error);
        else alert(error.message);
    }

}

async function crearSubtarea(tareaId, titulo, asignadoA, contenedorKey) {

    if (!titulo) return;

    try {
        await peticionApi(`/api/tareas/${tareaId}/subtareas`, {
            method: "POST",
            body: JSON.stringify({ titulo, asignadoA: asignadoA || null })
        });
        await abrirDetalleTarea(tareaId, true, contenedorKey);
    } catch (error) {
        alert(error.message);
    }

}

async function marcarSubtareaHecha(tareaId, subId, contenedorKey) {

    try {
        await peticionApi(`/api/tareas/${tareaId}/subtareas/${subId}/hecha`, { method: "POST" });
        await abrirDetalleTarea(tareaId, true, contenedorKey);
    } catch (error) {
        alert(error.message);
    }

}

async function crearComentario(tareaId, texto, contenedorKey) {

    if (!texto) return;

    try {
        await peticionApi(`/api/tareas/${tareaId}/comentarios`, {
            method: "POST",
            body: JSON.stringify({ texto })
        });
        await abrirDetalleTarea(tareaId, true, contenedorKey);
    } catch (error) {
        alert(error.message);
    }

}

async function marcarParticipacionTarea(id, contenedorKey) {
    try {
        await peticionApi(`/api/tareas/${id}/check`, { method: "POST" });
        await Promise.all([cargarSolicitudes(), cargarTareas()]);
        await abrirDetalleTarea(id, true, contenedorKey);
    } catch (error) {
        alert(error.message);
    }
}

async function quitarParticipacionTarea(id, usuarioId, contenedorKey) {
    if (!confirm("¿Quitar esta participación?")) return;
    try {
        await peticionApi(`/api/tareas/${id}/check/${usuarioId}`, { method: "DELETE" });
        await abrirDetalleTarea(id, true, contenedorKey);
    } catch (error) {
        alert(error.message);
    }
}

async function completarTarea(id, contenedorKey) {
    if (!confirm("¿Dar el check final y cerrar este caso?")) return;
    try {
        await peticionApi(`/api/tareas/${id}/completar`, { method: "POST" });
        await Promise.all([cargarSolicitudes(), cargarTareas()]);
        await abrirDetalleTarea(id, true, contenedorKey);
    } catch (error) {
        alert(error.message);
    }
}

async function cargarSolicitudes() {

    try {

        const { tareas } = await peticionApi("/api/tareas?tipo=solicitud");

        const recibidas = tareas.filter((t) => perfilActual && (t.rama_id === perfilActual.rama_id || t.rama_id === null));
        const enviadas = tareas.filter((t) => perfilActual && t.creado_por === perfilActual.id);

        renderizarListaTareas(document.getElementById("listaSolicitudesRecibidas"), recibidas, "solicitudesRecibidas");
        renderizarListaTareas(document.getElementById("listaSolicitudesEnviadas"), enviadas, "solicitudesEnviadas");
        renderizarAlertasSolicitudes(recibidas);

    } catch (error) {
        console.error(error);
    }

}

function renderizarAlertasSolicitudes(recibidas) {

    const contenedor = document.getElementById("alertasBarraLogistica");

    const pendientes = recibidas.filter((t) => {
        if (t.estado !== "pendiente") return false;
        const yaCubierto = t.cantidad_personas && t.checks_count >= t.cantidad_personas;
        return !yaCubierto;
    });

    contenedor.innerHTML = pendientes.map((t) => `
        <div class="alerta-chip" data-tarea-alerta="${t.id}">
            <span>🆘 ${mapaRamas[t.rama_origen_id] || "Una rama"} necesita ayuda: ${t.titulo}</span>
            <span class="numero">${t.cantidad_personas ? `${t.checks_count || 0}/${t.cantidad_personas}` : ""}</span>
        </div>
    `).join("");

    contenedor.querySelectorAll("[data-tarea-alerta]").forEach((chip) => {
        chip.addEventListener("click", () => {
            document.querySelector('.tab-modulo[data-vista="comunicacion"]').click();
            // Esta alerta siempre viene de "recibidas" (se construye a partir
            // de esa misma lista), así que la clave de contenedor es fija.
            setTimeout(() => abrirDetalleTarea(chip.dataset.tareaAlerta, true, "solicitudesRecibidas"), 150);
        });
    });

}

async function cargarTareas() {

    try {
        const { tareas } = await peticionApi("/api/tareas?tipo=tarea");
        renderizarListaTareas(document.getElementById("listaTareas"), tareas, "tareas");
    } catch (error) {
        console.error(error);
    }

}

document.getElementById("formSolicitud").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    const mensaje = document.getElementById("mensajeSolicitud");

    await conBotonDeshabilitado(evento.target, async () => {

        try {

            const ramaSeleccionada = document.getElementById("inputRamaDestinoSolicitud").value;

            await peticionApi("/api/tareas", {
                method: "POST",
                body: JSON.stringify({
                    tipo: "solicitud",
                    ramaId: ramaSeleccionada === "todas" ? null : ramaSeleccionada,
                    titulo: document.getElementById("inputTituloSolicitud").value.trim(),
                    descripcion: document.getElementById("inputDescripcionSolicitud").value.trim(),
                    cantidadPersonas: document.getElementById("inputCantidadPersonasSolicitud").value || null
                })
            });

            mostrarMensaje(mensaje, "Solicitud enviada correctamente", "ok");
            document.getElementById("formSolicitud").reset();
            await cargarSolicitudes();

        } catch (error) {
            mostrarMensaje(mensaje, error.message, "fallo");
        }

    });

});

document.getElementById("formTarea").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    const mensaje = document.getElementById("mensajeTarea");
    const horaProgramada = document.getElementById("inputHoraProgramadaTarea").value;

    await conBotonDeshabilitado(evento.target, async () => {

        try {

            await peticionApi("/api/tareas", {
                method: "POST",
                body: JSON.stringify({
                    tipo: "tarea",
                    ramaId: perfilActual?.rama_id,
                    titulo: document.getElementById("inputTituloTarea").value.trim(),
                    descripcion: document.getElementById("inputDescripcionTarea").value.trim(),
                    horaProgramada: horaProgramada ? new Date(horaProgramada).toISOString() : null
                })
            });

            mostrarMensaje(mensaje, "Tarea creada correctamente", "ok");
            document.getElementById("formTarea").reset();
            await cargarTareas();

        } catch (error) {
            mostrarMensaje(mensaje, error.message, "fallo");
        }

    });

});

// ==========================
// Observaciones individuales
// ==========================

async function cargarObservaciones() {

    try {

        const { observaciones } = await peticionApi("/api/observaciones");
        const contenedor = document.getElementById("listaObservaciones");

        contenedor.innerHTML = observaciones.length === 0
            ? `<p class="detalle">Sin observaciones todavía.</p>`
            : observaciones.map((o) => `
                <div class="historial-item">
                    <span class="hora">${formatearHora(o.creado_en)}</span>
                    <span class="badge ${o.tipo === "positiva" ? "verde" : o.tipo === "negativa" ? "rojo" : "neutro"}" style="margin-left:6px;">${humanizar(o.tipo)}</span>
                    ${!o.leido && o.usuario_id === perfilActual?.id ? `<span class="badge neutro">Sin leer</span>` : ""}
                    <div class="descripcion">${o.texto}</div>
                    <div class="usuario">${o.destinatario_nombre ? `Para: ${o.destinatario_nombre} · ` : ""}Escrita por: ${o.autor_nombre || "—"}</div>
                    ${(o.respuestas || []).map((r) => `
                        <div class="usuario" style="margin-left:12px; margin-top:4px; padding-left:8px; border-left:2px solid #ddd;">
                            <strong>${r.usuario_nombre}:</strong> ${r.texto}
                        </div>
                    `).join("")}
                    <div style="display:flex; gap:8px; margin-top:6px;">
                        ${!o.leido && o.usuario_id === perfilActual?.id ? `<button class="boton pequeno secundario" data-marcar-leida="${o.id}" style="width:auto; padding:4px 10px; font-size:11px;">Marcar como leída</button>` : ""}
                        <button class="boton pequeno secundario" data-responder-observacion="${o.id}" style="width:auto; padding:4px 10px; font-size:11px;">Responder</button>
                    </div>
                </div>
            `).join("");

        contenedor.querySelectorAll("[data-marcar-leida]").forEach((boton) => {
            boton.addEventListener("click", async () => {
                await peticionApi(`/api/observaciones/${boton.dataset.marcarLeida}/leido`, { method: "POST" }).catch(() => {});
                await cargarObservaciones();
            });
        });

        contenedor.querySelectorAll("[data-responder-observacion]").forEach((boton) => {
            boton.addEventListener("click", async () => {
                const texto = prompt("Tu respuesta:");
                if (!texto || !texto.trim()) return;
                try {
                    await peticionApi(`/api/observaciones/${boton.dataset.responderObservacion}/respuestas`, {
                        method: "POST",
                        body: JSON.stringify({ texto: texto.trim() })
                    });
                    await cargarObservaciones();
                } catch (error) {
                    alert(error.message);
                }
            });
        });

    } catch (error) {
        console.error(error);
    }

}

document.getElementById("formObservacion").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    const mensaje = document.getElementById("mensajeObservacion");

    await conBotonDeshabilitado(evento.target, async () => {

        try {

            await peticionApi("/api/observaciones", {
                method: "POST",
                body: JSON.stringify({
                    usuarioId: document.getElementById("inputMiembroObservacion").value,
                    tipo: document.getElementById("inputTipoObservacion").value,
                    texto: document.getElementById("inputTextoObservacion").value.trim()
                })
            });

            mostrarMensaje(mensaje, "Observación guardada correctamente", "ok");
            document.getElementById("formObservacion").reset();
            await cargarObservaciones();

        } catch (error) {
            mostrarMensaje(mensaje, error.message, "fallo");
        }

    });

});

// ==========================
// Mi cronograma
// ==========================

function formatearFechaHora(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleString("es-CO", {
        day: "2-digit", month: "2-digit", hour: "numeric", minute: "2-digit"
    });
}

async function cargarCronograma() {

    try {

        const { actividades } = await peticionApi("/api/actividades");
        const contenedor = document.getElementById("listaActividadesCronograma");

        contenedor.innerHTML = actividades.length === 0
            ? `<p class="detalle">Todavía no se ha cargado el cronograma del evento.</p>`
            : actividades.map((a) => `
                <div class="incidente-mini tarjeta-actividad" data-actividad="${a.id}">
                    <div style="width:100%;">
                        <div class="fila-encabezado-actividad">
                            <span class="codigo">${a.titulo}</span>
                            <div class="badges-actividad">
                                ${a.cancelada ? '<span class="badge rojo">Cancelada</span>' : ""}
                                <span class="badge ${a.montaje_completado ? "verde" : "neutro"}">${a.montaje_completado ? "Montaje listo" : "Montaje pendiente"}</span>
                                <span class="badge ${a.finalizada ? "verde" : "neutro"}">${a.finalizada ? "Finalizada" : "Sin finalizar"}</span>
                            </div>
                        </div>
                        <div class="descripcion">${formatearFechaHora(a.hora_inicio)} — ${formatearFechaHora(a.hora_fin)} ${a.espacio_usado ? `· ${a.espacio_usado}` : ""}</div>
                    </div>
                </div>
            `).join("");

        contenedor.querySelectorAll("[data-actividad]").forEach((card) => {
            card.addEventListener("click", () => abrirDetalleActividadCronograma(card.dataset.actividad));
        });

        cargarMiCumplimiento();

    } catch (error) {
        console.error(error);
    }

}

async function cargarMiCumplimiento() {

    const tarjeta = document.getElementById("tarjetaMiCumplimiento");

    if (!perfilActual || perfilActual.rol_en_rama !== "lider" || !perfilActual.rama_id) {
        tarjeta.classList.add("oculto");
        return;
    }

    try {

        const { ramas } = await peticionApi("/api/actividades/reportes/ramas");
        const miRama = ramas.find((r) => r.rama === mapaRamas[perfilActual.rama_id]);

        tarjeta.classList.remove("oculto");

        document.getElementById("miCumplimiento").innerHTML = !miRama
            ? `<p class="detalle">Todavía no hay tareas del cronograma para tu rama.</p>`
            : `
                <div class="fila-conteo">
                    <span class="nombre-fila-conteo">${miRama.completadas}/${miRama.total} tareas hechas</span>
                    <span class="badge ${miRama.porcentajeCumplimiento >= 70 ? "verde" : "rojo"}">${miRama.porcentajeCumplimiento}% a tiempo</span>
                </div>
                ${miRama.atrasoPromedioMinutos > 0 ? `<p class="detalle" style="margin-top:4px;">Atraso promedio: ${miRama.atrasoPromedioMinutos} min</p>` : ""}
            `;

    } catch (error) {
        console.error(error);
    }

}

async function abrirDetalleActividadCronograma(id) {

    try {

        const { actividad, tareas } = await peticionApi(`/api/actividades/${id}`);

        document.getElementById("tarjetaDetalleActividadCronograma").classList.remove("oculto");
        document.getElementById("tarjetaDetalleActividadCronograma").scrollIntoView({ behavior: "smooth" });

        document.getElementById("detalleActividadCronogramaTitulo").textContent = actividad.titulo;

        document.getElementById("detalleActividadCronogramaInfo").innerHTML = `
            <div class="dato"><span class="etiqueta">Horario</span><span class="valor">${formatearFechaHora(actividad.hora_inicio)} — ${formatearFechaHora(actividad.hora_fin)}</span></div>
            <div class="dato"><span class="etiqueta">Espacio</span><span class="valor">${actividad.espacio_usado || "—"}</span></div>
            <div class="dato"><span class="etiqueta">Encargados metodológicos</span><span class="valor">${actividad.encargados_metodologicos || "—"}</span></div>
        `;

        // Una tarea puede tener 2+ ramas asignadas (t.ramas), no solo su
        // rama_id "principal" — hay que revisar la lista completa o se
        // pierden las tareas donde mi rama quedó como secundaria.
        const tareasDeMiRama = tareas.filter((t) => {
            if (!perfilActual) return false;
            const ramasDeEsta = t.ramas && t.ramas.length > 0 ? t.ramas : [t.rama_id];
            return ramasDeEsta.includes(perfilActual.rama_id);
        });
        renderizarListaTareas(document.getElementById("listaTareasMiRamaActividad"), tareasDeMiRama, "actividad");

        const esLiderDeRamaInvolucrada = perfilActual?.rol_en_rama === "lider" && tareasDeMiRama.length > 0 && !actividad.cancelada;
        renderizarFasesActividadCronograma(actividad, esLiderDeRamaInvolucrada);

        await cargarMisMaterialesDeActividad(id);

    } catch (error) {
        alert(error.message);
    }

}

async function cargarMisMaterialesDeActividad(actividadId) {

    const bloque = document.getElementById("bloqueMaterialesActividadCronograma");

    if (!perfilActual || perfilActual.rol_en_rama !== "lider") {
        bloque.classList.add("oculto");
        return;
    }

    try {

        const { lotes } = await peticionApi("/api/materiales/lotes/mios");
        const lotesDeEstaActividad = lotes.filter((l) => l.actividadId === actividadId);

        bloque.classList.toggle("oculto", lotesDeEstaActividad.length === 0);

        document.getElementById("listaMaterialesActividadCronograma").innerHTML = lotesDeEstaActividad.map((l) => `
            <div class="incidente-mini columna">
                ${l.lineas.map((linea) => `
                    <div class="fila-conteo">
                        <span class="nombre-fila-conteo">${linea.materialNombre} — ${linea.pendiente > 0 ? `${linea.pendiente} pendiente de devolver` : "devuelto"}</span>
                    </div>
                `).join("")}
            </div>
        `).join("");

    } catch (error) {
        console.error(error);
    }

}

function renderizarFasesActividadCronograma(actividad, puedeGestionar) {

    const contenedor = document.getElementById("detalleActividadCronogramaFases");

    contenedor.innerHTML = `
        <h3>Cierre de la actividad</h3>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <span class="badge ${actividad.montaje_completado ? "verde" : "neutro"}">
                ${actividad.montaje_completado ? "Montaje listo" : "Montaje pendiente"}
            </span>
            <span class="badge ${actividad.finalizada ? "verde" : "neutro"}">
                ${actividad.finalizada ? "Actividad finalizada" : "Actividad no finalizada"}
            </span>
            ${puedeGestionar && !actividad.montaje_completado ? `<button class="boton pequeno secundario" id="btnMarcarMontajeCronograma" style="width:auto;">Marcar montaje listo</button>` : ""}
            ${puedeGestionar && actividad.montaje_completado && !actividad.finalizada ? `<button class="boton pequeno" id="btnMarcarFinalizadaCronograma" style="width:auto;">Marcar actividad terminada</button>` : ""}
        </div>
        <div class="mensaje" id="mensajeFasesActividadCronograma"></div>
    `;

    const btnMontaje = document.getElementById("btnMarcarMontajeCronograma");
    if (btnMontaje) {
        btnMontaje.addEventListener("click", () => marcarFaseActividadCronograma(actividad.id, "montaje"));
    }

    const btnFinalizada = document.getElementById("btnMarcarFinalizadaCronograma");
    if (btnFinalizada) {
        btnFinalizada.addEventListener("click", () => marcarFaseActividadCronograma(actividad.id, "finalizar"));
    }

}

async function marcarFaseActividadCronograma(actividadId, fase) {

    const mensaje = document.getElementById("mensajeFasesActividadCronograma");

    try {
        await peticionApi(`/api/actividades/${actividadId}/${fase}`, { method: "POST" });
        await abrirDetalleActividadCronograma(actividadId);
        await cargarCronograma();
    } catch (error) {
        mostrarMensaje(mensaje, error.message, "fallo");
    }

}

document.getElementById("btnCerrarDetalleActividadCronograma").addEventListener("click", () => {
    document.getElementById("tarjetaDetalleActividadCronograma").classList.add("oculto");
});

// ==========================
// Materiales
// ==========================

document.getElementById("filtroObjetivoMaterialLogistica").addEventListener("change", cargarMateriales);
document.getElementById("filtroUbicacionMaterialLogistica").addEventListener("input", () => {
    clearTimeout(window._filtroMaterialLogisticaTimeout);
    window._filtroMaterialLogisticaTimeout = setTimeout(cargarMateriales, 350);
});

async function cargarMateriales() {

    try {

        const objetivo = document.getElementById("filtroObjetivoMaterialLogistica").value;
        const ubicacion = document.getElementById("filtroUbicacionMaterialLogistica").value.trim();

        const params = new URLSearchParams();
        if (objetivo) params.set("objetivo", objetivo);
        if (ubicacion) params.set("ubicacion", ubicacion);

        const { materiales } = await peticionApi(`/api/materiales?${params.toString()}`);

        renderizarCatalogoMateriales(materiales);

        const esLider = !!perfilActual && perfilActual.rol_en_rama === "lider" && !!perfilActual.rama_id;
        const perteneceARama = !!perfilActual && !!perfilActual.rama_id;

        if (esLider) {
            cargarMisLotesMaterial();
        }

        if (perteneceARama) {
            renderizarChecklistSolicitudMaterial(materiales);
            cargarActividadesParaSolicitudMaterial();
            cargarMisSolicitudesMaterial();
        }

    } catch (error) {
        console.error(error);
    }

}

function renderizarCatalogoMateriales(materiales) {

    const contenedor = document.getElementById("listaCatalogoMateriales");

    contenedor.innerHTML = materiales.length === 0
        ? `<p class="detalle">Todavía no hay materiales registrados.</p>`
        : materiales.map((m) => `
            <div class="incidente-mini columna">
                <div style="display:flex; justify-content:space-between; gap:8px;">
                    <span class="codigo">${m.nombre}</span>
                    <span class="badge ${m.disponible > 0 ? "verde" : "rojo"}">${m.disponible}/${m.cantidad_total} disponibles</span>
                </div>
                <div class="descripcion">
                    ${humanizar(m.objetivo)}${m.ubicacion ? ` · ${m.ubicacion}` : ""}${m.danadaOPerdida > 0 ? ` · ${m.danadaOPerdida} dañados/perdidos` : ""}
                </div>
                ${m.tenedores.length > 0 ? `<div class="descripcion">Tienen: ${m.tenedores.map((t) => `${t.liderNombre} (${t.cantidad})`).join(", ")}</div>` : ""}
            </div>
        `).join("");

}

async function cargarMisLotesMaterial() {

    try {

        const { lotes } = await peticionApi("/api/materiales/lotes/mios");
        const contenedor = document.getElementById("listaMisLotesMaterial");

        contenedor.innerHTML = lotes.length === 0
            ? `<p class="detalle">No tienes materiales asignados.</p>`
            : lotes.map((l) => `
                <div class="incidente-mini columna">
                    <div class="descripcion">${l.actividadTitulo ? `Actividad: ${l.actividadTitulo}` : "Sin actividad vinculada"} · ${new Date(l.creadoEn).toLocaleString("es-CO")}</div>
                    ${l.lineas.map((linea) => `
                        <div class="fila-conteo">
                            <span class="nombre-fila-conteo">${linea.materialNombre} — ${linea.pendiente > 0 ? `${linea.pendiente} pendiente` : "devuelto"}</span>
                        </div>
                        ${linea.pendiente > 0 ? `
                            <form class="form-devolver-material" data-lote="${l.id}" data-linea="${linea.id}" style="display:flex; gap:6px; margin-top:4px; flex-wrap:wrap; align-items:end;">
                                <label style="font-size:11px;">Buen estado
                                    <input type="number" min="0" max="${linea.pendiente}" class="input-buen-estado" value="0" style="width:60px; padding:4px 6px; border:2px solid #ddd; border-radius:6px;">
                                </label>
                                <label style="font-size:11px;">Dañado
                                    <input type="number" min="0" max="${linea.pendiente}" class="input-danado" value="0" style="width:60px; padding:4px 6px; border:2px solid #ddd; border-radius:6px;">
                                </label>
                                <label style="font-size:11px;">Perdido
                                    <input type="number" min="0" max="${linea.pendiente}" class="input-perdido" value="0" style="width:60px; padding:4px 6px; border:2px solid #ddd; border-radius:6px;">
                                </label>
                                <label style="font-size:11px; flex:1; min-width:120px;">Comentario (opcional)
                                    <input type="text" class="input-comentario-devolucion" placeholder="Ej: se dañó por la lluvia" style="width:100%; padding:4px 6px; border:2px solid #ddd; border-radius:6px;">
                                </label>
                                <button type="submit" class="boton pequeno secundario" style="width:auto; padding:6px 12px; font-size:11px;">Devolver</button>
                            </form>
                        ` : ""}
                    `).join("")}
                </div>
            `).join("");

        contenedor.querySelectorAll(".form-devolver-material").forEach((form) => {
            form.addEventListener("submit", (evento) => {
                evento.preventDefault();
                devolverLineaMaterial(
                    form.dataset.lote,
                    form.dataset.linea,
                    form.querySelector(".input-buen-estado").value,
                    form.querySelector(".input-danado").value,
                    form.querySelector(".input-perdido").value,
                    form.querySelector(".input-comentario-devolucion").value.trim()
                );
            });
        });

    } catch (error) {
        console.error(error);
    }

}

async function devolverLineaMaterial(loteId, materialLoteId, buenEstado, danada, perdida, comentario) {

    try {

        await peticionApi(`/api/materiales/lotes/${loteId}/devolver`, {
            method: "POST",
            body: JSON.stringify({
                lineas: [{
                    materialLoteId,
                    cantidadBuenEstado: Number(buenEstado || 0),
                    cantidadDanada: Number(danada || 0),
                    cantidadPerdida: Number(perdida || 0),
                    comentario: comentario || null
                }]
            })
        });

        await Promise.all([cargarMisLotesMaterial(), cargarMateriales()]);

    } catch (error) {
        alert(error.message);
    }

}

async function cargarActividadesParaSolicitudMaterial() {

    try {
        const { actividades } = await peticionApi("/api/actividades");

        document.getElementById("inputActividadSolicitudMaterial").innerHTML = `<option value="">Sin actividad</option>` +
            actividades.filter((a) => !a.cancelada).map((a) => `<option value="${a.id}">${a.titulo}</option>`).join("");
    } catch (error) {
        console.error(error);
    }

}

function renderizarChecklistSolicitudMaterial(materiales) {

    const contenedor = document.getElementById("checklistSolicitudMaterial");

    contenedor.innerHTML = materiales.length === 0
        ? `<p class="detalle">No hay materiales en el catálogo.</p>`
        : materiales.map((m) => `
            <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
                <input type="checkbox" class="checkbox-material-solicitud" value="${m.id}">
                <span style="flex:1; font-size:13px;">${m.nombre} <span style="color:#888; font-size:11.5px;">(disponible: ${m.disponible})</span></span>
                <input type="number" class="cantidad-material-solicitud" min="1" placeholder="Cant." style="width:70px; padding:6px 8px; border:2px solid #ddd; border-radius:8px;">
            </div>
        `).join("");

}

document.getElementById("formSolicitarMaterial").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    const mensaje = document.getElementById("mensajeSolicitarMaterial");

    const items = [];
    document.querySelectorAll(".checkbox-material-solicitud:checked").forEach((checkbox) => {
        const fila = checkbox.closest("div");
        const cantidad = fila.querySelector(".cantidad-material-solicitud").value;
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

            await peticionApi("/api/materiales/solicitudes", {
                method: "POST",
                body: JSON.stringify({
                    actividadId: document.getElementById("inputActividadSolicitudMaterial").value || null,
                    notas: document.getElementById("inputNotasSolicitudMaterial").value.trim(),
                    necesarioPara: document.getElementById("inputNecesarioParaSolicitudMaterial").value
                        ? new Date(document.getElementById("inputNecesarioParaSolicitudMaterial").value).toISOString()
                        : null,
                    items
                })
            });

            mostrarMensaje(mensaje, "Solicitud enviada correctamente", "ok");
            document.getElementById("formSolicitarMaterial").reset();
            await cargarMisSolicitudesMaterial();

        } catch (error) {
            mostrarMensaje(mensaje, error.message, "fallo");
        }

    });

});

async function cargarMisSolicitudesMaterial() {

    try {

        const soloMias = document.getElementById("checkboxSoloMisSolicitudes").checked;
        const { solicitudes } = await peticionApi(`/api/materiales/solicitudes?soloMias=${soloMias}`);
        const contenedor = document.getElementById("listaMisSolicitudesMaterial");

        contenedor.innerHTML = solicitudes.length === 0
            ? `<p class="detalle">No hay solicitudes todavía.</p>`
            : solicitudes.map((s) => `
                <div class="incidente-mini columna">
                    <div style="display:flex; justify-content:space-between; gap:8px;">
                        <span class="codigo">${s.items.map((i) => `${i.materialNombre} × ${i.cantidad}`).join(", ")}</span>
                        <span class="estado-badge ${s.estado}">${humanizar(s.estado)}</span>
                    </div>
                    <div class="descripcion">
                        Pidió: ${s.solicitante_nombre} · ${new Date(s.creado_en).toLocaleString("es-CO")}
                        ${s.necesario_para ? ` · Necesario para: ${new Date(s.necesario_para).toLocaleString("es-CO")}` : ""}
                        ${s.notas ? ` · ${s.notas}` : ""}
                    </div>
                </div>
            `).join("");

    } catch (error) {
        console.error(error);
    }

}

document.getElementById("checkboxSoloMisSolicitudes").addEventListener("change", cargarMisSolicitudesMaterial);

// ==========================
// Arranque
// ==========================

verificarSesion();
