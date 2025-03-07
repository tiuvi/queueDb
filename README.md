# queueDb
Wrapper library for IndexedDB that manages a queue of requests, ensuring that operations are resolved in the order they are resolved, avoiding major locking issues with other tabs and with the service worker.
