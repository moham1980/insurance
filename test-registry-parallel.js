const url = "https://registry.npmjs.org/uuid";
const N = Number(process.env.N ?? 50);
const tasks = Array.from({ length: N }, async () => {
  try {
    const r = await fetch(url);
    return r.status;
  } catch (e) {
    return String(e);
  }
});
const results = await Promise.all(tasks);
const ok = results.filter((x) => x === 200).length;
const bad = results.filter((x) => x !== 200);
console.log({ N, ok, badCount: bad.length });
console.log(bad.slice(0, 10));
