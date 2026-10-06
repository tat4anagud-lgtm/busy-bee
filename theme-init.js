/* ========================================
   BUSY BEE — ВЫБОР ТЕМЫ ПРИ ЗАГРУЗКЕ
   ========================================
   Подключается в <head> КАЖДОЙ страницы (кроме reader.html — у читалки
   свои темы), ДО стилей:
       <script src="theme-init.js"></script>

   Ставит <html data-theme="light|dark"> ещё до того, как браузер
   нарисует страницу — иначе при тёмной теме на долю секунды мигала бы
   светлая. Тема берётся из localStorage (ключ busybee_theme — его пишет
   переключатель в script.js), а если читатель ещё ничего не выбирал —
   из настроек системы (prefers-color-scheme). Сам переключатель, кнопка
   с луной/солнцем и сохранение — в script.js. */
(function () {
    var theme = "light";
    try {
        var stored = localStorage.getItem("busybee_theme");
        if (stored === "dark" || stored === "light") {
            theme = stored;
        } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            theme = "dark";
        }
    } catch (error) {
        // localStorage недоступен — остаёмся на светлой
    }
    document.documentElement.setAttribute("data-theme", theme);
})();
