import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { setAuthToken } from "./api";

type AuthContextType = {
  token: string | null;
  setToken: (token: string | null) => void;
};

const AuthContext = createContext<AuthContextType>({ token: null, setToken: () => {} });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("jwt"));

  const setToken = (token: string | null) => {
    setTokenState(token);
    if (token) {
      localStorage.setItem("jwt", token);
    } else {
      localStorage.removeItem("jwt");
    }
    setAuthToken(token);
  };

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  return <AuthContext.Provider value={{ token, setToken }}>{children}</AuthContext.Provider>;
};