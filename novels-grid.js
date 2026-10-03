/* ========================================
   BUSY BEE — ОБЩИЙ БЛОК «СЕТКА НОВЕЛЛ» (логика)
   ========================================
   Пара к novels-grid.css. Подключать после script.js (нужны
   escapeHtml, pluralRu, bindNovelBookmarks), перед page-специфичным
   JS страницы (collection-script.js, genre-script.js).

   Каждый элемент items — { novel, ...meta }, где meta — то, что
   странице нужно для своей сортировки «по умолчанию» (у коллекции
   это addedAt, у жанра — updatedAt). Сам рендер карточки смотрит
   только на item.novel, остальное видят только переданные sorters.

   initNovelsGrid({
       gridEl, moreBtnEl, sortSelectEl, viewGridBtnEl, viewListBtnEl,
       items,                 // [{ novel, ...meta }]
       sorters,               // { значение_option: (a, b) => number }
       emptyMessage,          // текст, если items пуст
       pageSize = 8
   }) -> { render, setItems(items) }
*/

function ngStatusLabel(novel) {
    if (novel.translationStatus === "Полностью переведено") return "Завершено";
    if (novel.translationStatus === "Приостановлено") return "На паузе";
    return "Выходит";
}

/* options (необязательные, для полок на главной — страницы коллекции и
   жанра вызывают ngCardHtml(novel) как раньше и ничего не замечают):
     rank        — число: бейдж места на обложке («Топ 10»)
     showRating  — true: вместо «Выходит • 259 глав» показать
                   «★ 4.8 · Выходит» */
function ngCardHtml(novel, options = {}) {
    const rank = options.rank ?? null;
    const showRating = Boolean(options.showRating);

    const href = `novel.html?id=${encodeURIComponent(novel.id)}`;
    const tags = (novel.genres || []).slice(0, 2)
        .map((genre) => `<span class="ng-tag">${escapeHtml(genre)}</span>`).join("");
    const total = novel.totalChapters || 0;
    const chapters = total ? ` • ${total} ${pluralRu(total, "глава", "главы", "глав")}` : "";
    const statusHtml = showRating && novel.rating
        ? `<b class="ng-rating">★ ${novel.rating.score.toFixed(1)}</b> · ${ngStatusLabel(novel)}`
        : `${ngStatusLabel(novel)}${chapters}`;

    return `
        <article class="ng-card">
            <a href="${href}" class="ng-cover">${rank !== null ? `<span class="ng-rank" aria-label="Место ${rank}">${rank}</span>` : ""}<img src="${escapeHtml(novel.cover)}" alt="${escapeHtml(novel.title)}"></a>
            <div class="ng-card-body">
                <h3 class="ng-card-title"><a href="${href}">${escapeHtml(novel.title)}</a></h3>
                <p class="ng-card-author">${escapeHtml(novel.author ? novel.author.name : "")}</p>
                ${tags ? `<div class="ng-card-tags">${tags}</div>` : ""}
                <div class="ng-card-footer">
                    <span class="ng-card-status">${statusHtml}</span>
                    <button type="button" class="mini-bookmark" data-novel-id="${escapeHtml(novel.id)}" aria-label="Сохранить в закладки" aria-pressed="false">
                        <img src="images/icons/bookmark.svg" alt="" data-outline="images/icons/bookmark.svg" data-filled="images/icons/bookmark-filled-gold.svg">
                    </button>
                </div>
            </div>
        </article>`;
}

function initNovelsGrid(config) {
    const pageSize = config.pageSize || 8;
    let visibleCount = pageSize;
    let items = config.items;

    function sortedItems() {
        const sorter = config.sorters[config.sortSelectEl.value] || Object.values(config.sorters)[0];
        return items.slice().sort(sorter);
    }

    function render() {
        const list = sortedItems();

        if (!list.length) {
            config.gridEl.innerHTML = `<p class="ng-empty">${config.emptyMessage}</p>`;
            config.moreBtnEl.hidden = true;
            return;
        }

        config.gridEl.innerHTML = list.slice(0, visibleCount).map((item) => ngCardHtml(item.novel)).join("");
        config.moreBtnEl.hidden = visibleCount >= list.length;

        // Кнопки появились только что — общая привязка закладок при
        // загрузке страницы их ещё не видела
        bindNovelBookmarks(config.gridEl);
    }

    config.sortSelectEl.addEventListener("change", () => {
        visibleCount = pageSize;
        render();
    });

    config.moreBtnEl.addEventListener("click", () => {
        visibleCount += pageSize;
        render();
    });

    function setView(listView) {
        config.gridEl.classList.toggle("list-view", listView);
        config.viewGridBtnEl.classList.toggle("active", !listView);
        config.viewListBtnEl.classList.toggle("active", listView);
        config.viewGridBtnEl.setAttribute("aria-pressed", !listView);
        config.viewListBtnEl.setAttribute("aria-pressed", listView);
    }

    config.viewGridBtnEl.addEventListener("click", () => setView(false));
    config.viewListBtnEl.addEventListener("click", () => setView(true));

    render();

    return {
        render,
        setItems(newItems) {
            items = newItems;
            visibleCount = pageSize;
            render();
        }
    };
}
