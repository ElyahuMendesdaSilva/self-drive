// Segurança da própria conta: alterar senha e verificação em duas etapas (2FA).
import { useState } from "react";
import { Linking, StyleSheet, Text, TextInput, View } from "react-native";

import { changePassword, disableOtp, generateOtp, verifyOtp } from "../../../lib/api";
import { useSettings } from "../../../lib/settingsStore";
import { ActionButton, Card, SectionTitle } from "../controls";
import FormDialog from "../FormDialog";
import { useColors, useStyles } from "../../../lib/theme";

export default function SecurityScreen({ say }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const { user, reloadUser } = useSettings();
  const [dialog, setDialog] = useState(null); // "password" | "otpStart" | "otpOff"
  const [setup, setSetup] = useState(null); // { password, secret, url } enquanto o 2FA está sendo ativado
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const passwordLogin = !user?.loginMethod || user.loginMethod === "password";
  const locked = Boolean(user?.lockPassword);

  if (!user) return null;
  if (!passwordLogin) {
    return <Text style={styles.note}>Sua conta entra por {user.loginMethod}. Senha e 2FA são gerenciados por esse método.</Text>;
  }

  const confirmCode = async () => {
    if (!code.trim()) return say("Digite o código de 6 dígitos.");
    setBusy(true);
    try {
      await verifyOtp(setup.password, code);
      setSetup(null);
      setCode("");
      await reloadUser();
      say("Verificação em duas etapas ativada.");
    } catch (cause) {
      say(cause?.message || "Código inválido.", 4000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View>
        <SectionTitle>Senha</SectionTitle>
        <Card>
          <View style={styles.pad}>
            <Text style={styles.text}>
              {locked ? "O administrador bloqueou a alteração da sua senha." : "Troque a senha da sua conta. Você precisa informar a senha atual."}
            </Text>
            {!locked && <ActionButton label="Alterar senha" icon="key-outline" onPress={() => setDialog("password")} />}
          </View>
        </Card>
      </View>

      <View>
        <SectionTitle>Verificação em duas etapas</SectionTitle>
        <Card>
          <View style={styles.pad}>
            {setup ? (
              <>
                <Text style={styles.text}>
                  Adicione esta chave ao seu aplicativo autenticador (Google Authenticator, Authy…) e digite o código de 6 dígitos que ele mostrar.
                </Text>
                <Text selectable style={styles.secret}>
                  {setup.secret || setup.url}
                </Text>
                <ActionButton label="Abrir no autenticador" icon="open-outline" onPress={() => Linking.openURL(setup.url).catch(() => say("Nenhum autenticador encontrado. Copie a chave acima."))} />
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ""))}
                  placeholder="Código de 6 dígitos"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="number-pad"
                  maxLength={8}
                />
                <ActionButton label="Confirmar e ativar" icon="checkmark" filled busy={busy} onPress={confirmCode} />
                <ActionButton label="Cancelar" onPress={() => { setSetup(null); setCode(""); }} />
              </>
            ) : user.otpEnabled ? (
              <>
                <Text style={styles.text}>A verificação em duas etapas está ativada.</Text>
                <ActionButton label="Gerar novo código" icon="refresh" onPress={() => setDialog("otpStart")} />
                <ActionButton label="Desativar" icon="close-circle-outline" danger onPress={() => setDialog("otpOff")} />
              </>
            ) : (
              <>
                <Text style={styles.text}>Adicione uma camada extra de proteção: além da senha, o login pede um código do seu celular.</Text>
                <ActionButton label="Ativar" icon="shield-checkmark-outline" onPress={() => setDialog("otpStart")} />
              </>
            )}
          </View>
        </Card>
      </View>

      <FormDialog
        visible={dialog === "password"}
        title="Alterar senha"
        confirmLabel="Alterar"
        fields={[
          { key: "current", label: "Senha atual", secure: true },
          { key: "next", label: "Nova senha", secure: true },
          { key: "again", label: "Repita a nova senha", secure: true },
        ]}
        onClose={() => setDialog(null)}
        onSubmit={async ({ current, next, again }) => {
          if (next !== again) throw new Error("As senhas novas não são iguais.");
          await changePassword(current, next);
          setDialog(null);
          say("Senha alterada.");
        }}
      />
      <FormDialog
        visible={dialog === "otpStart"}
        title="Confirme sua senha"
        message="Vamos gerar uma chave nova para o seu autenticador."
        confirmLabel="Continuar"
        fields={[{ key: "password", label: "Senha", secure: true }]}
        onClose={() => setDialog(null)}
        onSubmit={async ({ password }) => {
          const generated = await generateOtp(password);
          setSetup({ ...generated, password });
          setDialog(null);
        }}
      />
      <FormDialog
        visible={dialog === "otpOff"}
        title="Desativar 2FA"
        message="Confirme sua senha para desativar a verificação em duas etapas."
        confirmLabel="Desativar"
        danger
        fields={[{ key: "password", label: "Senha", secure: true }]}
        onClose={() => setDialog(null)}
        onSubmit={async ({ password }) => {
          await disableOtp(password);
          await reloadUser();
          setDialog(null);
          say("Verificação em duas etapas desativada.");
        }}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { gap: 16 },
  pad: { padding: 16, gap: 12 },
  text: { color: colors.onSurfaceVariant, fontSize: 14, lineHeight: 20 },
  note: { color: colors.onSurfaceVariant, fontSize: 14, textAlign: "center", padding: 24 },
  secret: { color: colors.onSurface, fontSize: 15, backgroundColor: colors.background, borderRadius: 12, padding: 12 },
  input: { color: colors.onSurface, fontSize: 18, height: 52, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, paddingHorizontal: 14, textAlign: "center", letterSpacing: 4 },
});
