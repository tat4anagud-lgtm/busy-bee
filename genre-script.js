/* ========================================
   BUSY BEE — СТРАНИЦА «ЖАНР»
   ========================================
   Адрес: genre.html?name=Историческое — имя жанра берём как есть,
   ровно в таком виде, в каком оно записано в genres новеллы (жанры
   на сайте пока просто строки, без отдельных id/slug'ов, так что
   отдельный справочник жанров не нужен).

   Список новелл жанра не хранится нигде отдельно: страница читает
   общий novels/novels.json (тот же файл, что каталог и главная),
   подгружает каждую новеллу через getNovelData() и оставляет те,
   у кого среди genres есть нужный жанр. Появится новелла с этим
   жанром — сама попадёт на страницу, ничего вручную вести не нужно.

   Сетку, тулбар и карточки рисует общий novels-grid.js — здесь
   только фильтрация и сортировки, специфичные для жанра.

   Фотобаннер в шапке — те же картинки, что в карусели «Explore by
   Genre» на главной (images/genres/*.png). Своего id у жанра нет,
   поэтому имя файла сопоставлено с русским названием жанра прямо
   здесь, вручную, один раз — источник истины: подписи <span> под
   картинками в index.html. Появится картинка для ещё одного жанра —
   просто добавь строку в GENRE_BANNERS. Жанра нет в словаре —
   вместо баннера остаётся обычная текстовая шапка. */

const GENRE_BANNERS = {
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

document.addEventListener("DOMContentLoaded", async () => {

    const PAGE_SIZE = 8;
    const $ = (id) => document.getElementById(id);

    const notFound = $("gnNotFound");
    const content = $("gnContent");
    const grid = $("gnGrid");
    const moreBtn = $("gnMore");
    const sortSelect = $("gnSort");

    const genreName = new URLSearchParams(location.search).get("name");

    if (!genreName) {
        notFound.hidden = false;
        $("pageTitle").textContent = "Жанр не указан — Busy Bee";
        return;
    }

    $("pageTitle").textContent = `Жанр «${genreName}» — Busy Bee`;
    $("gnTitle").textContent = genreName;
    $("gnBreadcrumbCurrent").textContent = genreName;

    // Картинка нашлась — фотобаннер сверху, шапка упрощается до
    // текста без своей рамки; нет картинки — прежняя декоративная
    // шапка со значком-иллюстрацией
    const bannerSrc = GENRE_BANNERS[genreName];
    if (bannerSrc) {
        $("gnBannerImg").src = bannerSrc;
        $("gnBannerImg").alt = genreName;
        $("gnBanner").hidden = false;
        $("gnHero").classList.add("has-banner");
        $("gnHeroDecor").hidden = true;
    }


    /* ---------- Загрузка и фильтрация ---------- */
    let items = [];
    try {
        const response = await fetch("novels/novels.json");
        if (!response.ok) throw new Error("No index");
        const novelsIndex = await response.json();

        const novels = (await Promise.all(
            novelsIndex.map((entry) => getNovelData(entry.id).catch(() => null))
        )).filter(Boolean);

        items = novels
            .filter((novel) => (novel.genres || []).includes(genreName))
            .map((novel) => ({ novel, updatedAt: latestChapterDate(novel) }));
    } catch (error) {
        console.error("Couldn't load novels for genre page:", error);
    }

    // Последняя дата главы — для сортировки «По обновлению»; нет глав
    // (например, только что добавленная новелла) — уходит в конец списка
    function latestChapterDate(novel) {
        const dates = (novel.chapters || []).map((chapter) => chapter.date).filter(Boolean);
        return dates.length ? dates.sort().at(-1) : "";
    }

    $("gnSubtitle").textContent = items.length
        ? `${items.length} ${pluralRu(items.length, "новелла", "новеллы", "новелл")} в этом жанре`
        : "Новелл в этом жанре пока нет";
    $("gnCount").textContent = `${items.length} ${pluralRu(items.length, "новелла", "новеллы", "новелл")}`;


    /* ---------- Сетка, сортировка, вид (общий блок) ---------- */
    initNovelsGrid({
        gridEl: grid,
        moreBtnEl: moreBtn,
        sortSelectEl: sortSelect,
        viewGridBtnEl: $("gnViewGrid"),
        viewListBtnEl: $("gnViewList"),
        items,
        pageSize: PAGE_SIZE,
        emptyMessage: `Пока нет новелл в жанре «${genreName}». Загляните позже — мы постоянно переводим новые истории.`,
        sorters: {
            updated: (a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)),
            rating: (a, b) => (b.novel.rating ? b.novel.rating.score : 0) - (a.novel.rating ? a.novel.rating.score : 0),
            popular: (a, b) => (b.novel.rating ? b.novel.rating.votes || 0 : 0) - (a.novel.rating ? a.novel.rating.votes || 0 : 0)
        }
    });

    content.hidden = false;
});
