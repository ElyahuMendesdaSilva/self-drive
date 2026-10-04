// src/hooks/useStats.js
// Carrega as estatísticas ao focar a tela (mesmo padrão do useRemoteList) e expõe loading/erro/refresh.
//
//   const { stats, loading, error, refreshing, refresh, reload } = useStats();
//   stats.storage   → { used, total, free, percent, hasLimit }
//   stats.totals    → { files, folders, filesSize, modifiedLast7Days }
//   stats.byCategory / stats.byExtension → [{ key|name, label, color, count, size, percent }]
//   stats.largestFiles, stats.trash, stats.shares, stats.truncated, stats.updatedAt
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { getStats, invalidateIndex } from "../lib/api";

export function useStats(key = "") {
  const [state, setState] = useState({
    stats: null,
    loading: true,
    error: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const loadedKey = useRef(null);

  // silent: mantém os números atuais na tela enquanto recarrega (sem spinner)
  const reload = useCallback(async ({ silent = false, pull = false } = {}) => {
    const id = ++requestId.current;
    if (pull) setRefreshing(true);
    else if (!silent)
      setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const stats = await getStats();
      if (id === requestId.current)
        setState({ stats, loading: false, error: null });
    } catch (error) {
      if (id === requestId.current) {
        setState((current) => ({
          stats: silent || pull ? current.stats : null,
          loading: false,
          error:
            silent || pull ? current.error : error?.message || String(error),
        }));
      }
    } finally {
      if (id === requestId.current) setRefreshing(false);
    }
  }, []);

  // `key` (ex.: a origem da sessão) força recarregar do zero quando muda
  useFocusEffect(
    useCallback(() => {
      const sameKey = loadedKey.current === key;
      loadedKey.current = key;
      reload({ silent: sameKey });
    }, [reload, key]),
  );

  // puxar para atualizar: descarta o cache do índice para refazer a varredura
  const refresh = useCallback(() => {
    invalidateIndex();
    reload({ pull: true });
  }, [reload]);

  return {
    stats: state.stats,
    loading: state.loading,
    error: state.error,
    refreshing,
    reload,
    refresh,
  };
}
