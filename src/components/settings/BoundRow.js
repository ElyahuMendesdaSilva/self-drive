// src/components/settings/BoundRow.js — liga um item do modelo ao valor real (usuário ou padrões do administrador).
import { getPath, fromServer, toServer } from "../../lib/settingsModel";
import { useSettings } from "../../lib/settingsStore";
import SettingRow from "./SettingRow";

export default function BoundRow({ item }) {
  const { getUserValue, setUserValue, isLocked, defaults, setDefault, setEnforced, isAdmin } = useSettings();
  const binding = item.binding;
  if (!binding) return null;

  if (binding.type === "user") {
    return (
      <SettingRow
        item={item}
        value={fromServer(item, getUserValue(binding))}
        onChange={(value) => setUserValue(binding, toServer(item, value))}
        locked={isLocked(binding)}
      />
    );
  }

  if (binding.type === "defaults" && isAdmin) {
    return (
      <SettingRow
        item={item}
        value={fromServer(item, getPath(defaults.values, binding.path))}
        onChange={(value) => setDefault(binding.path, toServer(item, value))}
        enforced={getPath(defaults.enforced, binding.path) === true}
        onEnforcedChange={(on) => setEnforced(binding.path, on)}
      />
    );
  }
  return null;
}
