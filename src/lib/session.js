// src/lib/session.js
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import * as api from "./api";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(api.getSession());

  useEffect(() => {
    let active = true;
    // sessão expirada em qualquer chamada → volta para o login
    api.setUnauthorizedHandler(() => {
      api.logout().then(() => active && setSession(api.getSession()));
    });
    api.loadSession().then((loaded) => {
      if (!active) return;
      setSession(loaded);
      setReady(true);
    });
    return () => {
      active = false;
      api.setUnauthorizedHandler(null);
    };
  }, []);

  const signIn = useCallback(async (username, password) => {
    setSession(await api.login(username, password));
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setSession(api.getSession());
  }, []);

  const changeHost = useCallback(async (host) => {
    setSession(await api.setHost(host));
  }, []);

  const value = useMemo(
    () => ({ ready, ...session, signedIn: Boolean(session.token), signIn, signOut, changeHost }),
    [ready, session, signIn, signOut, changeHost],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession precisa estar dentro de <SessionProvider>.");
  return value;
}
