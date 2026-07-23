// Visor de solo lectura del mapa del evento — lo usan tanto el portal del
// campista como el sitio público. Las zonas llegan como puntos en
// porcentaje (0-100) relativo a la imagen, así que un <svg viewBox="0 0 100
// 100"> las dibuja directo, sin recalcular nada al cambiar de tamaño.
//
// Las formas NO llevan el nombre completo escrito encima: en zonas chicas
// el texto se salía y se encimaba con el de la zona vecina. En vez de eso,
// cada forma muestra solo un número, y debajo del mapa hay una leyenda
// "1. Baños, 2. Comedor..." — tocar la forma o la leyenda resalta ambas.
(function () {

    function coordenadasCentro(puntos) {
        var sx = 0, sy = 0;
        puntos.forEach(function (p) { sx += p.x; sy += p.y; });
        return { x: sx / puntos.length, y: sy / puntos.length };
    }

    // Pin como los de un mapa de parque/atracción: un círculo (el "bulbo",
    // donde va el número) con una colita triangular que apunta exactamente
    // al punto de la zona — la punta toca el punto, el bulbo queda arriba.
    function marcadorPin(punta, radio) {
        var centroBulbo = { x: punta.x, y: punta.y - radio * 1.7 };
        var anchoCola = radio * 0.55;
        var yBaseCola = centroBulbo.y + radio * 0.85;
        return {
            centroBulbo: centroBulbo,
            radio: radio,
            puntosCola: (punta.x - anchoCola) + "," + yBaseCola + " " + (punta.x + anchoCola) + "," + yBaseCola + " " + punta.x + "," + punta.y
        };
    }

    function inyectarEstilos() {

        if (document.getElementById("cf-mapa-evento-estilos")) return;

        var estilo = document.createElement("style");
        estilo.id = "cf-mapa-evento-estilos";
        estilo.textContent =
            ".cf-mapa-lienzo{ position:relative; width:100%; border:3px solid var(--ink); border-radius:14px; overflow:hidden; line-height:0; background:#eee; }" +
            ".cf-mapa-lienzo img{ width:100%; display:block; }" +
            ".cf-mapa-lienzo svg{ position:absolute; top:0; left:0; width:100%; height:100%; }" +
            ".cf-mapa-zona{ fill-opacity:.28; stroke-width:.6; cursor:pointer; transition:fill-opacity .12s ease; }" +
            ".cf-mapa-zona:hover, .cf-mapa-zona-activa{ fill-opacity:.5; }" +
            ".cf-mapa-pin{ filter:drop-shadow(0 .6px 1.1px rgba(0,0,0,.45)); pointer-events:none; }" +
            ".cf-mapa-pin-cola, .cf-mapa-pin-bulbo{ stroke:var(--ink); stroke-width:.35; }" +
            ".cf-mapa-zona-numero{ font-family:'Poppins', sans-serif; font-size:2.7px; font-weight:700; fill:#fff; text-anchor:middle; paint-order:stroke; stroke:var(--ink); stroke-width:.5px; stroke-linejoin:round; pointer-events:none; }" +
            ".cf-mapa-leyenda{ display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }" +
            ".cf-mapa-leyenda-item{ display:flex; align-items:center; gap:6px; padding:6px 12px 6px 6px; border-radius:999px; border:2px solid var(--ink); background:var(--white); font-size:12.5px; font-weight:700; cursor:pointer; }" +
            ".cf-mapa-leyenda-item.cf-mapa-leyenda-activa{ background:var(--yellow); }" +
            ".cf-mapa-leyenda-numero{ display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; border:2px solid var(--ink); font-size:11px; font-weight:800; flex-shrink:0; }" +
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

        var poligonos = zonas.map(function (zona, indice) {
            var puntos = zona.puntos.map(function (p) { return p.x + "," + p.y; }).join(" ");
            var centro = coordenadasCentro(zona.puntos);
            var pin = marcadorPin(centro, 3);
            return '<g data-cf-zona="' + zona.id + '">' +
                '<polygon class="cf-mapa-zona" points="' + puntos + '" style="fill:' + zona.color + '; stroke:' + zona.color + ';"></polygon>' +
                '<g class="cf-mapa-pin">' +
                '<polygon class="cf-mapa-pin-cola" points="' + pin.puntosCola + '" style="fill:' + zona.color + ';"></polygon>' +
                '<circle class="cf-mapa-pin-bulbo" cx="' + pin.centroBulbo.x + '" cy="' + pin.centroBulbo.y + '" r="' + pin.radio + '" style="fill:' + zona.color + ';"></circle>' +
                '<text class="cf-mapa-zona-numero" x="' + pin.centroBulbo.x + '" y="' + pin.centroBulbo.y + '" dy="0.95">' + (indice + 1) + '</text>' +
                '</g>' +
                '</g>';
        }).join("");

        var leyenda = zonas.map(function (zona, indice) {
            return '<div class="cf-mapa-leyenda-item" data-cf-leyenda="' + zona.id + '">' +
                '<span class="cf-mapa-leyenda-numero" style="background:' + zona.color + ';">' + (indice + 1) + '</span>' +
                '<span>' + zona.nombre + '</span>' +
                '</div>';
        }).join("");

        contenedor.innerHTML =
            '<div class="cf-mapa-lienzo">' +
            '<img src="' + datos.imagenUrl + '" alt="Mapa del evento">' +
            '<svg viewBox="0 0 100 100" preserveAspectRatio="none">' + poligonos + '</svg>' +
            '</div>' +
            (zonas.length > 0 ? '<div class="cf-mapa-leyenda">' + leyenda + '</div>' : '') +
            '<div class="cf-mapa-info" id="cf-mapa-info-panel"><p class="cf-mapa-vacio">Toca una zona del mapa (o de la lista) para ver más detalles.</p></div>';

        var panelInfo = contenedor.querySelector("#cf-mapa-info-panel");

        function seleccionarZona(zona) {

            if (!zona) return;

            contenedor.querySelectorAll(".cf-mapa-zona").forEach(function (p) { p.classList.remove("cf-mapa-zona-activa"); });
            contenedor.querySelectorAll(".cf-mapa-leyenda-item").forEach(function (item) { item.classList.remove("cf-mapa-leyenda-activa"); });

            var grupo = contenedor.querySelector('[data-cf-zona="' + zona.id + '"]');
            if (grupo) grupo.querySelector(".cf-mapa-zona").classList.add("cf-mapa-zona-activa");

            var itemLeyenda = contenedor.querySelector('[data-cf-leyenda="' + zona.id + '"]');
            if (itemLeyenda) itemLeyenda.classList.add("cf-mapa-leyenda-activa");

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

        }

        contenedor.querySelectorAll("[data-cf-zona]").forEach(function (g) {
            g.addEventListener("click", function () {
                seleccionarZona(zonas.filter(function (z) { return z.id === g.dataset.cfZona; })[0]);
            });
        });

        contenedor.querySelectorAll("[data-cf-leyenda]").forEach(function (item) {
            item.addEventListener("click", function () {
                seleccionarZona(zonas.filter(function (z) { return z.id === item.dataset.cfLeyenda; })[0]);
            });
        });

    }

    window.renderizarMapaEvento = renderizarMapaEvento;

})();
