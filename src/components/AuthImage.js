// src/components/AuthImage.js — <Image> para rotas autenticadas (miniaturas, avatar, preview).
// Baixa a imagem com o token (api.getAuthImage), guarda em cache e mostra o arquivo local.
//   <AuthImage source={{ uri, headers }} version={file.modified} style={...} fallback={<Icone />} />
import { useEffect, useState } from "react";
import { Image, View } from "react-native";

import { getAuthImage } from "../lib/api";
import LoadingSpinner from "./LoadingSpinner";

export default function AuthImage({ source, version = "", style, resizeMode = "cover", fallback = null, onFail }) {
  const [uri, setUri] = useState(null);
  const [failed, setFailed] = useState(false);
  const url = typeof source === "string" ? source : source?.uri;

  useEffect(() => {
    let active = true;
    setUri(null);
    setFailed(false);
    if (!url) {
      setFailed(true);
      return undefined;
    }
    getAuthImage(source, version)
      .then((local) => active && setUri(local))
      .catch((error) => {
        if (!active) return;
        setFailed(true);
        onFail?.(error);
      });
    return () => {
      active = false;
    };
    // `source` muda de identidade a cada render em alguns usos; a URL e a versão bastam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, version]);

  if (failed) return fallback;
  if (!uri) {
    return (
      <View style={[style, { alignItems: "center", justifyContent: "center" }]}>
        <LoadingSpinner size="small" />
      </View>
    );
  }
  return <Image source={{ uri }} style={style} resizeMode={resizeMode} onError={() => setFailed(true)} />;
}
