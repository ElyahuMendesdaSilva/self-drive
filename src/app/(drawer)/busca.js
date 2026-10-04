// src/app/(drawer)/busca.js — busca por nome em todas as pastas.
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import FileList from "../../components/ListFile";
import ScreenHeader from "../../components/ScreenHeader";
import { useFileActions } from "../../hooks/useFileActions";
import * as api from "../../lib/api";
import { toRow } from "../../lib/viewModel";
import { useColors, useStyles } from "../../lib/theme";

const goBack = () =>
  router.canGoBack() ? router.back() : router.replace("/inicio");

export default function Busca() {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ rows: [], loading: false, error: null });
  const actions = useFileActions({
    onChanged: () => {
      api.invalidateIndex();
      runSearch(query); // refaz a busca com o mesmo termo
    },
  });

  async function runSearch(term) {
    if (!term.trim())
      return setState({ rows: [], loading: false, error: null });
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const rows = (await api.searchResources(term)).map(toRow);
      setState({ rows, loading: false, error: null });
    } catch (error) {
      setState({
        rows: [],
        loading: false,
        error: error?.message || String(error),
      });
    }
  }

  // espera o usuário parar de digitar
  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader onBack={goBack}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Pesquisar no Self-Drive"
          placeholderTextColor={colors.onSurfaceVariant}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </ScreenHeader>
      <FileList
        files={state.rows}
        mode="list"
        loading={state.loading}
        error={state.error}
        emptyText={
          query.trim() ? "Nada encontrado." : "Digite para pesquisar por nome."
        }
        onRetry={() => runSearch(query)}
        onOpen={actions.openFile}
        onMenu={actions.openMenu}
        onFavoriteSelected={actions.favoriteSelected}
        onDeleteSelected={actions.deleteSelected}
        onCopySelected={actions.copySelected}
        onCutSelected={actions.cutSelected}
      />
      {actions.element}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  input: {
    flex: 1,
    height: 48,
    borderRadius: 100,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 18,
    color: colors.onSurface,
    fontSize: 16,
  },
});
