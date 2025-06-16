import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8080", // Замените на свой backend URL
});

export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common["Authorization"];
    }
};

export default api;