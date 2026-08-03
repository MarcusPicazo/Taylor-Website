// --- 6. CURSOR ---
const initCursor = () => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const dot = document.getElementById('custom-cursor-dot'), ring = document.getElementById('custom-cursor-ring');
    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2, ringX = mouseX, ringY = mouseY;
    // Solo guarda la posición cruda aquí; el mousemove puede disparar muchas más veces
    // por segundo de lo que el navegador pinta (ratones/trackpads de alto polling), así
    // que escribir el transform del punto en cada evento es trabajo de sobra que nunca
    // llega a pintarse. El punto se escribe una sola vez por frame, igual que el anillo.
    window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
    // Menos retraso que antes (0.15 -> 0.32 -> 0.45): el anillo alcanza al puntero
    // real más rápido en cada paso, así se siente pegado a la mano en vez de un
    // paso atrás — el punto ya sigue exacto, esto es solo para que el anillo no
    // se perciba como el elemento "impreciso" al apuntar.
    gsap.ticker.add(() => {
        gsap.set(dot, { x: mouseX, y: mouseY });
        ringX += (mouseX - ringX) * 0.45; ringY += (mouseY - ringY) * 0.45; gsap.set(ring, { x: ringX, y: ringY });
    });
    document.querySelectorAll('a, button, .premium-glass-card').forEach(el => {
        if (el.classList.contains('cursor-precise')) return; // manejado aparte, con un anillo que casi no crece
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hovering'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hovering'));
    });
    // Objetivos pequeños (ej. la X de cerrar un modal): el anillo casi no se agranda,
    // para no tapar el blanco y que apuntarle se sienta preciso.
    document.querySelectorAll('.cursor-precise').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hovering-tight'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hovering-tight'));
    });
};
