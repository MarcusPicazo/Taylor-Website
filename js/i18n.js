// --- 0. TRANSLATION SYSTEM (GSAP WIPE EFFECT) ---
let currentLang = 'en'; // Default

// Cargar palabras del espiral según idioma
const getSpiralWords = (lang) => {
    return lang === 'en' ?
        ["SECURITY", "TRUST", "FREEDOM", "EMPOWERMENT", "TAYLOR", "INNOVATION", "CERTAINTY", "COMMUNITY", "FEARLESS", "UNBREAKABLE", "PROTECTION", "MOBILITY"] :
        ["SEGURIDAD", "CONFIANZA", "LIBERTAD", "EMPODERAMIENTO", "TAYLOR", "INNOVACIÓN", "CERTEZA", "COMUNIDAD", "SIN MIEDO", "INQUEBRANTABLE", "PROTECCIÓN", "MOVILIDAD"];
};

// Calcula, para el set de elementos dado, un delay explícito por elemento según
// su posición horizontal real en pantalla (izquierda = antes). No depende de la
// distribución interna de GSAP para stagger por eje, que no barría de forma
// perceptible: aquí el orden queda garantizado.
const leftToRightDelays = (elements, totalSpread) => {
    const sorted = Array.from(elements).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    const n = sorted.length;
    const delays = new Map();
    sorted.forEach((el, i) => delays.set(el, n > 1 ? (i / (n - 1)) * totalSpread : 0));
    return (i, target) => delays.get(target) || 0;
};

const switchLanguage = (newLang) => {
    if (newLang === currentLang) return;

    // UI Toggle Button update
    document.getElementById('btn-en').className = newLang === 'en' ? 'px-3 py-1.5 text-xs font-bold rounded-full bg-white text-taylor-dark transition-all duration-300' : 'px-3 py-1.5 text-xs font-bold rounded-full text-white/50 hover:text-white transition-all duration-300 cursor-pointer';
    document.getElementById('btn-es').className = newLang === 'es' ? 'px-3 py-1.5 text-xs font-bold rounded-full bg-white text-taylor-dark transition-all duration-300' : 'px-3 py-1.5 text-xs font-bold rounded-full text-white/50 hover:text-white transition-all duration-300 cursor-pointer';

    const elements = document.querySelectorAll('.i18n-text');

    // will-change solo durante el barrido (se retira al final junto con clearProps):
    // son decenas de elementos y el efecto es puntual, no continuo.
    gsap.set(elements, { willChange: 'clip-path' });

    // Wipe Out: barrido de izquierda a derecha, delay explícito por posición real en pantalla.
    // Unidades en % consistentes en todo el recorrido (el CSS base también usa %) para que
    // GSAP interpole cada componente de forma continua en vez de saltar entre valores.
    gsap.to(elements, {
        clipPath: "inset(0% 0% 0% 100%)",
        duration: 0.55,
        ease: "sine.inOut",
        stagger: leftToRightDelays(elements, 0.55),
        onComplete: () => {
            // Update Text
            elements.forEach(el => {
                if(el.hasAttribute(`data-${newLang}`)) {
                    el.innerHTML = el.getAttribute(`data-${newLang}`);
                }
            });

            // Update Zoom Statement manually (it uses custom spans)
            const statementEl = document.getElementById('statement-text');
            statementEl.innerHTML = statementEl.getAttribute(`data-${newLang}`);
            buildZoomText(); // Re-build spans for the zoom animation
            initStatementZoom(); // El timeline viejo apuntaba a los spans que acaban de desaparecer

            // Update 3D Spiral: mismo barrido izquierda a derecha que el resto del texto,
            // en vez de cambiar la palabra de golpe sin transición.
            const words = getSpiralWords(newLang);
            const spiralElements = document.querySelectorAll('#spiral-container div');
            if (spiralElements.length) {
                gsap.set(spiralElements, { willChange: 'clip-path' });
                gsap.to(spiralElements, {
                    clipPath: "inset(0% 0% 0% 100%)",
                    duration: 0.4,
                    ease: "sine.inOut",
                    stagger: leftToRightDelays(spiralElements, 0.3),
                    onComplete: () => {
                        spiralElements.forEach((el, index) => { el.innerText = words[index % words.length]; });
                        gsap.set(spiralElements, { clipPath: "inset(0% 100% 0% 0%)" });
                        gsap.to(spiralElements, {
                            clipPath: "inset(0% 0% 0% 0%)",
                            duration: 0.45,
                            ease: "sine.inOut",
                            stagger: leftToRightDelays(spiralElements, 0.3),
                            onComplete: () => gsap.set(spiralElements, { clearProps: "clipPath,willChange" })
                        });
                    }
                });
            }

            // Prepare to Wipe In from Left
            gsap.set(elements, { clipPath: "inset(0% 100% 0% 0%)" });

            // Wipe In: mismo barrido izquierda a derecha, recalculado con las posiciones
            // ya actualizadas (el texto nuevo puede tener otro ancho/alto).
            gsap.to(elements, {
                clipPath: "inset(0% 0% 0% 0%)",
                duration: 0.65,
                ease: "sine.inOut",
                stagger: leftToRightDelays(elements, 0.55),
                onComplete: () => {
                    gsap.set(elements, { clearProps: "clipPath,willChange" }); // clean up
                    currentLang = newLang;

                    // El cambio de idioma altera la altura de secciones enteras (ES suele
                    // ser más largo que EN). Si no le avisamos a Lenis, su scroll virtual
                    // queda con las medidas viejas y todo el scroll-linked animation se
                    // desincroniza de ahí en adelante (por eso "en inglés sí, en español no").
                    if (typeof lenisInstance !== 'undefined' && lenisInstance) {
                        lenisInstance.resize();
                    }
                    ScrollTrigger.refresh();
                }
            });
        }
    });
};
