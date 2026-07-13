// Reemplaza esto con tus valores reales
const API_BASE = "https://campfest-api-production.up.railway.app";
const SUPABASE_URL = "https://lazarmjxajhdjvuhtzcl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhemFybWp4YWpoZGp2dWh0emNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDY4MzQsImV4cCI6MjA5OTM4MjgzNH0.j3muJDelPhZibma-yeuIhvjrvQ01e7DN0B-4UaYyCFM";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

//==========================
// Elementos
//==========================

const pantallaLogin = document.getElementById("pantallaLogin");
const pantallaPanel = document.getElementById("pantallaPanel");
const formLogin = document.getElementById("formLogin");
const mensajeLogin = document.getElementById("mensajeLogin");
const botonLogin = document.getElementById("botonLogin");
const nombreUsuarioActual = document.getElementById("nombreUsuarioActual");
const botonCerrarSesion = document.getElementById("botonCerrarSesion");

const inputBusqueda = document.getElementById("inputBusqueda");
const botonBuscar = document.getElementById("botonBuscar");
const mensajeBusqueda = document.getElementById("mensajeBusqueda");
const contenedorResultados = document.getElementById("contenedorResultados");
const fichaParticipante = document.getElementById("fichaParticipante");
const tabsBusqueda = document.querySelectorAll(".tab-busqueda");

let tipoBusqueda = "codigo";
let sesionActual = null;

//==========================
// Utilidades
//==========================

function escaparHtml(texto){
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

function mostrarMensaje(elemento, tipo, texto){
    elemento.className = `mensaje mostrar ${tipo}`;
    elemento.textContent = texto;
}

function ocultarMensaje(elemento){
    elemento.className = "mensaje";
    elemento.textContent = "";
}

async function llamarApi(ruta, opciones = {}){

    const { data: { session } } = await supabaseClient.auth.getSession();

    const respuesta = await fetch(`${API_BASE}${ruta}`, {
        ...opciones,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || ""}`,
            ...(opciones.headers || {})
        }
    });

    const cuerpo = await respuesta.json();

    if (!respuesta.ok){
        throw new Error(cuerpo.mensaje || "Ocurrió un error inesperado");
    }

    return cuerpo;

}

//==========================
// Login
//==========================

formLogin.addEventListener("submit", async (evento) => {

    evento.preventDefault();
    ocultarMensaje(mensajeLogin);

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    botonLogin.disabled = true;
    botonLogin.textContent = "Ingresando...";

    try{

        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) throw error;

        sesionActual = data.session;

        await mostrarPanel();

    }catch(error){

        mostrarMensaje(mensajeLogin, "fallo", error.message || "No se pudo iniciar sesión");

    }finally{

        botonLogin.disabled = false;
        botonLogin.textContent = "Ingresar";

    }

});

botonCerrarSesion.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    location.reload();
});

async function mostrarPanel(){

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session){
        pantallaLogin.classList.remove("oculto");
        pantallaPanel.classList.add("oculto");
        return;
    }

    nombreUsuarioActual.textContent = session.user.email;

    pantallaLogin.classList.add("oculto");
    pantallaPanel.classList.remove("oculto");

}

// Al cargar, revisar si ya hay una sesión activa
(async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session){
        sesionActual = session;
        await mostrarPanel();
    }
})();

//==========================
// Tabs de tipo de búsqueda
//==========================

const placeholders = {
    codigo: "Ingresa el código enviado por WhatsApp",
    documento: "Ingresa el número de documento",
    nombre: "Ingresa el nombre del participante"
};

tabsBusqueda.forEach((tab) => {
    tab.addEventListener("click", () => {
        tabsBusqueda.forEach((t) => t.classList.remove("activo"));
        tab.classList.add("activo");
        tipoBusqueda = tab.dataset.tipo;
        inputBusqueda.placeholder = placeholders[tipoBusqueda];
        inputBusqueda.value = "";
        inputBusqueda.focus();
    });
});

//==========================
// Búsqueda
//==========================

async function buscar(){

    const valor = inputBusqueda.value.trim();

    if (!valor){
        mostrarMensaje(mensajeBusqueda, "fallo", "Escribe algo para buscar");
        return;
    }

    ocultarMensaje(mensajeBusqueda);
    fichaParticipante.classList.add("oculto");
    contenedorResultados.classList.add("oculto");
    contenedorResultados.innerHTML = "";

    botonBuscar.disabled = true;
    botonBuscar.textContent = "Buscando...";

    try{

        const parametros = new URLSearchParams({ [tipoBusqueda]: valor });

        const respuesta = await llamarApi(`/api/logistica/buscar?${parametros.toString()}`);

        if (respuesta.resultados.length === 0){
            mostrarMensaje(mensajeBusqueda, "fallo", "No se encontró ningún participante");
            return;
        }

        if (respuesta.resultados.length === 1){
            await cargarFicha(respuesta.resultados[0].id);
            return;
        }

        // Varios resultados (típico al buscar por nombre)
        contenedorResultados.classList.remove("oculto");
        respuesta.resultados.forEach((p) => {
            const item = document.createElement("div");
            item.className = "resultado-item";
            item.innerHTML = `
                <div>
                    <div class="nombre">${escaparHtml(p.nombre)}</div>
                    <div class="detalle">${escaparHtml(p.documento)} · ${escaparHtml(p.municipio || "")}</div>
                </div>
                <div class="detalle">${escaparHtml(p.codigo)}</div>
            `;
            item.addEventListener("click", () => cargarFicha(p.id));
            contenedorResultados.appendChild(item);
        });

    }catch(error){

        mostrarMensaje(mensajeBusqueda, "fallo", error.message);

    }finally{

        botonBuscar.disabled = false;
        botonBuscar.textContent = "Buscar";

    }

}

botonBuscar.addEventListener("click", buscar);
inputBusqueda.addEventListener("keydown", (e) => { if (e.key === "Enter") buscar(); });

//==========================
// Cargar y renderizar la ficha completa de un participante
//==========================

async function cargarFicha(id){

    contenedorResultados.classList.add("oculto");
    ocultarMensaje(mensajeBusqueda);

    try{

        const respuesta = await llamarApi(`/api/logistica/participante/${id}`);
        renderizarFicha(respuesta);

    }catch(error){

        mostrarMensaje(mensajeBusqueda, "fallo", error.message);

    }

}

function renderizarFicha(datos){

    const p = datos.participante;

    const entregasPorServicio = {};
    datos.entregas.forEach((e) => { entregasPorServicio[e.servicio] = e; });

    const badgeIngreso = p.ingreso_registrado
        ? `<span class="badge verde">🟢 Ingresó</span>`
        : `<span class="badge rojo">🔴 Pendiente de ingreso</span>`;

    const badgeAlimentacion = `<span class="badge neutro">${datos.entregasRealizadas}/${datos.totalServicios} entregas</span>`;

    const badgeCarpa = `<span class="badge neutro">Carpa: ${p.carpa_asignada ? escaparHtml(p.carpa_asignada) : "sin asignar"}</span>`;

    const badgeLider = `<span class="badge neutro">Líder de carpa: ${p.es_lider_carpa ? "Sí" : "No"}</span>`;

    const checklistHtml = datos.servicios.map((s) => {

        const entrega = entregasPorServicio[s.id];

        if (entrega){
            const hora = new Date(entrega.hora).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
            return `
                <div class="item-servicio entregado">
                    <span>${s.label}</span>
                    <span class="marcado">✓ ${hora}</span>
                </div>
            `;
        }

        return `
            <div class="item-servicio">
                <span>${s.label}</span>
                <button data-servicio="${s.id}" class="boton-marcar-servicio">Marcar</button>
            </div>
        `;

    }).join("");

    const historialHtml = datos.historial.length > 0
        ? datos.historial.map((h) => {
            const fecha = new Date(h.creado_en).toLocaleString("es-CO", {
                hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit"
            });
            return `
                <div class="historial-item">
                    <div class="hora">${fecha}</div>
                    <div class="descripcion">${escaparHtml(h.descripcion)}</div>
                </div>
            `;
        }).join("")
        : `<p style="color:#999; font-size:13.5px;">Sin eventos registrados todavía.</p>`;

    fichaParticipante.innerHTML = `

        <div class="badges">
            ${badgeIngreso}
            ${badgeAlimentacion}
            ${badgeCarpa}
            ${badgeLider}
        </div>

        <h2>${escaparHtml(p.nombre)}</h2>
        <div class="documento">Documento: ${escaparHtml(p.documento)} · Código: ${escaparHtml(p.codigo)}</div>

        <div class="grid-info">
            <div class="dato"><span class="etiqueta">Edad</span><span class="valor">${escaparHtml(p.edad ?? "—")}</span></div>
            <div class="dato"><span class="etiqueta">Municipio</span><span class="valor">${escaparHtml(p.municipio || "—")}</span></div>
            <div class="dato"><span class="etiqueta">Teléfono</span><span class="valor">${escaparHtml(p.telefono || "—")}</span></div>
            <div class="dato"><span class="etiqueta">Estado de admisión</span><span class="valor">${escaparHtml(p.estado_admision)}</span></div>
            <div class="dato"><span class="etiqueta">Contacto de emergencia</span><span class="valor">${escaparHtml(p.contacto_emergencia_nombre || "—")} ${escaparHtml(p.contacto_emergencia_telefono || "")}</span></div>
            <div class="dato ${p.restricciones ? 'alerta' : ''}"><span class="etiqueta">Restricciones</span><span class="valor">${escaparHtml(p.restricciones || "Ninguna")}</span></div>
        </div>

        <div class="seccion">
            <h3>Ingreso</h3>
            <button class="boton pequeno" id="botonRegistrarIngreso" ${p.ingreso_registrado ? "disabled" : ""}>
                ${p.ingreso_registrado ? "Ingreso ya registrado" : "Registrar ingreso"}
            </button>
        </div>

        <div class="seccion">
            <h3>Asignación de carpa</h3>
            <div class="form-asignacion">
                <div class="campo">
                    <label>Carpa</label>
                    <input type="text" id="inputCarpa" value="${escaparHtml(p.carpa_asignada || "")}" placeholder="Ej. Carpa 4">
                </div>
                <div class="checkbox-lider">
                    <input type="checkbox" id="checkboxLider" ${p.es_lider_carpa ? "checked" : ""}>
                    <label for="checkboxLider">Líder de carpa</label>
                </div>
                <button class="boton pequeno" id="botonGuardarAsignacion">Guardar</button>
            </div>
        </div>

        <div class="seccion">
            <h3>Alimentación</h3>
            <div class="checklist-alimentacion">
                ${checklistHtml}
            </div>
        </div>

        <div class="seccion">
            <h3>Historial</h3>
            ${historialHtml}
        </div>

        <div class="mensaje" id="mensajeFicha"></div>

    `;

    fichaParticipante.classList.remove("oculto");

    // Eventos de la ficha recién renderizada

    document.getElementById("botonRegistrarIngreso").addEventListener("click", async () => {
        await accionFicha(() => llamarApi(`/api/logistica/participante/${p.id}/ingreso`, { method: "POST" }), p.id);
    });

    document.getElementById("botonGuardarAsignacion").addEventListener("click", async () => {
        const carpa = document.getElementById("inputCarpa").value.trim();
        const esLiderCarpa = document.getElementById("checkboxLider").checked;
        await accionFicha(() => llamarApi(`/api/logistica/participante/${p.id}/asignacion`, {
            method: "POST",
            body: JSON.stringify({ carpa, esLiderCarpa })
        }), p.id);
    });

    fichaParticipante.querySelectorAll(".boton-marcar-servicio").forEach((boton) => {
        boton.addEventListener("click", async () => {
            const servicio = boton.dataset.servicio;
            await accionFicha(() => llamarApi(`/api/logistica/participante/${p.id}/alimentacion`, {
                method: "POST",
                body: JSON.stringify({ servicio })
            }), p.id);
        });
    });

}

async function accionFicha(accion, participanteId){

    const mensajeFicha = document.getElementById("mensajeFicha");

    try{

        const resultado = await accion();
        await cargarFicha(participanteId);

        // Volvemos a tomar el mensaje porque la ficha se re-renderizó
        const nuevoMensaje = document.getElementById("mensajeFicha");
        mostrarMensaje(nuevoMensaje, "ok", resultado.mensaje);

    }catch(error){

        mostrarMensaje(mensajeFicha, "fallo", error.message);

    }

}