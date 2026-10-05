/* ========================================
   BUSY BEE — СТРАНИЦЫ ФУТЕРА (логика)
   ========================================
   Один файл на все пять страниц (Help Center, Contact Us, Privacy
   Policy, Terms of Use, For Rights Holders) — то, что нужно каждой
   из них, включается по наличию нужных элементов в разметке:

   • .fp-sidebar-menu — подсветка активного раздела при прокрутке
     (есть на всех пяти).
   • .fp-faq-item — раскрывающиеся вопросы (Help Center).
   • #fpFaqSearch — поиск по вопросам, фильтрует .fp-faq-item
     (только Help Center).
   • .fp-form — валидация "неотправить пустую форму" по умолчанию
     браузера (required на полях) — здесь просто мягкое сообщение
     после отправки, без реального бэкенда (Contact Us, For Rights
     Holders).
   • .fp-lang-switch — переключатель русский/английский на странице
     For Rights Holders (см. блок в конце файла).

   Подключать после script.js (нужен только для общего header/footer,
   сам этот файл от него ничего не использует). */

document.addEventListener("DOMContentLoaded", () => {

    /* ---------- FAQ-аккордеон ---------- */
    const faqList = document.querySelector(".fp-faq-list");

    if (faqList) {
        faqList.addEventListener("click", (event) => {
            const question = event.target.closest(".fp-faq-question");
            if (!question) return;

            const item = question.closest(".fp-faq-item");
            const answer = item.querySelector(".fp-faq-answer");
            const isOpen = item.classList.toggle("open");

            question.setAttribute("aria-expanded", isOpen);
            answer.hidden = !isOpen;
        });
    }


    /* ---------- Поиск по вопросам ---------- */
    const faqSearch = document.getElementById("fpFaqSearch");

    if (faqSearch && faqList) {
        const items = Array.from(faqList.querySelectorAll(".fp-faq-item"));
        const nothingFound = document.getElementById("fpFaqNothingFound");

        let searchTimer = null;
        faqSearch.addEventListener("input", () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                const query = faqSearch.value.trim().toLowerCase();
                let visibleCount = 0;

                items.forEach((item) => {
                    const text = item.textContent.toLowerCase();
                    const matches = !query || text.includes(query);
                    item.hidden = !matches;
                    if (matches) visibleCount += 1;
                });

                // Запрос совпал с одним-двумя вопросами — сразу раскрываем
                // их, чтобы не пришлось ещё раз кликать после поиска
                if (query && visibleCount > 0 && visibleCount <= 2) {
                    items.forEach((item) => {
                        if (item.hidden) return;
                        item.classList.add("open");
                        item.querySelector(".fp-faq-question").setAttribute("aria-expanded", "true");
                        item.querySelector(".fp-faq-answer").hidden = false;
                    });
                }

                if (nothingFound) nothingFound.hidden = visibleCount > 0;

                // Раздел сайдбара пуст после фильтра — не пропадает, просто
                // сортировка по прокрутке ниже сама перестанет на него попадать
            }, 120);
        });
    }


    /* ---------- Активный пункт сайдбара при прокрутке (scroll-spy) ----------
       Не смотрим на видимость блока (у короткого последнего раздела это
       ненадёжно — он может ни разу не занять «рабочую» полосу экрана),
       а сравниваем scrollY с тем, где начинается каждый заголовок:
       активен последний раздел, чей h2 уже прошёл черту чуть ниже шапки.
       Долистали до самого низа страницы — насильно подсвечиваем
       последний раздел, даже если по одной только позиции заголовка
       он ещё не должен был стать активным. */
    const sidebarLinks = Array.from(document.querySelectorAll(".fp-sidebar-menu a"));
    const sections = sidebarLinks
        .map((link) => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    if (sidebarLinks.length && sections.length) {
        const sidebarMenu = document.querySelector(".fp-sidebar-menu");
        let lastActiveId = null;

        const setActive = (id) => {
            sidebarLinks.forEach((link) => {
                link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
            });

            // На телефоне меню разделов — ряд «пилюль» с горизонтальной
            // прокруткой: когда раздел сменился, подводим активную пилюлю к
            // центру ряда, чтобы она не оставалась за краем экрана. Двигаем
            // только сам ряд (scrollLeft), а не страницу: scrollIntoView увёл
            // бы страницу вверх, к самому меню. На десктопе меню — колонка,
            // прокручивать нечего, и условие ниже просто не выполняется.
            if (id !== lastActiveId && sidebarMenu && sidebarMenu.scrollWidth > sidebarMenu.clientWidth) {
                const active = sidebarMenu.querySelector("a.active");
                if (active) {
                    sidebarMenu.scrollTo({
                        left: active.offsetLeft - (sidebarMenu.clientWidth - active.offsetWidth) / 2,
                        behavior: "smooth"
                    });
                }
            }
            lastActiveId = id;
        };

        // Строка, после которой заголовок раздела считается «прошедшим» —
        // с запасом под шапку, чтобы раздел подсвечивался чуть раньше,
        // чем его заголовок упрётся в самый верх окна
        const SCROLL_OFFSET = 120;

        function currentSectionId() {
            const nearBottom =
                window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
            if (nearBottom) return sections[sections.length - 1].id;

            const scrollLine = window.scrollY + SCROLL_OFFSET;
            let current = sections[0].id;

            // Позицию раздела берём через getBoundingClientRect, а не offsetTop:
            // у .page-shell стоит zoom: 0.9, и offsetTop считается в «неуменьшенных»
            // пикселях, а scrollY — в экранных. Из-за этого расхождение росло
            // к концу страницы (≈10%), и подсветка в меню отставала от текста.
            sections.forEach((section) => {
                const sectionTop = section.getBoundingClientRect().top + window.scrollY;
                if (sectionTop <= scrollLine) current = section.id;
            });

            return current;
        }

        let ticking = false;
        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                setActive(currentSectionId());
                ticking = false;
            });
        }

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);

        // Клик — подсвечиваем сразу, не дожидаясь события скролла
        // (короткий прыжок иначе мог не долистать страницу настолько,
        // чтобы scroll-обработчик вообще сработал)
        sidebarLinks.forEach((link) => {
            link.addEventListener("click", () => {
                const id = link.getAttribute("href").slice(1);
                setActive(id);
            });
        });

        setActive(currentSectionId());
    }


    /* ---------- Форма обратной связи (Contact Us) ---------- */
    const contactForm = document.querySelector(".fp-form");

    if (contactForm) {
        contactForm.addEventListener("submit", (event) => {
            event.preventDefault();

            // Заготовка без бэкенда: просто подтверждаем отправку и чистим
            // форму — реальную отправку подключишь на своей стороне позже
            const submitBtn = contactForm.querySelector(".fp-form-submit");
            const originalHtml = submitBtn.innerHTML;
            const isEnglish = document.body.dataset.pageLang === "en";

            submitBtn.textContent = isEnglish ? "Sent!" : "Отправлено!";
            submitBtn.disabled = true;

            setTimeout(() => {
                contactForm.reset();
                submitBtn.innerHTML = originalHtml;
                submitBtn.disabled = false;
            }, 2400);
        });
    }

    /* ---------- Язык страницы (For Rights Holders) ----------
       Оба языка лежат в разметке парами (<span data-lang="ru"> и
       <span data-lang="en">), лишний прячет CSS по body[data-page-lang].
       Отсюда меняется только то, что CSS не достаёт: placeholder'ы,
       подписи в <select>, <title> и lang у <html>.

       Какой язык открыть:
         1. ?lang=en / ?lang=ru в адресе — на английский вариант ведёт
            ссылка из английского дисклеймера в футере;
         2. иначе — русский, если русский есть среди языков браузера,
            и английский во всех остальных случаях. */
    const langSwitch = document.querySelector(".fp-lang-switch");

    if (langSwitch) {
        const LANGS = ["ru", "en"];
        const langButtons = Array.from(langSwitch.querySelectorAll("[data-set-lang]"));

        function detectLang() {
            const fromUrl = new URLSearchParams(location.search).get("lang");
            if (LANGS.includes(fromUrl)) return fromUrl;

            const browserLangs = navigator.languages && navigator.languages.length
                ? navigator.languages
                : [navigator.language || ""];
            return browserLangs.some((l) => String(l).toLowerCase().startsWith("ru")) ? "ru" : "en";
        }

        function setLang(lang, { updateUrl = false } = {}) {
            document.body.dataset.pageLang = lang;
            document.documentElement.lang = lang;

            langButtons.forEach((btn) => {
                const isActive = btn.dataset.setLang === lang;
                btn.classList.toggle("active", isActive);
                btn.setAttribute("aria-pressed", isActive);
            });

            document.querySelectorAll("[data-placeholder-ru]").forEach((el) => {
                el.placeholder = lang === "en" ? el.dataset.placeholderEn : el.dataset.placeholderRu;
            });

            document.querySelectorAll("option[data-ru]").forEach((option) => {
                option.textContent = lang === "en" ? option.dataset.en : option.dataset.ru;
            });

            const titleEl = document.querySelector("title[data-ru]");
            if (titleEl) titleEl.textContent = lang === "en" ? titleEl.dataset.en : titleEl.dataset.ru;

            // Адрес обновляем только по клику: на первом показе не нужно
            // дописывать ?lang= к чужой ссылке. Якорь (#form и т.п.) сохраняем
            if (updateUrl) {
                history.replaceState(null, "", `?lang=${lang}${location.hash}`);
            }
        }

        langButtons.forEach((btn) => {
            btn.addEventListener("click", () => setLang(btn.dataset.setLang, { updateUrl: true }));
        });

        setLang(detectLang());
    }

});
