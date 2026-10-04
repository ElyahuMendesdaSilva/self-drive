// src/hooks/useTask.js — executa uma ação assíncrona mostrando "ocupado" e, no fim, um aviso curto.
import { useCallback, useEffect, useRef, useState } from "react";

export function useTask() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const say = useCallback((text, ms = 2500) => {
    clearTimeout(timer.current);
    setMessage(text);
    if (text && ms) timer.current = setTimeout(() => setMessage(""), ms);
  }, []);

  /** Roda `job`; devolve true se deu certo. `done` vira o aviso de sucesso. */
  const run = useCallback(
    async (job, done) => {
      setBusy(true);
      try {
        await job();
        if (done) say(done);
        return true;
      } catch (cause) {
        say(cause?.message || "Algo deu errado.", 4000);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [say],
  );

  return { message, busy, say, run };
}
