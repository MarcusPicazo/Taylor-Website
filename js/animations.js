// --- 3. FUNCIONES DE CONSTRUCCIÓN DINÁMICA ---
const initSpiralText = () => {
    const container = document.getElementById('spiral-container');
    if (!container) return;
    const words = getSpiralWords(currentLang);
    const totalItems = 35;
    const isMobile = window.innerWidth < 768;
    const radius = isMobile ? 180 : 380;

    for (let i = 0; i < totalItems; i++) {
        const el = document.createElement('div');
        if (i % 2 === 0) { el.className = 'absolute top-1/2 left-1/2 text-4xl md:text-7xl font-extrabold text-white/80 tracking-tighter whitespace-nowrap'; }
        else { el.className = 'absolute top-1/2 left-1/2 text-4xl md:text-7xl font-extrabold text-transparent tracking-tighter whitespace-nowrap'; el.style.webkitTextStroke = isMobile ? '1px rgba(255,255,255,0.6)' : '2px rgba(255,255,255,0.6)'; }
        el.innerText = words[i % words.length];
        const angle = i * 35; const yOffset = (i * 90) - (totalItems * 45);
        el.style.transform = `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${radius}px) translateY(${yOffset}px)`;
        container.appendChild(el);
    }
};

const buildZoomText = () => {
    const container = document.getElementById('statement-text');
    const text = container.innerText;
    container.innerHTML = '';
    text.split(' ').forEach(word => {
        const wordSpan = document.createElement('span');
        wordSpan.style.display = 'inline-block'; wordSpan.style.marginRight = '0.25em';
        word.split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.innerHTML = char;
            // Resetear estilos iniciales de GSAP
            charSpan.style.opacity = '0.1'; charSpan.style.transform = 'translateY(10px) scale(0.95)';
            wordSpan.appendChild(charSpan);
        });
        container.appendChild(wordSpan);
    });
};

// El timeline scrubeado del manifiesto ("We don't build...") necesita reconstruirse
// cada vez que buildZoomText() reemplaza los spans (typeof cambio de idioma incluido):
// un tween creado con un selector de texto resuelve sus targets UNA sola vez al crearse,
// así que si el DOM se reconstruye después, el timeline viejo queda apuntando a nodos
// ya desmontados y la animación deja de reaccionar al scroll (por eso solo funcionaba
// en inglés, nunca tras cambiar a español).
let statementScrollTrigger = null;
const initStatementZoom = () => {
    if (statementScrollTrigger) statementScrollTrigger.kill();
    const zoomWrapper = document.querySelector('.zoom-wrapper');
    gsap.set(zoomWrapper, { clearProps: "scale,opacity" });

    const tl = gsap.timeline({ scrollTrigger: { trigger: '#statement', start: "top top", end: "bottom bottom", scrub: 1 } });
    tl.to('#statement-text span span', { opacity: 1, transform: 'translateY(0px) scale(1)', stagger: 0.02, ease: "power2.out", duration: 3 });
    tl.to(zoomWrapper, { scale: 1, duration: 1.5 });
    // Escala y opacidad van en tweens separados que arrancan juntos: la escala crece
    // lento-a-rápido (power4.in, duration 4) mientras la opacidad cae en una ventana más
    // corta (duration 2, power2.in) desde el mismo punto de partida. Con power2.in la
    // opacidad se queda cerca de 1 en su primer tramo (el texto no se apaga antes de
    // tiempo, como sí pasaba con power4.out, que la hacía caer casi de inmediato) y solo
    // cae del todo cuando la escala apenas empieza a crecer (~4-5x) — antes de que se
    // vuelva lo bastante grande como para verse recortada por el overflow-hidden del
    // contenedor. Simétrico en ambas direcciones de scroll.
    tl.to(zoomWrapper, { scale: 60, ease: "power4.in", duration: 4 });
    tl.to(zoomWrapper, { opacity: 0, ease: "power2.in", duration: 2 }, "<");
    statementScrollTrigger = tl.scrollTrigger;
};

// Reveal a medida ("ensamblado") para las 3 filas de specs en Tecnología: en vez del
// fade plano genérico (.gs-up), cada pieza de la fila entra en su propio momento —
// número, luego ícono con un pequeño rebote, luego título y texto deslizándose desde
// la izquierda — para que se sienta más armado que un simple aparecer. Solo opacity y
// transform (compositor, sin filter) para que corra fluido durante el scroll.
const initTechRows = () => {
    gsap.utils.toArray('#solucion .hover-zoom').forEach(row => {
        const number = row.querySelector('span');
        const icon = row.querySelector('div');
        const heading = row.querySelector('h3');
        const paragraph = row.querySelector('p');
        const tl = gsap.timeline({
            scrollTrigger: { trigger: row, start: "top bottom-=60", end: "top 55%", scrub: 0.6 }
        });
        tl.fromTo(number, { opacity: 0, y: 24 }, { opacity: 1, y: 0, ease: "power2.out", duration: 1 }, 0);
        tl.fromTo(icon, { opacity: 0, y: 24, scale: 0.7 }, { opacity: 1, y: 0, scale: 1, ease: "back.out(1.7)", duration: 1 }, 0.12);
        tl.fromTo(heading, { opacity: 0, x: -24 }, { opacity: 1, x: 0, ease: "power2.out", duration: 1 }, 0.24);
        tl.fromTo(paragraph, { opacity: 0, x: -24 }, { opacity: 1, x: 0, ease: "power2.out", duration: 1 }, 0.36);
    });
};

// Reveal a medida para la tarjeta "Why the current model failed": en vez del fade
// genérico, el texto entra deslizándose desde la izquierda y la gráfica desde la
// derecha, conviergiendo hacia el centro — distinto al resto de las tarjetas.
const initFailedModelCard = () => {
    const card = document.getElementById('failed-model-card');
    if (!card) return;
    const [textCol, chartCol] = card.querySelectorAll(':scope > .relative > div');
    if (!textCol || !chartCol) return;
    gsap.timeline({
        scrollTrigger: { trigger: card, start: "top bottom-=40", end: "top 55%", scrub: 0.6 }
    })
        .fromTo(textCol, { opacity: 0, x: -60 }, { opacity: 1, x: 0, ease: "power2.out", duration: 1 }, 0)
        .fromTo(chartCol, { opacity: 0, x: 60 }, { opacity: 1, x: 0, ease: "power2.out", duration: 1 }, 0.1);
};

// Reveal a medida para "The Core Three": las tarjetas laterales (Marcus, Demian)
// se deslizan desde sus lados hacia el centro, mientras la tarjeta central de
// Valeria crece con un pequeño rebote — el trío "se ensambla" en vez de solo
// aparecer, distinto al resto de las secciones. Valeria ya usa scale-110 en reposo
// (tarjeta protagonista), así que el tween termina ahí, no en scale 1.
const initCoreThree = () => {
    const grid = document.getElementById('core-three-grid');
    if (!grid) return;
    const [marcus, valeria, demian] = grid.children;
    if (!marcus || !valeria || !demian) return;
    const tl = gsap.timeline({
        scrollTrigger: { trigger: grid, start: "top bottom-=40", end: "top 45%", scrub: 0.6 }
    });
    tl.fromTo(marcus, { opacity: 0, x: -70 }, { opacity: 1, x: 0, ease: "power2.out", duration: 1 }, 0);
    tl.fromTo(demian, { opacity: 0, x: 70 }, { opacity: 1, x: 0, ease: "power2.out", duration: 1 }, 0);
    tl.fromTo(valeria, { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1.1, ease: "back.out(1.4)", duration: 1.1 }, 0.08);
};

// Reveal a medida para el resto del equipo (Otoño/Andy/Mel): cada tarjeta "se
// asienta" — entra rotada de más y va enderezándose a su rotación final mientras
// sube y crece, como una foto que se termina de acomodar. Alternar el signo de la
// rotación inicial le da variedad en vez de que las 3 se muevan idéntico.
const initRestTeamRow = () => {
    const row = document.getElementById('rest-team-row');
    if (!row) return;
    [...row.children].forEach((cardEl, i) => {
        const fromRotation = i % 2 === 0 ? -9 : 9;
        const offsetPx = i * 90;
        gsap.fromTo(cardEl,
            { opacity: 0, y: 45, scale: 0.9, rotation: fromRotation },
            {
                opacity: 1, y: 0, scale: 1, rotation: 0, ease: "power2.out",
                scrollTrigger: {
                    trigger: cardEl,
                    start: offsetPx ? `top bottom-=${40 + offsetPx}` : "top bottom-=40",
                    end: "top 70%",
                    scrub: 0.6
                }
            }
        );
    });
};

// --- 4. GSAP ANIMATIONS ---
const initGSAP = () => {
    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.create({
        start: 'top -50', end: 99999, toggleClass: {className: 'floating-nav', targets: '#navbar'},
        onEnter: () => document.getElementById('navbar-inner').classList.replace('h-20', 'h-16'),
        onLeaveBack: () => document.getElementById('navbar-inner').classList.replace('h-16', 'h-20')
    });

    gsap.to('.hero-content', {
        scale: 1.5, opacity: 0, ease: "power2.in",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 1 }
    });

    buildZoomText(); // Build it once for GSAP
    initStatementZoom();
    initTechRows();
    initFailedModelCard();
    initCoreThree();
    initRestTeamRow();

    initSpiralText();
    if(document.getElementById('spiral-container')) {
        // Forma/recorrido originales del monolito (el desplazamiento vertical es
        // -3000/-2000, scrub subido a 1.8 para que se sienta más soft de ida y vuelta).
        gsap.to('#spiral-container', {
            rotationY: -360 * 2, y: window.innerWidth < 768 ? -2000 : -3000, ease: "none",
            scrollTrigger: { trigger: "#spiral-section", start: "top top", end: "bottom bottom", scrub: 1.8 }
        });
    }

    gsap.utils.toArray('.panel:not(#hero):not(#statement):not(#spiral-section):not(#lista-espera):not(#promo-scroll)').forEach((panel) => {
        ScrollTrigger.create({
            trigger: panel, start: "top 95%", end: "top 20%", scrub: 1,
            animation: gsap.fromTo(panel, { y: 50, opacity: 0 }, { y: 0, opacity: 1, ease: "power2.out" })
        });
    });

    // Lista de espera sigue inmediatamente al espiral (ahora que Economics ya no está
    // entre medio): entrada rápida, sin espacio muerto de scroll.
    ScrollTrigger.create({
        trigger: '#lista-espera', start: "top bottom", end: "top 85%", scrub: 1,
        animation: gsap.fromTo('#lista-espera', { y: 50, opacity: 0 }, { y: 0, opacity: 1, ease: "power2.out" })
    });

    // Fluido en ambas direcciones: la revelación queda atada de forma continua a la
    // posición de scroll (scrub) en vez de disparar una animación de duración fija al
    // cruzar un punto — así no “se prende de golpe” y responde igual subiendo o bajando.
    gsap.utils.toArray('.gs-up').forEach(elem => {
        // Varias tarjetas ya traían un transition-delay inline (0s/0.1s/0.2s/0.3s) de
        // cuando la animación anterior sí usaba duración fija; ese delay quedaba sin
        // efecto con scrub. Lo reaprovechamos como un pequeño desfase de scroll para
        // que grupos en una misma fila (ej. las 4 tarjetas de Waitlist) se revelen en
        // cascada de izquierda a derecha en vez de todas al mismo tiempo.
        const delaySeconds = parseFloat(elem.style.transitionDelay) || 0;
        // Antes 300: con 3-4 tarjetas por fila (0/0.1/0.2/0.3s) la última llegaba a
        // arrancar 90px más tarde que la primera y, con el final fijo en el mismo punto
        // de scroll para toda la fila, le quedaba menos recorrido para completarse —
        // terminaba de aparecer casi hasta que el usuario ya iba de salida de la
        // sección, sin tiempo de leerla. Reducido a la mitad para que el desfase siga
        // dando la cascada izquierda-a-derecha sin comerse tanto margen.
        const offsetPx = Math.round(delaySeconds * 150);
        // Solo opacity + transform: son las dos únicas propiedades que el navegador
        // puede animar en el hilo de composición sin repintar. Una versión anterior
        // sumaba un filter (brightness/saturate) para reforzar la sensación de "se
        // enciende el color", pero filter fuerza un repintado en el hilo principal en
        // cada frame — con 20+ tarjetas a la vez eso era la causa real del stuttering.
        // El final del recorrido también se adelantó (de 55% a 80% del viewport): así
        // la tarjeta ya está completamente visible poco después de entrar en pantalla,
        // dejando tiempo real de lectura antes de que el usuario siga bajando, en vez
        // de terminar de aparecer justo cuando ya casi se sale de la vista.
        gsap.fromTo(elem,
            { y: 40, opacity: 0 },
            {
                y: 0, opacity: 1, ease: "power1.out",
                scrollTrigger: {
                    trigger: elem,
                    start: offsetPx ? `top bottom-=${offsetPx}` : "top bottom",
                    end: "top 80%",
                    scrub: 0.6
                }
            }
        );
    });
};
