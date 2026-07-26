// --- 9. PROMO CINEMÁTICO: SCRUB DE VIDEO EN CANVAS ATADO AL SCROLL ---
// Un solo video (los 4 clips originales fusionados en video/promo-full.mp4, con
// keyframes cada 0.5s) recorrido de principio a fin según el progreso de scroll,
// dibujado frame a frame en un <canvas>. Antes eran 4 archivos separados con un
// "salto" de video en cada cambio de clip — cada archivo nuevo tenía su propio
// estado de carga/seek, lo que se sentía cortado justo en las transiciones. Con
// un solo archivo continuo y keyframes frecuentes, cualquier punto del recorrido
// busca rápido sin importar qué tan lejos esté del inicio.
const initPromoScroll = () => {
    const section = document.getElementById('promo-scroll');
    const pinEl = document.getElementById('promo-scroll-pin');
    const mainCanvas = document.getElementById('promo-canvas');
    const bgCanvas = document.getElementById('promo-bg-canvas');
    const video = document.getElementById('promo-clip');
    if (!section || !pinEl || !mainCanvas || !bgCanvas || !video) return;

    const mainCtx = mainCanvas.getContext('2d');
    const bgCtx = bgCanvas.getContext('2d');
    const texts = [0, 1, 2, 3].map(i => document.getElementById(`promo-text-${i}`));
    const SEGMENTS = texts.length; // 4 escenas dentro del video fusionado, para los textos

    const resizeCanvases = () => {
        const rect = pinEl.getBoundingClientRect();
        // pinEl es sticky a pantalla completa (h-screen w-full), así que si el rect
        // llega en 0x0 (layout no listo, o el navegador todavía no terminó de medir)
        // el viewport es un sustituto válido en vez de dejar el canvas sin dibujar.
        const rectW = rect.width || window.innerWidth;
        const rectH = rect.height || window.innerHeight;
        if (!rectW || !rectH) return; // nada fiable todavía; se reintentará después
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        // Canvas principal: contenido a 16:9, contenido dentro del viewport con margen.
        // pinEl tiene padding-top (pt-20) para que el header fijo no tape la parte de
        // arriba del video; ese espacio se resta antes de calcular el alto máximo, para
        // que en viewports muy verticales el video siga cabiendo dentro del área visible
        // real en vez de calcularse sobre el alto completo y desbordar por abajo.
        const topOffset = parseFloat(getComputedStyle(pinEl).paddingTop) || 0;
        const maxW = Math.min(rectW * 0.9, 1600);
        const maxH = (rectH - topOffset) * 0.82;
        let w = maxW, h = w * 9 / 16;
        if (h > maxH) { h = maxH; w = h * 16 / 9; }
        mainCanvas.style.width = w + 'px';
        mainCanvas.style.height = h + 'px';
        mainCanvas.width = Math.round(w * dpr);
        mainCanvas.height = Math.round(h * dpr);

        // Canvas de fondo: cubre toda la sección, se difumina y escala vía CSS. Se
        // dibuja a una FRACCIÓN de la resolución real (0.35x) — el resultado ya lleva
        // un blur(25px) tan grande que el detalle fino no se nota, así que renderizar
        // a resolución completa solo para difuminarlo después era puro gasto: un canvas
        // del tamaño del viewport con ese blur, redibujado cada frame durante todo el
        // scroll de la sección, era el costo más caro de la sección (el filtro recorre
        // cada píxel). El navegador estira este canvas más chico vía CSS sin diferencia
        // visible perceptible.
        const bgScale = 0.35;
        bgCanvas.width = Math.round(rectW * dpr * bgScale);
        bgCanvas.height = Math.round(rectH * dpr * bgScale);
    };

    const drawFrame = () => {
        if (video.readyState < 2 || !video.videoWidth) return;
        const vw = video.videoWidth, vh = video.videoHeight;

        // Canvas principal: "object-fit: cover" manual (recorta sobrante).
        const cw = mainCanvas.width, ch = mainCanvas.height;
        const videoRatio = vw / vh, canvasRatio = cw / ch;
        let sx, sy, sw, sh;
        if (videoRatio > canvasRatio) {
            sh = vh; sw = vh * canvasRatio; sy = 0; sx = (vw - sw) / 2;
        } else {
            sw = vw; sh = vw / canvasRatio; sx = 0; sy = (vh - sh) / 2;
        }
        mainCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);

        // Canvas de fondo: el frame completo sin recortar, para que al difuminarlo
        // y agrandarlo (vía CSS) el color se extienda más allá del video nítido y
        // no quede un borde duro entre el video y el fondo de la sección.
        bgCtx.drawImage(video, 0, 0, bgCanvas.width, bgCanvas.height);
    };

    const updateTexts = (activeIndex, localProgress) => {
        const fadeZone = 0.18; // % del tramo dedicado a entrar/salir suavemente
        texts.forEach((el, i) => {
            if (!el) return;
            let opacity = 0;
            if (i === activeIndex) {
                if (localProgress < fadeZone) opacity = localProgress / fadeZone;
                else if (localProgress > 1 - fadeZone) opacity = (1 - localProgress) / fadeZone;
                else opacity = 1;
            }
            el.style.opacity = opacity;
        });
    };

    // El scroll real dispara MUCHOS eventos por segundo. Si cada uno reasigna
    // currentTime mientras el seek anterior seguía en curso, lo cancela antes de que
    // termine — con eventos llegando más rápido de lo que un seek tarda en resolver,
    // NINGÚN seek llega a completarse nunca y 'seeked' no vuelve a disparar, dejando el
    // frame congelado para siempre aunque el scroll siga avanzando. En vez de reasignar
    // siempre, si el video ya está "seeking" solo se anota el destino más reciente y se
    // aplica en cuanto el seek en curso resuelva — así cada seek llega a terminar.
    let pendingTarget = null;
    video.addEventListener('seeked', () => {
        drawFrame();
        if (pendingTarget !== null) {
            const t = pendingTarget;
            pendingTarget = null;
            video.currentTime = t;
        }
    });

    const seekAndDraw = (progress) => {
        // Red de seguridad final: si por lo que sea el canvas seguía en 0x0
        // (layout no listo cuando corrieron los intentos anteriores), se
        // reintenta aquí mismo antes de dibujar, sin esperar a otro evento.
        if (!mainCanvas.width || !bgCanvas.width) resizeCanvases();

        const clamped = Math.min(Math.max(progress, 0), 0.999999);
        if (video.duration) {
            const target = clamped * video.duration;
            if (video.seeking) {
                pendingTarget = target;
            } else {
                video.currentTime = target;
            }
        }
        drawFrame(); // pinta de inmediato lo último ya decodificado (puede ir un frame detrás; el listener 'seeked' lo corrige)

        const scaled = clamped * SEGMENTS;
        const segIndex = Math.min(Math.floor(scaled), SEGMENTS - 1);
        const localProgress = scaled - segIndex;
        updateTexts(segIndex, localProgress);
    };

    // ResizeObserver en vez de un solo cálculo puntual: si en window.onload el
    // layout todavía no tiene medidas fiables (rect en 0x0), se vuelve a llamar
    // solo en cuanto el elemento realmente tenga tamaño, sin depender de que el
    // evento 'resize' de la ventana llegue a dispararse.
    resizeCanvases();
    let resizeTimeout;
    const scheduleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvases, 120);
    };
    if (window.ResizeObserver) {
        new ResizeObserver(scheduleResize).observe(pinEl);
    } else {
        window.addEventListener('resize', scheduleResize);
    }

    // Si el clip todavía no tiene src (placeholder) no bloquea el arranque de la
    // sección: la mecánica de scroll/pin/textos queda operativa de una vez.
    const waitForClip = () => new Promise(resolve => {
        if (!video.getAttribute('src')) return resolve();
        if (video.readyState >= 1) return resolve();
        video.addEventListener('loadedmetadata', () => resolve(), { once: true });
        video.addEventListener('error', () => resolve(), { once: true });
    });

    // Progreso de scroll calculado directo del scroll nativo (mismo patrón que ya
    // probamos que funciona bien en otro proyecto: rect.top / alto disponible), en vez
    // de depender de un ScrollTrigger de GSAP. Lenis ya anima el scroll real de la
    // ventana (no usa un wrapper/content propio), así que el evento 'scroll' nativo
    // sigue disparando con normalidad y esto es una sola fuente de verdad, más directa.
    const computeProgress = () => {
        const rect = section.getBoundingClientRect();
        const totalHeight = rect.height - window.innerHeight;
        if (totalHeight <= 0) return 0;
        return Math.min(Math.max(-rect.top / totalHeight, 0), 1);
    };

    // El scroll solo actualiza el OBJETIVO; un loop de rAF aparte va acercando el
    // progreso real hacia ese objetivo un poco en cada frame (misma idea que el lag
    // del cursor o el fondo líquido). Esto logra dos cosas a la vez: suaviza saltos
    // bruscos entre eventos de scroll irregulares (menos "torpe"/cortado), y hace que
    // al soltar el scroll el video siga avanzando un instante más hasta alcanzar el
    // objetivo en vez de detenerse en seco — el efecto de inercia que se pidió.
    let targetProgress = 0;
    let currentProgress = 0;
    let rafId = null;

    const tick = () => {
        currentProgress += (targetProgress - currentProgress) * 0.05;
        if (Math.abs(targetProgress - currentProgress) < 0.0004) currentProgress = targetProgress;
        seekAndDraw(currentProgress);
        rafId = requestAnimationFrame(tick);
    };
    const startTick = () => { if (rafId === null) tick(); };
    const stopTick = () => { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } };

    const handleScroll = () => { targetProgress = computeProgress(); };

    waitForClip().then(() => {
        // Segunda pasada defensiva: en la primera llamada (justo en window.onload)
        // el layout a veces todavía no tiene medidas fiables, así que se repite aquí.
        resizeCanvases();
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);
        targetProgress = currentProgress = computeProgress();

        // El loop de rAF solo corre mientras la sección esté cerca del viewport (igual
        // que la escena de partículas del Waitlist): si no, sería un requestAnimationFrame
        // dibujando en un canvas invisible para siempre, sin ningún beneficio visual.
        if (window.IntersectionObserver) {
            new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) startTick(); else stopTick();
            }, { rootMargin: '20% 0px' }).observe(section);
        } else {
            startTick();
        }
    });
};
