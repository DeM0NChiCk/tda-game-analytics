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

        const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1e9);
        camera.position.set(5, 5, 15);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.minDistance = 0.01;
        controls.maxDistance = Infinity;
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

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

        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        const loadData = () => {
            clearVoxels();
            api.get(`/api/heatmap?gameId=${gameId}&location=${encodeURIComponent(location)}&bins=${bins}`)
                .then(res => {
                    const { voxels: voxelList, max_value }: { voxels: Voxel[]; max_value: number } = res.data;
                    console.log(`Получено ${voxelList.length} вокселей`);

                    if (voxelList.length === 0) return;

                    let minX = Infinity, maxX = -Infinity;
                    let minY = Infinity, maxY = -Infinity;
                    let minZ = Infinity, maxZ = -Infinity;

                    voxelList.forEach(v => {
                        minX = Math.min(minX, v.x0);
                        maxX = Math.max(maxX, v.x1);
                        minY = Math.min(minY, v.y0);
                        maxY = Math.max(maxY, v.y1);
                        minZ = Math.min(minZ, v.z0);
                        maxZ = Math.max(maxZ, v.z1);
                    });

                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;
                    const centerZ = (minZ + maxZ) / 2;

                    const sizeX = maxX - minX;
                    const sizeY = maxY - minY;
                    const sizeZ = maxZ - minZ;
                    const largestSize = Math.max(sizeX, sizeY, sizeZ) || 1;

                    const sceneScale = 50000;
                    const dynamicScaleFactor = sceneScale / largestSize;

                    voxelList.forEach(v => {
                        const geo = new THREE.BoxGeometry(
                            (v.x1 - v.x0) * dynamicScaleFactor,
                            (v.y1 - v.y0) * dynamicScaleFactor,
                            (v.z1 - v.z0) * dynamicScaleFactor
                        );
                        const mat = new THREE.MeshStandardMaterial({
                            color: valueToColor(v.value, max_value || 1),
                            transparent: true,
                            opacity: 0.8
                        });
                        const mesh = new THREE.Mesh(geo, mat);
                        mesh.position.set(
                            ((v.x0 + v.x1) / 2 - centerX) * dynamicScaleFactor,
                            ((v.y0 + v.y1) / 2 - centerY) * dynamicScaleFactor,
                            ((v.z0 + v.z1) / 2 - centerZ) * dynamicScaleFactor
                        );
                        voxels.add(mesh);
                    });

                    controls.target.set(0, 0, 0);
                    controls.update();

                    camera.position.set(sceneScale * 0.8, sceneScale * 0.8, sceneScale * 0.8);
                    controls.update();
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