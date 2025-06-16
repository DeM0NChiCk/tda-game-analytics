import { useState, useEffect } from "react";
import HeatmapScene from "./HeatmapScene";
import HeatmapControls from "./HeatmapControls";

export default function Dashboard() {
  const [heatmap, setHeatmap] = useState(null);

  useEffect(() => {
    // Загрузка по умолчанию
    fetch("/api/heatmap")
      .then((res) => res.json())
      .then(setHeatmap)
      .catch(console.error);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Dashboard (Protected)</h2>

      <HeatmapControls onLoad={setHeatmap} />

      {heatmap ? (
        <HeatmapScene heatmap={heatmap} />
      ) : (
        <p className="text-gray-400">Loading heatmap...</p>
      )}
    </div>
  );
}