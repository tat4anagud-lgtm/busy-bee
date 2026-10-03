/* ========================================
   BUSY BEE — AUTHOR PAGE INTERACTION
   ========================================
   Данные — из authors/<id>/<id>.json (id берётся из ?id=, как на
   novel.html из novels/<id>/<id>.json). Работы автора хранятся прямо
   в его файле, отдельно каждую новеллу не фетчим — так же, как
   novel.json не фетчит отдельного автора, а хранит name/href сразу
   в себе (см. novel.author в script.js).
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ---------- Вкладки страницы автора — показываем/прячем панель
       #tabPanel-<data-tab> ---------- */
    const tabs = document.querySelectorAll(".author-tabs .tab-btn");
    const panels = document.querySelectorAll(".tab-panel");

    function selectTab(tabName) {
        tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tabName));
        panels.forEach((p) => { p.hidden = p.id !== `tabPanel-${tabName}`; });
    }

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => selectTab(tab.dataset.tab));
    });

    // Ссылки вида «Все работы →» / «Все цитаты →» переключают вкладку,
    // а не скроллят к якорю
    document.querySelectorAll("[data-goto-tab]").forEach((el) => {
        el.addEventListener("click", (event) => {
            event.preventDefault();
            selectTab(el.dataset.gotoTab);
        });
    });

    /* ---------- Общие форматтеры (та же логика, что в script.js на
       novel.html/catalog.html, но своя копия — там она объявлена
       внутри if-блока и снаружи недоступна) ---------- */

    // pluralizeRu(5, "глава", "главы", "глав") -> "глав"
    function pluralizeRu(n, one, few, many) {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
    }

    // 128000 -> "128K", 900 -> "900"
    function formatCompactRu(n) {
        if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(".", ",")}K`;
        return String(n);
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (ch) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
        }[ch]));
    }

    function formatLikes(likes) {
        // novel.quotes встречаются и как число, и как готовая строка
        // вида "1.1k" — во втором случае просто показываем как есть
        return typeof likes === "number" ? formatCompactRu(likes) : String(likes);
    }

    // Для сортировки по лайкам: число остаётся числом, "1.1k" -> 1100
    function likesAsNumber(likes) {
        if (typeof likes === "number") return likes;
        const match = String(likes).toLowerCase().match(/^([\d.]+)\s*k$/);
        return match ? parseFloat(match[1]) * 1000 : parseFloat(likes) || 0;
    }

    function quoteCardHtml({ text, novelId, novelTitle, chapter, likes }) {
        return `
            <div class="quote-card">
                <p class="quote-text">«${escapeHtml(text)}»</p>
                <div class="quote-footer">
                    <span>— <a href="novel.html?id=${encodeURIComponent(novelId)}">${escapeHtml(novelTitle)}</a>, гл. ${chapter}</span>
                    <button type="button" class="like-btn"><img src="images/icons/heart.svg" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"> ${formatLikes(likes)}</button>
                </div>
            </div>`;
    }

    // Вешаем обработчик лайка на все .like-btn внутри контейнера —
    // общая функция для сайдбара и вкладки «Цитаты»
    function bindLikeButtons(container) {
        container.querySelectorAll(".like-btn").forEach((likeBtn) => {
            const icon = likeBtn.querySelector("img");
            likeBtn.addEventListener("click", () => {
                const isLiked = likeBtn.classList.toggle("liked");
                if (icon) icon.src = isLiked ? icon.dataset.filled : icon.dataset.outline;
            });
        });
    }

    /* ---------- Плашка статуса перевода — тот же набор вариантов
       (класс/иконка/текст), что script.js использует на карточках
       каталога (см. badgeClass/badgeIcon/badgeText там). Реальные
       novel.json пока используют разные формулировки статуса
       («В процессе», «Полностью переведено», ...) — проверяем и то,
       и другое, чтобы не привязываться к одной точной строке */
    function statusBadge(translationStatus) {
        if (translationStatus === "Полностью переведено" || translationStatus === "Завершено") {
            return { cls: "badge-completed", icon: "images/icons/check-circle.svg", text: "Завершено" };
        }
        if (translationStatus === "Приостановлено") {
            return { cls: "badge-hiatus", icon: "images/icons/pause-circle.svg", text: "На паузе" };
        }
        return { cls: "badge-ongoing", icon: "images/icons/clock.svg", text: "Выходит" };
    }

    /* Карточка работы строится из настоящего novel.json (через
       getNovelData() — она объявлена в script.js и уже в кэше, если
       эту новеллу успели где-то показать раньше). Своих полей вроде
       currentChapter у novel.json нет — «последняя переведённая
       глава» берём как максимум по novel.chapters */
    function workCardHtml(novel) {
        const chapters = novel.chapters || [];
        const latestChapter = chapters.length
            ? Math.max(...chapters.map((c) => c.number))
            : 0;

        const badge = statusBadge(novel.translationStatus);
        const isDone = badge.cls === "badge-completed";
        const footer = isDone
            ? `<span>Глава ${novel.totalChapters} из ${novel.totalChapters}</span><span class="check-icon">✓</span>`
            : `<span>Глава ${latestChapter}</span><a href="novel.html?id=${encodeURIComponent(novel.id)}" class="btn-continue">Продолжить</a>`;

        return `
            <article class="work-card">
                <div class="work-cover-box">
                    <span class="badge ${badge.cls}"><img src="${badge.icon}" alt="">${badge.text}</span>
                    <button type="button" class="btn-dots" aria-label="Ещё">···</button>
                    <a href="novel.html?id=${encodeURIComponent(novel.id)}"><img src="${escapeHtml(novel.cover)}" alt="${escapeHtml(novel.title)}"></a>
                </div>
                <h3><a href="novel.html?id=${encodeURIComponent(novel.id)}">${escapeHtml(novel.title)}</a></h3>
                <p class="orig-title">${escapeHtml(novel.originalTitle || "")}</p>
                <p class="translator-info">Переводчик: <span>${escapeHtml((novel.translator && novel.translator.name) || "Busy Bee")}</span></p>
                <div class="work-tags">${(novel.genres || []).map((g) => `<span>${escapeHtml(g)}</span>`).join("")}</div>
                <div class="work-footer">${footer}</div>
            </article>`;
    }

    /* ---------- Загрузка страницы автора ---------- */
    async function loadAuthorPage() {
        const params = new URLSearchParams(window.location.search);
        const authorId = params.get("id") || "qian-shan-cha-ke";

        let author;
        try {
            const response = await fetch(`authors/${authorId}/${authorId}.json`);
            if (!response.ok) throw new Error("Not found");
            author = await response.json();
        } catch (error) {
            const nameEl = document.getElementById("authorName");
            if (nameEl) nameEl.textContent = "Автор не найден";
            return;
        }

        /* ---- Заголовок вкладки и хлебные крошки ---- */
        const pageTitleEl = document.getElementById("pageTitle");
        if (pageTitleEl) pageTitleEl.textContent = `${author.name} — Busy Bee`;
        const breadcrumbEl = document.getElementById("breadcrumbAuthorName");
        if (breadcrumbEl) breadcrumbEl.textContent = author.name;

        /* ---- Шапка карточки автора ---- */
        const avatarImg = document.getElementById("authorAvatarImg");
        if (avatarImg) {
            avatarImg.src = author.avatar;
            avatarImg.alt = author.name;
        }

        const nameEl = document.getElementById("authorName");
        if (nameEl) nameEl.textContent = author.name;

        const originalNameEl = document.getElementById("authorOriginalName");
        if (originalNameEl) originalNameEl.textContent = author.originalName || "";

        /* ---- Подписка на автора + колокольчик уведомлений (как на
           странице переводчика). Ключ в localStorage включает authorId,
           так что подписка на разных авторов хранится отдельно. ---- */
        const subscribeBtn = document.getElementById("subscribeBtn");
        const notifyBtn = document.getElementById("notifyBtn");

        if (subscribeBtn && notifyBtn) {
            const STORAGE_KEY = `busybee:author:${authorId}:subscription`;
            const subscribeLabel = subscribeBtn.querySelector(".subscribe-label");

            function loadSubscription() {
                try {
                    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
                    if (saved && typeof saved.subscribed === "boolean") {
                        return { subscribed: saved.subscribed, notify: saved.notify !== false };
                    }
                } catch (error) { /* нет доступа к storage — работаем без сохранения */ }
                return { subscribed: false, notify: true };
            }

            function saveSubscription(state) {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                } catch (error) { /* ignore */ }
            }

            const subscription = loadSubscription();

            function renderSubscription() {
                subscribeBtn.setAttribute("aria-pressed", String(subscription.subscribed));
                subscribeLabel.textContent = subscription.subscribed ? "Вы подписаны" : "Подписаться";

                notifyBtn.hidden = !subscription.subscribed;
                notifyBtn.setAttribute("aria-pressed", String(subscription.notify));
                const notifyText = subscription.notify ? "Уведомления включены" : "Уведомления выключены";
                notifyBtn.setAttribute("aria-label", notifyText);
                notifyBtn.title = notifyText;
            }

            subscribeBtn.addEventListener("click", () => {
                subscription.subscribed = !subscription.subscribed;
                subscription.notify = true;
                saveSubscription(subscription);
                renderSubscription();
            });

            notifyBtn.addEventListener("click", () => {
                subscription.notify = !subscription.notify;
                saveSubscription(subscription);
                renderSubscription();
            });

            renderSubscription();
        }

        // Первое имя в списке — как «главный» highlight-tag (обычно
        // это сокращение вроде MXTX), остальные — просто через точку
        const akaLineEl = document.getElementById("authorAkaLine");
        if (akaLineEl && (author.akaNames || []).length) {
            const [first, ...rest] = author.akaNames;
            const restHtml = rest.map((n) => escapeHtml(n)).join(" • ");
            akaLineEl.innerHTML = `<span>Другие имена: <strong class="highlight-tag">${escapeHtml(first)}</strong>${restHtml ? ` • ${restHtml}` : ""}</span>`;
        }

        const originLineEl = document.getElementById("authorOriginLine");
        if (originLineEl) {
            const years = author.activeSince ? `Пишет с ${author.activeSince} года` : "";
            originLineEl.innerHTML = `<span>${escapeHtml(author.country || "")}</span>${years ? ` • <span>${years}</span>` : ""}`;
        }

        const bioEl = document.getElementById("authorBio");
        if (bioEl) bioEl.textContent = (author.bio || []).join(" ");

        const writingStyleEl = document.getElementById("authorWritingStyle");
        if (writingStyleEl) writingStyleEl.textContent = (author.writingStyle || []).join(" • ");

        const mainGenresEl = document.getElementById("authorMainGenres");
        if (mainGenresEl) mainGenresEl.textContent = (author.mainGenres || []).join(" • ");

        /* ---- Работы автора — сами новеллы фетчим через getNovelData()
           (объявлена в script.js, который загружен раньше этого файла);
           если файла новеллы ещё нет на диске — просто пропускаем
           карточку, а не ломаем страницу (как в bookmarks-script.js) */
        const novelIds = author.works || [];
        const fetchedWorks = await Promise.all(
            novelIds.map((id) => getNovelData(id).catch(() => null))
        );
        const works = fetchedWorks.filter(Boolean);

        const statNovelsEl = document.getElementById("statTranslatedNovels");
        if (statNovelsEl) statNovelsEl.textContent = works.length;

        // «Всего глав» — сумма реально переведённых глав по каждой
        // работе (novel.chapters.length), а не заявленная цель
        // novel.totalChapters — так эта цифра не разъедется с тем,
        // что показывают карточки и страницы самих новелл
        const statChaptersEl = document.getElementById("statTotalChapters");
        if (statChaptersEl) {
            const totalChapters = works.reduce((sum, novel) => sum + (novel.chapters || []).length, 0);
            statChaptersEl.textContent = totalChapters.toLocaleString("ru-RU");
        }

        if (author.stats && author.stats.rating) {
            const scoreEl = document.getElementById("statRatingScore");
            const starsEl = document.getElementById("statRatingStars");
            const votesEl = document.getElementById("statRatingVotes");
            if (scoreEl) scoreEl.textContent = author.stats.rating.score.toFixed(1);
            if (starsEl) {
                const fullStars = Math.round(author.stats.rating.score);
                starsEl.textContent = "★".repeat(fullStars) + "☆".repeat(Math.max(0, 5 - fullStars));
            }
            if (votesEl) {
                const votesLabel = pluralizeRu(author.stats.rating.votes, "голос", "голоса", "голосов");
                votesEl.textContent = `(${formatCompactRu(author.stats.rating.votes)} ${votesLabel})`;
            }
        }

        const statFollowersEl = document.getElementById("statFollowers");
        if (statFollowersEl && author.stats) {
            statFollowersEl.textContent = formatCompactRu(author.stats.followers || 0);
        }

        const favoriteGenresEl = document.getElementById("statFavoriteGenres");
        if (favoriteGenresEl) favoriteGenresEl.textContent = (author.favoriteGenres || []).join(", ");

        /* ---- Работы автора ---- */
        // «Обзор» — только превью (первые 6), полный список — на вкладке
        // «Новеллы» ниже. Порядок совпадает с тем, что уже отсортировано
        // в author.json — если понадобится другая логика отбора «топ-6»
        // (например, по рейтингу), менять здесь.
        const worksGridEl = document.getElementById("worksGrid");
        if (worksGridEl) worksGridEl.innerHTML = works.slice(0, 6).map(workCardHtml).join("");

        // Если работ 6 или меньше, «Обзор» и так показывает всё — кнопка
        // на вкладку «Новеллы» с тем же самым списком не нужна
        const viewAllWorksWrapEl = document.getElementById("viewAllWorksWrap");
        if (viewAllWorksWrapEl) viewAllWorksWrapEl.hidden = works.length <= 6;

        // Вкладка «Новеллы» — те же карточки, но целиком, без ограничения
        const worksGridFullEl = document.getElementById("worksGridFull");
        if (worksGridFullEl) worksGridFullEl.innerHTML = works.map(workCardHtml).join("");

        /* ---- «Почему читатели любят этого автора» ---- */
        const reasonsListEl = document.getElementById("reasonsList");
        if (reasonsListEl) {
            reasonsListEl.innerHTML = (author.reasons || [])
                .map((reason) => `
                    <li>
                        <div>
                            <strong>${escapeHtml(reason.title)}</strong>
                            <p>${escapeHtml(reason.text)}</p>
                        </div>
                    </li>`)
                .join("");
        }

        const readingOrderLinkEl = document.getElementById("recommendedReadingOrderLink");
        if (readingOrderLinkEl && author.recommendedReadingOrderHref) {
            readingOrderLinkEl.href = author.recommendedReadingOrderHref;
        }

        /* ---- Заметки переводчика ---- */
        if (author.translatorNote) {
            const noteTextEl = document.getElementById("translatorNoteText");
            if (noteTextEl) {
                noteTextEl.innerHTML = (author.translatorNote.lines || [])
                    .map((line) => escapeHtml(line))
                    .join("<br>");
            }
            const signatureEl = document.getElementById("translatorNoteSignature");
            if (signatureEl) signatureEl.textContent = `— ${author.translatorNote.signature || "Busy Bee"} 🐝`;
        }

        /* ---- Цитаты — общий список, собранный из novel.quotes по
           каждой работе автора. Больше не нужно вручную дублировать
           их в author.json (author.quotes) ---- */
        const allQuotes = works
            .flatMap((novel) =>
                (novel.quotes || []).map((q) => ({
                    text: q.text,
                    chapter: q.chapter,
                    likes: q.likes,
                    novelId: novel.id,
                    novelTitle: novel.title,
                }))
            )
            .sort((a, b) => likesAsNumber(b.likes) - likesAsNumber(a.likes));

        // Сайдбар «Любимые цитаты» на вкладке «Обзор» — топ-2 по лайкам
        const quotesListEl = document.getElementById("quotesList");
        if (quotesListEl) {
            quotesListEl.innerHTML = allQuotes.slice(0, 2).map(quoteCardHtml).join("");
            bindLikeButtons(quotesListEl);
        }

        // Вкладка «Цитаты» — полный список
        const allQuotesGridEl = document.getElementById("allQuotesGrid");
        const allQuotesEmptyEl = document.getElementById("allQuotesEmpty");
        if (allQuotesGridEl) {
            allQuotesGridEl.innerHTML = allQuotes.map(quoteCardHtml).join("");
            bindLikeButtons(allQuotesGridEl);
            if (allQuotesEmptyEl) allQuotesEmptyEl.hidden = allQuotes.length > 0;
        }

        /* ---- Читателям этого автора также нравятся ---- */
        const relatedGridEl = document.getElementById("relatedAuthorsGrid");
        if (relatedGridEl) {
            const cardsHtml = (author.relatedAuthors || [])
                .map((related) => `
                    <a href="author.html?id=${encodeURIComponent(related.id)}" class="author-mini-card">
                        <img src="${escapeHtml(related.avatar)}" alt="${escapeHtml(related.name)}">
                        <strong>${escapeHtml(related.name)}</strong>
                        <div class="mini-tags">${(related.genres || []).map((g) => `<span>${escapeHtml(g)}</span>`).join("")}</div>
                    </a>`)
                .join("");
            // "Больше авторов" — статичная карточка в конце разметки,
            // остальные вставляем перед ней
            relatedGridEl.insertAdjacentHTML("afterbegin", cardsHtml);

            // Без этого ряд открывается прокрученным в конец: пока карточки
            // ещё не вставлены, в контейнере — только «Больше авторов» на
            // позиции 0, и когда мы добавляем карточки ПЕРЕД ней, браузер
            // (CSS scroll anchoring) сам сдвигает прокрутку так, чтобы она
            // осталась на том же месте экрана. overflow-anchor в CSS
            // отключает эту компенсацию, а scrollLeft подстраховывает на
            // случай, если что-то похожее сдвинет прокрутку и после
            // (например, чуть позже подгрузятся картинки авторов).
            relatedGridEl.scrollLeft = 0;
        }
    }

    loadAuthorPage();

});
