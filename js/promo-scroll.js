// --- 9. PROMO CINEMÁTICO: SCRUB DE SECUENCIA DE IMÁGENES ATADA AL SCROLL ---
// Antes esto buscaba (seek) frames en un <video> y los dibujaba en un <canvas>. Un
// seek real es asíncrono y tiene latencia (decodificar hasta el frame pedido); con
// scroll rápido llegan más eventos por segundo de los que un seek tarda en resolver,
// así que el canvas se quedaba pintando el mismo frame varias veces seguidas y luego
// saltaba al siguiente — eso es justo lo que se sentía "a pasos"/trabado, sin importar
// cuánto se afinara el manejo del seek. La solución real es no depender de ningún seek:
// el video se pre-renderizó como 150 frames (cada ~0.134s) empacados en 3 "hojas" de
// sprites (video/sequence/sheet_N.jpg, 10x5 frames de 640x360 cada una). Dibujar el
// frame que toca es un simple drawImage recortando su celda — instantáneo, sin espera,
// así que el scrub queda tan fluido como el scroll mismo lo permita.
const initPromoScroll = () => {
    const section = document.getElementById('promo-scroll');
    const pinEl = document.getElementById('promo-scroll-pin');
    const mainCanvas = document.getElementById('promo-canvas');
    const bgCanvas = document.getElementById('promo-bg-canvas');
    if (!section || !pinEl || !mainCanvas || !bgCanvas) return;

    const mainCtx = mainCanvas.getContext('2d');
    const bgCtx = bgCanvas.getContext('2d');
    const texts = [0, 1, 2, 3].map(i => document.getElementById(`promo-text-${i}`));
    const SEGMENTS = texts.length; // 4 escenas dentro de la secuencia, para los textos

    const TOTAL_FRAMES = 150;
    const COLS = 10, ROWS = 5, PER_SHEET = COLS * ROWS;
    const CELL_W = 640, CELL_H = 360;
    const NUM_SHEETS = Math.ceil(TOTAL_FRAMES / PER_SHEET);

    const sheets = [];
    let sheetsReady = 0;
    let allSheetsReady = false;
    for (let i = 0; i < NUM_SHEETS; i++) {
        const img = new Image();
        img.onload = () => { sheetsReady++; if (sheetsReady === NUM_SHEETS) allSheetsReady = true; };
        img.src = `video/sequence/sheet_${i}.jpg`;
        sheets.push(img);
    }

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
        // a resolución completa solo para difuminarlo después era puro gasto.
        const bgScale = 0.35;
        bgCanvas.width = Math.round(rectW * dpr * bgScale);
        bgCanvas.height = Math.round(rectH * dpr * bgScale);
    };

    const drawFrame = (progress) => {
        if (!allSheetsReady) return;
        const frameIndex = Math.min(Math.floor(progress * TOTAL_FRAMES), TOTAL_FRAMES - 1);
        const sheetIndex = Math.floor(frameIndex / PER_SHEET);
        const indexInSheet = frameIndex % PER_SHEET;
        const col = indexInSheet % COLS;
        const row = Math.floor(indexInSheet / COLS);
        const sx = col * CELL_W, sy = row * CELL_H;
        const sheetImg = sheets[sheetIndex];
        if (!sheetImg || !sheetImg.complete) return;

        // Canvas principal: "object-fit: cover" manual (recorta sobrante de la celda).
        const cw = mainCanvas.width, ch = mainCanvas.height;
        const cellRatio = CELL_W / CELL_H, canvasRatio = cw / ch;
        let cropX = sx, cropY = sy, cropW = CELL_W, cropH = CELL_H;
        if (cellRatio > canvasRatio) {
            cropW = CELL_H * canvasRatio;
            cropX = sx + (CELL_W - cropW) / 2;
        } else {
            cropH = CELL_W / canvasRatio;
            cropY = sy + (CELL_H - cropH) / 2;
        }
        mainCtx.drawImage(sheetImg, cropX, cropY, cropW, cropH, 0, 0, cw, ch);

        // Canvas de fondo: la celda completa sin recortar, para que al difuminarla y
        // agrandarla (vía CSS) el color se extienda más allá del video nítido y no
        // quede un borde duro entre el video y el fondo de la sección.
        bgCtx.drawImage(sheetImg, sx, sy, CELL_W, CELL_H, 0, 0, bgCanvas.width, bgCanvas.height);
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

    const drawAtProgress = (progress) => {
        // Red de seguridad final: si por lo que sea el canvas seguía en 0x0
        // (layout no listo cuando corrieron los intentos anteriores), se
        // reintenta aquí mismo antes de dibujar, sin esperar a otro evento.
        if (!mainCanvas.width || !bgCanvas.width) resizeCanvases();

        const clamped = Math.min(Math.max(progress, 0), 0.999999);
        drawFrame(clamped);

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
    // del cursor o el fondo líquido). Esto suaviza saltos bruscos entre eventos de
    // scroll irregulares, y hace que al soltar el scroll el video siga avanzando un
    // instante más hasta alcanzar el objetivo en vez de detenerse en seco — el efecto
    // de inercia que se pidió. Como ya no hay ningún seek de por medio, cada tick
    // dibuja de inmediato el frame que le toca: nada que esperar, nada que se atore.
    let targetProgress = 0;
    let currentProgress = 0;
    let rafId = null;

    const tick = () => {
        currentProgress += (targetProgress - currentProgress) * 0.08;
        if (Math.abs(targetProgress - currentProgress) < 0.0004) currentProgress = targetProgress;
        drawAtProgress(currentProgress);
        rafId = requestAnimationFrame(tick);
    };
    const startTick = () => { if (rafId === null) tick(); };
    const stopTick = () => { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } };

    const handleScroll = () => { targetProgress = computeProgress(); };

    // Segunda pasada defensiva: en la primera llamada (justo en window.onload) el
    // layout a veces todavía no tiene medidas fiables, así que se repite aquí.
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
};
