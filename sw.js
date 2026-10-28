/* سرویس‌ورکر: بعد از یک بار باز شدن (با فیلترشکن)، اپ و کتابخانه‌هایش روی گوشی ذخیره می‌شود
   و دفعه‌های بعد بدون فیلترشکن هم باز می‌شود. هر وقت این فایل را عوض کردی، شماره‌ی V را بالا ببر. */
const V = "fa-v1";
const EXT = [
  "https://cdn.jsdelivr.net/npm/firebase@10.12.2/firebase-app-compat.js",
  "https://cdn.jsdelivr.net/npm/firebase@10.12.2/firebase-firestore-compat.js",
  "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;800&display=swap"
];
const HOSTS = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];
const timeout = (p, ms) => Promise.race([p, new Promise((_, rj) => setTimeout(rj, ms))]);

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all([
      ...["./", "./index.html"].map(u => fetch(u, { cache: "reload" }).then(r => r.ok && c.put(u, r)).catch(() => {})),
      ...EXT.map(u => fetch(u, { mode: "no-cors" }).then(r => c.put(u, r)).catch(() => {}))
    ]);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url), same = u.origin === location.origin;
  if (!same && !HOSTS.includes(u.hostname)) return;          // فایربیس، آب‌وهوا و نرخ ارز دست‌نخورده می‌مانند
  if (same) {                                                  // خود اپ: اول اینترنت (۲ ثانیه)، اگر نشد نسخه‌ی ذخیره‌شده
    e.respondWith((async () => {
      const c = await caches.open(V);
      try {
        const res = await timeout(fetch(r), 2000);
        if (res && res.ok) c.put(r, res.clone());
        return res;
      } catch (er) {
        return (await c.match(r, { ignoreSearch: true })) || (await c.match("./index.html")) || Response.error();
      }
    })());
  } else {                                                     // کتابخانه‌ها و فونت: اول نسخه‌ی ذخیره‌شده
    e.respondWith((async () => {
      const c = await caches.open(V), hit = await c.match(r);
      if (hit) return hit;
      try {
        const res = await fetch(r);
        if (res && (res.ok || res.type === "opaque")) c.put(r, res.clone());
        return res;
      } catch (er) { return Response.error(); }
    })());
  }
});
