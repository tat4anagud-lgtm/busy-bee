/* ========================================
   BUSY BEE — USER PROFILE INTERACTION
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* 1. Добавление новой коллекции */
    const createCollectionBtn = document.querySelector(".create-new-collection");

    if (createCollectionBtn) {
        createCollectionBtn.addEventListener("click", () => {
            const title = prompt("Введите название новой коллекции:");
            if (title) {
                alert(`Коллекция «${title}» создана!`);
            }
        });
    }

    /* 2. Быстрые переключения в левом меню */
    const sidebarItems = document.querySelectorAll(".sidebar-item");

    sidebarItems.forEach((item) => {
        item.addEventListener("click", (e) => {
            sidebarItems.forEach((i) => i.classList.remove("active"));
            item.classList.add("active");
        });
    });

    /* 3. Лайк под цитатами — тот же outline/filled свап иконки сердца,
       что и у .favorite-btn на других страницах */
    document.querySelectorAll(".btn-like").forEach((button) => {
        const icon = button.querySelector("img");
        if (!icon) return;

        button.addEventListener("click", () => {
            const isLiked = button.classList.toggle("active");
            icon.src = isLiked ? icon.dataset.filled : icon.dataset.outline;
        });
    });

});