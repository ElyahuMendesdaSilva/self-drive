// src/hooks/useRemoteList.js
// Carrega uma lista da API ao focar a tela e expõe estados de carregamento/erro/atualização.
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { invalidateIndex } from "../lib/api";

export function useRemoteList(fetcher, key = "") {
  const [state, setState] = useState({ rows: [], loading: true, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);
  const loadedKey = useRef(null);

  // silent: mantém a lista atual na tela enquanto recarrega (sem spinner)
  const reload = useCallback(async ({ silent = false, pull = false } = {}) => {
    const id = ++requestId.current;
    if (pull) setRefreshing(true);
    else if (!silent) setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const rows = await fetcherRef.current();
      if (id === requestId.current) setState({ rows, loading: false, error: null });
    } catch (error) {
      if (id === requestId.current) {
        setState((current) => ({
          rows: silent || pull ? current.rows : [],
          loading: false,
          error: silent || pull ? current.error : error?.message || String(error),
        }));
      }
    } finally {
      if (id === requestId.current) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const sameKey = loadedKey.current === key;
      loadedKey.current = key;
      reload({ silent: sameKey });
    }, [reload, key]),
  );

  const refresh = useCallback(() => {
    invalidateIndex();
    reload({ pull: true });
  }, [reload]);

  return { rows: state.rows, loading: state.loading, error: state.error, refreshing, reload, refresh };
}
