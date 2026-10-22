# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Jóvenes del Valle del Cauca** (de Bugalagrande primero) que quieren saber si pueden ir, cuándo es, qué pasa allí y cómo inscribirse. Leen sobre todo en el celular.
- **Madres, padres y acudientes de menores de edad** que necesitan confianza: quién organiza, qué respaldo legal tiene, cómo se cuida a los menores y qué permisos firmar.
- **Aliados públicos y privados** (Gobernación del Valle, Alcaldía de Bugalagrande, Indervalle, Río Paila Castilla, Fundación Caicedo González, Nestlé y otros) que revisan la seriedad, la viabilidad y el uso de los recursos antes de comprometer apoyo.

## Product Purpose

Sitio público de Camp Fest Bugalagrande, II Campamento Juvenil del Valle del Cauca: informa, genera confianza y recibe inscripciones. El éxito es que un joven se inscriba, que un acudiente autorice sin dudas y que un aliado confirme su apoyo.

## Positioning

Desde octubre de 2026 el campamento se reenfoca en la **reconstrucción social después del terremoto**: tejido social, bienestar emocional, preparación comunitaria ante el riesgo (Ley 1523 de 2012), participación juvenil en la reconstrucción y liderazgo. Lema: "Jóvenes que reconstruyen". Principio rector: la comunidad va primero y el recurso después; el bienestar de la mayoría guía cada decisión. Nada se presenta como celebración; las actividades recreativas se reformulan como espacios de memoria, cultura y bienestar. El terremoto se menciona en términos generales, sin cifras ni fechas.


Es una iniciativa de jóvenes para jóvenes, organizada en Bugalagrande por consejeros municipales de juventud. Algunos jóvenes del Subsistema de Participación Juvenil participan en la organización; otros están por confirmar su interés. No se presenta al Subsistema como organizador. Se apoya en el Estatuto de Ciudadanía Juvenil (Ley 1622 de 2013, modificada por la Ley 1885 de 2018). Tiene un sistema propio de inscripción, admisión y control logístico.

## Operating Context

- Edición 2 (la primera fue en 2025). Sede en Bugalagrande; el lugar exacto está por confirmar.
- **Aplazado al primer semestre de 2027**; la fecha exacta está por definir. Las inscripciones siguen abiertas sin fecha de cierre hasta que se anuncie la fecha.
- Los aliados privados (Río Paila Castilla, Nestlé, Red CPA y otros), la Gobernación del Valle (con las Secretarías de Salud, Educación y TIC) e Indervalle aplazaron su apoyo por el terremoto, pero no lo retiraron. Sus compromisos siguen en pie. La Alcaldía de Bugalagrande está en revisión: decidirá su apoyo según el número de inscritos, y solo hará la difusión si forma parte de la organización. La Industria de Licores del Valle ya no es aliada, porque el evento tiene menores de edad. La póliza de seguros la pagan los organizadores.
- Las inscripciones, el portal del campista, la verificación de cartas, el mapa y el estado del evento dependen de la API en Railway (`campfest-api-production.up.railway.app`) y de Supabase. A la fecha (octubre de 2026) ambos están inactivos y hay que reactivarlos.

## Capabilities and Constraints

- Sitio estático en HTML, CSS y JS sin compilación, publicado con CNAME en campfest.online. Las subpáginas viven en `campfest/*`.
- Se comunica públicamente: **unos 150 jóvenes**; Bugalagrande tiene más de la mitad de los cupos, ingreso directo y una edad mínima de 15 años.
- El presupuesto se presenta por componentes y fuentes de apoyo (en dinero o en especie), **sin cifras en pesos**. No se inventan montos.
- Los paneles internos (`centro-control`, `logistica`, `manual`, `verificacion`) quedan fuera del rediseño público.

## Brand Commitments

- Estilo Memphis de campamento con la paleta actual (#FF2E8B, #FFD400, #00D2C6, #8B2FF0, #FF6B00, tinta #1A1A1E) y las animaciones actuales (confeti, flotación, revelado al hacer scroll). El usuario las pidió explícitamente.
- Tono más profesional y confiable: **iconos en lugar de emojis**. La redacción es clara y sin muletillas de texto generado por IA.
- Firma: Camp Fest Bugalagrande. Equipo coordinador: Juan José Wallens Serna y Sarha Gabriela Pacheco Reyes, consejeros municipales de juventud.

## Evidence on Hand

- `../../Ficha Tecnica CampFest 2026.pdf`: objetivos, componentes, metodología e indicadores de impacto.
- `../../Peticiones GOBER/`: peticiones a la Gobernación (Desarrollo Social, Salud, Indervalle, Educación, TIC, ILV).
- `../../SolicitudFormalAlcaldiaBugalagrande.docx`: alineación con el Plan de Desarrollo Municipal 2024–2027 y la lista de recursos en especie.
- `../../Cartas/`: cartas a Río Paila, Nestlé, Bimbo, Colombina, SuperGiros, Fundación Caicedo González y otros.
- No hay testimonios, cifras de dinero ni convenios firmados publicables. No se fabrican.

## Product Principles

1. La confianza va antes que el entusiasmo: cada afirmación se puede verificar o se presenta como lo que es (tentativa, en gestión o confirmada).
2. Decir el estado real: la fecha es tentativa y el apoyo está aplazado, no cancelado. Nunca se presenta como más avanzado de lo que está.
3. El celular es lo primero: la mayoría de los jóvenes y acudientes entran desde el teléfono.
4. Bugalagrande tiene prioridad sin excluir a nadie.

## Accessibility & Inclusion

Público con menores de edad y zonas rurales con conexiones lentas: hay que cuidar el contraste, respetar `prefers-reduced-motion`, usar texto legible en el celular y mantener la página liviana.
