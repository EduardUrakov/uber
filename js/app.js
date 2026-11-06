const hero = document.querySelector('.hero');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function showFallback() {
    hero.classList.add('hero--no3d');
}

if (reducedMotion) {
    showFallback();
} else {
    import('./car.js')
        .then(({ initCarScene }) => {
            const canvas = document.getElementById('car-canvas');
            if (!initCarScene(canvas, hero)) showFallback();
        })
        .catch(showFallback);
}

// Мобильное меню
const burger = document.getElementById('nav-burger');
const links = document.getElementById('nav-links');
burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    links.classList.toggle('nav__links--open', !open);
});
links.addEventListener('click', (e) => {
    if (e.target.matches('.nav__link')) {
        links.classList.remove('nav__links--open');
        burger.setAttribute('aria-expanded', 'false');
    }
});

// Появление блоков при скролле
const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
        }
    }
}, { threshold: 0.15 });
document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

// Форма (демо: без отправки на сервер)
const form = document.getElementById('apply-form');
const status = document.getElementById('apply-status');
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    if (!name || !phone) {
        status.textContent = 'Заполните имя и телефон.';
        status.classList.add('apply__status--error');
        return;
    }
    status.classList.remove('apply__status--error');
    status.textContent = `Заявка принята (демо). ${name}, мы позвоним на ${phone}.`;
    form.reset();
});
