import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useIncomingShare } from "expo-sharing";

import * as api from "../lib/api";
import { useSession } from "../lib/session";

export default function IncomingShareUploader() {
  const { ready, signedIn } = useSession();
  const {
    resolvedSharedPayloads,
    isResolving,
    error,
    clearSharedPayloads,
    refreshSharePayloads,
  } = useIncomingShare();
  const processing = useRef(false);
  const handledKey = useRef("");

  useEffect(() => {
    if (!ready || isResolving || processing.current) return;

    if (error) {
      processing.current = true;
      Alert.alert(
        "Não foi possível abrir o compartilhamento",
        error.message || "Tente compartilhar o arquivo novamente.",
        [
          {
            text: "OK",
            onPress: () => {
              clearSharedPayloads();
              refreshSharePayloads();
              processing.current = false;
              handledKey.current = "";
            },
          },
        ],
        { cancelable: false },
      );
      return;
    }

    if (!resolvedSharedPayloads.length) return;

    const shareKey = resolvedSharedPayloads
      .map((payload) => `${payload.contentUri || payload.value}:${payload.originalName || ""}`)
      .join("|");
    if (shareKey === handledKey.current || !signedIn) return;

    const files = api.filesFromSharedPayloads(resolvedSharedPayloads);
    handledKey.current = shareKey;
    processing.current = true;

    const upload = async () => {
      try {
        if (!files.length) {
          Alert.alert(
            "Conteúdo não compatível",
            "Compartilhe arquivos, fotos, vídeos ou músicas para enviar ao servidor.",
          );
          return;
        }

        const { sent, failures } = await api.uploadFiles("/", files);
        if (failures.length) {
          const summary = failures.slice(0, 5).join("\n");
          Alert.alert(
            sent ? "Envio parcial" : "Falha no envio",
            `${sent} de ${files.length} arquivo(s) enviado(s).\n\n${summary}`,
          );
        } else {
          Alert.alert(
            "Envio concluído",
            `${sent} arquivo(s) enviado(s) para a pasta raiz do servidor.`,
          );
        }
      } catch (uploadError) {
        Alert.alert(
          "Falha no envio",
          uploadError?.message || "Não foi possível enviar os arquivos.",
        );
      } finally {
        clearSharedPayloads();
        refreshSharePayloads();
        processing.current = false;
        handledKey.current = "";
      }
    };

    void upload();
  }, [
    clearSharedPayloads,
    error,
    isResolving,
    ready,
    refreshSharePayloads,
    resolvedSharedPayloads,
    signedIn,
  ]);

  return null;
}
