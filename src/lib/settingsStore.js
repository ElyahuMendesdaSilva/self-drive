// src/lib/settingsStore.js — configurações lidas e gravadas no servidor.
// - `user`: o usuário logado (preferências em PATCH /api/users).
// - `defaults`: padrões e valores impostos pelo administrador (GET/PATCH /api/settings/user-defaults).
// As alterações aparecem na tela na hora; a gravação vai em fila e, se falhar, o valor volta ao do servidor.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import * as api from "./api";
import { applyUserValue, getPath, nestedPatch, readUserValue } from "./settingsModel";

const SettingsContext = createContext(null);
const SAVE_DELAY_MS = 400; // o Slider dispara várias vezes por segundo enquanto o dedo arrasta

export function SettingsProvider({ children }) {
  const [user, setUser] = useState(null);
  const [defaults, setDefaults] = useState({ values: {}, enforced: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userRef = useRef(null);
  const queue = useRef(Promise.resolve());
  const timers = useRef({});
  const alive = useRef(true);

  const showError = useCallback((cause) => {
    if (alive.current) setError(cause?.message || "Não foi possível salvar a configuração.");
  }, []);

  const applyUser = useCallback((next) => {
    userRef.current = next;
    if (alive.current) setUser(next);
  }, []);

  const reloadUser = useCallback(async () => {
    const fresh = await api.getCurrentUser();
    if (fresh) applyUser(fresh);
    return fresh;
  }, [applyUser]);

  const reloadDefaults = useCallback(async () => {
    try {
      const body = await api.getUserDefaults();
      // o administrador recebe { values, enforced }; o usuário comum só recebe o que foi imposto
      const next = body?.values || body?.enforced ? { values: body.values || {}, enforced: body.enforced || {} } : { values: body || {}, enforced: {} };
      if (alive.current) setDefaults(next);
      return next;
    } catch {
      return null; // sem permissão ou servidor antigo: ninguém impôs nada
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    const pendingTimers = timers.current;
    (async () => {
      try {
        await reloadUser();
      } catch (cause) {
        showError(cause);
      }
      await reloadDefaults();
      if (alive.current) setLoading(false);
    })();
    return () => {
      alive.current = false;
      Object.values(pendingTimers).forEach(clearTimeout);
    };
  }, [reloadUser, reloadDefaults, showError]);

  const isAdmin = Boolean(user?.permissions?.admin);

  // joga a gravação na fila: duas gravações nunca correm ao mesmo tempo
  const enqueue = useCallback(
    (job) => {
      queue.current = queue.current.then(job).catch(async (cause) => {
        showError(cause);
        try {
          await reloadUser();
          await reloadDefaults();
        } catch {
          /* mantém o que está na tela */
        }
      });
      return queue.current;
    },
    [reloadDefaults, reloadUser, showError],
  );

  /** Troca uma preferência do próprio usuário. */
  const setUserValue = useCallback(
    (binding, value) => {
      const current = userRef.current;
      if (!current) return;
      applyUser(applyUserValue(current, binding, value));

      const { field } = binding;
      clearTimeout(timers.current[field]);
      timers.current[field] = setTimeout(
        () =>
          enqueue(async () => {
            const latest = userRef.current;
            await api.patchUser(latest.username, [field], { [field]: latest[field] });
          }),
        SAVE_DELAY_MS,
      );
    },
    [applyUser, enqueue],
  );

  const getUserValue = useCallback((binding) => readUserValue(user, binding), [user]);

  /** O administrador impôs este valor? Só vale para quem não é administrador. */
  const isLocked = useCallback(
    (binding) => !isAdmin && Boolean(binding.enforce) && getPath(defaults.enforced, binding.enforce) === true,
    [defaults.enforced, isAdmin],
  );

  /** Valor padrão que o administrador define para novos usuários. */
  const setDefault = useCallback(
    (path, value) => {
      setDefaults((current) => ({ ...current, values: mergeDeep(current.values, nestedPatch(path, value)) }));
      const key = `default:${path}`;
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => enqueue(() => api.patchUserDefaults(nestedPatch(path, value))), SAVE_DELAY_MS);
    },
    [enqueue],
  );

  /** "Aplicar a todos": impõe o valor aos usuários que não são administradores. */
  const setEnforced = useCallback(
    (path, enforced) => {
      setDefaults((current) => ({ ...current, enforced: mergeDeep(current.enforced, nestedPatch(path, enforced)) }));
      return enqueue(() => api.patchUserDefaults({ enforced: nestedPatch(path, enforced) }));
    },
    [enqueue],
  );

  const value = useMemo(
    () => ({
      user,
      defaults,
      loading,
      isAdmin,
      error,
      clearError: () => setError(""),
      reportError: showError,
      reloadUser,
      reloadDefaults,
      getUserValue,
      setUserValue,
      isLocked,
      setDefault,
      setEnforced,
    }),
    [user, defaults, loading, isAdmin, error, showError, reloadUser, reloadDefaults, getUserValue, setUserValue, isLocked, setDefault, setEnforced],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

function mergeDeep(target, patch) {
  const out = { ...(target || {}) };
  for (const [key, value] of Object.entries(patch)) {
    out[key] = value && typeof value === "object" && !Array.isArray(value) ? mergeDeep(out[key], value) : value;
  }
  return out;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings precisa estar dentro de <SettingsProvider>.");
  return value;
}
