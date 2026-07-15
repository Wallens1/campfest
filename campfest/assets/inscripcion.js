// Lógica compartida del formulario de inscripción — se incrusta igual en
// i-mayores-de-18-anos/ e i-menores-de-edad/ (el mismo formulario en ambas
// páginas; la fecha de nacimiento real decide si aplica el aviso de menor
// de edad, no la página en la que se llenó).

const API_BASE = "https://campfest-api-production.up.railway.app";
const ENDPOINT_INSCRIPCION = `${API_BASE}/api/inscripcion`;

const MUNICIPIOS_VALLE = [
    "Alcalá", "Andalucía", "Ansermanuevo", "Argelia", "Bolívar", "Buenaventura",
    "Guadalajara de Buga", "Bugalagrande", "Caicedonia", "Cali", "Calima (El Darién)",
    "Candelaria", "Cartago", "Dagua", "El Águila", "El Cairo", "El Cerrito", "El Dovio",
    "Florida", "Ginebra", "Guacarí", "Jamundí", "La Cumbre", "La Unión", "La Victoria",
    "Obando", "Palmira", "Pradera", "Restrepo", "Riofrío", "Roldanillo", "San Pedro",
    "Sevilla", "Toro", "Trujillo", "Tuluá", "Ulloa", "Versalles", "Vijes", "Yotoco",
    "Yumbo", "Zarzal"
];

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("formInscripcion");
    if (!form) return; // esta página no tiene el formulario embebido

    const boton = document.getElementById("botonInscripcion");
    const estado = document.getElementById("estadoInscripcion");
    const selectMunicipio = document.getElementById("municipio");
    const campoMunicipioOtro = document.getElementById("campoMunicipioOtro");
    const inputFechaNacimiento = document.getElementById("fechaNacimiento");
    const avisoMenorEdad = document.getElementById("avisoMenorEdad");
    const seccionLiderazgo = document.getElementById("seccionLiderazgo");
    const exitoInscripcion = document.getElementById("exitoInscripcion");
    const codigoGenerado = document.getElementById("codigoGenerado");

    // ===== Municipio =====
    selectMunicipio.innerHTML = `<option value="">Selecciona tu municipio</option>` +
        MUNICIPIOS_VALLE.map((m) => `<option value="${m}">${m}</option>`).join("") +
        `<option value="otro">Otro (fuera del Valle del Cauca)</option>`;

    selectMunicipio.addEventListener("change", () => {
        campoMunicipioOtro.classList.toggle("cf-oculto", selectMunicipio.value !== "otro");
        seccionLiderazgo.classList.toggle("cf-oculto", selectMunicipio.value === "Bugalagrande");
    });

    // ===== Edad en vivo + aviso de menor de edad =====
    inputFechaNacimiento.addEventListener("change", () => {

        const valor = inputFechaNacimiento.value;
        if (!valor) { avisoMenorEdad.classList.add("cf-oculto"); return; }

        const hoy = new Date();
        const nacimiento = new Date(valor);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mesDiff = hoy.getMonth() - nacimiento.getMonth();
        if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) edad--;

        avisoMenorEdad.classList.toggle("cf-oculto", edad >= 18);

    });

    // ===== Campos condicionales sí/no (condición médica, restricciones, alergias) =====
    [
        ["tieneCondicionMedica", "detalleCondicionMedica"],
        ["tieneRestriccionesAlimentarias", "detalleRestricciones"],
        ["alergiaMedicamento", "detalleAlergiaMedicamento"],
        ["alergiaAlimento", "detalleAlergiaAlimento"]
    ].forEach(([idCheckbox, idDetalle]) => {
        const checkbox = document.getElementById(idCheckbox);
        const detalle = document.getElementById(idDetalle);
        checkbox.addEventListener("change", () => detalle.classList.toggle("cf-oculto", !checkbox.checked));
    });

    // ===== Envío =====
    form.addEventListener("submit", async (evento) => {

        evento.preventDefault();
        ocultarEstado();

        const comoSeEntero = Array.from(document.querySelectorAll('input[name="comoSeEntero"]:checked')).map((c) => c.value);

        const datos = {
            nombres: valorDe("nombres"),
            apellidos: valorDe("apellidos"),
            tipoDocumento: valorDe("tipoDocumento"),
            documento: valorDe("documento"),
            fechaNacimiento: valorDe("fechaNacimiento"),
            municipio: valorDe("municipio"),
            municipioOtro: valorDe("municipioOtro"),
            zonaRuralUrbana: valorDe("zonaRuralUrbana"),
            telefono: valorDe("telefono"),
            contactoEmergenciaNombre: valorDe("contactoEmergenciaNombre"),
            contactoEmergenciaTelefono: valorDe("contactoEmergenciaTelefono"),
            contactoEmergencia2Nombre: valorDe("contactoEmergencia2Nombre"),
            contactoEmergencia2Telefono: valorDe("contactoEmergencia2Telefono"),
            correoPersonal: valorDe("correoPersonal"),
            rh: valorDe("rh"),
            tieneCondicionMedica: marcadoDe("tieneCondicionMedica"),
            condicionMedicaDetalle: valorDe("condicionMedicaDetalle"),
            tieneRestriccionesAlimentarias: marcadoDe("tieneRestriccionesAlimentarias"),
            restriccionesAlimentariasDetalle: valorDe("restriccionesAlimentariasDetalle"),
            alergiaMedicamento: marcadoDe("alergiaMedicamento"),
            alergiaMedicamentoDetalle: valorDe("alergiaMedicamentoDetalle"),
            alergiaAlimento: marcadoDe("alergiaAlimento"),
            alergiaAlimentoDetalle: valorDe("alergiaAlimentoDetalle"),
            eps: valorDe("eps"),
            carpaPropia: marcadoDe("carpaPropia"),
            aceptaTratamientoDatos: marcadoDe("aceptaTratamientoDatos"),
            aceptaUsoImagen: marcadoDe("aceptaUsoImagen"),
            aceptaExencionResponsabilidad: marcadoDe("aceptaExencionResponsabilidad"),
            experienciaLiderazgo: valorDe("experienciaLiderazgo"),
            incidenciaLiderSocial: valorDe("incidenciaLiderSocial"),
            beneficioPersonalLiderazgo: valorDe("beneficioPersonalLiderazgo"),
            expectativaPostCampamento: valorDe("expectativaPostCampamento"),
            subsistemaInstancia: valorDe("subsistemaInstancia"),
            comoSeEntero,
            invitadoPor: valorDe("invitadoPor"),
            sitioWeb: valorDe("sitioWeb")
        };

        boton.disabled = true;
        boton.textContent = "Enviando...";
        mostrarEstado("cargando", "Enviando tu inscripción, un momento...");

        try {

            const respuesta = await fetch(ENDPOINT_INSCRIPCION, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos)
            });

            const cuerpo = await respuesta.json();

            if (!respuesta.ok) throw new Error(cuerpo.mensaje || "No se pudo completar la inscripción.");

            ocultarEstado();
            form.classList.add("cf-oculto");
            codigoGenerado.textContent = cuerpo.codigo;
            exitoInscripcion.classList.remove("cf-oculto");
            exitoInscripcion.scrollIntoView({ behavior: "smooth" });

        } catch (error) {

            mostrarEstado("fallo", error.message || "Ocurrió un error al enviar tu inscripción.");

        } finally {

            boton.disabled = false;
            boton.textContent = "Enviar inscripción";

        }

    });

    function valorDe(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : "";
    }

    function marcadoDe(id) {
        const el = document.getElementById(id);
        return el ? el.checked : false;
    }

    function mostrarEstado(tipo, texto) {
        estado.className = `cf-estado cf-estado-mostrar cf-estado-${tipo}`;
        estado.textContent = texto;
    }

    function ocultarEstado() {
        estado.className = "cf-estado";
        estado.textContent = "";
    }

});
