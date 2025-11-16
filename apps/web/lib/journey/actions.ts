export async function completeNode(nodeId: string) {
  const res = await fetch('/api/journey/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nodeId }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to complete node: ${error}`);
  }

  return res.json(); // { pointsAwarded, nextUnlocked }
}
