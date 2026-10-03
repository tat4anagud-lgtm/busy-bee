/* ========================================
   BUSY BEE — ОБЩАЯ ШАПКА
   ========================================
   Вставляется синхронно, во время чтения страницы браузером — поэтому
   к моменту, когда браузер доходит до <script src="script.js">, шапка
   уже гарантированно в DOM, и вся её логика (меню, тема, поиск)
   в script.js продолжает работать без единой правки там.

   Как это работает: <script src="header.js"> — обычный, без async/
   defer, значит выполняется в тот момент, когда браузер как раз дошёл
   до этого места в HTML. document.currentScript — это и есть тег
   <script>, который сейчас выполняется; insertAdjacentHTML("afterend",
   ...) вставляет разметку сразу после него — то есть ровно туда, где
   в HTML раньше лежал сам <header>.

   Пока подключено только на index.html. Остальные страницы получат
   этот же файл по очереди, без переписывания — разметка одна на всех. */

document.currentScript.insertAdjacentHTML("afterend", `
<header class="header">
    <a href="index.html" class="logo">
        <img src="images/logo/BusyBee_logo.png" alt="Busy Bee">
        <span>Busy Bee</span>
    </a>

    <!-- Main navigation: Catalog dropdown + simple links -->
    <nav class="navigation">

        <div class="catalog-menu">

            <button class="catalog-button">
                Каталог
                <img src="images/icons/chevron-down.svg" alt="Chevron-down">
            </button>

            <div class="catalog-dropdown">
                <a href="catalog.html">Новеллы</a>
                <a href="authors.html">Авторы</a>
                <a href="genres.html">Жанры</a>
                <a href="collections.html">Коллекции</a>
                <a href="glossary.html">Глоссарий</a>
            </div>

        </div>

        <a href="announcements.html">Анонсы</a>
        <a href="about.html">О Busy Bee</a>

    </nav>

    <!-- Search, notification icons, language switcher, profile menu -->
    <div class="header-actions">

        <div class="search">
            <input type="text" placeholder="Поиск по книгам, авторам...">
            <img src="images/icons/search.svg" alt="Search">
        </div>

        <!-- Always visible, for guests and signed-in users alike -->
        <button class="header-bookmark-button">
            <img src="images/icons/bookmark.svg" alt="Bookmark">
        </button>

        <button class="bell-button">
            <img src="images/icons/bell.svg" alt="Bell">
        </button>

        <!-- Theme toggle: a device/browser preference, not an account
             setting, so it lives in the header itself now and stays
             visible in both the guest and signed-in states -->
        <button class="theme-toggle-button theme-toggle" title="Тема">
            <img src="images/icons/moon.svg" alt="Theme">
        </button>

        <!-- Signed-in state: profile menu. Shown when IS_LOGGED_IN is
             true (see script.js) — hidden entirely for guests, who see
             .header-login-button instead. -->
        <div class="user-menu">

            <button class="user-button">
                <div class="user-avatar"></div>
                <img src="images/icons/chevron-down.svg" alt="Chevron-down">
            </button>

            <div class="user-dropdown">

                <div class="user-dropdown-greeting">Добро пожаловать, Татьяна!</div>

                <div class="user-dropdown-divider"></div>

                <a href="profile.html" class="user-dropdown-item">
                    <img src="images/icons/user.svg" alt="" class="user-dropdown-icon"> Мой профиль
                </a>

                <div class="user-dropdown-spacer"></div>

                <!-- Reading-related sections -->
                <a href="profile.html#library" class="user-dropdown-item">
                    <img src="images/icons/book.svg" alt="" class="user-dropdown-icon"> Моя библиотека
                </a>
                <a href="profile.html#favorites" class="user-dropdown-item">
                    <img src="images/icons/heart.svg" alt="" class="user-dropdown-icon"> Избранное
                </a>
                <a href="profile.html#quotes" class="user-dropdown-item">
                    <img src="images/icons/quote.svg" alt="" class="user-dropdown-icon"> Мои цитаты
                </a>
                <a href="profile.html#notes" class="user-dropdown-item">
                    <img src="images/icons/edit.svg" alt="" class="user-dropdown-icon"> Мои заметки
                </a>
                <a href="profile.html#collections" class="user-dropdown-item">
                    <img src="images/icons/folder.svg" alt="" class="user-dropdown-icon"> Мои коллекции
                </a>

                <div class="user-dropdown-spacer"></div>

                <a href="profile.html#achievements" class="user-dropdown-item">
                    <img src="images/icons/award.svg" alt="" class="user-dropdown-icon"> Достижения
                </a>

                <div class="user-dropdown-divider"></div>

                <!-- App settings -->
                <a href="profile.html#settings" class="user-dropdown-item">
                    <img src="images/icons/settings.svg" alt="" class="user-dropdown-icon"> Настройки
                </a>

                <!-- Language switcher: same open/close logic as before, just moved
                     here from the header. Temporary — for the GitHub demo only. -->
                <div class="language-menu">

                    <button type="button" class="user-dropdown-item language-button">
                        <img src="images/icons/globe.svg" alt="" class="user-dropdown-icon"> Язык
                    </button>

                    <div class="language-dropdown">
                        <button class="language-option active">Русский</button>
                        <button class="language-option">English</button>
                    </div>

                </div>

                <div class="user-dropdown-divider"></div>

                <a href="#" class="user-dropdown-item user-dropdown-item-danger">
                    <img src="images/icons/log-out.svg" alt="" class="user-dropdown-icon"> Выйти
                </a>

            </div>

        </div>

        <!-- Guest state: just a single icon-only login button, no text.
             Shown when IS_LOGGED_IN is false (see script.js). -->
        <button class="header-login-button" title="Войти">
            <img src="images/icons/log-in.svg" alt="Log In">
        </button>

        <!-- Мобильное меню (бургер) — видна только ниже 768px (style.css).
             Открывает .mobile-nav-overlay, которую вставляет mobile-nav.js
             ВНЕ .page-shell (см. комментарий в начале того файла) — сама
             кнопка остаётся здесь, в обычной шапке, ей fixed-позиция не
             нужна. Иконка меняется на крестик через тот же приём
             data-outline/data-filled, что и везде на сайте. -->
        <button class="mobile-menu-button" id="mobileMenuBtn" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobileNavOverlay">
            <img src="images/icons/menu.svg" alt="" data-outline="images/icons/menu.svg" data-filled="images/icons/close.svg">
        </button>

    </div>
</header>
`);
