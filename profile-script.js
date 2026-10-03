/* ========================================
   BUSY BEE — ПРОФИЛЬ (все разделы в одном файле)
   ========================================
   profile.html — одна страница, внутри неё восемь разделов
   (блоки .profile-view), сайдбар и меню шапки переключают их без
   перезагрузки. Адрес выбирает раздел, а у разделов с вкладками —
   и вкладку:

     profile.html                      Мой профиль
     profile.html#library              Моя библиотека   (#library/reading …/planned …/paused …/completed …/dropped)
     profile.html#favorites            Избранное        (#favorites/novels …/quotes …/collections)
     profile.html#quotes               Мои цитаты
     profile.html#notes                Мои заметки
     profile.html#collections          Мои коллекции    (заглушка)
     profile.html#achievements         Достижения       (заглушка)
     profile.html#settings             Настройки        (заглушка)

   Общие функции (getNovelData, renderNovelGrid, loadSavedEntries,
   getShelfNovelIds, setupCarousel…) живут в script.js, который
   подключается перед этим файлом.

   Порядок файла:
     1. Обзор профиля     (счётчики полок, виджеты цитат/заметок,
                            «Продолжить чтение», «Избранное», карусели, лайки)
     2. Моя библиотека
     3. Избранное
     4. Мои цитаты / Мои заметки
     5. Вкладки страниц   (.page-tabs)
     6. Роутер разделов
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ============================================================
       1. ОБЗОР ПРОФИЛЯ
       ============================================================ */

    /* 1a. Счётчики «Личных полок» и виджеты «Мои цитаты» / «Мои заметки».
       Считаются из тех же хранилищ, что и разделы «Моя библиотека»,
       «Мои цитаты», «Мои заметки», поэтому числа и записи всегда
       совпадают с тем, что лежит в самих разделах. Вызывается при
       каждом входе в раздел «Мой профиль» (см. роутер), чтобы
       после удаления цитаты или смены полки виджеты были свежими. */
    function fillSavedWidget({ storageKey, listEl, emptyEl, itemHtml }) {
        if (!listEl || typeof loadSavedEntries !== "function") return;

        loadSavedEntries(storageKey).then((entries) => {
            const latest = entries.slice(0, 3);
            listEl.innerHTML = latest.map(itemHtml).join("");
            if (emptyEl) emptyEl.hidden = latest.length > 0;
        });
    }

    // «Книга грёз, глава 1 · 18 мая, 2025» — название новеллы, если оно нашлось
    function savedSourceLine(entry) {
        const where = entry.novelTitle
            ? `${entry.novelTitle}, глава ${entry.chapterNumber || 1}`
            : `Глава ${entry.chapterNumber || 1}`;
        return escapeHtml(`${where} · ${entry.dateLabel}`);
    }

    function refreshProfileOverview() {
        document.querySelectorAll("[data-shelf-count]").forEach((el) => {
            if (typeof getShelfNovelIds !== "function") return;
            el.textContent = getShelfNovelIds(el.dataset.shelfCount).length;
        });

        fillSavedWidget({
            storageKey: "busybee_quotes",
            listEl: document.getElementById("profileQuotesList"),
            emptyEl: document.getElementById("profileQuotesEmpty"),
            itemHtml: (entry) => `
                <div class="personal-quote-item">
                    <img src="images/icons/quote.svg" alt="" class="personal-quote-icon">
                    <div class="personal-quote-info">
                        <strong>«${escapeHtml(entry.text)}»</strong>
                        <span class="personal-quote-source">${savedSourceLine(entry)}</span>
                    </div>
                </div>`,
        });

        fillSavedWidget({
            storageKey: "busybee_notes",
            listEl: document.getElementById("profileNotesList"),
            emptyEl: document.getElementById("profileNotesEmpty"),
            itemHtml: (entry) => `
                <div class="note-item">
                    <img src="images/icons/notes.svg" alt="" class="note-icon">
                    <div class="note-info">
                        <strong>${escapeHtml(entry.content)}</strong>
                        <span class="note-date">${savedSourceLine(entry)}</span>
                    </div>
                </div>`,
        });
    }

    /* 1b. «Продолжить чтение» и «Избранное → Новеллы»
       Данные — из тех же мест, что и на главной: список из
       localStorage (busybee_reading_progress / busybee_favorite_novels,
       см. script.js) плюс обложка/автор/число глав из
       novels/novels.json через общую getNovelData(). Ничего не
       читаешь и ничего не в избранном в этом браузере — секция или
       вкладка остаются пустыми, без сообщения "нет данных" (кроме
       вкладки «Новеллы» в «Избранном» — она видна рядом с чипами,
       поэтому там короткая подсказка, как у пустых цитат в читалке).
       Обе функции ждут novels/novels.json (индекс) и
       novels/<id>/<id>.json (карточка новеллы) — те же, что уже
       использует главная страница. Пока их нет на диске, секции
       просто останутся пустыми, ошибки в консоли не будет. */

    function readingCardHtml(novelId, novel, chapterNumber) {
        const percent = novel.totalChapters
            ? Math.min(100, Math.round((chapterNumber / novel.totalChapters) * 100))
            : 0;
        const chapterLabel = novel.totalChapters
            ? `Глава ${chapterNumber} из ${novel.totalChapters}`
            : `Глава ${chapterNumber}`;

        return `
            <article class="reading-card">
                <a href="chapter.html?novel=${encodeURIComponent(novelId)}&chapter=${chapterNumber}" class="reading-cover-wrap">
                    <img src="${novel.cover}" alt="">
                </a>
                <div class="reading-info">
                    <h3><a href="novel.html?id=${encodeURIComponent(novelId)}" class="hero-title-link">${novel.title}</a></h3>
                    <span class="chapter-info">${chapterLabel}</span>
                    <div class="reading-progress">
                        <div class="progress-bar-wrap">
                            <div class="progress-bar-fill" style="width: ${percent}%;"></div>
                        </div>
                        <span class="progress-percent">${percent}%</span>
                    </div>
                </div>
                <button type="button" class="btn-dots" aria-label="Действия">⋮</button>
            </article>`;
    }

    function favoriteNovelCardHtml(novelId, novel) {
        return `
            <a href="novel.html?id=${encodeURIComponent(novelId)}" class="fav-novel-card">
                <img src="${novel.cover}" alt="">
                <h4>${novel.title}</h4>
                <span class="fav-novel-author">${novel.author ? novel.author.name : ""}</span>
            </a>`;
    }

    // Общий шаг для обеих секций: и «Продолжить чтение», и «Избранное»
    // подтягивают карточки новелл через getNovelData и переинициализируют
    // карусель — единственное отличие в том, откуда берётся список id
    // и как выглядит одна карточка.
    function fillNovelCarousel({ ids, buildCardHtml, trackEl, sectionEl, emptyEl }) {
        if (!trackEl) return;

        if (ids.length === 0) {
            if (sectionEl) sectionEl.hidden = true;
            if (emptyEl) emptyEl.hidden = false;
            return;
        }

        Promise.all(
            ids.map((id) =>
                getNovelData(id)
                    .then((novel) => ({ id, novel }))
                    // Сохранённая новелла удалена/переименована — пропускаем её
                    // карточку, а не ломаем всю карусель
                    .catch(() => null)
            )
        ).then((results) => {
            const found = results.filter(Boolean);

            if (found.length === 0) {
                if (sectionEl) sectionEl.hidden = true;
                if (emptyEl) emptyEl.hidden = false;
                return;
            }

            trackEl.innerHTML = found.map(({ id, novel }) => buildCardHtml(id, novel)).join("");

            if (sectionEl) sectionEl.hidden = false;
            if (emptyEl) emptyEl.hidden = true;

            // Карточки только что появились в DOM — сообщаем каруселям,
            // чтобы пересчитали, нужны ли стрелки (см. блок 1c ниже)
            trackEl.closest(".profile-carousel")?.dispatchEvent(new Event("cards-updated"));
        });
    }

    // «Продолжить чтение» — самая свежая глава по каждой новелле,
    // отсортировано по времени последнего чтения (новее — выше)
    let progressEntries = [];
    try {
        const all = JSON.parse(localStorage.getItem("busybee_reading_progress")) || {};
        progressEntries = Object.entries(all).sort(([, a], [, b]) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } catch (error) {
        progressEntries = [];
    }

    fillNovelCarousel({
        ids: progressEntries.map(([novelId]) => novelId),
        buildCardHtml: (novelId, novel) => {
            const chapterNumber = progressEntries.find(([id]) => id === novelId)[1].chapter;
            return readingCardHtml(novelId, novel, chapterNumber);
        },
        trackEl: document.getElementById("continueReadingTrack"),
        sectionEl: document.getElementById("continueReadingSection"),
    });

    // «Избранное → Новеллы» — то, что отмечено ♡ на странице новеллы
    fillNovelCarousel({
        ids: typeof getFavoriteNovelIds === "function" ? getFavoriteNovelIds() : [],
        buildCardHtml: favoriteNovelCardHtml,
        trackEl: document.getElementById("favoriteNovelsTrack"),
        emptyEl: document.getElementById("favoriteNovelsEmpty"),
    });

    /* 1c. Карусели («Продолжить чтение», «Избранное»)
       Схема как на главной: .profile-carousel = стрелка + дорожка + стрелка.
       Прокрутку и зацикливание ведёт общая setupCarousel из script.js.
       Здесь её подключаем и прячем стрелки, когда все карточки и так
       помещаются. ResizeObserver пересчитывает это при любом изменении
       размера дорожки — в том числе когда раздел или вкладка «Избранного»
       из скрытых становятся видимыми. */
    document.querySelectorAll(".profile-carousel").forEach((carousel) => {
        const track = carousel.querySelector(".carousel-track");
        const arrows = carousel.querySelectorAll(".carousel-arrow");
        if (!track) return;

        if (typeof setupCarousel === "function") {
            setupCarousel(carousel);
        }

        const updateArrows = () => {
            // у скрытого раздела/вкладки размеры нулевые — тогда ничего не трогаем
            if (track.clientWidth === 0) return;

            const fits = track.scrollWidth <= track.clientWidth + 1;
            arrows.forEach((arrow) => {
                arrow.style.display = fits ? "none" : "";
            });
        };

        updateArrows();
        new ResizeObserver(updateArrows).observe(track);
        // «Продолжить чтение» / «Избранное» заполняются асинхронно (блок 1b
        // выше), уже после того как ResizeObserver один раз отработает
        // на пустой дорожке — пересчитываем явно, когда карточки пришли
        carousel.addEventListener("cards-updated", updateArrows);
    });

    /* 1d. Чипы «Избранного» в обзоре: Новеллы / Цитаты / Коллекции
       Переключают панель внутри блока. Стрелки ← → на клавиатуре
       двигают выбор между чипами (стандартное поведение вкладок). */
    document.querySelectorAll(".chip-row").forEach((row) => {
        const tabs = Array.from(row.querySelectorAll('[role="tab"]'));

        const select = (tab) => {
            tabs.forEach((t) => {
                const isActive = t === tab;
                t.classList.toggle("active", isActive);
                t.setAttribute("aria-selected", isActive);
                t.tabIndex = isActive ? 0 : -1;

                const panel = document.getElementById(t.getAttribute("aria-controls"));
                if (panel) panel.hidden = !isActive;
            });
        };

        tabs.forEach((tab, index) => {
            tab.addEventListener("click", () => select(tab));

            tab.addEventListener("keydown", (event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();

                const step = event.key === "ArrowRight" ? 1 : -1;
                const next = tabs[(index + step + tabs.length) % tabs.length];
                select(next);
                next.focus();
            });
        });
    });

    /* 1e. Лайк под цитатами — тот же outline/filled свап иконки сердца,
       что и у .favorite-btn на других страницах, плюс ±1 к счётчику */
    document.querySelectorAll(".btn-like").forEach((button) => {
        const icon = button.querySelector("img");
        const countEl = button.querySelector(".like-count");
        if (!icon) return;

        // \s ловит и обычный, и неразрывный пробел («1 250»)
        const baseCount = countEl ? Number(countEl.textContent.replace(/\s/g, "")) || 0 : 0;

        button.addEventListener("click", () => {
            const isLiked = button.classList.toggle("active");
            button.setAttribute("aria-pressed", isLiked);
            icon.src = isLiked ? icon.dataset.filled : icon.dataset.outline;

            if (countEl) {
                countEl.textContent = (baseCount + (isLiked ? 1 : 0)).toLocaleString("ru-RU");
            }
        });
    });


    /* ============================================================
       2. МОЯ БИБЛИОТЕКА
       Вкладки-полки; getShelfNovelIds(shelf) (script.js) отдаёт id
       новелл полки, renderNovelGrid() рисует карточки и ставит число
       на вкладке. Числа нужны на всех вкладках сразу, даже пока
       полка не открыта, поэтому рисуем все полки.
       ============================================================ */
    function renderLibrary() {
        document.querySelectorAll("#view-library .page-tabs [role='tab']").forEach((tab) => {
            const shelf = tab.dataset.tab;
            renderNovelGrid({
                ids: getShelfNovelIds(shelf),
                grid: document.querySelector(`[data-lib-grid="${shelf}"]`),
                empty: document.querySelector(`[data-lib-empty="${shelf}"]`),
                count: document.querySelector(`[data-lib-count="${shelf}"]`),
            });
        });
    }


    /* ============================================================
       3. ИЗБРАННОЕ
       Новеллы: getFavoriteNovelIds() (script.js) — то, что отмечено ♡
       на странице новеллы. Цитаты и коллекции пока не заполняются
       (см. заметки в разметке): их числа на вкладках остаются 0, а
       панели показывают «пока пусто».
       ============================================================ */
    function renderFavorites() {
        renderNovelGrid({
            ids: getFavoriteNovelIds(),
            grid: document.querySelector('[data-fav-grid="novels"]'),
            empty: document.querySelector('[data-fav-empty="novels"]'),
            count: document.querySelector('[data-fav-count="novels"]'),
        });
    }


    /* ============================================================
       4. МОИ ЦИТАТЫ / МОИ ЗАМЕТКИ
       Их сохраняет читалка (кнопки «Цитата» / «Заметка» над выделенным
       текстом) в localStorage: busybee_quotes / busybee_notes. Обе
       страницы — один и тот же список карточек, отличается только тело
       карточки и слова для счётчика, поэтому строит их одна функция.
       Чтение, удаление и форматирование — в script.js (loadSavedEntries
       и др.). Возвращает функцию перерисовки.
       ============================================================ */
    function setupSavedList({ storageKey, idPrefix, forms, bodyHtml }) {
        const listEl = document.getElementById(`${idPrefix}List`);
        const emptyEl = document.getElementById(`${idPrefix}Empty`);
        const countEl = document.getElementById(`${idPrefix}Count`);
        if (!listEl) return () => {};

        function cardHtml(entry) {
            const source = [
                entry.novelTitle ? `<a href="${entry.novelHref}">${escapeHtml(entry.novelTitle)}</a>` : "",
                escapeHtml(entry.chapterLabel),
            ].filter(Boolean).join(" · ");

            return `
                <article class="saved-card" data-saved-at="${escapeHtml(entry.savedAt)}">
                    ${bodyHtml(entry)}
                    <div class="saved-source">${source}</div>
                    <div class="saved-foot">
                        <span class="saved-date">${escapeHtml(entry.dateLabel)}</span>
                        <div class="saved-actions">
                            <a href="${entry.chapterHref}" class="saved-link">Открыть главу</a>
                            <button type="button" class="saved-delete">Удалить</button>
                        </div>
                    </div>
                </article>`;
        }

        async function render() {
            const entries = await loadSavedEntries(storageKey);

            listEl.innerHTML = entries.map(cardHtml).join("");
            emptyEl.hidden = entries.length > 0;
            countEl.textContent = entries.length
                ? `${entries.length} ${pluralRu(entries.length, ...forms)}`
                : "";
        }

        setupSavedDelete(listEl, storageKey, render);
        return render;
    }

    const renderQuotes = setupSavedList({
        storageKey: "busybee_quotes",
        idPrefix: "quotes",
        forms: ["цитата", "цитаты", "цитат"],
        bodyHtml: (entry) => `<p class="saved-quote">«${escapeHtml(entry.text)}»</p>`,
    });

    const renderNotes = setupSavedList({
        storageKey: "busybee_notes",
        idPrefix: "notes",
        forms: ["заметка", "заметки", "заметок"],
        bodyHtml: (entry) => `
            <blockquote class="saved-passage">«${escapeHtml(entry.quotedText)}»</blockquote>
            <p class="saved-note">${escapeHtml(entry.content)}</p>`,
    });


    /* ============================================================
       5. ВКЛАДКИ СТРАНИЦ (.page-tabs: «Моя библиотека», «Избранное»)
       У каждой вкладки data-tab="ключ" и aria-controls="id панели".
       ← → Home End двигают выбор. Выбранная вкладка попадает в адрес
       (#library/paused) через replaceState — без лишних записей
       в истории браузера.
       ============================================================ */
    function tabsOf(viewKey) {
        return Array.from(document.querySelectorAll(`#view-${viewKey} .page-tabs [role="tab"]`));
    }

    function selectTab(viewKey, tab, { updateHash = true } = {}) {
        tabsOf(viewKey).forEach((t) => {
            const isActive = t === tab;
            t.classList.toggle("active", isActive);
            t.setAttribute("aria-selected", isActive);
            t.tabIndex = isActive ? 0 : -1;

            const panel = document.getElementById(t.getAttribute("aria-controls"));
            if (panel) panel.hidden = !isActive;
        });

        if (updateHash) {
            history.replaceState(null, "", `#${viewKey}/${tab.dataset.tab}`);
        }
    }

    ["library", "favorites"].forEach((viewKey) => {
        const tabs = tabsOf(viewKey);

        tabs.forEach((tab, index) => {
            tab.addEventListener("click", () => selectTab(viewKey, tab));

            tab.addEventListener("keydown", (event) => {
                let next = null;
                if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
                if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
                if (event.key === "Home") next = tabs[0];
                if (event.key === "End") next = tabs[tabs.length - 1];
                if (!next) return;

                event.preventDefault();
                selectTab(viewKey, next);
                next.focus();
            });
        });
    });


    /* ============================================================
       6. РОУТЕР РАЗДЕЛОВ
       #раздел или #раздел/вкладка. Пустой или неизвестный адрес —
       «Мой профиль». При входе в раздел данные перечитываются из
       localStorage, поэтому всё всегда свежее.
       ============================================================ */
    const VIEWS = {
        profile: "Мой профиль",
        library: "Моя библиотека",
        favorites: "Избранное",
        quotes: "Мои цитаты",
        notes: "Мои заметки",
        collections: "Мои коллекции",
        achievements: "Достижения",
        settings: "Настройки",
    };

    // Раздел → что перерисовать при входе (у заглушек — ничего)
    const RENDERERS = {
        profile: refreshProfileOverview,
        library: renderLibrary,
        favorites: renderFavorites,
        quotes: renderQuotes,
        notes: renderNotes,
    };

    const viewEls = document.querySelectorAll(".profile-view");
    const sidebarItems = document.querySelectorAll(".sidebar-item[data-view]");
    let currentView = null;

    function route() {
        const [rawView, sub] = location.hash.slice(1).split("/");
        const view = VIEWS[rawView] ? rawView : "profile";

        viewEls.forEach((el) => {
            el.hidden = el.id !== `view-${view}`;
        });

        sidebarItems.forEach((item) => {
            const isActive = item.dataset.view === view;
            item.classList.toggle("active", isActive);
            if (isActive) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");
        });

        document.title = `${VIEWS[view]} — Татьяна | Busy Bee`;

        // «‹ Мой профиль» (видна только на телефоне) — только внутри разделов
        const backLink = document.getElementById("profileBackLink");
        if (backLink) backLink.hidden = view === "profile";

        // #library/paused — открыть нужную вкладку раздела
        if (sub) {
            const tab = tabsOf(view).find((t) => t.dataset.tab === sub);
            if (tab) selectTab(view, tab, { updateHash: false });
        }

        if (view !== currentView) {
            currentView = view;
            window.scrollTo({ top: 0 });
            if (RENDERERS[view]) RENDERERS[view]();
        }

        // Меню шапки закрываем, чтобы оно не висело поверх нового раздела
        document.querySelector(".user-dropdown")?.classList.remove("open");
    }

    window.addEventListener("hashchange", route);
    route();

});
