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

function ngCardHtml(novel) {
    const href = `novel.html?id=${encodeURIComponent(novel.id)}`;
    const tags = (novel.genres || []).slice(0, 2)
        .map((genre) => `<span class="ng-tag">${escapeHtml(genre)}</span>`).join("");
    const total = novel.totalChapters || 0;
    const chapters = total ? ` • ${total} ${pluralRu(total, "глава", "главы", "глав")}` : "";

    return `
        <article class="ng-card">
            <a href="${href}" class="ng-cover"><img src="${escapeHtml(novel.cover)}" alt="${escapeHtml(novel.title)}"></a>
            <div class="ng-card-body">
                <h3 class="ng-card-title"><a href="${href}">${escapeHtml(novel.title)}</a></h3>
                <p class="ng-card-author">${escapeHtml(novel.author ? novel.author.name : "")}</p>
                ${tags ? `<div class="ng-card-tags">${tags}</div>` : ""}
                <div class="ng-card-footer">
                    <span class="ng-card-status">${ngStatusLabel(novel)}${chapters}</span>
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
