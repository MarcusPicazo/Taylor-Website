// --- 8. MODALES DE DESCARGA (ANDROID APK / iOS WEB) ---

// TODO: reemplazar WEB_APP_URL con la URL real cuando esté lista. Mientras sea null,
// el botón correspondiente se muestra deshabilitado con un aviso "Próximamente".
const ANDROID_APK_URL = 'app/taylor-v0.1.0.apk';
const WEB_APP_URL = null;

const wireDownloadLinks = () => {
    const apply = (el, url) => {
        if (url) {
            el.href = url;
            el.setAttribute('download', 'taylor.apk');
            el.removeAttribute('aria-disabled');
            el.classList.remove('opacity-40', 'pointer-events-none');
            const badge = el.querySelector('.js-soon-badge');
            if (badge) badge.remove();
        } else {
            el.href = '#';
            el.setAttribute('aria-disabled', 'true');
            el.classList.add('opacity-40', 'pointer-events-none');
            if (!el.querySelector('.js-soon-badge')) {
                const badge = document.createElement('span');
                badge.className = 'js-soon-badge i18n-text block text-[0.65rem] font-normal normal-case tracking-normal mt-1 opacity-80';
                badge.setAttribute('data-en', '(coming soon)');
                badge.setAttribute('data-es', '(próximamente)');
                badge.textContent = currentLang === 'es' ? '(próximamente)' : '(coming soon)';
                el.appendChild(badge);
            }
        }
    };
    document.querySelectorAll('.js-apk-link').forEach(el => apply(el, ANDROID_APK_URL));
    document.querySelectorAll('.js-web-link').forEach(el => apply(el, WEB_APP_URL));
};

const openModal = (modal) => {
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
    gsap.fromTo(modal.querySelector('.premium-glass-card'),
        { opacity: 0, y: 20, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out" }
    );
};

const closeModal = (modal) => {
    if (!modal) return;
    gsap.to(modal, {
        opacity: 0, duration: 0.25, ease: "power2.in",
        onComplete: () => { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    });
};

const openAppleModal = () => openModal(document.getElementById('apple-modal'));
const closeAppleModal = () => closeModal(document.getElementById('apple-modal'));
const openAndroidModal = () => openModal(document.getElementById('android-modal'));
const closeAndroidModal = () => closeModal(document.getElementById('android-modal'));

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAppleModal();
        closeAndroidModal();
    }
});
