

const queueHandle = {

    operations: [],
    isProcessing: false,
    async addQueue(args) {

        return new Promise((resolve) => {
            this.operations.push({ ...args, resolve: resolve });
            this.processQueue(); // Iniciar el procesamiento si no está en curso
        });
    },
    async processQueue() {

        if (this.isProcessing || this.operations.length === 0) return;

        this.isProcessing = true;

        while (this.operations.length > 0) {

            await executeDbOperation(this.operations.shift());

        }

        this.isProcessing = false;
    },
}

async function initDataBase(args) {

    const {
        db,
    } = args;

    return await new Promise((resolve) => {

        const handleDb = indexedDB.open(db);

        handleDb.onblocked = (event) => {
            console.log(event)
            resolve({ result: null, err: `handleDb onblocked` });
        };

        handleDb.onerror = (event) => {
            resolve({ result: null, err: event.target.error })
        };


        handleDb.onsuccess = (event) => {

            const conexion = event.target.result; // Referencia a la base de datos abierta

            handleDb.onabort = (event) => {
                console.log(event)
                resolve({ result: null, err: "conexion onabort" })
            };

            handleDb.onclose = (event) => {
                console.log(event)
                resolve({ result: null, err: "conexion onclose" })
            };

            handleDb.onerror = (event) => {
                resolve({ result: null, err: event.target.error })
            };

            handleDb.onversionchange = (event) => {
                console.log(event)
                resolve({ result: null, err: "conexion onversionchange" })
            };

            resolve({ result: conexion, err: null })
        }
    })
}

async function createTableIfNotExist(args) {

    const {
        db,
        table,
        conexion,
        query,
    } = args;

    return await new Promise((resolve) => {

        if (!conexion.objectStoreNames.contains(table)) {

            conexion.close()

            const createTableHandle = indexedDB.open(db, conexion.version + 1);

            createTableHandle.onblocked = (event) => {
                console.log(event)
                resolve({ result: null, err: `tabla bloqueada` });
            };

            createTableHandle.onerror = (event) => {
                resolve({ result: null, err: event.target.error })
            };

            createTableHandle.onupgradeneeded = (event) => {

                const conexion = event.target.result;

                conexion.createObjectStore(table);
            }

            createTableHandle.onsuccess = (event) => {

                const conexion = event.target.result; // Referencia a la base de datos abierta

                conexion.onabort = (event) => {
                    console.log(event)
                    resolve({ result: null, err: "conexion onabort" })
                };

                conexion.onclose = (event) => {
                    console.log(event)
                    resolve({ result: null, err: "conexion onclose" })
                };

                conexion.onerror = (event) => {
                    resolve({ result: null, err: event.target.error })
                };

                conexion.onversionchange = (event) => {
                    console.log(event)
                    resolve({ result: null, err: "conexion onversionchange" })
                };

                resolve({ result: conexion, err: null })
            }

        } else {

            resolve({ result: conexion, err: null })
        }

    })
}

async function retrieve(args) {
    const {
        store,
        key,
    } = args;

    return await new Promise((resolve) => {

        const getRequest = store.get(key);

        getRequest.onsuccess = () => {

            resolve({ data: getRequest.result, err: null });
        };

        getRequest.onerror = (event) => {
            resolve({ err: event.target.error });
        };
    });
}

async function update(args) {

    const {
        store,
        key,
        data,
    } = args;

    return await new Promise((resolve) => {

        const putRequest = store.put(data, key);

        putRequest.onsuccess = () => {
            resolve({ err: null })
        };

        putRequest.onerror = (event) => {
            resolve({ err: event.target.error })
        };

    })
}

async function executeDbOperation(args) {

    const {
        db,
        table,
        query,

        key,
        data,
        resolve,

    } = args;


    const { result: conexion, err: errInitDataBase } = await initDataBase({ db })
    if (errInitDataBase !== null) {
        return ({ err: errInitDataBase });
    }

    const { result: conexion2, err: errTable } = await createTableIfNotExist({ conexion, db, table })
    if (errTable !== null) {
        return ({ err: errTable });
    }


    const transaction = conexion2.transaction([table], "readwrite");

    const result = { result: null, err: null }
    transaction.oncomplete = () => {

        conexion2.close();

        resolve(result)
    };

    transaction.onerror = (event) => {

        conexion2.close();

        return ({ err: event.target.error });
    };

    const store = transaction.objectStore(table);

    if (query === "update") {

        const { err } = await update({ store, key, data })
        if (err !== null) {
            result.err = err;
        }
    } else if (query === "retrieve") {

        const { data, err } = await retrieve({ store, key })
        if (err !== null) {
            result.err = err;
        } else {
            result.result = data;
        }
    }

    
};




export const queueDB = {

    // queueDB.set("test", "holaMundo", "llave", {user:"franky"})
    async set(db, table, key, data) {

        return queueHandle.addQueue({
            db: db,
            table: table,
            query: "update",
            key: key,
            data: data,
        })
    },
    // queueDB.get("test", "holaMundo", "llave", {user:"franky"})
    async get(db, table, key) {

        return queueHandle.addQueue({
            db: db,
            table: table,
            query: "retrieve",
            key: key,
        })
    },
}
