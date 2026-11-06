import * as THREE from '../vendor/three.module.js';

const ACCENT = 0xebff01;
const BODY = 0x0a0a0a;

// Профиль кузова в боковой проекции (X — длина, Y — высота), метры
const PROFILE = [
    [2.20, 0.30], [1.78, 0.52], [1.10, 0.82], [0.40, 0.97],
    [-0.70, 0.98], [-1.45, 0.74], [-2.00, 0.56], [-2.22, 0.36],
    [-2.22, 0.14], [2.20, 0.14]
];

function buildCar() {
    const group = new THREE.Group();

    const shape = new THREE.Shape();
    shape.moveTo(PROFILE[0][0], PROFILE[0][1]);
    for (let i = 1; i < PROFILE.length; i++) {
        shape.lineTo(PROFILE[i][0], PROFILE[i][1]);
    }
    shape.closePath();

    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.7, bevelEnabled: false });
    bodyGeo.translate(0, 0, -0.85);

    const body = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial({ color: BODY }));
    group.add(body);

    const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(bodyGeo, 20),
        new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85 })
    );
    group.add(edges);

    // Колёса: тёмный цилиндр + полигональное кольцо
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20);
    wheelGeo.rotateX(Math.PI / 2);
    const wheelEdgeGeo = new THREE.EdgesGeometry(wheelGeo, 20);

    for (const [wx, wz] of [[1.35, 0.82], [1.35, -0.82], [-1.35, 0.82], [-1.35, -0.82]]) {
        const wheel = new THREE.Group();
        wheel.add(new THREE.Mesh(wheelGeo, new THREE.MeshBasicMaterial({ color: BODY })));
        wheel.add(new THREE.LineSegments(wheelEdgeGeo,
            new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.65 })));
        wheel.position.set(wx, 0.34, wz);
        group.add(wheel);
    }

    return group;
}

export function initCarScene(canvas, hero) {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (err) {
        return false;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0a, 9, 20);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    const baseCamPos = new THREE.Vector3();

    function placeCamera() {
        const w = hero.clientWidth;
        const aspect = w / hero.clientHeight;
        if (aspect < 1) {
            camera.fov = 46;
            baseCamPos.set(6.6, 2.6, 7.2);
        } else {
            camera.fov = 36;
            baseCamPos.set(5.6, 2.3, 6.2);
        }
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
    }

    const car = buildCar();
    scene.add(car);

    const grid = new THREE.GridHelper(24, 48, 0x26262a, 0x17171a);
    grid.position.y = 0;
    scene.add(grid);

    placeCamera();
    camera.position.copy(baseCamPos);
    camera.lookAt(0, 0.55, 0);

    function resize() {
        const w = hero.clientWidth;
        const h = hero.clientHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        placeCamera();
    }
    resize();
    window.addEventListener('resize', resize);

    // Параллакс от курсора (лёгкий, без резких рывков)
    const pointer = { x: 0, y: 0 };
    window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    const clock = new THREE.Clock();
    let running = true;
    let visible = true;

    function frame() {
        if (running && visible) {
            const dt = Math.min(clock.getDelta(), 0.05);
            car.rotation.y += dt * 0.3;
            camera.position.x += (baseCamPos.x + pointer.x * 0.8 - camera.position.x) * 0.05;
            camera.position.y += (baseCamPos.y - pointer.y * 0.4 - camera.position.y) * 0.05;
            camera.lookAt(0, 0.55, 0);
            renderer.render(scene, camera);
        }
        requestAnimationFrame(frame);
    }
    frame();

    // Экономия: пауза, когда герой вне вьюпорта или вкладка скрыта
    new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
    }, { threshold: 0.05 }).observe(hero);

    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) clock.getDelta();
    });

    return true;
}
