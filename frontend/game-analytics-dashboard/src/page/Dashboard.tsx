import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import api from "../auth/api";
import HeatmapViewer from "./HeatmapViewer";

export default function Dashboard() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [games, setGames] = useState<{ id: string, game_name: string }[]>([]);
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const [locations, setLocations] = useState<string[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [bins, setBins] = useState(25);

    useEffect(() => {
        if (!token) {
            navigate("/");
            return;
        }
        api.get("/api/games")
            .then(res => setGames(res.data))
            .catch(console.error);
    }, [token, navigate]);

    useEffect(() => {
        if (selectedGame) {
            setSelectedLocation(null);
            api.get(`/api/locations/?gameId=${selectedGame}`)
                .then(res => setLocations(res.data))
                .catch(console.error);
        } else {
            setLocations([]);
            setSelectedLocation(null);
        }
    }, [selectedGame]);

    return (
        <div style={{ padding: "1rem" }}>
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem"
            }}>
                <h2>Heatmap Dashboard</h2>
                <button onClick={() => navigate("/profile")}>
                    Профиль
                </button>
            </div>

            <div style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "1rem",
                flexWrap: "wrap",
                alignItems: "center"
            }}>
                <select value={selectedGame ?? ""} onChange={e => setSelectedGame(e.target.value || null)}>
                    <option value="">-- Select Game --</option>
                    {games.map(g => (
                        <option key={g.id} value={g.id}>{g.game_name}</option>
                    ))}
                </select>

                <select
                    value={selectedLocation ?? ""}
                    onChange={e => setSelectedLocation(e.target.value || null)}
                    disabled={!selectedGame}
                >
                    <option value="">-- Select Location --</option>
                    {locations.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                    ))}
                </select>

                <label>
                    Density:
                    <input type="range" min="5" max="60" value={bins} onChange={e => setBins(Number(e.target.value))} />
                </label>
            </div>

            {selectedGame && selectedLocation && (
                <HeatmapViewer gameId={selectedGame} location={selectedLocation} bins={bins} />
            )}
        </div>
    );
}
