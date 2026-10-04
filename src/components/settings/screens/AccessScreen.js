// Acesso (administrador): permissões padrão das fontes e regras de acesso por caminho.
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useRemoteList } from "../../../hooks/useRemoteList";
import { useTask } from "../../../hooks/useTask";
import {
  addAccessRule,
  deleteAccessRule,
  getSourceSettings,
  listAccessRules,
  listSourceNames,
  moveAccessRule,
  patchSourceSettings,
} from "../../../lib/api";
import { PERMISSIONS_FONTE } from "../../../lib/settingsModel";
import { ActionButton, Card, Chips, Empty, SectionTitle, SwitchControl } from "../controls";
import FormDialog from "../FormDialog";
import SettingRow from "../SettingRow";
import { useStyles } from "../../../lib/theme";

function RuleLine({ icon, text, onRemove }) {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.line}>
      <Text style={styles.lineText}>
        {icon} {text}
      </Text>
      <ActionButton label="Remover" danger onPress={onRemove} />
    </View>
  );
}

export default function AccessScreen({ say }) {
  const styles = useStyles(createStyles);
  const { run } = useTask();
  const [sources, setSources] = useState([]);
  const [source, setSource] = useState("");
  const [settings, setSettings] = useState({ defaultPermissions: {}, enforcedPermissions: {} });
  const [cascade, setCascade] = useState(false);
  const [dialog, setDialog] = useState(null); // { type: "rule"|"move", path?, allow? }

  useEffect(() => {
    listSourceNames()
      .then((names) => {
        setSources(names);
        setSource((current) => current || names[0] || "");
      })
      .catch((cause) => say(cause?.message || "Não foi possível listar as fontes.", 4000));
    getSourceSettings()
      .then((body) => setSettings({ defaultPermissions: body.defaultPermissions || {}, enforcedPermissions: body.enforcedPermissions || {} }))
      .catch(() => {});
  }, [say]);

  const { rows, loading, error, reload } = useRemoteList(() => (source ? listAccessRules(source) : Promise.resolve({})), `rules:${source}`);
  const rules = Array.isArray(rows) ? {} : rows;
  const loadRules = () => reload({ silent: true });

  // uma propriedade por requisição: o servidor recusa várias de uma vez
  const setPermission = async (kind, id, value) => {
    const key = kind === "default" ? "defaultPermissions" : "enforcedPermissions";
    const previous = settings[key];
    setSettings((s) => ({ ...s, [key]: { ...s[key], [id]: value } }));
    const ok = await run(() => patchSourceSettings({ [key]: { [id]: value } }));
    if (!ok) setSettings((s) => ({ ...s, [key]: previous }));
  };

  const removeEntry = (path, ruleType, ruleCategory, value) =>
    run(() => deleteAccessRule(source, path, { ruleType, ruleCategory, value, cascade }), "Regra removida.").then(loadRules);

  const confirmDenyAll = (path, rule) => {
    if (rule.denyAll) return removeEntry(path, "deny", "all", "");
    return run(() => addAccessRule(source, path, { allow: false, ruleCategory: "all" }), "Acesso negado por padrão.").then(loadRules);
  };

  const paths = Object.keys(rules || {}).sort();

  return (
    <View style={styles.wrap}>
      <View>
        <SectionTitle>Permissões padrão de novas fontes de usuário</SectionTitle>
        <Card>
          {PERMISSIONS_FONTE.map((permission, index) => (
            <View key={permission.id} style={index > 0 && styles.divider}>
              <SettingRow
                item={{ kind: "toggle", label: permission.label }}
                value={Boolean(settings.defaultPermissions[permission.id])}
                onChange={(value) => setPermission("default", permission.id, value)}
              />
              <View style={styles.enforce}>
                <Text style={styles.meta}>Aplicar a todos os usuários</Text>
                <SwitchControl value={Boolean(settings.enforcedPermissions[permission.id])} onChange={(value) => setPermission("enforced", permission.id, value)} />
              </View>
            </View>
          ))}
        </Card>
      </View>

      <View>
        <SectionTitle>Regras por caminho</SectionTitle>
        {sources.length > 1 && (
          <View style={styles.chips}>
            <Chips options={sources.map((name) => ({ value: name, label: name }))} value={source} onChange={setSource} />
          </View>
        )}
        <Card>
          <SettingRow item={{ kind: "toggle", label: "Remover também dos subcaminhos", description: "Vale para as remoções feitas abaixo." }} value={cascade} onChange={setCascade} />
        </Card>
        <View style={styles.gap} />
        <View style={styles.actions}>
          <ActionButton label="Regra para usuário" icon="person-add-outline" filled onPress={() => setDialog({ type: "rule", category: "user" })} />
          <ActionButton label="Regra para grupo" icon="people-outline" filled onPress={() => setDialog({ type: "rule", category: "group" })} />
        </View>
        <View style={styles.gap} />
        <Card>
          {loading ? (
            <Empty>Carregando…</Empty>
          ) : error ? (
            <Empty>{error}</Empty>
          ) : paths.length === 0 ? (
            <Empty>Nenhuma regra nesta fonte. Sem regras, o acesso segue as permissões do usuário.</Empty>
          ) : (
            paths.map((path, index) => {
              const rule = rules[path];
              return (
                <View key={path} style={[styles.item, index > 0 && styles.divider]}>
                  <Text style={styles.name}>{path}</Text>
                  {rule.pathExists === false && <Text style={styles.warn}>Este caminho não existe mais na fonte.</Text>}
                  {rule.denyAll && <RuleLine icon="⛔" text="Negado para todos por padrão" onRemove={() => confirmDenyAll(path, rule)} />}
                  {(rule.allow?.users || []).map((name) => (
                    <RuleLine key={`au${name}`} icon="✅" text={`Permitir usuário ${name}`} onRemove={() => removeEntry(path, "allow", "user", name)} />
                  ))}
                  {(rule.allow?.groups || []).map((name) => (
                    <RuleLine key={`ag${name}`} icon="✅" text={`Permitir grupo ${name}`} onRemove={() => removeEntry(path, "allow", "group", name)} />
                  ))}
                  {(rule.deny?.users || []).map((name) => (
                    <RuleLine key={`du${name}`} icon="⛔" text={`Negar usuário ${name}`} onRemove={() => removeEntry(path, "deny", "user", name)} />
                  ))}
                  {(rule.deny?.groups || []).map((name) => (
                    <RuleLine key={`dg${name}`} icon="⛔" text={`Negar grupo ${name}`} onRemove={() => removeEntry(path, "deny", "group", name)} />
                  ))}
                  <View style={styles.actions}>
                    {!rule.denyAll && <ActionButton label="Negar a todos" icon="ban-outline" onPress={() => confirmDenyAll(path, rule)} />}
                    <ActionButton label="Mover caminho" icon="swap-horizontal-outline" onPress={() => setDialog({ type: "move", path })} />
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </View>

      <FormDialog
        visible={dialog?.type === "rule"}
        title={dialog?.category === "group" ? "Nova regra para grupo" : "Nova regra para usuário"}
        message="Informe o caminho (ex.: /Documentos/). A regra permite o acesso."
        confirmLabel="Adicionar"
        fields={[
          { key: "path", label: "Caminho", initial: "/" },
          { key: "value", label: dialog?.category === "group" ? "Nome do grupo" : "Nome do usuário" },
        ]}
        onClose={() => setDialog(null)}
        onSubmit={async ({ path, value }) => {
          await addAccessRule(source, path.trim(), { allow: true, ruleCategory: dialog.category, value: value.trim() });
          setDialog(null);
          say("Regra adicionada.");
          loadRules();
        }}
      />
      <FormDialog
        visible={dialog?.type === "move"}
        title="Mover caminho"
        message={`As regras de ${dialog?.path ?? ""} passam a valer no novo caminho.`}
        confirmLabel="Mover"
        fields={[{ key: "to", label: "Novo caminho", initial: dialog?.path ?? "/" }]}
        onClose={() => setDialog(null)}
        onSubmit={async ({ to }) => {
          await moveAccessRule(source, dialog.path, to.trim());
          setDialog(null);
          say("Caminho movido.");
          loadRules();
        }}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { gap: 16 },
  gap: { height: 12 },
  chips: { marginBottom: 12, marginLeft: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant },
  enforce: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, marginTop: -4 },
  meta: { color: colors.onSurfaceVariant, fontSize: 13 },
  item: { padding: 16, gap: 6 },
  name: { color: colors.onSurface, fontSize: 16 },
  warn: { color: colors.warning, fontSize: 12 },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lineText: { color: colors.onSurfaceVariant, fontSize: 14, flex: 1 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
});
