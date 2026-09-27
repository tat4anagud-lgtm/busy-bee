/* ========================================
   BUSY BEE — СТРАНИЦА «ЖАНРЫ» (список всех жанров)
   ========================================
   Отдельного справочника жанров на сайте нет (см. GENRE_BANNERS в
   genre-script.js) — список и счётчики собираются на лету из общего
   novels/novels.json: каждая новелла подгружается через
   getNovelData(), и её genres идут в подсчёт. Появится новелла с
   новым жанром — он сам попадёт в сетку, ничего вручную вести не
   нужно (тот же принцип, что и на самой странице жанра).

   GENRE_IMAGES — те же десять фотографий, что в карусели «Жанры» на
   главной и в GENRE_BANNERS на genre.html; продублировано здесь же
   (как fs-* и другие мелкие константы в других page-специфичных
   файлах — «пока так, до переноса в общее место»), потому что
   genre-script.js на этой странице не подключён. У жанра без своей
   картинки в сетке будет тёплая плашка вместо фото (см. .no-image
   в genres-style.css) — карточка не пропадает, просто без фото. */

const GENRE_IMAGES = {
    "Армия": "images/genres/army.png",
    "Дворцовые интриги": "images/genres/court-intrigue.png",
    "Драма": "images/genres/drama.png",
    "Исторические": "images/genres/historical.png",
    "Комедия": "images/genres/comedy.png",
    "Месть": "images/genres/revenge.png",
    "Мистика": "images/genres/mystery.png",
    "Романтика": "images/genres/romance.png",
    "Современные": "images/genres/modern.png",
    "Фэнтези": "images/genres/fantasy.png"
};

// Порядок для чипа «Все» — тот же, что в карусели на главной; жанры
// без картинки (найдены в каталоге, но не входят в этот список)
// уходят в конец, в алфавитном порядке
const GENRE_ORDER = Object.keys(GENRE_IMAGES);

document.addEventListener("DOMContentLoaded", async () => {

    const $ = (id) => document.getElementById(id);
    const grid = $("geGrid");
    const emptyEl = $("geEmpty");
    const countEl = $("geCount");
    const chips = $("geChips");
    const searchInput = $("geSearchInput");

    function novelsLabel(n) {
        return `${n} ${pluralRu(n, "новелла", "новеллы", "новелл")}`;
    }

    /* ---------- Подсчёт жанров по каталогу ---------- */
    let genres = [];
    try {
        const response = await fetch("novels/novels.json");
        if (!response.ok) throw new Error("No index");
        const novelsIndex = await response.json();

        const novels = (await Promise.all(
            novelsIndex.map((entry) => getNovelData(entry.id).catch(() => null))
        )).filter(Boolean);

        const counts = new Map();
        novels.forEach((novel) => (novel.genres || []).forEach((name) => {
            counts.set(name, (counts.get(name) || 0) + 1);
        }));

        genres = Array.from(counts.entries()).map(([name, count]) => ({
            name,
            count,
            image: GENRE_IMAGES[name] || ""
        }));
    } catch (error) {
        emptyEl.textContent = "Не удалось загрузить жанры. Попробуйте обновить страницу.";
        emptyEl.hidden = false;
        return;
    }


    /* ---------- Карточка ---------- */
    function cardHtml(item) {
        const href = `genre.html?name=${encodeURIComponent(item.name)}`;
        const img = item.image
            ? `<img src="${escapeHtml(item.image)}" alt="">`
            : "";

        return `
            <a href="${href}" class="ge-card${item.image ? "" : " no-image"}">
                ${img}
                <div class="ge-card-overlay"></div>
                <div class="ge-card-body">
                    <h3 class="ge-card-title">${escapeHtml(item.name)}</h3>
                    <span class="ge-card-count">${novelsLabel(item.count)}</span>
                </div>
            </a>`;
    }

    const EMPTY_TEXT = {
        search: "Ничего не нашлось. Проверьте написание или попробуйте другое слово.",
        default: "Жанров пока нет. Загляните позже — мы скоро добавим новеллы в каталог."
    };

    /* ---------- Рендер: поиск по названию + сортировка ---------- */
    function render() {
        const activeChip = chips.querySelector(".ge-chip.active");
        const sort = activeChip ? activeChip.dataset.sort : "default";
        const query = searchInput.value.trim().toLowerCase();

        let list = genres.slice();

        if (query) {
            list = list.filter((g) => g.name.toLowerCase().includes(query));
        }

        if (sort === "popular") {
            list.sort((a, b) => b.count - a.count);
        } else if (sort === "alphabet") {
            list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
        } else {
            // «Все» — сначала в порядке карусели на главной, дальше
            // всё остальное (жанры без своей картинки) по алфавиту
            list.sort((a, b) => {
                const ai = GENRE_ORDER.indexOf(a.name);
                const bi = GENRE_ORDER.indexOf(b.name);
                if (ai === -1 && bi === -1) return a.name.localeCompare(b.name, "ru");
                if (ai === -1) return 1;
                if (bi === -1) return -1;
                return ai - bi;
            });
        }

        grid.innerHTML = list.map(cardHtml).join("");
        emptyEl.textContent = query ? EMPTY_TEXT.search : EMPTY_TEXT.default;
        emptyEl.hidden = list.length > 0;
        countEl.textContent = list.length
            ? `${list.length} ${pluralRu(list.length, "жанр", "жанра", "жанров")}`
            : "";
    }

    chips.addEventListener("click", (event) => {
        const chip = event.target.closest(".ge-chip");
        if (!chip) return;

        chips.querySelectorAll(".ge-chip").forEach((c) => {
            const active = c === chip;
            c.classList.toggle("active", active);
            c.setAttribute("aria-pressed", active);
        });
        render();
    });

    let searchTimer = null;
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(render, 150);
    });

    render();
});
