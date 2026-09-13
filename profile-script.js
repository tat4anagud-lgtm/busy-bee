/* ========================================
   BUSY BEE — USER PROFILE INTERACTION
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* 1. Добавление новой коллекции */
    const createCollectionBtn = document.querySelector(".create-new-collection");

    if (createCollectionBtn) {
        createCollectionBtn.addEventListener("click", () => {
            const title = prompt("Enter new collection title:");
            if (title) {
                alert(`Collection "${title}" has been created!`);
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

});