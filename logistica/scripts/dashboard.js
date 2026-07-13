// ==========================
// Configuración
// ==========================
// Ajusta estos tres valores según el entorno donde quede publicada esta página.

const API_BASE = "https://campfest-api-production.up.railway.app";
const SUPABASE_URL = "https://lazarmjxajhdjvuhtzcl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhemFybWp4YWpoZGp2dWh0emNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDY4MzQsImV4cCI6MjA5OTM4MjgzNH0.j3muJDelPhZibma-yeuIhvjrvQ01e7DN0B-4UaYyCFM";


const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
const inputCarpa = document.getElementById("inputCarpa");
const checkboxLider = document.getElementById("checkboxLider");
const tituloAlimentacion = document.getElementById("tituloAlimentacion");
const checklistAlimentacion = document.getElementById("checklistAlimentacion");
const historial = document.getElementById("historial");
const mensajeFicha = document.getElementById("mensajeFicha");

let campoBusquedaActivo = "codigo";
let participanteActualId = null;

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

    const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
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
}

function mostrarPanel(sesion) {
    pantallaLogin.classList.add("oculto");
    pantallaPanel.classList.remove("oculto");
    usuarioActual.textContent = sesion.user.email;
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

    inputCarpa.value = participante.carpa_asignada || "";
    checkboxLider.checked = !!participante.es_lider_carpa;

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

function renderizarInfo(participante) {

    const campos = [
        { campo: "edad", etiqueta: "Edad" },
        { campo: "municipio", etiqueta: "Municipio" },
        { campo: "telefono", etiqueta: "Teléfono" },
        { campo: "contacto_emergencia", etiqueta: "Contacto de emergencia" },
        { campo: "estado_admision", etiqueta: "Estado de admisión" },
        { campo: "restricciones", etiqueta: "Restricciones médicas/alimentarias", alerta: true },
        { campo: "codigo", etiqueta: "Código" }
    ];

    gridInfo.innerHTML = campos.map(({ campo, etiqueta, alerta }) => {

        const valor = participante[campo];
        const esAlerta = alerta && valor;

        return `
            <div class="dato ${esAlerta ? "alerta" : ""}">
                <span class="etiqueta">${etiqueta}</span>
                <span class="valor">${valor || "—"}</span>
            </div>
        `;

    }).join("");

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

    const carpa = inputCarpa.value.trim();

    if (!carpa) {
        mostrarMensaje(mensajeFicha, "Debes indicar la carpa asignada", "fallo");
        return;
    }

    try {

        await peticionApi(`/api/logistica/participante/${participanteActualId}/asignacion`, {
            method: "POST",
            body: JSON.stringify({ carpa, esLiderCarpa: checkboxLider.checked })
        });

        mostrarMensaje(mensajeFicha, "Asignación guardada correctamente", "ok");
        await seleccionarParticipante(participanteActualId);

    } catch (error) {
        mostrarMensaje(mensajeFicha, error.message, "fallo");
    }

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
// Arranque
// ==========================

verificarSesion();
