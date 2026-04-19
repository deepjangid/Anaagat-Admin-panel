const listeners = new Map();

const getBucket = (candidateKey) => {
  const key = String(candidateKey || "").trim();
  if (!key) return null;
  if (!listeners.has(key)) listeners.set(key, new Set());
  return listeners.get(key);
};

export const subscribeToCandidateApplications = (candidateKey, response) => {
  const bucket = getBucket(candidateKey);
  if (!bucket) return () => {};

  bucket.add(response);

  response.write(`event: connected\n`);
  response.write(`data: ${JSON.stringify({ ok: true, candidateKey })}\n\n`);

  return () => {
    bucket.delete(response);
    if (bucket.size === 0) listeners.delete(String(candidateKey).trim());
  };
};

export const publishCandidateApplicationUpdate = (candidateKey, payload) => {
  const bucket = getBucket(candidateKey);
  if (!bucket || bucket.size === 0) return;

  const data = `event: application-update\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const response of bucket) {
    response.write(data);
  }
};
