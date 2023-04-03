const version = 1;
const cacheName = `ServiceWorker${version}`;
let isOnline = true;
let cacheRef = null;

//initial items to add to the cache
const cacheItems = [
  "./",
  "/pwa/index.html",
  "/css/main.css",
  "/js/app.js",
  "/js/cache.js",
  "/favicon.ico",
  "/manifest.json",
  "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;500;600;800&display=swap",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0",
];

self.addEventListener("install", (ev) => {
  //service worker installing and adding initial files

  ev.waitUntil(
    caches.open(cacheName).then((cache) => {
      cache.addAll(cacheItems).catch((err) => {
        console.warn("Everything was NOT saved in the cache");
      });
    })
  );
});

self.addEventListener("activate", (ev) => {
  //when the service worker is activated delete the old cache(s)
  ev.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((nm) => nm != cacheName && nm != "Giftr-People")
          .map((nm) => caches.delete(nm))
      );
    })
  );
});

self.addEventListener("fetch", (ev) => {
  //any time a fetch is happening
  let request = ev.request;
  let isOnline = navigator.onLine;
  let mode = ev.request.mode;
  let url = new URL(ev.request.url);
  let pathname = url.pathname;

  //any file that we are potentially interested in
  let acceptableFiles =
    url.pathname.includes("index") ||
    ev.request.mode == "navigate" ||
    url.pathname.includes("index.html") ||
    url.pathname.endsWith("html") ||
    url.pathname.startsWith("index") ||
    url.pathname.includes(".css") ||
    url.pathname.includes("css2") ||
    url.pathname.includes(".js") ||
    url.pathname.includes("pwa") ||
    url.pathname.includes("favicon") ||
    url.pathname.includes(".ico") ||
    url.pathname.includes(".xml") ||
    url.pathname.includes(".html") ||
    url.pathname.includes(".woff2") ||
    url.pathname.includes("android-chrome") ||
    url.pathname.includes(".ttf") ||
    url.pathname.includes(".png") ||
    url.pathname.includes(".jpg") ||
    url.pathname.includes(".svg") ||
    url.pathname.includes(".gif") ||
    url.pathname.includes(".webp") ||
    url.pathname.includes(".json") ||
    url.pathname.includes("manifest") ||
    url.hostname.includes("json") ||
    url.pathname.includes(".jpeg");

  if (isOnline) {
    if (acceptableFiles) {
      //online and any of the file list
      ev.respondWith(cacheFirst(ev));
    } else {
      //online and any other file
      ev.respondWith(networkFirst(ev));
    }
  } else {
    //offline and getting notJson or isJson from cache
    ev.respondWith(cacheOnly(ev));
  }
});

//check the cache, fetch, update cache with fetch, return one of them
function cacheFirst(ev) {
  return caches.match(ev.request).then((cacheMatch) => {
    let fetchResponse = fetch(ev.request, {
      credentials: "omit",
      mode: "cors",
    }).then((response) => {
      if (!response.ok)
        throw new NetworkError(
          "Something went wrong. Please try loading the page again.",
          response
        );

      caches.open(cacheName).then((cache) => {
        cache.put(ev.request, response);
      });
      return response.clone();
    });
    return cacheMatch || fetchResponse;
  });
}

//fetch, return cache if it fails, store the fetch in the cache
function networkFirst(ev) {
  return fetch(ev.request)
    .then((response) => {
      if (!response.ok) return caches.match(ev.request);

      return caches.open(cacheName).then((cache) => {
        return cache.put(ev.request, response.clone()).then(() => {
          return response;
        });
      });
    })
    .catch((err) => {
      let json = JSON.stringify([]);
      let file = new File([json], "data.json", { type: "application/json" });
      return new Response(file, {
        status: 404,
        statusText: "Not Found",
        headers,
      });
    });
}

//getting files from the cache only
function cacheOnly(ev) {
  return caches.match(ev.request);
}

class NetworkError extends Error {
  constructor(msg, response) {
    super(msg);
    this.type = "NetworkError";
    this.response = response;
    this.message = msg;
  }
}
