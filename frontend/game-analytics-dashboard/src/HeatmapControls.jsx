import { useState } from "react";

export default function HeatmapControls({ onLoad }) {
    const [game, setGame] = useState("demo");
    const [location, setLocation] = useState("level1");
    const [bins, setBins] = useState(10);
    const [max, setMax] = useState(1000);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch(`/api/heatmap?game=${game}&location=${location}&bins=${bins}&max_value=${max}`);
        const data = await res.json();
        onLoad(data);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 max-w-xl mx-auto">
            <label className="flex flex-col">
                <span>Game:</span>
                <select value={game} onChange={(e) => setGame(e.target.value)} className="p-2 rounded bg-gray-800 text-white">
                    <option value="demo">demo</option>
                    <option value="test">test</option>
                </select>
            </label>

            <label className="flex flex-col">
                <span>Location:</span>
                <select value={location} onChange={(e) => setLocation(e.target.value)} className="p-2 rounded bg-gray-800 text-white">
                    <option value="level1">level1</option>
                    <option value="level2">level2</option>
                </select>
            </label>

            <label className="flex flex-col">
                <span>Bins:</span>
                <input
                    type="number"
                    value={bins}
                    onChange={(e) => setBins(Number(e.target.value))}
                    className="p-2 rounded bg-gray-800 text-white"
                    min={1}
                    max={100}
                />
            </label>

            <label className="flex flex-col">
                <span>Max value: {max}</span>
                <input
                    type="range"
                    min={1}
                    max={2000}
                    value={max}
                    onChange={(e) => setMax(Number(e.target.value))}
                />
            </label>

            <button type="submit" className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                Загрузить тепловую карту
            </button>
        </form>
    );
}