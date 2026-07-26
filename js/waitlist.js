// --- 7. LISTA DE ESPERA: RED DE PARTÍCULAS (WEBGL AISLADO A LA SECCIÓN) ---
const initWaitlistScene = () => {
    const canvas = document.getElementById('waitlist-canvas');
    const section = document.getElementById('lista-espera');
    if (!canvas || !section) return null;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, section.clientWidth / Math.max(section.clientHeight, 1), 0.1, 1000);
    camera.position.z = 70;

    const resize = () => {
        const w = section.clientWidth, h = section.clientHeight;
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
    };
    resize();
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resize, 150);
    });

    // Cuatro cúmulos, uno por estadística (conductoras, usuari@s, escuelas, pymes).
    // En vez de esparcir los puntos al azar dentro de una caja, cada cúmulo se arma
    // con una espiral tipo "girasol" (ángulo dorado) - un patrón parejo y reconocible
    // en vez de una nube aleatoria, para que la red se vea más armada/bonita.
    const CLUSTERS = 4;
    const PER_CLUSTER = 26;
    const TOTAL = CLUSTERS * PER_CLUSTER;
    const positions = new Float32Array(TOTAL * 3);
    const basePositions = new Float32Array(TOTAL * 3);
    const velocities = [];
    const clusterCenters = [-52, -17, 17, 52].map(x => ({ x, y: (Math.random() - 0.5) * 12 }));
    const GOLDEN_ANGLE = 2.399963;
    const CLUSTER_RADIUS = 20;

    for (let i = 0; i < TOTAL; i++) {
        const clusterIndex = Math.floor(i / PER_CLUSTER);
        const localIndex = i % PER_CLUSTER;
        const c = clusterCenters[clusterIndex];
        const r = CLUSTER_RADIUS * Math.sqrt(localIndex / PER_CLUSTER);
        const theta = localIndex * GOLDEN_ANGLE;
        const x = c.x + r * Math.cos(theta);
        const y = c.y + r * Math.sin(theta);
        const z = (Math.random() - 0.5) * 22;
        positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
        basePositions[i * 3] = x; basePositions[i * 3 + 1] = y; basePositions[i * 3 + 2] = z;
        velocities.push({
            x: (Math.random() - 0.5) * 0.04,
            y: (Math.random() - 0.5) * 0.04,
            phase: Math.random() * Math.PI * 2
        });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xFFC1DC, size: 1.8, transparent: true, opacity: 0.75, sizeAttenuation: true });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6 });
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSegments);

    const MAX_DIST = 13;
    const updateLines = () => {
        const linePositions = [];
        for (let i = 0; i < TOTAL; i++) {
            for (let j = i + 1; j < TOTAL; j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const distSq = dx * dx + dy * dy + dz * dz;
                if (distSq < MAX_DIST * MAX_DIST) {
                    linePositions.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
                    linePositions.push(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
                }
            }
        }
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    };

    let mouseX = 0, mouseY = 0;
    section.addEventListener('mousemove', (e) => {
        const rect = section.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    });

    let rafId = null;
    let frame = 0;
    const animate = () => {
        frame++;
        for (let i = 0; i < TOTAL; i++) {
            const v = velocities[i];
            positions[i * 3] += Math.sin(frame * 0.01 + v.phase) * 0.03 + v.x * 0.2;
            positions[i * 3 + 1] += Math.cos(frame * 0.012 + v.phase) * 0.03 + v.y * 0.2;
            const bx = basePositions[i * 3], by = basePositions[i * 3 + 1];
            positions[i * 3] += (bx - positions[i * 3]) * 0.003;
            positions[i * 3 + 1] += (by - positions[i * 3 + 1]) * 0.003;
        }
        geometry.attributes.position.needsUpdate = true;
        if (frame % 2 === 0) updateLines(); // costo O(n^2): con menos nodos alcanza para actualizar más seguido

        points.rotation.y += 0.0012;
        lineSegments.rotation.y += 0.0012;
        camera.position.x += (mouseX * 14 - camera.position.x) * 0.04;
        camera.position.y += (-mouseY * 10 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
        rafId = requestAnimationFrame(animate);
    };

    return {
        start: () => { if (rafId === null) animate(); },
        stop: () => { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }
    };
};

const animateWaitlistCounters = () => {
    document.querySelectorAll('#lista-espera [data-count-to]').forEach(el => {
        const target = parseInt(el.getAttribute('data-count-to'), 10);
        const counter = { val: 0 };
        gsap.to(counter, {
            val: target,
            duration: 1.8,
            ease: "power2.out",
            onUpdate: () => { el.textContent = '+' + Math.floor(counter.val); }
        });
    });
};

// Arranca/detiene el render loop solo mientras la sección esté en pantalla ("de manera inteligente")
const initWaitlist = () => {
    const scene = initWaitlistScene();
    if (!scene) return;
    ScrollTrigger.create({
        trigger: '#lista-espera', start: 'top 80%', end: 'bottom 20%',
        onEnter: () => { scene.start(); animateWaitlistCounters(); },
        onEnterBack: () => scene.start(),
        onLeave: () => scene.stop(),
        onLeaveBack: () => scene.stop(),
        once: false
    });
};
