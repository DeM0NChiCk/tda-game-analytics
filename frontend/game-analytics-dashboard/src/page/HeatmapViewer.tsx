import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import api from "../auth/api";

interface Props {
    gameId: string;
    location: string;
    bins: number;
}

interface Voxel {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    z0: number;
    z1: number;
    value: number;
}

export default function HeatmapViewer({ gameId, location, bins }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 3000);
        camera.position.set(5, 5, 15); // Камера ближе к сцене

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const light = new THREE.DirectionalLight(0xffffff, 0.8);
        light.position.set(100, 100, 200);
        scene.add(light);

        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);

        const voxels = new THREE.Group();
        scene.add(voxels);

        const valueToColor = (v: number, max: number) =>
            new THREE.Color(`hsl(${120 - 120 * v / max}, 80%, 50%)`);

        function clearVoxels() {
            voxels.children.forEach(m => {
                const mesh = m as THREE.Mesh;
                mesh.geometry.dispose();
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => mat.dispose());
                } else {
                    mesh.material.dispose();
                }
            });
            voxels.clear();
        }

        function addVoxel(v: Voxel, max: number) {
            const scaleFactor = 50; // Временно увеличим объекты для видимости
            const geo = new THREE.BoxGeometry(
                (v.x1 - v.x0) * scaleFactor,
                (v.y1 - v.y0) * scaleFactor,
                (v.z1 - v.z0) * scaleFactor
            );
            const mat = new THREE.MeshStandardMaterial({
                color: valueToColor(v.value, max),
                transparent: true,
                opacity: 0.8
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                ((v.x0 + v.x1) / 2) * scaleFactor,
                ((v.y0 + v.y1) / 2) * scaleFactor,
                ((v.z0 + v.z1) / 2) * scaleFactor
            );
            voxels.add(mesh);
        }

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();

        const loadData = () => {
            clearVoxels();
            api.get(`/api/heatmap?gameId=${gameId}&location=${encodeURIComponent(location)}&bins=${bins}`)
                .then(res => {
                    const { voxels: voxelList, max_value }: { voxels: Voxel[]; max_value: number } = res.data;
                    console.log(`Получено ${voxelList.length} вокселей`);
                    voxelList.forEach((v: Voxel) => addVoxel(v, max_value || 1));

                    // Центруем камеру относительно сцены
                    if (voxelList.length > 0) {
                        const first = voxelList[0];
                        controls.target.set(
                            ((first.x0 + first.x1) / 2) * 50,
                            ((first.y0 + first.y1) / 2) * 50,
                            ((first.z0 + first.z1) / 2) * 50
                        );
                        controls.update();
                    }
                })
                .catch(console.error);
        };

        loadData();

        const handleResize = () => {
            const w = container.clientWidth, h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
    }, [gameId, location, bins]);

    return <div ref={containerRef} style={{ width: "100%", height: "80vh", background: "#111" }} />;
}