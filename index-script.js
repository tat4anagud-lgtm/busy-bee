/* ========================================
   BUSY BEE — ГЛАВНАЯ СТРАНИЦА (JS)
   ========================================
   Шапка/футер, дропдауны, карусели, корзина закладок и другие общие
   вещи по-прежнему в script.js — подключайте его первым. Здесь —
   только то, что специфично для index.html: переключение hero
   («Продолжить чтение» / «Добро пожаловать»), блок «Избранные
   авторы» (Follow/Following) и виджеты, которые рисуются из данных
   новелл: «Топ 10 за неделю», «Вы хотели прочитать», «Busy Bee
   рекомендует», «Новинки», «Последние обновления».

   getNovelData, novelDataCache, bindNovelBookmarks, pluralRu — общие
   хелперы из script.js; здесь не переопределяются. Карточки на
   полках — .translation-card, тот же стиль, что и на странице
   переводчика (своя разметка ниже, homeCardHtml). */

document.addEventListener("DOMContentLoaded", () => {

    /* ========================================
       Hero — "Continue Reading" vs "Welcome" search
       ========================================
       Shows .hero-continue (last chapter the reader had open, picked
       from busybee_reading_progress) if there's any reading history in
       this browser, otherwise falls back to .hero-welcome. */

    const heroContinue = document.querySelector(".hero-continue");
    const heroWelcome = document.querySelector(".hero-welcome");

    if (heroContinue && heroWelcome) {
        // Most recently updated novel across everything in localStorage —
        // that's "the thing I was last reading", regardless of which novel
        let mostRecentNovelId = null;
        let mostRecentChapterNumber = null;
        try {
            const allProgress = JSON.parse(localStorage.getItem("busybee_reading_progress")) || {};
            Object.entries(allProgress).forEach(([novelId, entry]) => {
                if (!mostRecentNovelId || entry.updatedAt > allProgress[mostRecentNovelId].updatedAt) {
                    mostRecentNovelId = novelId;
                    mostRecentChapterNumber = entry.chapter;
                }
            });
        } catch (error) {
            // No valid progress saved — falls through to the welcome hero below
        }

        if (mostRecentNovelId) {
            getNovelData(mostRecentNovelId)
                .then((novel) => {
                    const coverImg = document.getElementById("heroCoverImg");
                    if (coverImg) {
                        coverImg.src = novel.cover;
                        coverImg.alt = novel.title;
                    }

                    const titleLink = document.getElementById("heroTitleLink");
                    if (titleLink) {
                        titleLink.textContent = novel.title;
                        titleLink.href = `novel.html?id=${mostRecentNovelId}`;
                    }

                    if (novel.author) {
                        const authorName = document.getElementById("heroAuthorName");
                        const authorLink = document.getElementById("heroAuthorLink");
                        if (authorName) authorName.textContent = novel.author.name;
                        if (authorLink) authorLink.href = novel.author.href || "#";
                    }

                    const translatorLink = document.getElementById("heroTranslatorLink");
                    if (translatorLink && novel.translator) {
                        translatorLink.textContent = novel.translator.name;
                        translatorLink.href = novel.translator.href || "#";
                    }

                    const descriptionEl = document.getElementById("heroDescription");
                    if (descriptionEl) descriptionEl.textContent = (novel.synopsis || []).join(" ");

                    const progressLabel = document.getElementById("heroProgressLabel");
                    const progressPercent = document.getElementById("heroProgressPercent");
                    const progressBar = document.getElementById("heroProgressBar");
                    if (novel.totalChapters) {
                        const percent = Math.min(100, Math.round((mostRecentChapterNumber / novel.totalChapters) * 100));
                        if (progressLabel) progressLabel.textContent = `Глава ${mostRecentChapterNumber} из ${novel.totalChapters}`;
                        if (progressPercent) progressPercent.textContent = `${percent}%`;
                        if (progressBar) progressBar.style.width = `${percent}%`;
                    }

                    const continueBtn = document.getElementById("heroContinueBtn");
                    if (continueBtn) continueBtn.href = chapterHref(mostRecentNovelId, mostRecentChapterNumber);

                    // Закладка на карточке «Продолжить чтение» — та же новелла
                    const heroBookmark = heroContinue.querySelector(".hero-bookmark-button");
                    if (heroBookmark) {
                        heroBookmark.dataset.novelId = mostRecentNovelId;
                        bindNovelBookmarks(heroContinue);
                    }

                    heroContinue.style.display = "flex";
                    heroWelcome.style.display = "none";
                })
                .catch(() => {
                    // Saved novel no longer exists (renamed/removed) — fall
                    // back to the welcome hero rather than showing a broken card
                    heroContinue.style.display = "none";
                    heroWelcome.style.display = "flex";
                });
        } else {
            heroContinue.style.display = "none";
            heroWelcome.style.display = "flex";
        }
    }


    /* ---------- Featured Authors: Follow / Following toggle ---------- */

    document.querySelectorAll(".follow-button").forEach((button) => {
        const icon = button.querySelector("img");

        button.addEventListener("click", () => {
            const isFollowing = button.classList.toggle("following");

            if (icon) {
                icon.src = isFollowing ? "images/icons/following.svg" : "images/icons/follow.svg";
                icon.alt = isFollowing ? "Вы подписаны" : "Подписаться";
            }
        });
    });


    /* ====================================================================
       Полки-карусели: Топ 10 / Вы хотели прочитать. Одна и та же
       карточка (.ng-card) и одна и та же карусель — отличаются только
       набор новелл и порядок. «Busy Bee рекомендует» и «Новинки» —
       отдельные блоки другой формы, см. ниже.
       ==================================================================== */

    // novels.json + данные каждой новеллы — один раз на страницу, дальше
    // все блоки берут готовый результат (getNovelData кэширует по id, но
    // сам novels.json без этого качался бы по разу на каждый блок)
    let allNovelsPromise = null;
    function loadAllNovels() {
        if (!allNovelsPromise) {
            allNovelsPromise = fetch("novels/novels.json")
                .then((response) => {
                    if (!response.ok) throw new Error("No novels index");
                    return response.json();
                })
                // нет файла у одной новеллы — пропускаем её, а не роняем весь блок
                .then((novelsIndex) => Promise.all(novelsIndex.map((entry) => getNovelData(entry.id).catch(() => null))))
                .then((novels) => novels.filter(Boolean));
        }
        return allNovelsPromise;
    }

    // "Выходит" / "Завершено" / "На паузе" — тот же текст, что и
    // ngStatusLabel в novels-grid.js, локальная копия: подключать ради
    // одной строчки весь novels-grid.js на главной не нужно
    function statusLabel(novel) {
        if (novel.translationStatus === "Полностью переведено") return "Завершено";
        if (novel.translationStatus === "Приостановлено") return "На паузе";
        return "Выходит";
    }

    // Последняя по дате глава — используется в "Глава X из Y" на карточке,
    // та же логика, что и в "Последних обновлениях" ниже
    function latestChapterNumber(novel) {
        if (!novel.chapters || !novel.chapters.length) return null;
        return [...novel.chapters].sort((a, b) => new Date(b.date) - new Date(a.date))[0].number;
    }

    // Карточка — тот же .translation-card, что и на странице переводчика
    // (см. index-style.css). rank — номер места (Топ 10); без него —
    // обычный бейдж статуса "Выходит"/"Завершено", как у переводчика.
    function homeCardHtml(novel, { rank = null } = {}) {
        const href = `novel.html?id=${encodeURIComponent(novel.id)}`;
        const isCompleted = novel.translationStatus === "Полностью переведено";

        const cornerBadge = rank !== null
            ? `<span class="card-rank" aria-label="Место ${rank}">${rank}</span>`
            : isCompleted
                ? `<span class="badge-completed">Завершено</span>`
                : `<span class="badge-ongoing">Выходит</span>`;

        const chInfo = isCompleted
            ? `${novel.totalChapters || 0} ${pluralRu(novel.totalChapters || 0, "глава", "главы", "глав")}`
            : `Глава ${latestChapterNumber(novel) ?? "?"} из ${novel.totalChapters ?? "?"}`;

        return `
            <article class="translation-card">
                <div class="cover-box">
                    ${cornerBadge}
                    <a href="${href}"><img src="${escapeHtml(novel.cover)}" alt="${escapeHtml(novel.title)}"></a>
                </div>
                <h4><a href="${href}" class="hero-title-link">${escapeHtml(novel.title)}</a></h4>
                <p class="author">${escapeHtml(novel.author ? novel.author.name : "")}</p>
                <p class="ch-info">${chInfo}</p>
                <div class="card-footer">
                    <button type="button" class="favorite-btn" aria-label="Нравится" aria-pressed="false"><img src="images/icons/heart.svg" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"></button>
                    <button type="button" class="mini-bookmark" data-novel-id="${escapeHtml(novel.id)}" aria-label="Сохранить в закладки" aria-pressed="false"><img src="images/icons/bookmark.svg" alt="" data-outline="images/icons/bookmark.svg" data-filled="images/icons/bookmark-filled-gold.svg"></button>
                </div>
            </article>`;
    }

    // .favorite-btn — тот же паттерн outline/filled, что и .mini-bookmark;
    // общая привязка в script.js срабатывает при загрузке страницы, когда
    // этих кнопок ещё нет (карточки приходят из fetch позже), поэтому
    // здесь привязываем заново после каждого рендера — как и bindNovelBookmarks
    function bindFavoriteButtons(scope) {
        scope.querySelectorAll(".favorite-btn").forEach((button) => {
            const icon = button.querySelector("img");
            button.addEventListener("click", () => {
                const isSaved = button.classList.toggle("active");
                button.setAttribute("aria-pressed", isSaved);
                if (icon) icon.src = isSaved ? icon.dataset.filled : icon.dataset.outline;
            });
        });
    }

    // Стрелки карусели. Общая setupCarousel из script.js при загрузке видит
    // ещё пустой трек (карточки приходят из fetch позже) и молча выходит,
    // так что у каруселей, которые рисуются из JS, стрелки сами не
    // привязываются. Здесь то же поведение (шаг = ширина карточки, по
    // краям — по кругу), но карточка ищется в момент клика — поэтому
    // работает и после перерисовки трека. Флаг не даёт привязать дважды.
    function wireCarouselArrows(wrapper) {
        if (!wrapper || wrapper.dataset.carouselWired) return;
        wrapper.dataset.carouselWired = "1";

        const track = wrapper.querySelector(".carousel-track");
        const arrows = wrapper.querySelectorAll(".carousel-arrow");
        if (!track) return;

        arrows.forEach((arrow, index) => {
            const direction = index === 0 ? -1 : 1; // первая стрелка — назад, вторая — вперёд

            arrow.addEventListener("click", () => {
                const card = track.firstElementChild;
                if (!card) return;

                const trackGap = parseFloat(getComputedStyle(track).gap) || 0;
                const step = card.offsetWidth + trackGap;
                const maxScroll = track.scrollWidth - track.clientWidth;

                const atStart = track.scrollLeft <= 1;
                const atEnd = track.scrollLeft >= maxScroll - 1;

                if (direction === 1 && atEnd) {
                    track.scrollTo({ left: 0, behavior: "smooth" });
                } else if (direction === -1 && atStart) {
                    track.scrollTo({ left: maxScroll, behavior: "smooth" });
                } else {
                    track.scrollBy({ left: direction * step, behavior: "smooth" });
                }
            });
        });
    }

    function renderBookCarousel(track, novels, { ranked = false } = {}) {
        track.innerHTML = novels
            .map((novel, index) => homeCardHtml(novel, { rank: ranked ? index + 1 : null }))
            .join("");

        // Закладка на карточке = «Буду читать» (см. bindNovelBookmarks);
        // привязываем здесь, потому что этих кнопок ещё не было, когда
        // общая привязка .mini-bookmark в script.js отработала при загрузке
        bindNovelBookmarks(track);
        bindFavoriteButtons(track);
        wireCarouselArrows(track.closest(".book-carousel"));
    }


    /* ---------- Топ 10 за неделю ----------
       ЗАГЛУШКА: настоящего недельного топа пока нет (нет статистики
       просмотров), поэтому берём все новеллы по рейтингу — сначала по
       оценке, при равенстве по числу голосов. Когда появятся данные,
       поменять нужно только сортировку ниже. */
    const top10Track = document.getElementById("top10Track");
    if (top10Track) {
        loadAllNovels()
            .then((novels) => {
                const top = novels
                    .slice()
                    .sort((a, b) =>
                        ((b.rating ? b.rating.score : 0) - (a.rating ? a.rating.score : 0)) ||
                        ((b.rating ? b.rating.votes || 0 : 0) - (a.rating ? a.rating.votes || 0 : 0))
                    )
                    .slice(0, 10);
                renderBookCarousel(top10Track, top, { ranked: true });
            })
            .catch((error) => console.error("Failed to load top 10:", error));
    }


    /* ---------- Вы хотели прочитать ----------
       Настоящие данные: новеллы с полки «Буду читать» (busybee_shelves,
       getShelfNovelIds из script.js) — недавно добавленные первыми, до
       10 штук. Пока полка пуста — вместо карусели показываем подсказку.
       TODO: для новых пользователей вместо подсказки показывать
       отдельный блок рекомендаций (не «Busy Bee рекомендует»). */
    const wantToReadTrack = document.getElementById("wantToReadTrack");
    const wantToReadCarousel = document.getElementById("wantToReadCarousel");
    const wantToReadEmpty = document.getElementById("wantToReadEmpty");

    function renderWantToRead() {
        if (!wantToReadTrack || !wantToReadCarousel || !wantToReadEmpty) return;

        const ids = getShelfNovelIds("planned").slice(0, 10);

        function showEmpty() {
            wantToReadCarousel.hidden = true;
            wantToReadEmpty.hidden = false;
        }

        if (!ids.length) {
            showEmpty();
            return;
        }

        Promise.all(ids.map((id) => getNovelData(id).catch(() => null)))
            .then((novels) => {
                const found = novels.filter(Boolean);
                if (!found.length) {
                    showEmpty();
                    return;
                }
                wantToReadEmpty.hidden = true;
                wantToReadCarousel.hidden = false;
                renderBookCarousel(wantToReadTrack, found);
            })
            .catch((error) => {
                console.error("Failed to load want-to-read shelf:", error);
                showEmpty();
            });
    }

    renderWantToRead();

    // Вернулись на главную кнопкой «Назад» из кэша браузера — полка
    // могла измениться на другой странице (закладка на новелле, чтение)
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) renderWantToRead();
    });


    /* ---------- Busy Bee рекомендует (редакционный блок) ----------
       Одна большая карточка с описанием + две поменьше.
       Чтобы выбрать новеллы вручную, впиши id в EDITORS_PICK_IDS — первая
       станет большой карточкой:
           const EDITORS_PICK_IDS = ["kniga-grez", "v-pogone-za-nefritom", "vlyubitsya"];
       Пока список пуст — берутся первые три новеллы из novels.json. */
    const EDITORS_PICK_IDS = [];

    function pickFeaturedHtml(novel) {
        const href = `novel.html?id=${encodeURIComponent(novel.id)}`;
        const tags = (novel.genres || []).slice(0, 3)
            .map((genre) => `<span class="ng-tag">${escapeHtml(genre)}</span>`).join("");
        const synopsis = (novel.synopsis || []).join(" ");
        const total = novel.totalChapters || 0;
        const chapters = total ? ` · ${total} ${pluralRu(total, "глава", "главы", "глав")}` : "";
        const rating = novel.rating ? `<b class="ng-rating">★ ${novel.rating.score.toFixed(1)}</b> · ` : "";

        return `
            <article class="pick-featured">
                <a href="${href}" class="pick-cover"><img src="${escapeHtml(novel.cover)}" alt="${escapeHtml(novel.title)}"></a>
                <div class="pick-body">
                    <span class="pick-label"><img src="images/icons/bee-icon.svg" alt="">Выбор Busy Bee</span>
                    <h3 class="pick-title"><a href="${href}">${escapeHtml(novel.title)}</a></h3>
                    <p class="pick-author">${escapeHtml(novel.author ? novel.author.name : "")}</p>
                    ${tags ? `<div class="pick-tags">${tags}</div>` : ""}
                    ${synopsis ? `<p class="pick-desc">${escapeHtml(synopsis)}</p>` : ""}
                    <p class="pick-meta">${rating}${statusLabel(novel)}${chapters}</p>
                    <div class="pick-actions">
                        <a href="${href}" class="continue-button">
                            <img src="images/icons/book-open.svg" alt="">
                            Читать
                        </a>
                        <button type="button" class="hero-bookmark-button" data-novel-id="${escapeHtml(novel.id)}" aria-label="Сохранить в закладки" aria-pressed="false">
                            <img src="images/icons/bookmark.svg" alt="" data-outline="images/icons/bookmark.svg" data-filled="images/icons/bookmark-filled-gold.svg">
                        </button>
                    </div>
                </div>
            </article>`;
    }

    const editorsPick = document.getElementById("editorsPick");
    if (editorsPick) {
        loadAllNovels()
            .then((novels) => {
                let picks = EDITORS_PICK_IDS
                    .map((id) => novels.find((novel) => novel.id === id))
                    .filter(Boolean);
                if (!picks.length) picks = novels;
                picks = picks.slice(0, 3);

                const [featured, ...rest] = picks;
                if (!featured) return;

                editorsPick.innerHTML =
                    pickFeaturedHtml(featured) +
                    rest.map((novel) => homeCardHtml(novel)).join("");

                bindNovelBookmarks(editorsPick);
                bindFavoriteButtons(editorsPick);
            })
            .catch((error) => console.error("Failed to load editor's picks:", error));
    }


    /* ---------- Новинки (компактный список) ----------
       ЗАГЛУШКА: в данных новеллы пока нет даты добавления в каталог
       (есть только даты глав), поэтому считаем, что новые новеллы
       дописывают в конец novels.json, и показываем список с конца.
       Когда появится поле вроде addedAt — сортировать по нему. */
    const MAX_NEW_RELEASES = 6;

    function newRowHtml(novel) {
        const href = `novel.html?id=${encodeURIComponent(novel.id)}`;
        const total = novel.totalChapters || 0;
        const chapters = total ? ` · ${total} ${pluralRu(total, "глава", "главы", "глав")}` : "";
        const rating = novel.rating ? `<b class="ng-rating">★ ${novel.rating.score.toFixed(1)}</b> · ` : "";

        return `
            <article class="new-row">
                <a href="${href}" class="new-row-cover"><img src="${escapeHtml(novel.cover)}" alt="${escapeHtml(novel.title)}"></a>
                <div class="new-row-body">
                    <h3 class="new-row-title"><a href="${href}">${escapeHtml(novel.title)}</a></h3>
                    <p class="new-row-author">${escapeHtml(novel.author ? novel.author.name : "")}</p>
                    <p class="new-row-meta">${rating}${statusLabel(novel)}${chapters}</p>
                </div>
                <button type="button" class="mini-bookmark" data-novel-id="${escapeHtml(novel.id)}" aria-label="Сохранить в закладки" aria-pressed="false">
                    <img src="images/icons/bookmark.svg" alt="" data-outline="images/icons/bookmark.svg" data-filled="images/icons/bookmark-filled-gold.svg">
                </button>
            </article>`;
    }

    const newReleasesList = document.getElementById("newReleasesList");
    if (newReleasesList) {
        loadAllNovels()
            .then((novels) => {
                newReleasesList.innerHTML = novels
                    .slice()
                    .reverse()
                    .slice(0, MAX_NEW_RELEASES)
                    .map(newRowHtml)
                    .join("");
                bindNovelBookmarks(newReleasesList);
            })
            .catch((error) => console.error("Failed to load new releases:", error));
    }


    /* ====================================================================
       "Последние обновления": берём у каждой новеллы её последнюю главу,
       сортируем всё по дате и показываем не больше 4 — чтобы блок не
       растягивался за пределы своего 4-строчного дизайна, когда
       новелл/глав станет больше.
       ==================================================================== */

    const latestReleasesList = document.getElementById("latestReleasesList");
    const MAX_LATEST_RELEASES = 4;

    if (latestReleasesList) {
        // "2 дня назад" / "Вчера" / "Сегодня" — falls back to a plain date
        // once it's more than a week old, since "13 дней назад" reads worse
        // than just the date at that point
        function formatRelativeRu(isoDate) {
            const date = new Date(isoDate);
            if (isNaN(date)) return "";
            const diffDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) return "Сегодня";
            if (diffDays === 1) return "Вчера";
            if (diffDays < 7) {
                const mod10 = diffDays % 10;
                const mod100 = diffDays % 100;
                let word = "дней";
                if (mod10 === 1 && mod100 !== 11) word = "день";
                else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = "дня";
                return `${diffDays} ${word} назад`;
            }
            return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
        }

        loadAllNovels()
            .then((novels) => {
                // One entry per novel — its own latest chapter
                const latestPerNovel = novels
                    .map((novel) => {
                        if (!novel.chapters || novel.chapters.length === 0) return null;
                        const latestChapter = [...novel.chapters].sort(
                            (a, b) => new Date(b.date) - new Date(a.date)
                        )[0];
                        return { novel, chapter: latestChapter };
                    })
                    .filter(Boolean)
                    .sort((a, b) => new Date(b.chapter.date) - new Date(a.chapter.date))
                    .slice(0, MAX_LATEST_RELEASES);

                latestReleasesList.innerHTML = latestPerNovel
                    .map(({ novel, chapter }) => {
                        const daysOld = Math.floor((new Date() - new Date(chapter.date)) / (1000 * 60 * 60 * 24));
                        const isNew = daysOld <= 3;
                        return `
                            <article class="release-item">
                                <img src="${escapeHtml(novel.cover)}" alt="${escapeHtml(novel.title)}">
                                <div class="release-info">
                                    <h3><a href="novel.html?id=${encodeURIComponent(novel.id)}" class="hero-title-link">${escapeHtml(novel.title)}</a></h3>
                                    <p>Глава ${chapter.number}</p>
                                </div>
                                <div class="release-right">
                                    <span>${formatRelativeRu(chapter.date)}</span>
                                    ${isNew ? "<b>Новое</b>" : ""}
                                </div>
                            </article>`;
                    })
                    .join("");
            })
            .catch((error) => console.error("Failed to load latest releases:", error));
    }

});
