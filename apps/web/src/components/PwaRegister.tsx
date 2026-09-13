"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // échec silencieux : la PWA reste utilisable sans mode hors-ligne
      });
    }
  }, []);

  return null;
}
