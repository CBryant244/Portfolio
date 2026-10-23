/* ==========================================================================
   Cohen Bryant — Engineering Portfolio
   Vanilla ES2020. No dependencies, no build step, no polyfills required.
   Every module is independently guarded: if its markup is absent or an API
   is missing, it returns quietly instead of breaking the rest of the page.
   ========================================================================== */

(() => {
    'use strict';

    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const html = document.documentElement;

    const onIdle = (fn) =>
        'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 800 }) : setTimeout(fn, 1);

    /* ── Orbital starfield ────────────────────────────────────────────────
       Depth-layered drift with a slow parallax response to the pointer.
       Renders at device pixel ratio, and suspends entirely whenever the
       canvas leaves the viewport or the tab loses visibility.
    ------------------------------------------------------------------------ */
    const initStarfield = () => {
        const canvas = document.querySelector('[data-stars]');
        if (!canvas || motionQuery.matches) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const LAYERS = [
            { count: 0.45, speed: 0.012, size: [0.4, 0.9], alpha: [0.25, 0.5] },
            { count: 0.35, speed: 0.026, size: [0.6, 1.3], alpha: [0.4, 0.75] },
            { count: 0.20, speed: 0.048, size: [0.9, 1.8], alpha: [0.6, 1.0] }
        ];

        let stars = [];
        let width = 0;
        let height = 0;
        let dpr = 1;
        let frame = 0;
        let running = false;
        const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

        const rand = (min, max) => min + Math.random() * (max - min);

        const build = () => {
            const rect = canvas.getBoundingClientRect();
            width = Math.max(1, Math.round(rect.width));
            height = Math.max(1, Math.round(rect.height));
            dpr = Math.min(window.devicePixelRatio || 1, 2);

            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Density scaled to area, clamped so phones and ultrawides both behave.
            const total = Math.round(Math.min(320, Math.max(70, (width * height) / 7000)));

            stars = [];
            LAYERS.forEach((layer, depth) => {
                for (let i = 0; i < total * layer.count; i++) {
                    stars.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        r: rand(layer.size[0], layer.size[1]),
                        a: rand(layer.alpha[0], layer.alpha[1]),
                        vx: -layer.speed * rand(0.7, 1.3),
                        vy: layer.speed * rand(-0.25, 0.25),
                        depth: depth + 1,
                        phase: Math.random() * Math.PI * 2,
                        twinkle: rand(0.0008, 0.0025)
                    });
                }
            });
        };

        const draw = (time) => {
            if (!running) return;

            pointer.x += (pointer.tx - pointer.x) * 0.045;
            pointer.y += (pointer.ty - pointer.y) * 0.045;

            ctx.clearRect(0, 0, width, height);

            for (const s of stars) {
                s.x += s.vx * s.depth;
                s.y += s.vy * s.depth;

                if (s.x < -2) s.x = width + 2;
                else if (s.x > width + 2) s.x = -2;
                if (s.y < -2) s.y = height + 2;
                else if (s.y > height + 2) s.y = -2;

                const px = s.x + pointer.x * s.depth * 1.6;
                const py = s.y + pointer.y * s.depth * 1.6;

                const flicker = 0.72 + 0.28 * Math.sin(time * s.twinkle + s.phase);
                ctx.globalAlpha = Math.max(0, Math.min(1, s.a * flicker));
                ctx.fillStyle = s.depth === 3 ? '#dceaff' : '#ffffff';
                ctx.beginPath();
                ctx.arc(px, py, s.r, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            frame = requestAnimationFrame(draw);
        };

        const start = () => {
            if (running) return;
            running = true;
            frame = requestAnimationFrame(draw);
        };
        const stop = () => {
            running = false;
            cancelAnimationFrame(frame);
        };

        build();

        // Pause when scrolled past, so it never burns cycles off-screen.
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(
                ([entry]) => (entry.isIntersecting && !document.hidden ? start() : stop()),
                { threshold: 0 }
            ).observe(canvas);
        } else {
            start();
        }

        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

        if ('ResizeObserver' in window) {
            let raf = 0;
            new ResizeObserver(() => {
                cancelAnimationFrame(raf);
                raf = requestAnimationFrame(build);
            }).observe(canvas);
        } else {
            addEventListener('resize', build, { passive: true });
        }

        const host = canvas.closest('.hero') || canvas;
        host.addEventListener(
            'pointermove',
            (e) => {
                if (e.pointerType !== 'mouse') return;
                const rect = host.getBoundingClientRect();
                pointer.tx = ((e.clientX - rect.left) / rect.width - 0.5) * -14;
                pointer.ty = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
            },
            { passive: true }
        );
        host.addEventListener('pointerleave', () => {
            pointer.tx = 0;
            pointer.ty = 0;
        });

        motionQuery.addEventListener('change', (e) => {
            if (e.matches) {
                stop();
                ctx.clearRect(0, 0, width, height);
            } else {
                start();
            }
        });
    };

    /* ── Scroll-linked navigation state and progress rail ─────────────── */
    const initNavState = () => {
        const nav = document.querySelector('[data-nav]');
        let ticking = false;

        const update = () => {
            const y = window.scrollY;
            if (nav) nav.classList.toggle('is-stuck', y > 24);

            const scrollable = html.scrollHeight - window.innerHeight;
            const progress = scrollable > 0 ? Math.min(1, Math.max(0, y / scrollable)) : 0;
            html.style.setProperty('--scroll-progress', progress.toFixed(4));

            ticking = false;
        };

        addEventListener(
            'scroll',
            () => {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(update);
            },
            { passive: true }
        );
        addEventListener('resize', update, { passive: true });
        update();
    };

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
        matchMedia('(min-width: 821px)').addEventListener('change', (e) => {
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

    /* ── Scroll reveal, with per-group stagger ────────────────────────── */
    const initReveal = () => {
        const items = [...document.querySelectorAll('[data-anim]')];
        if (!items.length) return;

        if (motionQuery.matches || !('IntersectionObserver' in window)) return;

        const vh = window.innerHeight || 800;

        // Only apply entrance animation to elements well below the initial fold
        const belowFold = items.filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.top > vh * 0.9;
        });

        belowFold.forEach((el) => {
            const siblings = [...el.parentElement.children].filter((n) => n.hasAttribute('data-anim'));
            const index = siblings.indexOf(el);
            if (index > 0) el.style.setProperty('--anim-delay', `${Math.min(index * 70, 280)}ms`);
            el.classList.add('anim-ready');
        });

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-in');
                    obs.unobserve(entry.target);
                });
            },
            { threshold: 0, rootMargin: '0px 0px 80px 0px' }
        );

        belowFold.forEach((el) => observer.observe(el));
    };

    /* ── Statistic counters ───────────────────────────────────────────── */
    const initCounters = () => {
        const counters = [...document.querySelectorAll('[data-count]')];
        if (!counters.length) return;

        const render = (el, value) => {
            const pad = Number(el.dataset.pad || 0);
            el.textContent = String(Math.round(value)).padStart(pad, '0');
        };

        if (motionQuery.matches || !('IntersectionObserver' in window)) {
            counters.forEach((el) => render(el, Number(el.dataset.count)));
            return;
        }

        const run = (el) => {
            const target = Number(el.dataset.count) || 0;
            const duration = 1400;
            const started = performance.now();

            const step = (now) => {
                const t = Math.min(1, (now - started) / duration);
                const eased = 1 - Math.pow(1 - t, 4);
                render(el, target * eased);
                if (t < 1) requestAnimationFrame(step);
                else render(el, target);
            };

            render(el, 0);
            requestAnimationFrame(step);
        };

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    run(entry.target);
                    obs.unobserve(entry.target);
                });
            },
            { threshold: 0.6 }
        );

        counters.forEach((el) => observer.observe(el));
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
                    if (iframeContainer) iframeContainer.classList.add('is-active');
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
                if (isMatch) {
                    link.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                }
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
        window.addEventListener('scroll', updateActive, { passive: true });
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
        safely('reveal', initReveal);
        safely('navState', initNavState);
        safely('navMenu', initNavMenu);
        safely('counters', initCounters);
        safely('filters', initFilters);
        safely('dialogs', initDialogs);
        safely('year', initYear);
        safely('docViewer', initDocViewer);
        safely('caseSubnav', initCaseSubnav);

        // Deferred so neither competes with first paint.
        onIdle(() => safely('starfield', initStarfield));
        onIdle(() => safely('scrollSpy', initScrollSpy));
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
