// --- 1. LENIS: SMOOTH SCROLL (Nivel Premium) ---
// Expuesta a nivel de script para que otros módulos (ej. el cambio de idioma,
// que altera la altura de la página) puedan llamar a lenisInstance.resize()
// y mantener sincronizados los límites de scroll virtual con ScrollTrigger.
let lenisInstance = null;

// Cuando un click de nav dispara un lenisInstance.scrollTo(...) de una sección a otra
// lejana, Lenis emite un evento 'scroll' por cada paso intermedio del recorrido — si
// cada uno llama a ScrollTrigger.update(), TODAS las animaciones ligadas a scroll de
// por medio (espiral, tarjetas, el zoom del manifiesto, etc.) se reproducen a toda
// velocidad durante ese trayecto, en vez de solo desplazar la vista. main.js activa
// este flag mientras dura el salto de nav para omitir esos updates intermedios.
let suppressScrollTriggerUpdates = false;

const initLenis = () => {
    const lenis = new Lenis({
        // 1.8 fue demasiado: el scroll tardaba tanto en alcanzar el objetivo que
        // se sentía flotante e impreciso (dejabas de scrolear y seguía moviéndose
        // más de lo esperado, difícil de parar justo donde querías). 1.1 mantiene
        // la respuesta pegada al input real. wheelMultiplier también se quita
        // (vuelve al 1 por defecto) — reducirlo sumaba a esa sensación de que el
        // scroll "no hacía lo que se le pedía".
        duration: 1.1,
        // Cúbica en vez de exponencial: la exponencial arrancaba casi de golpe
        // (velocidad máxima desde el primer instante) y solo suavizaba el final,
        // lo que se sentía brusco pese a la desaceleración. La cúbica acelera y
        // frena de forma gradual en los dos extremos.
        easing: (t) => 1 - Math.pow(1 - t, 3),
        direction: 'vertical', gestureDirection: 'vertical', smooth: true
    })
    lenis.on('scroll', () => { if (!suppressScrollTriggerUpdates) ScrollTrigger.update(); })
    gsap.ticker.add((time)=>{ lenis.raf(time * 1000) })
    gsap.ticker.lagSmoothing(0)
    lenisInstance = lenis;
    return lenis;
};

// --- 2. THREE.JS: FONDO LÍQUIDO AVANZADO ---
const initWebGL = () => {
    const canvas = document.getElementById('liquid-canvas');
    // antialias: false — es un solo quad a pantalla completa sin bordes geométricos
    // dentro del viewport (todo el color viene del ruido del shader), así que MSAA no
    // cambia nada visible aquí y solo encarece cada píxel de cada frame, para siempre.
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const fragmentShader = `
        uniform float u_time; uniform float u_scroll; uniform vec2 u_resolution;
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) ); vec2 x0 = v - i + dot(i, C.xx);
            vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m; m = m*m; vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }
        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution.xy; st.x *= u_resolution.x/u_resolution.y;
            vec2 pos = vec2(st * 1.2);
            float n = snoise(pos + (u_time * 0.1) + (u_scroll * 0.8));
            float n2 = snoise(pos + (u_time * 0.2) + vec2(10.0) - (u_scroll * 0.3));
            vec3 color1 = vec3(0.85, 0.11, 0.38); vec3 color2 = vec3(1.0, 0.24, 0.5); vec3 color3 = vec3(1.0, 0.5, 0.65);
            vec3 finalColor = mix(color1, color2, n * 0.5 + 0.5); finalColor = mix(finalColor, color3, n2 * 0.4);
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;
    const uniforms = { u_time: { value: 0.0 }, u_scroll: { value: 0.0 }, u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) } };
    const material = new THREE.ShaderMaterial({ vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`, fragmentShader, uniforms });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    let scrollTarget = 0, currentScroll = 0;
    // document.body.scrollHeight fuerza un layout síncrono si el árbol de estilos tiene
    // algo pendiente (getter dependiente de layout) — leerlo en cada frame de un loop de
    // requestAnimationFrame que corre para siempre es el patrón clásico de "layout
    // thrashing" y una causa directa de scroll trabado. Se cachea y solo se recalcula
    // cuando el alto de la página puede haber cambiado de verdad (resize, refresh de
    // ScrollTrigger tras cambio de idioma), no en cada uno de los ~60 frames por segundo.
    let scrollMax = Math.max(document.body.scrollHeight - window.innerHeight, 1);
    const updateScrollMax = () => { scrollMax = Math.max(document.body.scrollHeight - window.innerHeight, 1); };
    const animate = (time) => {
        scrollTarget = window.scrollY / scrollMax;
        currentScroll += (scrollTarget - currentScroll) * 0.05;
        uniforms.u_time.value = time * 0.001; uniforms.u_scroll.value = currentScroll;
        renderer.render(scene, camera); requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => { renderer.setSize(window.innerWidth, window.innerHeight); uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight); updateScrollMax(); }, 150);
    });
    if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', updateScrollMax);
};
