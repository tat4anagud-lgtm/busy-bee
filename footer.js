/* ========================================
   BUSY BEE — ОБЩИЙ ФУТЕР
   ========================================
   Та же схема, что и в header.js — см. комментарий там подробнее.
   Пока подключено только на index.html. */

document.currentScript.insertAdjacentHTML("afterend", `
<footer class="footer">

    <div class="footer-top">

        <div class="footer-brand">
            <a href="index.html" class="logo footer-logo">
                <img src="images/logo/BusyBee_logo.png" alt="Busy Bee">
                <span>Busy Bee</span>
            </a>
            <p>Bringing stories to life, one chapter at a time.</p>
        </div>

        <!-- Placeholder wording — rewrite in your own voice -->
        <p class="footer-disclaimer">
            Busy Bee is an independent translation project. All rights to the original novels belong to their
            respective authors and copyright holders — we don't claim ownership over the source material, only
            the translations themselves. If you're a rights holder and would like a translation removed, please
            get in touch with us.
        </p>

    </div>

    <div class="footer-bottom">

        <span class="footer-copyright">&copy; 2026 Busy Bee</span>

        <div class="footer-links">
            <a href="#">Help Center</a>
            <a href="#">Contact Us</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Use</a>
            <a href="#">For Rights Holders</a>
        </div>

        <div class="footer-bottom-right">

            <!-- Community, as icons instead of a text column — each
                 needs a real href once the accounts exist -->
            <div class="footer-social">
                <a href="#" class="footer-social-icon" title="Telegram">
                    <img class="icon-mono" src="images/icons/telegram.svg" alt="Telegram">
                    <img class="icon-color" src="images/icons/telegram-color.svg" alt="">
                </a>
                <a href="#" class="footer-social-icon" title="Pinterest">
                    <img class="icon-mono" src="images/icons/pinterest.svg" alt="Pinterest">
                    <img class="icon-color" src="images/icons/pinterest-color.svg" alt="">
                </a>
                <a href="#" class="footer-social-icon" title="Boosty">
                    <img class="icon-mono" src="images/icons/boosty.svg" alt="Boosty">
                    <img class="icon-color" src="images/icons/boosty-color.svg" alt="">
                </a>
                <a href="#" class="footer-social-icon" title="YouTube">
                    <img class="icon-mono" src="images/icons/youtube.svg" alt="YouTube">
                    <img class="icon-color" src="images/icons/youtube-color.svg" alt="">
                </a>
                <a href="#" class="footer-social-icon" title="Patreon">
                    <img class="icon-mono" src="images/icons/patreon.svg" alt="Patreon">
                    <img class="icon-color" src="images/icons/patreon-color.svg" alt="">
                </a>
            </div>

            <!-- Visual only for now, same as the header's language
                 switcher — doesn't actually translate the page yet -->
            <div class="footer-language">
                <button type="button" class="footer-language-option active">Ru</button>
                <span class="footer-language-sep">/</span>
                <button type="button" class="footer-language-option">Eng</button>
            </div>

        </div>

    </div>

</footer>
`);
