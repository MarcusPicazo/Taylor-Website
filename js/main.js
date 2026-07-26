// Scroll suave con aceleración/desaceleración al hacer clic en los links del header,
// en vez del salto instantáneo por defecto del navegador.
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Menú móvil: el nav de escritorio se oculta por completo bajo el breakpoint md, así
// que en mobile es la única forma de llegar a cualquier sección desde el header.
const toggleMobileMenu = () => {
    const menu = document.getElementById('mobile-menu');
    const isOpen = menu.classList.contains('flex');
    menu.className = isOpen
        ? 'hidden md:hidden mx-4 mt-2 bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden'
        : 'flex flex-col md:hidden mx-4 mt-2 bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden';
};
const closeMobileMenu = () => {
    document.getElementById('mobile-menu').className = 'hidden md:hidden mx-4 mt-2 bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden';
};

const wireNavSmoothScroll = () => {
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const targetEl = document.querySelector(link.getAttribute('href'));
            if (!targetEl || !lenisInstance) return;
            e.preventDefault();
            // Mientras dura el salto, se omiten los updates de ScrollTrigger (ver
            // background.js) para que el viaje sea solo desplazamiento fluido, sin
            // reproducir de golpe todas las animaciones de las secciones de por medio.
            // Al llegar, un ScrollTrigger.update() deja cada animación exactamente en
            // el estado que le corresponde para la posición final, sin transición.
            suppressScrollTriggerUpdates = true;
            lenisInstance.scrollTo(targetEl, {
                duration: 1.4, easing: easeInOutCubic,
                onComplete: () => { suppressScrollTriggerUpdates = false; ScrollTrigger.update(); }
            });
        });
    });
};

// Aviso de "sigue escroleando" para toda la página: se muestra cuando el usuario
// deja de escrolear por un momento (sin haber llegado al final), y se apaga en
// cuanto retoma el scroll. En el hero, antes de que haya pasado nada, el mensaje
// es "empieza a escrolear" en vez de "sigue". Un intervalo simple (no rAF) porque
// solo hace falta revisar unas pocas veces por segundo, no en cada frame.
const initScrollHint = () => {
    const hint = document.getElementById('scroll-hint');
    const textEl = document.getElementById('scroll-hint-text');
    const heroEl = document.getElementById('hero');
    if (!hint || !textEl || !heroEl) return;

    const IDLE_MS = 1000;
    const labels = {
        hero: { en: 'Start scrolling', es: 'Empieza a scrolear' },
        rest: { en: 'Keep scrolling', es: 'Sigue scroleando' }
    };

    let lastScrollTime = performance.now();
    window.addEventListener('scroll', () => { lastScrollTime = performance.now(); }, { passive: true });

    setInterval(() => {
        const idle = performance.now() - lastScrollTime > IDLE_MS;
        const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
        const shouldShow = idle && !atBottom;
        hint.style.opacity = shouldShow ? '1' : '0';
        if (shouldShow) {
            // Sigue en el hero mientras su mitad de abajo todavía se vea en pantalla.
            const inHero = heroEl.getBoundingClientRect().bottom > window.innerHeight * 0.5;
            const set = inHero ? labels.hero : labels.rest;
            const lang = (typeof currentLang !== 'undefined' && currentLang === 'es') ? 'es' : 'en';
            textEl.textContent = set[lang];
        }
    }, 200);
};

window.onload = () => {
    initLenis();
    initWebGL();
    initGSAP();
    initCursor();
    initWaitlist();
    wireDownloadLinks();
    wireNavSmoothScroll();
    initPromoScroll();
    initScrollHint();
    ScrollTrigger.create({ trigger: "#problema", start: "top 50%", onEnter: () => initCharts(), once: true });
};
