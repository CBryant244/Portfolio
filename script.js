/* ==========================================================================
   Cohen Bryant — Engineering Portfolio
   Vanilla ES2020. No dependencies, no build step, no polyfills required.
   Every module is independently guarded: if its markup is absent or an API
   is missing, it returns quietly instead of breaking the rest of the page.
   ========================================================================== */

(() => {
    'use strict';

    const html = document.documentElement;

    const onIdle = (fn) =>
        'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 800 }) : setTimeout(fn, 1);

    /* ── Mobile navigation ────────────────────────────────────────────── */
    const initNavMenu = () => {
        const nav = document.querySelector('[data-nav]');
        const toggle = document.querySelector('[data-nav-toggle]');
        const panel = document.getElementById('primary-nav');
        if (!nav || !toggle || !panel) return;

        const label = toggle.querySelector('.sr-only');

        const setOpen = (open) => {
            nav.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            if (label) label.textContent = open ? 'Close navigation' : 'Open navigation';
        };

        toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));

        panel.addEventListener('click', (e) => {
            if (e.target.closest('a')) setOpen(false);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('is-open')) {
                setOpen(false);
                toggle.focus();
            }
        });

        document.addEventListener('click', (e) => {
            if (nav.classList.contains('is-open') && !nav.contains(e.target)) setOpen(false);
        });

        // Collapse if the viewport grows past the mobile breakpoint while open.
        matchMedia('(min-width: 1081px)').addEventListener('change', (e) => {
            if (e.matches) setOpen(false);
        });
    };

    /* ── Active-section highlighting ──────────────────────────────────── */
    const initScrollSpy = () => {
        if (!('IntersectionObserver' in window)) return;

        const links = [...document.querySelectorAll('.nav-list a[href^="#"]')].filter(
            (a) => a.getAttribute('href').length > 1
        );
        if (!links.length) return;

        const targets = links
            .map((link) => document.querySelector(link.getAttribute('href')))
            .filter(Boolean);
        if (!targets.length) return;

        const visible = new Set();

        const paint = () => {
            let best = null;
            let bestTop = Infinity;

            visible.forEach((el) => {
                const top = Math.abs(el.getBoundingClientRect().top);
                if (top < bestTop) {
                    bestTop = top;
                    best = el;
                }
            });

            links.forEach((link) =>
                link.classList.toggle('is-current', !!best && link.getAttribute('href') === `#${best.id}`)
            );
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) =>
                    entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)
                );
                paint();
            },
            { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
        );

        targets.forEach((el) => observer.observe(el));
    };

    /* ── Project filtering ───────────────────────────────────────────── */
    const initFilters = () => {
        const buttons = [...document.querySelectorAll('[data-filter]')];
        const grid = document.querySelector('[data-work-grid]');
        if (!buttons.length || !grid) return;

        const cards = [...grid.querySelectorAll('[data-tags]')];
        const status = document.querySelector('[data-filter-status]');
        const empty = document.querySelector('[data-work-empty]');

        const apply = (filter) => {
            let shown = 0;

            cards.forEach((card) => {
                const tags = (card.dataset.tags || '').split(/\s+/);
                const match = filter === 'all' || tags.includes(filter);
                card.hidden = !match;
                if (match) shown++;
            });

            buttons.forEach((btn) => {
                const active = btn.dataset.filter === filter;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-pressed', String(active));
            });

            if (empty) empty.hidden = shown > 0;

            if (status) {
                const noun = shown === 1 ? 'project' : 'projects';
                status.textContent =
                    filter === 'all'
                        ? `Showing all ${shown} ${noun}`
                        : `Showing ${shown} ${filter} ${noun}`;
            }
        };

        buttons.forEach((btn) => btn.addEventListener('click', () => apply(btn.dataset.filter)));
    };

    /* ── Case-note dialogs ───────────────────────────────────────────────
       Native <dialog> supplies the focus trap, Escape handling, top-layer
       stacking, and focus restoration. We add backdrop dismissal, scroll
       locking, and a graceful path for engines without showModal().
    ------------------------------------------------------------------------ */
    const initDialogs = () => {
        const triggers = [...document.querySelectorAll('[data-open]')];
        if (!triggers.length) return;

        const lock = (on) => {
            if (on) {
                const gap = window.innerWidth - html.clientWidth;
                if (gap > 0) html.style.setProperty('scrollbar-gutter', 'stable');
                html.style.overflow = 'hidden';
            } else {
                html.style.overflow = '';
                html.style.removeProperty('scrollbar-gutter');
            }
        };

        const open = (dialog) => {
            if (typeof dialog.showModal === 'function') dialog.showModal();
            else dialog.setAttribute('open', '');
            lock(true);
        };

        const close = (dialog) => {
            if (typeof dialog.close === 'function') dialog.close();
            else dialog.removeAttribute('open');
            lock(false);
        };

        triggers.forEach((trigger) => {
            const dialog = document.getElementById(trigger.dataset.open);
            if (!dialog) return;
            trigger.addEventListener('click', () => open(dialog));
        });

        document.querySelectorAll('dialog').forEach((dialog) => {
            dialog.addEventListener('close', () => lock(false));

            dialog.querySelectorAll('[data-close]').forEach((btn) =>
                btn.addEventListener('click', () => close(dialog))
            );

            // A click landing on the dialog element itself is a backdrop click.
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) close(dialog);
            });
        });
    };

    /* ── Footer year ─────────────────────────────────────────────────── */
    const initYear = () => {
        const slot = document.querySelector('[data-year]');
        if (slot) slot.textContent = String(new Date().getFullYear());
    };

    /* ── Document viewer view switcher ────────────────────────────────── */
    const initDocViewer = () => {
        const viewer = document.querySelector('[data-doc-viewer]');
        if (!viewer) return;

        const toggleBtns = [...viewer.querySelectorAll('[data-doc-view]')];
        const pagesContainer = viewer.querySelector('[data-doc-pages]');
        const iframeContainer = viewer.querySelector('[data-doc-iframe-wrap]');

        toggleBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.docView;
                toggleBtns.forEach((b) => {
                    const active = b === btn;
                    b.classList.toggle('is-active', active);
                    b.setAttribute('aria-pressed', String(active));
                });

                if (mode === 'iframe') {
                    if (pagesContainer) pagesContainer.style.display = 'none';
                    if (iframeContainer) {
                        const frame = iframeContainer.querySelector('iframe');
                        if (frame && !frame.hasAttribute('src')) frame.src = frame.dataset.src;
                        iframeContainer.classList.add('is-active');
                    }
                } else {
                    if (pagesContainer) pagesContainer.style.display = 'flex';
                    if (iframeContainer) iframeContainer.classList.remove('is-active');
                }
            });
        });

        // Fullscreen support
        const fsBtn = viewer.querySelector('[data-doc-fullscreen]');
        if (fsBtn) {
            fsBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    if (viewer.requestFullscreen) viewer.requestFullscreen();
                    else if (viewer.webkitRequestFullscreen) viewer.webkitRequestFullscreen();
                } else {
                    if (document.exitFullscreen) document.exitFullscreen();
                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                }
            });
        }
    };

    /* ── Case Study Section Subnav Spy ─────────────────────────────────── */
    const initCaseSubnav = () => {
        const subnav = document.querySelector('[data-case-subnav]');
        if (!subnav || !('IntersectionObserver' in window)) return;

        const links = [...subnav.querySelectorAll('.case-subnav-link')];
        if (!links.length) return;

        const sections = links
            .map((link) => document.querySelector(link.getAttribute('href')))
            .filter(Boolean);
        if (!sections.length) return;

        const visibleSections = new Set();

        const updateActive = () => {
            let activeEl = null;
            let minDistance = Infinity;

            visibleSections.forEach((el) => {
                const dist = Math.abs(el.getBoundingClientRect().top - 120);
                if (dist < minDistance) {
                    minDistance = dist;
                    activeEl = el;
                }
            });

            if (!activeEl && sections.length) {
                const scrollY = window.scrollY;
                for (let i = sections.length - 1; i >= 0; i--) {
                    if (sections[i].offsetTop - 140 <= scrollY) {
                        activeEl = sections[i];
                        break;
                    }
                }
            }

            links.forEach((link) => {
                const isMatch = activeEl && link.getAttribute('href') === `#${activeEl.id}`;
                link.classList.toggle('is-active', isMatch);
                if (isMatch) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) visibleSections.add(entry.target);
                    else visibleSections.delete(entry.target);
                });
                updateActive();
            },
            { rootMargin: '-10% 0px -50% 0px', threshold: 0 }
        );

        sections.forEach((sec) => observer.observe(sec));
    };

    /* ── Boot ────────────────────────────────────────────────────────────
       Each module is isolated: if one throws on an engine that lacks an API
       it depends on, the remaining features still initialize.
    ------------------------------------------------------------------------ */
    const safely = (name, fn) => {
        try {
            fn();
        } catch (error) {
            console.warn(`[portfolio] ${name} failed to initialize:`, error);
        }
    };

    const boot = () => {
        safely('navMenu', initNavMenu);
        safely('filters', initFilters);
        safely('dialogs', initDialogs);
        safely('year', initYear);
        safely('docViewer', initDocViewer);
        safely('caseSubnav', initCaseSubnav);

        // Deferred so neither competes with first paint.
        onIdle(() => safely('scrollSpy', initScrollSpy));
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
