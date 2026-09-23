/* ========================================
   BUSY BEE — USER PROFILE INTERACTION
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* 0. «Продолжить чтение» и «Избранное → Новеллы»
       Данные — из тех же мест, что и на главной: список из
       localStorage (busybee_reading_progress / busybee_favorite_novels,
       см. script.js) плюс обложка/автор/число глав из
       novels/novels.json через общую getNovelData(). Ничего не
       читаешь и ничего не в избранном в этом браузере — секция или
       вкладка остаются пустыми, без сообщения "нет данных" (кроме
       вкладки «Новеллы» в «Избранном» — она видна рядом с чипами,
       поэтому там короткая подсказка, как у пустых цитат в читалке).

       ⚠️ Если сюда попал placeholder-скриншот вместо реальной
       страницы: обе функции ждут файл novels/novels.json (индекс) и
       novels/<id>/<id>.json (карточка новеллы) — тех же, что уже
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
            // чтобы пересчитали, нужны ли стрелки (см. блок 1 ниже)
            trackEl.closest(".profile-carousel")?.dispatchEvent(new Event("cards-updated"));
        });
    }

    // «Продолжить чтение» — самая свежая глава по каждой новелле,
    // отсортировано по времени последнего чтения (новее — выше)
    if (typeof getReadingProgress === "function" || true) {
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
    }

    // «Избранное → Новеллы» — то, что отмечено ♡ на странице новеллы
    fillNovelCarousel({
        ids: typeof getFavoriteNovelIds === "function" ? getFavoriteNovelIds() : [],
        buildCardHtml: favoriteNovelCardHtml,
        trackEl: document.getElementById("favoriteNovelsTrack"),
        emptyEl: document.getElementById("favoriteNovelsEmpty"),
    });

    /* 1. Карусели («Продолжить чтение», «Избранное»)
       Схема как на главной: .profile-carousel = стрелка + дорожка + стрелка.
       Прокрутку и зацикливание ведёт общая setupCarousel из script.js.
       Здесь её подключаем и прячем стрелки, когда все карточки и так
       помещаются. ResizeObserver пересчитывает это при любом изменении
       размера дорожки — в том числе когда вкладка «Избранного» из
       скрытой становится видимой. */
    document.querySelectorAll(".profile-carousel").forEach((carousel) => {
        const track = carousel.querySelector(".carousel-track");
        const arrows = carousel.querySelectorAll(".carousel-arrow");
        if (!track) return;

        if (typeof setupCarousel === "function") {
            setupCarousel(carousel);
        }

        const updateArrows = () => {
            // у скрытой вкладки/секции размеры нулевые — тогда ничего не трогаем
            if (track.clientWidth === 0) return;

            const fits = track.scrollWidth <= track.clientWidth + 1;
            arrows.forEach((arrow) => {
                arrow.style.display = fits ? "none" : "";
            });
        };

        updateArrows();
        new ResizeObserver(updateArrows).observe(track);
        // «Продолжить чтение» / «Избранное» заполняются асинхронно (блок 0
        // выше), уже после того как ResizeObserver один раз отработает
        // на пустой дорожке — пересчитываем явно, когда карточки пришли
        carousel.addEventListener("cards-updated", updateArrows);
    });

    /* 2. Чипы «Избранного»: Новеллы / Цитаты / Коллекции
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

    /* Левое меню: активный пункт («Мой профиль») задан прямо в HTML
       и на каждой странице раздела ставится самой страницей,
       поэтому переключать его кликом не нужно. */

    /* 3. Лайк под цитатами — тот же outline/filled свап иконки сердца,
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

});
