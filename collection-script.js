/* ========================================
   BUSY BEE — СТРАНИЦА «КОЛЛЕКЦИЯ»
   ========================================
   Данные — из collections/<id>/<id>.json, адрес страницы:
   collection.html?id=rebirth

   В JSON коллекции лежат только id новелл и дата добавления
   ("novels": [{ "id": "kniga-grez", "addedAt": "2026-09-01" }]).
   Название, обложка, автор, жанры, статус и рейтинг берутся из
   novels/<id>/<id>.json через getNovelData() из script.js — ничего
   не дублируется. Счётчик новелл и жанры в строке под описанием
   считаются сами.

   Закладка на карточке — общая .mini-bookmark (bindNovelBookmarks из
   script.js): ставит «Буду читать» и показывает «Отменить». Так она
   работает так же, как в каталоге и на странице «Закладки».

   Подписка на коллекцию пока хранится в localStorage
   (busybee_followed_collections). */

document.addEventListener("DOMContentLoaded", async () => {

    const PAGE_SIZE = 8;
    const FOLLOWED_KEY = "busybee_followed_collections";

    const $ = (id) => document.getElementById(id);
    const content = $("colContent");
    const notFound = $("colNotFound");
    const grid = $("colGrid");
    const moreBtn = $("colMore");
    const sortSelect = $("colSort");

    // Без ?id= открываем «Перерождение» — удобно для проверки страницы
    const collectionId = new URLSearchParams(location.search).get("id") || "rebirth";

    /* ---------- Загрузка ---------- */
    let collection;
    try {
        const response = await fetch(`collections/${encodeURIComponent(collectionId)}/${encodeURIComponent(collectionId)}.json`);
        if (!response.ok) throw new Error("Not found");
        collection = await response.json();
    } catch (error) {
        notFound.hidden = false;
        $("pageTitle").textContent = "Коллекция не найдена — Busy Bee";
        return;
    }

    // Новеллы: нет файла у одной — пропускаем её, а не роняем страницу
    const entries = collection.novels || [];
    const loaded = await Promise.all(
        entries.map((entry) =>
            getNovelData(entry.id)
                .then((novel) => ({ novel, addedAt: entry.addedAt || "" }))
                .catch(() => null)
        )
    );
    const items = loaded.filter(Boolean);


    /* ---------- Шапка коллекции ---------- */
    $("pageTitle").textContent = `Коллекция «${collection.title}» — Busy Bee`;

    $("colBanner").src = collection.banner || "";
    $("colBanner").alt = collection.title;
    $("colTitle").textContent = collection.title;
    $("colDescription").textContent = collection.description || "";

    function novelsLabel(n) {
        return `${n} ${pluralRu(n, "новелла", "новеллы", "новелл")}`;
    }

    // «12 новелл · Historical · Romance…» — жанры по частоте, до четырёх
    function topGenres() {
        const counts = new Map();
        items.forEach(({ novel }) => (novel.genres || []).forEach((genre) => {
            counts.set(genre, (counts.get(genre) || 0) + 1);
        }));
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([genre]) => genre);
    }

    $("colMeta").textContent = [novelsLabel(items.length), ...topGenres()].join("  •  ");
    $("colCount").textContent = novelsLabel(items.length);


    /* ---------- Об этой коллекции ---------- */
    // Картинка в этом блоке одна и та же для всех коллекций (так
    // попросили — не подбирать иллюстрацию под каждую отдельно),
    // поэтому путь зашит здесь, а не читается из about.image
    const ABOUT_IMAGE = "images/backgrounds/collection-about.png";

    if (collection.about) {
        $("colAboutTitle").textContent = collection.about.title || "Об этой коллекции";
        $("colAboutText").innerHTML = (collection.about.paragraphs || [])
            .map((text) => `<p>${escapeHtml(text)}</p>`).join("");

        // Файл ещё не добавлен на сервер — блок растягивается на всю
        // ширину вместо «битой» иконки
        const aboutImage = $("colAboutImage");
        aboutImage.addEventListener("error", () => {
            aboutImage.parentElement.hidden = true;
            $("colAbout").classList.add("no-image");
        });
        aboutImage.src = ABOUT_IMAGE;

        $("colAbout").hidden = false;
    }


    /* ---------- Подписка ---------- */
    const followBtn = $("colFollow");
    const followIcon = followBtn.querySelector("img");
    const followLabel = followBtn.querySelector("span");
    const followersEl = $("colFollowers");
    const baseFollowers = collection.followers || 0;

    function readFollowed() {
        try {
            return JSON.parse(localStorage.getItem(FOLLOWED_KEY)) || {};
        } catch (error) {
            return {};
        }
    }

    function paintFollow(following) {
        followBtn.classList.toggle("following", following);
        followBtn.setAttribute("aria-pressed", following);
        followIcon.src = following ? followIcon.dataset.filled : followIcon.dataset.outline;
        followLabel.textContent = following ? "Вы подписаны" : "Подписаться на коллекцию";

        const total = baseFollowers + (following ? 1 : 0);
        followersEl.textContent = `${total.toLocaleString("ru-RU")} ${pluralRu(total, "читатель следит", "читателя следят", "читателей следят")} за коллекцией`;
    }

    paintFollow(Boolean(readFollowed()[collection.id]));

    followBtn.addEventListener("click", () => {
        const following = !followBtn.classList.contains("following");
        try {
            const all = readFollowed();
            if (following) all[collection.id] = true;
            else delete all[collection.id];
            localStorage.setItem(FOLLOWED_KEY, JSON.stringify(all));
        } catch (error) {
            console.error("Couldn't save collection follow:", error);
        }
        paintFollow(following);
    });


    /* ---------- Карточки, сортировка, вид ----------
       Сама сетка, тулбар и карточка — общий блок из novels-grid.js;
       здесь только то, что специфично для коллекции: три варианта
       сортировки, где «Недавно добавленные» смотрит на addedAt
       из JSON коллекции (у жанра для этой же цели своя дата —
       обновление главы, см. genre-script.js). */
    initNovelsGrid({
        gridEl: grid,
        moreBtnEl: moreBtn,
        sortSelectEl: sortSelect,
        viewGridBtnEl: $("colViewGrid"),
        viewListBtnEl: $("colViewList"),
        items,
        pageSize: PAGE_SIZE,
        emptyMessage: "В этой коллекции пока нет новелл. Загляните позже — мы скоро её пополним.",
        sorters: {
            recent: (a, b) => String(b.addedAt).localeCompare(String(a.addedAt)),
            rating: (a, b) => (b.novel.rating ? b.novel.rating.score : 0) - (a.novel.rating ? a.novel.rating.score : 0),
            popular: (a, b) => (b.novel.rating ? b.novel.rating.votes || 0 : 0) - (a.novel.rating ? a.novel.rating.votes || 0 : 0)
        }
    });

    content.hidden = false;
});
