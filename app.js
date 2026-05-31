const addPlantBtn = document.getElementById("addPlantBtn");
const plantsContainer = document.getElementById("plants");

const plantSearchInput =
    document.getElementById("plantSearchInput");

let searchKeyword = "";

let renderId = 0;

const DB_NAME = "plantPhotoDB";
const DB_VERSION = 1;
const PHOTO_STORE = "photos";

function openPhotoDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(PHOTO_STORE)) {
                db.createObjectStore(PHOTO_STORE, {
                    keyPath: "id"
                });
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

async function getPhotoFromDB(id) {
    const db = await openPhotoDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PHOTO_STORE, "readonly");
        const store = transaction.objectStore(PHOTO_STORE);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result ? request.result.src : "");
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

async function deletePhotoFromDB(id) {
    const db = await openPhotoDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PHOTO_STORE, "readwrite");
        const store = transaction.objectStore(PHOTO_STORE);

        store.delete(id);

        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = () => {
            reject(transaction.error);
        };
    });
}

// データ読み込み
let plants = JSON.parse(localStorage.getItem("plants"));

// 初回データ変換
if (!plants) {

    plants = [
        {
    name: "ドラゴンフルーツ",
    startDate: new Date().toISOString(),
    archived: false,
    coverPhoto: null
},
{
    name: "桃",
    startDate: new Date().toISOString(),
    archived: false,
    coverPhoto: null
},
{
    name: "きゅうり",
    startDate: new Date().toISOString(),
    archived: false,
    coverPhoto: null
}
    ];

}

// 古いデータ対応
if (typeof plants[0] === "string") {

   plants = plants.map(name => ({
    name: name,
    startDate: new Date().toISOString(),
    archived: false,
    coverPhoto: null
}));

    savePlants();

}

function savePlants() {

    localStorage.setItem(
        "plants",
        JSON.stringify(plants)
    );

}

async function renderPlants() {

    renderId++;
    const currentRenderId = renderId;

    plantsContainer.innerHTML = "";

    const visiblePlants = plants.filter(plant => {
        const matchArchive = !plant.archived;
        const matchSearch =
            plant.name
                .toLowerCase()
                .includes(searchKeyword.toLowerCase());

        return matchArchive && matchSearch;
    });

    for (const plant of visiblePlants) {

        if (currentRenderId !== renderId) return;

        const plantCard =
            document.createElement("div");

        plantCard.className = "plant-card";

        const records =
            JSON.parse(
                localStorage.getItem("records_" + plant.name)
            ) || [];

        let latestPhoto = null;

        const recordsWithPhotos = [...records]
            .filter(record => record.photos && record.photos.length > 0)
            .sort((a, b) => {
                return new Date(b.date) - new Date(a.date);
            });

        if (recordsWithPhotos.length > 0) {
            const latestRecord = recordsWithPhotos[0];
            latestPhoto = latestRecord.photos[latestRecord.photos.length - 1];
        }

        const sortedRecordsByDate = [...records].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        const latestDate =
            sortedRecordsByDate.length > 0
                ? sortedRecordsByDate[0].date
                : "記録なし";

        let thumbHtml = `<div class="plant-thumb placeholder">🌱</div>`;

        if (latestPhoto) {
            let src = "";

            if (typeof latestPhoto === "string") {
                src = latestPhoto;
            } else if (latestPhoto.src) {
                src = latestPhoto.src;
            } else if (latestPhoto.id) {
                src = await getPhotoFromDB(latestPhoto.id);
            }

            if (src) {
                thumbHtml = `<img src="${src}" class="plant-thumb">`;
            }
        }

        plantCard.innerHTML = `
            ${thumbHtml}
            <div class="plant-name">${plant.name}</div>
            <div class="plant-updated">${latestDate}</div>
            <div class="plant-count">記録 ${records.length}件</div>
            <button class="deletePlantBtn">🗑完全削除</button>
        `;

        plantCard.style.cursor = "pointer";

        plantCard.querySelector(".deletePlantBtn").addEventListener(
    "click",
    async (event) => {

        event.stopPropagation();

        if (
            !confirm(
                plant.name +
                " を完全削除しますか？\n写真も記録も全部消えます。"
            )
        ) {
            return;
        }

        const records =
            JSON.parse(
                localStorage.getItem(
                    "records_" + plant.name
                )
            ) || [];

        for (const record of records) {

            if (!record.photos) continue;

            for (const photo of record.photos) {

                if (photo.id) {
                    await deletePhotoFromDB(
                        photo.id
                    );
                }

            }

        }

        localStorage.removeItem(
            "records_" + plant.name
        );

        plants = plants.filter(
            p => p.name !== plant.name
        );

        savePlants();

        renderPlants();

        alert(
            "完全削除しました"
        );

    }
);

        plantCard.addEventListener("click", () => {
            window.location.href =
                "plant.html?name=" +
                encodeURIComponent(plant.name);
        });

if (currentRenderId !== renderId) return;

        plantsContainer.appendChild(plantCard);
    }
}

addPlantBtn.addEventListener("click", () => {

    const plantName =
        prompt("植物名を入力してください🌱");

    if (!plantName) return;

    plants.push({
    name: plantName,
    startDate: new Date().toISOString(),
    archived: false,
    coverPhoto: null
});

    savePlants();

    renderPlants();

});

plantSearchInput.addEventListener("input", () => {
    searchKeyword = plantSearchInput.value.trim();
    renderPlants();
});

renderPlants();

const exportBackupBtn = document.getElementById("exportBackupBtn");
const importBackupBtn = document.getElementById("importBackupBtn");

async function getAllPhotosFromDB() {
    const db = await openPhotoDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PHOTO_STORE, "readonly");
        const store = transaction.objectStore(PHOTO_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

async function savePhotoObjectToDB(photo) {
    const db = await openPhotoDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PHOTO_STORE, "readwrite");
        const store = transaction.objectStore(PHOTO_STORE);

        store.put(photo);

        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = () => {
            reject(transaction.error);
        };
    });
}

exportBackupBtn.addEventListener("click", async () => {
    const plants =
        JSON.parse(localStorage.getItem("plants")) || [];

    const records = {};

    plants.forEach(plant => {
        records["records_" + plant.name] =
            JSON.parse(
                localStorage.getItem("records_" + plant.name)
            ) || [];
    });

    const photos = await getAllPhotosFromDB();

    const backup = {
        version: 1,
        createdAt: new Date().toISOString(),
        plants: plants,
        records: records,
        photos: photos
    };

    const blob = new Blob(
        [JSON.stringify(backup)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "plant-app-backup.json";
    a.click();

    URL.revokeObjectURL(url);

    alert("バックアップを書き出しました！");
});

importBackupBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.addEventListener("change", async () => {
        const file = input.files[0];

        if (!file) return;

        if (!confirm("現在のデータを上書きして復元しますか？")) {
            return;
        }

        const text = await file.text();
        const backup = JSON.parse(text);

        localStorage.setItem(
            "plants",
            JSON.stringify(backup.plants || [])
        );

        Object.keys(backup.records || {}).forEach(key => {
            localStorage.setItem(
                key,
                JSON.stringify(backup.records[key])
            );
        });

        for (const photo of backup.photos || []) {
            await savePhotoObjectToDB(photo);
        }

        alert("バックアップを復元しました！");
        location.reload();
    });

    input.click();
});

