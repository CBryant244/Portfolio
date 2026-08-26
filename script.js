(() => {
    'use strict';

    // 1. Reduced Motion Detection
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 2. Particle Constellation Canvas Animation
    const initParticles = () => {
        if (prefersReducedMotion) return;

        const canvas = document.getElementById('hero-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width, height;
        let particles = [];
        let mouse = { x: -1000, y: -1000 };

        const resize = () => {
            width = canvas.parentElement.clientWidth;
            height = canvas.parentElement.clientHeight;
            canvas.width = width;
            canvas.height = height;

            // Recalculate particle count
            const baseArea = 1920 * 1080;
            const currentArea = width * height;
            // roughly 80 on desktop, 40 on mobile
            const count = Math.max(20, Math.floor((currentArea / baseArea) * 80));
            
            particles = [];
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.6,
                    vy: (Math.random() - 0.5) * 0.6,
                    radius: Math.random() * 1.5 + 1,
                    opacity: Math.random() * 0.5 + 0.3,
                    color: i % 2 === 0 ? '#0077ff' : '#00d4ff'
                });
            }
        };

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => requestAnimationFrame(resize), 150);
        });

        // Mouse interaction
        const heroSection = canvas.closest('.hero') || canvas.parentElement;
        heroSection.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        }, { passive: true });

        heroSection.addEventListener('mouseleave', () => {
            mouse.x = -1000;
            mouse.y = -1000;
        }, { passive: true });

        resize();

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Update and draw particles
            for (let i = 0; i < particles.length; i++) {
                let p = particles[i];

                // Mouse attraction
                const dxMouse = mouse.x - p.x;
                const dyMouse = mouse.y - p.y;
                const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
                
                if (distMouse < 200) {
                    p.vx += dxMouse * 0.005;
                    p.vy += dyMouse * 0.005;
                }

                // Speed limits
                const maxSpeed = 1.5;
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (speed > maxSpeed) {
                    p.vx = (p.vx / speed) * maxSpeed;
                    p.vy = (p.vy / speed) * maxSpeed;
                }

                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.opacity;
                ctx.fill();

                // Draw connections
                for (let j = i + 1; j < particles.length; j++) {
                    let p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        const lineOpacity = (1 - dist / 150) * 0.15;
                        ctx.strokeStyle = `rgba(0, 119, 255, ${lineOpacity})`;
                        ctx.globalAlpha = 1; // Handled by strokeStyle
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
            
            ctx.globalAlpha = 1;
            requestAnimationFrame(animate);
        };

        animate();
    };

    // 3. Hero Entrance Animation
    const initHeroEntrance = () => {
        const hero = document.querySelector('.hero');
        if (hero) {
            setTimeout(() => {
                hero.classList.add('loaded');
            }, 100);
        }
    };

    // 4. Navbar Scroll State & 5. Mobile Navigation
    const initNavigation = () => {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        // Scroll state
        window.addEventListener('scroll', () => {
            if (window.scrollY > 80) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }, { passive: true });

        // Mobile toggle
        const navToggle = document.querySelector('.nav-toggle');
        const navLinks = document.querySelectorAll('.nav-links a');

        if (navToggle) {
            navToggle.addEventListener('click', () => {
                const isOpen = navbar.classList.toggle('nav-open');
                navToggle.setAttribute('aria-expanded', isOpen);
                navToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
            });
        }

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navbar.classList.contains('nav-open')) {
                    navbar.classList.remove('nav-open');
                    if (navToggle) {
                        navToggle.setAttribute('aria-expanded', 'false');
                        navToggle.setAttribute('aria-label', 'Open navigation menu');
                    }
                }
            });
        });
    };

    // 6. Scroll Spy (Active Nav Link)
    const initScrollSpy = () => {
        const sections = document.querySelectorAll('section[id], footer[id], main[id]');
        const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
        
        if (sections.length === 0 || navLinks.length === 0) return;

        const observerOptions = {
            threshold: 0.3,
            rootMargin: '-20% 0px -60% 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, observerOptions);

        sections.forEach(section => {
            observer.observe(section);
        });
    };

    // 7. Scroll Reveal
    const initScrollReveal = () => {
        const revealElements = document.querySelectorAll('.reveal');
        if (revealElements.length === 0) return;

        if (prefersReducedMotion) {
            revealElements.forEach(el => el.classList.add('visible'));
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        revealElements.forEach(el => observer.observe(el));
    };

    // 8. Modal System
    const initModals = () => {
        const modalTriggers = document.querySelectorAll('[data-modal]');
        const closeButtons = document.querySelectorAll('.modal [data-close]');
        const modals = document.querySelectorAll('.modal');

        const openModal = (id) => {
            const modal = document.getElementById(id);
            if (!modal) return;
            
            modal.classList.remove('hidden');
            // Force reflow for animation
            void modal.offsetWidth;
            modal.classList.add('is-open');
            document.body.style.overflow = 'hidden';
            
            const closeBtn = modal.querySelector('[data-close]');
            if (closeBtn) closeBtn.focus();
        };

        const closeModal = (modal) => {
            if (!modal) return;
            
            modal.classList.remove('is-open');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300); // match transition duration
            
            document.body.style.overflow = '';
        };

        modalTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = trigger.getAttribute('data-modal');
                openModal(targetId);
            });
        });

        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = btn.closest('.modal');
                closeModal(modal);
            });
        });

        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal);
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModalEl = document.querySelector('.modal.is-open');
                if (openModalEl) closeModal(openModalEl);
            }
        });
    };

    // 9. Project Filter
    const initProjectFilter = () => {
        const filterBtns = document.querySelectorAll('.filter-btn');
        const projectCards = document.querySelectorAll('.project-card');

        if (filterBtns.length === 0 || projectCards.length === 0) return;

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filterValue = btn.getAttribute('data-filter');

                projectCards.forEach(card => {
                    const category = card.getAttribute('data-category');
                    if (!category) return;

                    if (filterValue === 'all' || category.includes(filterValue)) {
                        card.classList.remove('hidden');
                    } else {
                        card.classList.add('hidden');
                    }
                });
            });
        });
    };

    // 10. Counter Animation for Hero Stats
    const initCounterAnimation = () => {
        const statsContainer = document.querySelector('.hero-stats');
        const statValues = document.querySelectorAll('.stat-value[data-target]');
        
        if (!statsContainer || statValues.length === 0) return;

        let animated = false;

        const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

        const animateStats = () => {
            if (animated || prefersReducedMotion) {
                if (prefersReducedMotion) {
                    statValues.forEach(el => {
                        el.textContent = el.getAttribute('data-target');
                    });
                }
                return;
            }
            animated = true;

            const duration = 2000;

            statValues.forEach(el => {
                const targetStr = el.getAttribute('data-target');
                const targetNum = parseFloat(targetStr.replace(/[^0-9.-]/g, ''));
                const suffix = targetStr.replace(/[0-9.-]/g, '');
                const startTime = performance.now();

                const update = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easedProgress = easeOutQuart(progress);
                    
                    const currentVal = (targetNum * easedProgress).toFixed(targetNum % 1 !== 0 ? 1 : 0);
                    
                    el.textContent = currentVal + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(update);
                    } else {
                        el.textContent = targetStr;
                    }
                };
                
                requestAnimationFrame(update);
            });
        };

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateStats();
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(statsContainer);
    };

    // Initialize all
    document.addEventListener('DOMContentLoaded', () => {
        initHeroEntrance();
        initParticles();
        initNavigation();
        initScrollSpy();
        initScrollReveal();
        initModals();
        initProjectFilter();
        initCounterAnimation();
    });

})();
