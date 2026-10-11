export function sollEnterAbsenden({ taste, wiederholt, laeuft }) {
  if (taste !== 'Enter') return false;
  if (wiederholt) return false;
  if (laeuft) return false;
  return true;
}
