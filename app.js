const addPlantBtn = document.getElementById("addPlantBtn");
const plantsContainer = document.getElementById("plants");

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

    plantsContainer.innerHTML = "";

    for (const plant of plants.filter(plant => !plant.archived)) {

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
        `;

        plantCard.style.cursor = "pointer";

        plantCard.addEventListener("click", () => {
            window.location.href =
                "plant.html?name=" +
                encodeURIComponent(plant.name);
        });

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

renderPlants();
