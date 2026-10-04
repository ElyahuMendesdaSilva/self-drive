// src/hooks/useIsAdmin.js — descobre se o usuário logado é administrador (permissions.admin).
import { useEffect, useState } from "react";

import { getCurrentUser } from "../lib/api";

export function useIsAdmin() {
  const [state, setState] = useState({ loading: true, isAdmin: false });

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => active && setState({ loading: false, isAdmin: Boolean(user?.permissions?.admin) }))
      // sem resposta do servidor, mostra só o que é do usuário comum
      .catch(() => active && setState({ loading: false, isAdmin: false }));
    return () => {
      active = false;
    };
  }, []);

  return state;
}
