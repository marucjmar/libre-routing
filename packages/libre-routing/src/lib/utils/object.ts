export function mergeDeep(a, b) {
  return Object.entries(b).reduce((o, [k, v]) => {
    o[k] =
      v && typeof v === "object"
        ? mergeDeep((o[k] = o[k] || (Array.isArray(v) ? [] : {})), v)
        : v;
    return o;
  }, a);
}
