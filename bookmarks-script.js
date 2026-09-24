/* ========================================
   BUSY BEE — СТРАНИЦА «ЗАКЛАДКИ»
   ========================================
   Две вкладки, данные — из localStorage, отдельного хранилища у
   вкладки «Новеллы» нет:

   • Новеллы — полки «Читаю», «Буду читать», «Отложено»
     (busybee_shelves, getShelfNovelIds из script.js) + прогресс из
     busybee_reading_progress. Иконка закладки убирает новеллу с полки
     (статус снимается, прогресс чтения остаётся).
   • Страницы — busybee_passage_bookmarks: «Закладка» в шапке читалки и
     «Закладка» над выделенным отрывком (см. «Закладки-страницы»
     в script.js).

   Убрать закладку можно и вернуть — после удаления на несколько
   секунд появляется «Отменить». */

document.addEventListener("DOMContentLoaded", () => {

    /* ---------- Вкладки: #novels / #pages ---------- */
    const tabs = Array.from(document.querySelectorAll(".bm-tab"));

    function selectTab(tab, { updateHash = true } = {}) {
        tabs.forEach((t) => {
            const isActive = t === tab;
            t.classList.toggle("active", isActive);
            t.setAttribute("aria-selected", isActive);
            t.tabIndex = isActive ? 0 : -1;

            const panel = document.getElementById(t.getAttribute("aria-controls"));
            if (panel) panel.hidden = !isActive;
        });

        if (updateHash) history.replaceState(null, "", `#${tab.dataset.tab}`);
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => selectTab(tab));

        tab.addEventListener("keydown", (event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
            event.preventDefault();

            const step = event.key === "ArrowRight" ? 1 : -1;
            const next = tabs[(index + step + tabs.length) % tabs.length];
            selectTab(next);
            next.focus();
        });
    });

    function selectFromHash() {
        const tab = tabs.find((t) => t.dataset.tab === location.hash.slice(1));
        if (tab) selectTab(tab, { updateHash: false });
    }

    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);


    /* ---------- «Отменить» ---------- */
    const toastEl = document.getElementById("bmToast");
    const toastText = document.getElementById("bmToastText");
    const toastUndo = document.getElementById("bmToastUndo");
    let undoAction = null;
    let toastTimer = null;

    function showUndo(text, undo) {
        undoAction = undo;
        toastText.textContent = text;
        toastEl.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastEl.hidden = true;
            undoAction = null;
        }, 6000);
    }

    toastUndo.addEventListener("click", () => {
        if (undoAction) undoAction();
        undoAction = null;
        toastEl.hidden = true;
        clearTimeout(toastTimer);
    });


    /* ---------- Вкладка «Новеллы» ---------- */
    const SHELF_ORDER = ["reading", "planned", "paused"];
    const SHELF_LABELS = { reading: "Читаю", planned: "Буду читать", paused: "Отложено" };

    const novelGrid = document.getElementById("bmNovelGrid");
    const novelsEmpty = document.getElementById("bmNovelsEmpty");
    const novelsCount = document.getElementById("bmNovelsCount");

    function readProgress() {
        try {
            return JSON.parse(localStorage.getItem("busybee_reading_progress")) || {};
        } catch (error) {
            return {};
        }
    }

    function novelCardHtml({ id, shelf, novel, chapter }) {
        const total = novel.totalChapters || 0;
        const percent = total ? Math.min(100, Math.round(((chapter || 0) / total) * 100)) : 0;
        const href = `novel.html?id=${encodeURIComponent(id)}`;
        const genres = (novel.genres || []).slice(0, 3)
            .map((g) => `<span class="bm-genre">${escapeHtml(g)}</span>`).join("");

        return `
            <article class="bm-novel-card" data-novel-id="${escapeHtml(id)}" data-shelf="${shelf}">
                <div class="bm-novel-top">
                    <a href="${href}" class="bm-novel-cover"><img src="${escapeHtml(novel.cover)}" alt=""></a>
                    <button type="button" class="bm-remove" data-remove-novel aria-label="Убрать из закладок">
                        <img src="images/icons/bookmark-filled-gold.svg" alt="">
                    </button>
                </div>
                <h3 class="bm-novel-title"><a href="${href}">${escapeHtml(novel.title)}</a></h3>
                <p class="bm-novel-author">${escapeHtml(novel.author ? novel.author.name : "")}</p>
                <span class="bm-chip bm-chip--${shelf}">${SHELF_LABELS[shelf]}</span>
                ${total ? `<div class="bm-chapter-line">Глава ${chapter || 1} / ${total}</div>
                <div class="bm-progress">
                    <div class="bm-bar"><i style="width: ${percent}%"></i></div>
                    <b>${percent}%</b>
                </div>` : ""}
                ${genres ? `<div class="bm-genres">${genres}</div>` : ""}
            </article>`;
    }

    async function renderNovels() {
        const progress = readProgress();

        // «Читаю» первыми, дальше «Буду читать», «Отложено»; внутри
        // полки порядок тот, что отдаёт getShelfNovelIds (свежие выше)
        const items = SHELF_ORDER.flatMap((shelf) =>
            getShelfNovelIds(shelf).map((id) => ({ id, shelf }))
        );

        const loaded = await Promise.all(
            items.map((item) =>
                getNovelData(item.id)
                    .then((novel) => ({ ...item, novel, chapter: (progress[item.id] || {}).chapter }))
                    // нет файла новеллы — пропускаем карточку, а не ломаем список
                    .catch(() => null)
            )
        );
        const found = loaded.filter(Boolean);

        novelGrid.innerHTML = found.map(novelCardHtml).join("");
        novelsEmpty.hidden = found.length > 0;
        novelsCount.textContent = found.length
            ? `${found.length} ${pluralRu(found.length, "новелла", "новеллы", "новелл")}`
            : "";
    }

    novelGrid.addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove-novel]");
        if (!button) return;

        const card = button.closest(".bm-novel-card");
        const { novelId, shelf } = card.dataset;

        setNovelShelf(novelId, null);
        renderNovels();
        showUndo("Новелла убрана из закладок", () => {
            setNovelShelf(novelId, shelf);
            renderNovels();
        });
    });


    /* ---------- Вкладка «Страницы» ---------- */
    const pageList = document.getElementById("bmPageList");
    const pagesEmpty = document.getElementById("bmPagesEmpty");
    const pagesCount = document.getElementById("bmPagesCount");

    // «2 дня назад», «1 неделю назад»
    function timeAgoRu(iso) {
        const diff = Date.now() - new Date(iso).getTime();
        if (Number.isNaN(diff)) return "";

        const MIN = 60000, HOUR = 3600000, DAY = 86400000;
        const ago = (n, one, few, many) => `${n} ${pluralRu(n, one, few, many)} назад`;

        if (diff < MIN) return "только что";
        if (diff < HOUR) return ago(Math.floor(diff / MIN), "минуту", "минуты", "минут");
        if (diff < DAY) return ago(Math.floor(diff / HOUR), "час", "часа", "часов");
        if (diff < 7 * DAY) return ago(Math.floor(diff / DAY), "день", "дня", "дней");
        if (diff < 30 * DAY) return ago(Math.floor(diff / (7 * DAY)), "неделю", "недели", "недель");
        if (diff < 365 * DAY) return ago(Math.floor(diff / (30 * DAY)), "месяц", "месяца", "месяцев");
        return ago(Math.floor(diff / (365 * DAY)), "год", "года", "лет");
    }

    // Открываем ту страницу читалки, где закладка была поставлена (reader
    // или chapter); если адрес не наш или его нет — веб-версия главы
    function openHref(entry) {
        try {
            if (entry.url && new URL(entry.url, location.href).origin === location.origin) return entry.url;
        } catch (error) { /* берём запасной */ }
        return entry.chapterHref;
    }

    function pageRowHtml(entry) {
        const chapterTitle = entry.chapterTitle && !entry.chapterTitle.includes("|") ? entry.chapterTitle : "";
        const chapterLine = `Глава ${entry.chapterNumber || 1}${chapterTitle ? ` — «${chapterTitle}»` : ""}`;
        const title = entry.novelTitle || "Новелла";
        const cover = entry.novelCover
            ? `<img src="${escapeHtml(entry.novelCover)}" alt="">`
            : "";

        return `
            <article class="bm-page-row" data-saved-at="${escapeHtml(entry.savedAt)}">
                <a href="${entry.novelHref}" class="bm-page-cover">${cover}</a>
                <div class="bm-page-body">
                    <h3 class="bm-page-title"><a href="${entry.novelHref}">${escapeHtml(title)}</a></h3>
                    <p class="bm-page-chapter">${escapeHtml(chapterLine)}</p>
                    ${entry.text ? `<p class="bm-page-excerpt">«${escapeHtml(entry.text)}»</p>` : ""}
                </div>
                <div class="bm-page-side">
                    <span class="bm-page-date">Сохранено ${escapeHtml(timeAgoRu(entry.savedAt))}</span>
                    <a href="${escapeHtml(openHref(entry))}" class="bm-open">Открыть страницу</a>
                </div>
                <button type="button" class="bm-remove" data-remove-page aria-label="Убрать из закладок">
                    <img src="images/icons/bookmark-filled-gold.svg" alt="">
                </button>
            </article>`;
    }

    async function renderPages() {
        const entries = await loadSavedEntries(PAGE_BOOKMARKS_KEY);

        pageList.innerHTML = entries.map(pageRowHtml).join("");
        pagesEmpty.hidden = entries.length > 0;
        pagesCount.textContent = entries.length
            ? `${entries.length} ${pluralRu(entries.length, "сохранённая страница", "сохранённые страницы", "сохранённых страниц")}`
            : "";
    }

    pageList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove-page]");
        if (!button) return;

        const savedAt = button.closest(".bm-page-row").dataset.savedAt;
        // сохраняем исходную запись целиком, чтобы «Отменить» вернула её как была
        const original = getSavedList(PAGE_BOOKMARKS_KEY).find((e) => e.savedAt === savedAt);

        deleteSavedEntry(PAGE_BOOKMARKS_KEY, savedAt);
        renderPages();

        if (original) {
            showUndo("Страница убрана из закладок", () => {
                const list = getSavedList(PAGE_BOOKMARKS_KEY);
                list.push(original);
                localStorage.setItem(PAGE_BOOKMARKS_KEY, JSON.stringify(list));
                renderPages();
            });
        }
    });


    renderNovels();
    renderPages();

});
