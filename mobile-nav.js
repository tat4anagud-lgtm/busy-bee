/* ========================================
   BUSY BEE — МОБИЛЬНАЯ НАВИГАЦИЯ
   (нижняя панель + панель бургер-меню)
   ========================================
   Та же схема вставки, что в header.js/footer.js (см. комментарий
   в header.js) — с одной важной разницей: этот <script> должен стоять
   СНАРУЖИ .page-shell в HTML (сразу после его закрывающего </div>,
   перед <script src="script.js">), а не внутри него.

   Почему: у .page-shell стоят overflow: hidden и zoom: 0.9 (вся
   страница — «карточка» с отступом и скруглёнными углами). Нижняя
   панель и полноэкранная панель бургера используют position: fixed,
   рассчитанный на весь экран устройства — если вставить их внутрь
   .page-shell, они либо обрежутся по скруглённому краю карточки,
   либо съедут из-за zoom, вместо того чтобы прилипнуть к настоящему
   низу/краям экрана.

   Пример, куда вставлять (на каждой странице):

       </div>  <!-- закрывает .page-shell -->

       <script src="mobile-nav.js"></script>

       <script src="script.js"></script>
       <script src="какой-нибудь-свой-скрипт-страницы.js"></script>
   </body>

   Поведение (открытие/закрытие панели, подсветка активной вкладки,
   подстановка «Продолжить чтение») — в script.js, не здесь; этот файл
   только вставляет разметку, тот же принцип, что в header.js/footer.js.

   BOTTOM_NAV_FIFTH_TAB (см. script.js) решает, что показывать пятым
   пунктом нижней панели — «Профиль» или «Анонсы». Обе вкладки уже
   лежат в разметке ниже, лишняя скрывается через [hidden] в script.js,
   а не удаляется — чтобы потом включить обратно без правки HTML. */

document.currentScript.insertAdjacentHTML("afterend", `

<!-- ============ НИЖНЯЯ ПАНЕЛЬ ============ -->
<nav class="bottom-nav" aria-label="Основная навигация">

    <a href="index.html" class="bottom-nav-item">
        <span class="bottom-nav-icon-wrap"><img src="images/icons/home.svg" alt=""></span>
        <span>Главная</span>
    </a>

    <a href="catalog.html" class="bottom-nav-item">
        <span class="bottom-nav-icon-wrap"><img src="images/icons/compass.svg" alt=""></span>
        <span>Каталог</span>
    </a>

    <!-- Центральная приподнятая кнопка — ВСЕГДА кнопка, не ссылка:
         script.js решает по клику, что делать. Если в localStorage
         есть хоть одна начатая новелла — открывает шторку со списком
         (#continueSheet, см. ниже), пользователь сам выбирает, какую
         продолжить. Если прогресса нет вообще — ведёт прямо в каталог.
         Подпись и иконка здесь нарочно общие («Продолжить»/«Открыть»),
         без названия конкретной книги — конкретные обложки и названия
         показываются уже внутри самого списка. -->
    <button type="button" class="bottom-nav-item bottom-nav-center" id="bottomNavCenter" aria-haspopup="true" aria-expanded="false">
        <span class="bottom-nav-center-cover">
            <img src="images/icons/book-open.svg" alt="">
        </span>
        <span id="bottomNavCenterLabel">Открыть</span>
    </button>

    <a href="bookmarks.html" class="bottom-nav-item">
        <span class="bottom-nav-icon-wrap"><img src="images/icons/bookmark.svg" alt=""></span>
        <span>Сохранённое</span>
    </a>

    <a href="profile.html" class="bottom-nav-item" data-fifth-tab="profile">
        <span class="bottom-nav-icon-wrap"><img src="images/icons/user.svg" alt=""></span>
        <span>Профиль</span>
    </a>

    <a href="announcements.html" class="bottom-nav-item" data-fifth-tab="announcements" hidden>
        <span class="bottom-nav-icon-wrap"><img src="images/icons/megaphone.svg" alt=""></span>
        <span>Анонсы</span>
    </a>

</nav>

<!-- ============ ШТОРКА «ПРОДОЛЖИТЬ ЧТЕНИЕ» ============
     Открывается центральной кнопкой нижней панели, только если есть
     хотя бы одна начатая новелла. Список строк — целиком из
     script.js (та же логика, что раньше просто выбирала одну, самую
     свежую книгу — теперь показывает их все, по убыванию давности). -->
<div class="continue-sheet" id="continueSheet">

    <div class="continue-sheet-backdrop"></div>

    <div class="continue-sheet-panel">
        <div class="continue-sheet-head">
            <h3>Продолжить чтение</h3>
            <button type="button" class="mobile-nav-close" id="continueSheetClose" aria-label="Закрыть">
                <img src="images/icons/close.svg" alt="">
            </button>
        </div>

        <div class="continue-sheet-list" id="continueSheetList">
            <!-- строки-книги вставляет script.js -->
        </div>
    </div>

</div>

<!-- ============ ПАНЕЛЬ БУРГЕР-МЕНЮ ============
     Всё, что не поместилось в шапку и нижнюю панель: остальной каталог,
     Анонсы/Профиль (тот из двух, которого нет в нижней панели — см.
     data-duplicate-of и BOTTOM_NAV_FIFTH_TAB в script.js), «О Busy Bee»,
     пять страниц футера, переключатель темы. -->
<div class="mobile-nav-overlay" id="mobileNavOverlay">

    <div class="mobile-nav-backdrop"></div>

    <div class="mobile-nav-panel">

        <div class="mobile-nav-panel-head">
            <a href="index.html" class="logo">
                <img src="images/logo/BusyBee_logo.png" alt="Busy Bee">
                <span>Busy Bee</span>
            </a>
            <button type="button" class="mobile-nav-close" aria-label="Закрыть меню">
                <img src="images/icons/close.svg" alt="">
            </button>
        </div>

        <div class="mobile-nav-section">
            <a href="catalog.html" class="mobile-nav-link">Новеллы</a>
            <a href="authors.html" class="mobile-nav-link">Авторы</a>
            <a href="genres.html" class="mobile-nav-link">Жанры</a>
            <a href="collections.html" class="mobile-nav-link">Коллекции</a>
            <a href="glossary.html" class="mobile-nav-link">Глоссарий</a>
        </div>

        <div class="mobile-nav-section">
            <a href="profile.html" class="mobile-nav-link" data-duplicate-of="profile">Профиль</a>
            <a href="announcements.html" class="mobile-nav-link" data-duplicate-of="announcements">Анонсы</a>
            <a href="about.html" class="mobile-nav-link">О Busy Bee</a>
        </div>

        <div class="mobile-nav-section">
            <a href="help-center.html" class="mobile-nav-link secondary">Центр помощи</a>
            <a href="contact-us.html" class="mobile-nav-link secondary">Связаться с нами</a>
            <a href="privacy-policy.html" class="mobile-nav-link secondary">Политика конфиденциальности</a>
            <a href="terms-of-use.html" class="mobile-nav-link secondary">Условия использования</a>
            <a href="rights-holders.html" class="mobile-nav-link secondary">Правообладателям</a>
        </div>

        <div class="mobile-nav-section">
            <!-- .theme-toggle — тот же класс, что у иконки темы в шапке;
                 script.js слушает оба через querySelectorAll и держит
                 их в одном состоянии (см. paintThemeToggles) -->
            <button type="button" class="mobile-nav-theme-row theme-toggle">
                <span>Тёмная тема</span>
                <img src="images/icons/moon.svg" alt="">
            </button>
        </div>

    </div>

</div>
`);
