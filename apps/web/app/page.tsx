"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [apiOk, setApiOk] = useState<null | boolean>(null);
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    fetch(base + "/health")
      .then((r) => r.json())
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
  }, []);
  return (
    <div>
      <h1>GymBro Web – Hello</h1>
      <p>API health: {apiOk === null ? "…" : apiOk ? "OK" : "DOWN"}</p>
    </div>
  );
}
