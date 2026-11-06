import * as THREE from 'three';

const ACCENT = 0xebff01;
const BODY = 0x0a0a0a;
const MODEL_URL = './car.glb';

// Процедурный запасной вариант: профиль кузова → экструзия → рёбра
const PROFILE = [
    [2.20, 0.30], [1.78, 0.52], [1.10, 0.82], [0.40, 0.97],
    [-0.70, 0.98], [-1.45, 0.74], [-2.00, 0.56], [-2.22, 0.36],
    [-2.22, 0.14], [2.20, 0.14]
];

function buildFallbackCar() {
    const group = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(PROFILE[0][0], PROFILE[0][1]);
    for (let i = 1; i < PROFILE.length; i++) shape.lineTo(PROFILE[i][0], PROFILE[i][1]);
    shape.closePath();

    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.7, bevelEnabled: false });
    bodyGeo.translate(0, 0, -0.85);
    group.add(new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial({ color: BODY })));
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo, 20),
        new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85 })));

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

// Реальная модель: каждый меш → тёмный корпус + лаймовые рёбра (каркас)
function toWireframe(root) {
    const solid = new THREE.MeshBasicMaterial({ color: BODY });
    const line = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.9 });
    root.traverse((o) => {
        if (o.isMesh) {
            o.material = solid;
            o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), line));
        }
    });
}

// Масштаб ~4.4 м по длине, центр в начале координат, колёса на полу
function normalizeCar(obj) {
    let box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 4.4 / Math.max(size.x, size.z);
    obj.scale.setScalar(scale);
    box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box.getCenter(center);
    obj.position.sub(center);
    obj.position.y -= box.min.y - center.y;
}

function loadCarModel(carHolder) {
    return import('./loaders/GLTFLoader.js').then(({ GLTFLoader }) => new Promise((resolve) => {
        new GLTFLoader().load(
            MODEL_URL,
            (gltf) => {
                try {
                    toWireframe(gltf.scene);
                    normalizeCar(gltf.scene);
                    carHolder.add(gltf.scene);
                    resolve(true);
                } catch (err) {
                    carHolder.add(buildFallbackCar());
                    resolve(false);
                }
            },
            undefined,
            () => {
                carHolder.add(buildFallbackCar());
                resolve(false);
            }
        );
    })).catch(() => {
        carHolder.add(buildFallbackCar());
        return false;
    });
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

    const carHolder = new THREE.Group();
    scene.add(carHolder);
    loadCarModel(carHolder);

    const grid = new THREE.GridHelper(24, 48, 0x26262a, 0x17171a);
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
            carHolder.rotation.y += dt * 0.3;
            camera.position.x += (baseCamPos.x + pointer.x * 0.8 - camera.position.x) * 0.05;
            camera.position.y += (baseCamPos.y - pointer.y * 0.4 - camera.position.y) * 0.05;
            camera.lookAt(0, 0.55, 0);
            renderer.render(scene, camera);
        }
        requestAnimationFrame(frame);
    }
    frame();

    new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
    }, { threshold: 0.05 }).observe(hero);

    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) clock.getDelta();
    });

    return true;
}
