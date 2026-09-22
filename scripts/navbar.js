document.addEventListener("DOMContentLoaded", () => {
    const root = document.documentElement;
    const body = document.body;
    const navbar = document.querySelector(".navbar");
    const menuToggle = document.getElementById("menu-toggle");
    const navList = document.getElementById("nav-menu");
    const navLinks = Array.from(document.querySelectorAll(".navbar a"));
    const sectionLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
    const themeToggle = document.getElementById("theme-toggle");
    const themeToggleIcon = themeToggle?.querySelector(".theme-toggle-icon");
    const heroSection = document.querySelector(".hero-section");
    const finalCta = document.querySelector(".cta-section");
    const mobileInstallBar = document.querySelector(".mobile-install-bar");
    const main = document.getElementById("main");
    const darkModeMedia = window.matchMedia("(prefers-color-scheme: dark)");
    const desktopMedia = window.matchMedia("(min-width: 921px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const themeKey = "goalsreach-theme";
    let navFrame = 0;
    let menuOpen = false;

    const moonIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 15.2A8.6 8.6 0 1 1 12.8 4a6.9 6.9 0 0 0 7.2 11.2Z"></path>
        </svg>
    `;

    const sunIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2"></circle>
            <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"></path>
        </svg>
    `;

    function getStoredTheme() {
        try {
            const storedTheme = window.localStorage.getItem(themeKey);
            return storedTheme === "light" || storedTheme === "dark" ? storedTheme : null;
        } catch (error) {
            return null;
        }
    }

    function setStoredTheme(theme) {
        try {
            window.localStorage.setItem(themeKey, theme);
        } catch (error) {
            // The selected theme still applies for this page view.
        }
    }

    function syncThemeAssets(theme) {
        document.querySelectorAll("source[data-theme-dark-source]").forEach((source) => {
            source.media = theme === "dark" ? "all" : "not all";
        });

        document.querySelectorAll("img[data-theme-light-src][data-theme-dark-src]").forEach((image) => {
            image.src = theme === "dark" ? image.dataset.themeDarkSrc : image.dataset.themeLightSrc;
        });
    }

    function applyTheme() {
        const activeTheme = getStoredTheme() || (darkModeMedia.matches ? "dark" : "light");
        const nextTheme = activeTheme === "dark" ? "light" : "dark";
        root.dataset.theme = activeTheme;
        root.style.colorScheme = activeTheme;
        syncThemeAssets(activeTheme);

        if (themeToggle && themeToggleIcon) {
            themeToggle.dataset.theme = activeTheme;
            themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
            themeToggle.setAttribute("title", `Switch to ${nextTheme} mode`);
            themeToggleIcon.innerHTML = nextTheme === "dark" ? moonIcon : sunIcon;
        }
    }

    function focusableMenuItems() {
        if (!navList) {
            return [];
        }

        return Array.from(navList.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    }

    function openMenu() {
        if (!navList || !menuToggle || desktopMedia.matches || menuOpen) {
            return;
        }

        menuOpen = true;
        navList.classList.add("show");
        menuToggle.classList.add("open");
        menuToggle.setAttribute("aria-expanded", "true");
        menuToggle.setAttribute("aria-label", "Close menu");
        body.classList.add("menu-open");
        if (main) main.inert = true;
        window.setTimeout(() => focusableMenuItems()[0]?.focus({ preventScroll: true }), 80);
    }

    function closeMenu({ restoreFocus = false } = {}) {
        if (!navList || !menuToggle || !menuOpen) {
            return;
        }

        menuOpen = false;
        navList.classList.remove("show");
        menuToggle.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open menu");
        body.classList.remove("menu-open");
        if (main) main.inert = false;
        if (restoreFocus) menuToggle.focus({ preventScroll: true });
    }

    function updateNavbar() {
        navFrame = 0;
        if (!navbar) {
            return;
        }

        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const scrollY = window.scrollY;
        const heroBottom = heroSection?.getBoundingClientRect().bottom ?? 0;
        const ctaTop = finalCta?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
        const isBelowHero = heroBottom <= 90;

        navbar.classList.toggle("is-scrolled", desktopMedia.matches && scrollY > 48);
        navbar.classList.toggle("is-over-hero", !isBelowHero);
        navbar.classList.toggle("is-below-hero", isBelowHero);

        if (mobileInstallBar) {
            const shouldShow = !desktopMedia.matches
                && heroBottom < viewportHeight * 0.38
                && ctaTop > viewportHeight * 0.7
                && !menuOpen;
            mobileInstallBar.classList.toggle("is-visible", shouldShow);
            navbar.classList.toggle("has-install-bar", shouldShow);
        }

        const marker = scrollY + Math.min(viewportHeight * 0.34, 280);
        let activeId = "";
        let activeOffset = Number.NEGATIVE_INFINITY;
        sectionLinks.forEach((link) => {
            const target = document.querySelector(link.getAttribute("href"));
            if (target && target.offsetTop <= marker && target.offsetTop > activeOffset) {
                activeId = `#${target.id}`;
                activeOffset = target.offsetTop;
            }
        });
        sectionLinks.forEach((link) => {
            link.classList.toggle("is-active", link.getAttribute("href") === activeId);
        });
    }

    function requestNavbarUpdate() {
        if (!navFrame) {
            navFrame = window.requestAnimationFrame(updateNavbar);
        }
    }

    menuToggle?.addEventListener("click", (event) => {
        event.stopPropagation();
        if (menuOpen) {
            closeMenu({ restoreFocus: true });
        } else {
            openMenu();
        }
        requestNavbarUpdate();
    });

    navList?.addEventListener("click", (event) => {
        if (event.target === navList) {
            closeMenu({ restoreFocus: true });
        }
    });

    navLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            const href = link.getAttribute("href");

            if (href?.startsWith("#")) {
                const target = document.querySelector(href);
                if (target) {
                    event.preventDefault();
                    closeMenu();
                    target.scrollIntoView({
                        behavior: reducedMotion.matches ? "auto" : "smooth",
                        block: "start",
                    });
                    window.history.replaceState(null, "", href);
                }
            } else {
                closeMenu();
            }
        });
    });

    document.addEventListener("keydown", (event) => {
        if (!menuOpen) {
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            closeMenu({ restoreFocus: true });
            requestNavbarUpdate();
            return;
        }

        if (event.key !== "Tab") {
            return;
        }

        const items = [menuToggle, ...focusableMenuItems()];
        const first = items[0];
        const last = items[items.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    themeToggle?.addEventListener("click", () => {
        const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
        setStoredTheme(nextTheme);
        applyTheme();
    });

    darkModeMedia.addEventListener("change", () => {
        if (!getStoredTheme()) {
            applyTheme();
        }
    });

    desktopMedia.addEventListener("change", (event) => {
        if (event.matches) {
            closeMenu();
        }
        requestNavbarUpdate();
    });

    window.addEventListener("scroll", requestNavbarUpdate, { passive: true });
    window.addEventListener("resize", requestNavbarUpdate, { passive: true });
    window.addEventListener("pageshow", requestNavbarUpdate);

    applyTheme();
    updateNavbar();
});
