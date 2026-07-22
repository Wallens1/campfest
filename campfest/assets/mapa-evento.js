// Visor de solo lectura del mapa del evento — lo usan tanto el portal del
// campista como el sitio público. Las zonas llegan como puntos en
// porcentaje (0-100) relativo a la imagen, así que un <svg viewBox="0 0 100
// 100"> las dibuja directo, sin recalcular nada al cambiar de tamaño.
(function () {

    function coordenadasCentro(puntos) {
        var sx = 0, sy = 0;
        puntos.forEach(function (p) { sx += p.x; sy += p.y; });
        return { x: sx / puntos.length, y: sy / puntos.length };
    }

    function inyectarEstilos() {

        if (document.getElementById("cf-mapa-evento-estilos")) return;

        var estilo = document.createElement("style");
        estilo.id = "cf-mapa-evento-estilos";
        estilo.textContent =
            ".cf-mapa-lienzo{ position:relative; width:100%; border:3px solid var(--ink); border-radius:14px; overflow:hidden; line-height:0; background:#eee; }" +
            ".cf-mapa-lienzo img{ width:100%; display:block; }" +
            ".cf-mapa-lienzo svg{ position:absolute; top:0; left:0; width:100%; height:100%; }" +
            ".cf-mapa-zona{ fill-opacity:.35; stroke-width:.6; cursor:pointer; transition:fill-opacity .12s ease; }" +
            ".cf-mapa-zona:hover, .cf-mapa-zona-activa{ fill-opacity:.6; }" +
            ".cf-mapa-zona-etiqueta{ font-size:3.2px; font-weight:700; fill:var(--ink); text-anchor:middle; pointer-events:none; paint-order:stroke; stroke:#fff; stroke-width:.6px; }" +
            ".cf-mapa-info{ margin-top:14px; padding:14px 16px; border-radius:12px; border:2px solid var(--ink); background:var(--cream); }" +
            ".cf-mapa-info h4{ margin:0 0 4px; }" +
            ".cf-mapa-info p{ margin:0 0 8px; font-size:13.5px; opacity:.85; }" +
            ".cf-mapa-info ul{ margin:0; padding-left:18px; font-size:13px; }" +
            ".cf-mapa-vacio{ font-size:13.5px; opacity:.75; }";

        document.head.appendChild(estilo);

    }

    // datos = respuesta de GET /api/mapa: { ok, publicado, imagenUrl, zonas }
    function renderizarMapaEvento(contenedor, datos) {

        inyectarEstilos();

        if (!datos || !datos.publicado) {
            contenedor.innerHTML = '<p class="cf-mapa-vacio">El mapa del evento todavía no está disponible. Vuelve a revisar más cerca de la fecha. 💜</p>';
            return;
        }

        var zonas = datos.zonas || [];

        var poligonos = zonas.map(function (zona) {
            var puntos = zona.puntos.map(function (p) { return p.x + "," + p.y; }).join(" ");
            var centro = coordenadasCentro(zona.puntos);
            return '<g data-cf-zona="' + zona.id + '">' +
                '<polygon class="cf-mapa-zona" points="' + puntos + '" style="fill:' + zona.color + '; stroke:' + zona.color + ';"></polygon>' +
                '<text class="cf-mapa-zona-etiqueta" x="' + centro.x + '" y="' + centro.y + '">' + zona.nombre + '</text>' +
                '</g>';
        }).join("");

        contenedor.innerHTML =
            '<div class="cf-mapa-lienzo">' +
            '<img src="' + datos.imagenUrl + '" alt="Mapa del evento">' +
            '<svg viewBox="0 0 100 100" preserveAspectRatio="none">' + poligonos + '</svg>' +
            '</div>' +
            '<div class="cf-mapa-info" id="cf-mapa-info-panel"><p class="cf-mapa-vacio">Toca una zona del mapa para ver más detalles.</p></div>';

        var panelInfo = contenedor.querySelector("#cf-mapa-info-panel");

        contenedor.querySelectorAll("[data-cf-zona]").forEach(function (g) {
            g.addEventListener("click", function () {

                contenedor.querySelectorAll(".cf-mapa-zona").forEach(function (p) { p.classList.remove("cf-mapa-zona-activa"); });
                g.querySelector(".cf-mapa-zona").classList.add("cf-mapa-zona-activa");

                var zona = zonas.filter(function (z) { return z.id === g.dataset.cfZona; })[0];
                if (!zona) return;

                var actividadesHtml = (zona.actividades && zona.actividades.length > 0)
                    ? "<ul>" + zona.actividades.map(function (a) {
                        var hora = a.horaInicio ? new Date(a.horaInicio).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" }) : "";
                        return "<li>" + a.titulo + (hora ? " — " + hora : "") + "</li>";
                    }).join("") + "</ul>"
                    : "";

                panelInfo.innerHTML =
                    "<h4>" + zona.nombre + "</h4>" +
                    (zona.descripcion ? "<p>" + zona.descripcion + "</p>" : "") +
                    actividadesHtml;

            });
        });

    }

    window.renderizarMapaEvento = renderizarMapaEvento;

})();
