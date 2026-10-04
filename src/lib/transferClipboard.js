import { useSyncExternalStore } from "react";

let clipboard = { mode: null, items: [], source: null };
const listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const publish = () => listeners.forEach((listener) => listener());

export function getTransferClipboard() {
  return clipboard;
}

export function setTransferClipboard(mode, items, source) {
  clipboard = { mode, items: [...items], source };
  publish();
}

export function clearTransferClipboard() {
  clipboard = { mode: null, items: [], source: null };
  publish();
}

export function useTransferClipboard() {
  return useSyncExternalStore(subscribe, getTransferClipboard, getTransferClipboard);
}
