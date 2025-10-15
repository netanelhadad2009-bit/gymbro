export function genderToHe(value?: string | null): string {
  if (!value) return "—";
  const v = String(value).trim().toLowerCase();
  const map: Record<string, string> = {
    male: "זכר",
    female: "נקבה",
    non_binary: "א-בינרי",
    nonbinary: "א-בינרי",
    other: "אחר",
    m: "זכר",
    f: "נקבה",
  };
  // Already Hebrew? return as-is
  if (["זכר", "נקבה", "א-בינרי", "אחר"].includes(value)) return value;
  return map[v] ?? "—";
}
