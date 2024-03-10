import { useState, useEffect, useRef } from "react";
import Keycloak from "keycloak-js";

interface AuthData {
  isLogin: boolean;
  email: string | null;
  name: string | null;
  logout: () => void;
}

const keycloakConfig = {
  url: "http://127.0.0.1:4000/",
  realm: "snkrealm",
  clientId: "snkclient",
};

const client = new Keycloak(keycloakConfig);

const useAuth = (): AuthData => {
  const isRun = useRef<boolean>(false);
  const [token, setToken] = useState<string | null>(client.token || null);
  const [isLogin, setLogin] = useState<boolean>(false);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (isRun.current) return;

    isRun.current = true;
    client
      .init({
        onLoad: "login-required",
      })
      .then((res) => {
        setLogin(res);
        setToken(client.token || null);
        setEmail(client.tokenParsed?.email || null);
        setName(client.tokenParsed?.name || null);
      });
  }, [client]);

  const logout = () => {
    client.logout({ redirectUri: "http://localhost:3000/logout" });
  };

  return { isLogin, email, name, logout };
};

export default useAuth;
