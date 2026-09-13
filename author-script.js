/* ========================================
   BUSY BEE — AUTHOR PAGE INTERACTION
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    /* 1. Вкладки страницы автора */
    const tabs = document.querySelectorAll(".author-tabs .tab-btn");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
        });
    });

    /* 2. Лайки для цитат */
    const quoteLikes = document.querySelectorAll(".btn-like");

    quoteLikes.forEach((btn) => {
        btn.addEventListener("click", () => {
            btn.classList.toggle("liked");
            if (btn.classList.contains("liked")) {
                btn.style.color = "#E74C3C";
            } else {
                btn.style.color = "var(--text-muted)";
            }
        });
    });

});