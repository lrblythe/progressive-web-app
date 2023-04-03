const CACHE = {
  cacheVersion: 1,
  peopleCacheName: "Giftr-People",
  cache: null,

  init() {
    //
    // CACHE.peopleCacheName = `filecache-${CACHE.userName}-${CACHE.cacheVersion}`;
  },
  saveToCache() {
    return caches.open(CACHE.peopleCacheName);
  },

  getAllFilesFromCache() {
    return caches.open(CACHE.peopleCacheName).then((cache) => {
      return cache.keys();
    });
  },
  getSingleFileFromCache(request) {
    return caches.match(request).then((response) => {
      if (response) return response.json();
    });
  },

  deleteSingleFileFromCache(filename) {
    return caches.open(CACHE.peopleCacheName).then((cache) => {
      return cache.delete(filename);
    });
  },
};

export default CACHE;
