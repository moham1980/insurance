const r = await fetch("https://registry.npmjs.org/uuid");
const t = await r.text();
console.log(t.slice(0, 200));
