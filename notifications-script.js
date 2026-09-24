/* ========================================
   BUSY BEE — NOTIFICATIONS PAGE INTERACTION
   ======================================== */

// Note: header search/notifications/theme/user menu are wired up
// globally by script.js — nothing page-specific needed here for those.

document.addEventListener("DOMContentLoaded", () => {

    const filterTabs = document.getElementById("notifFilterTabs");
    const items = document.querySelectorAll(".notification-item");
    const nothingFound = document.getElementById("notifNothingFound");

    function applyFilter(filter) {
        let visibleCount = 0;

        items.forEach((item) => {
            const matches =
                filter === "all" ||
                (filter === "unread" && item.classList.contains("unread")) ||
                item.getAttribute("data-category") === filter;

            item.style.display = matches ? "" : "none";
            if (matches) visibleCount += 1;
        });

        // Hide a now-empty date group heading along with its (empty) list
        document.querySelectorAll(".notification-group").forEach((group) => {
            const anyVisible = Array.from(group.querySelectorAll(".notification-item")).some(
                (item) => item.style.display !== "none"
            );
            group.style.display = anyVisible ? "" : "none";
        });

        if (nothingFound) nothingFound.hidden = visibleCount > 0;
    }

    if (filterTabs) {
        filterTabs.addEventListener("click", (event) => {
            const chip = event.target.closest(".chip");
            if (!chip) return;

            filterTabs.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
            chip.classList.add("active");

            applyFilter(chip.getAttribute("data-filter"));
        });
    }

    /* «Отметить всё как прочитанное» — снимает класс .unread; сама
       точка-индикатор рисуется через ::before в CSS, отдельно её
       убирать не нужно */
    const markAllReadBtn = document.getElementById("markAllReadBtn");
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener("click", () => {
            items.forEach((item) => item.classList.remove("unread"));

            // Если сейчас активен фильтр «Непрочитанные» — список должен
            // тут же опустеть, а не молчать до следующего клика по чипу
            const activeChip = filterTabs?.querySelector(".chip.active");
            if (activeChip?.getAttribute("data-filter") === "unread") {
                applyFilter("unread");
            }
        });
    }

});
