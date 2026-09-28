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
     после отправки, без реального бэкенда (Contact Us).

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
        const setActive = (id) => {
            sidebarLinks.forEach((link) => {
                link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
            });
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

            sections.forEach((section) => {
                if (section.offsetTop <= scrollLine) current = section.id;
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
            const originalLabel = submitBtn.textContent;

            submitBtn.textContent = "Отправлено!";
            submitBtn.disabled = true;

            setTimeout(() => {
                contactForm.reset();
                submitBtn.textContent = originalLabel;
                submitBtn.disabled = false;
            }, 2400);
        });
    }

});
