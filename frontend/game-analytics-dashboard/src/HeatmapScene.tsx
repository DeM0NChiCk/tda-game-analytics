import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

type Voxel = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
  value: number;
};

type HeatmapData = {
  max_value: number;
  voxels: Voxel[];
};

interface HeatmapSceneProps {
  heatmap: HeatmapData | null;
}

export default function HeatmapScene({ heatmap }: HeatmapSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!heatmap) return;

    const container = containerRef.current;
    const tooltip = tooltipRef.current;
    if (!container || !tooltip) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      3000
    );
    camera.position.set(0, 0, 150);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(100, 100, 200);
    scene.add(dl);

    const voxels = new THREE.Group();
    scene.add(voxels);

    const valueToColor = (v: number, max: number) =>
      new THREE.Color(`hsl(${120 - (120 * v) / max}, 80%, 50%)`);

    const max = heatmap.max_value || 1;

    for (const v of heatmap.voxels) {
      const geo = new THREE.BoxGeometry(
        v.x1 - v.x0,
        v.y1 - v.y0,
        v.z1 - v.z0
      );
      const mat = new THREE.MeshStandardMaterial({
        color: valueToColor(v.value, max),
        transparent: true,
        opacity: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const cx = (v.x0 + v.x1) / 2;
      const cy = (v.y0 + v.y1) / 2;
      const cz = (v.z0 + v.z1) / 2;
      mesh.position.set(cx, cy, cz);
      mesh.userData = { coords: { x: cx, y: cy, z: cz }, value: v.value };
      voxels.add(mesh);
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onMouseMove(event: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(voxels.children, false);

      if (!tooltip) return;

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        const { x, y, z } = obj.userData.coords;
        const v = obj.userData.value;
        tooltip.textContent = `x:${x.toFixed(2)} y:${y.toFixed(2)} z:${z.toFixed(2)} v:${v}`;
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY}px`;
        tooltip.style.display = "block";
      } else {
        tooltip.style.display = "none";
      }
    }

    renderer.domElement.addEventListener("mouseleave", () => {
      if (tooltip) {
        tooltip.style.display = "none";
      }
    });

    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [heatmap]);

  return (
    <>
      <div ref={containerRef} style={{ width: "100%", height: "80vh", background: "#111" }} />
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          zIndex: 50,
          pointerEvents: "none",
          background: "#000c",
          color: "#fff",
          padding: "4px 6px",
          font: "12px monospace",
          borderRadius: "4px",
          whiteSpace: "nowrap",
          transform: "translate(-50%,-135%)",
          display: "none",
          backdropFilter: "blur(3px)",
        }}
      />
    </>
  );
}