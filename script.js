// ===== PAGE LOADER ===== 
window.addEventListener('load', function() {
    const loader = document.getElementById('pageLoader');
    // Quick fade out
    setTimeout(() => {
        loader.classList.add('loaded');
    }, 100);
});

// ===== SMOOTH SCROLL & NAVBAR ===== 
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.querySelector('.navbar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.querySelector('.nav-links');
    
    // Navbar scroll effect
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80; // Navbar height
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
    }
    
    // ===== LOGO CLICK - SCROLL TO TOP =====
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        // Add pointer cursor to show it's clickable
        logo.style.cursor = 'pointer';
    }
    
    // ===== SMOOTH MOUSE-TRACKING TITLE ANIMATION =====
    const heroTitle = document.getElementById('heroTitle');
    const titleLines = document.querySelectorAll('.title-line');
    
    if (heroTitle && titleLines.length > 0) {
        let animationFrame;
        
        heroTitle.addEventListener('mousemove', (e) => {
            // Cancel previous animation frame for smooth performance
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
            
            animationFrame = requestAnimationFrame(() => {
                const rect = heroTitle.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Calculate rotation angles based on mouse position
                const rotateX = ((y - centerY) / centerY) * -8; // Max 8deg
                const rotateY = ((x - centerX) / centerX) * 8;  // Max 8deg
                
                titleLines.forEach((line, index) => {
                    // Stagger the effect for each line
                    const intensity = 1 - (index * 0.15); // Each line less intense
                    
                    line.style.transform = `
                        perspective(1000px)
                        rotateX(${rotateX * intensity}deg)
                        rotateY(${rotateY * intensity}deg)
                        translateZ(${15 * intensity}px)
                    `;
                });
            });
        });
        
        // Smooth reset on mouse leave
        heroTitle.addEventListener('mouseleave', () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
            
            titleLines.forEach((line) => {
                line.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
            });
        });
        
        // Add individual line hover effect with smooth transitions
        titleLines.forEach((line) => {
            line.addEventListener('mouseenter', function() {
                this.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            });
            
            line.addEventListener('mouseleave', function() {
                this.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
            });
        });
    }
});

// Removed particle effects for cleaner design

// ===== SCROLL REVEAL ANIMATION =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for scroll animations
document.addEventListener('DOMContentLoaded', () => {
    const animateElements = document.querySelectorAll('.feature-card, .method, .point');
    
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease-out';
        observer.observe(el);
    });
});

// ===== PARALLAX EFFECT FOR GRADIENT ORBS =====
document.addEventListener('mousemove', (e) => {
    const orbs = document.querySelectorAll('.gradient-orb');
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    orbs.forEach((orb, index) => {
        const speed = (index + 1) * 20;
        const x = (mouseX * speed) - (speed / 2);
        const y = (mouseY * speed) - (speed / 2);
        
        orb.style.transform = `translate(${x}px, ${y}px)`;
    });
});

// ===== SMOKE PARTICLES EFFECT =====
function createSmokeParticles() {
    const smokeContainer = document.createElement('div');
    smokeContainer.className = 'smoke-container';
    document.body.appendChild(smokeContainer);
    
    // Create multiple smoke particles with variety - MORE VISIBLE
    for (let i = 0; i < 40; i++) {
        setTimeout(() => {
            createSmokeParticle(smokeContainer);
        }, i * 400);
    }
    
    // Continuously add new particles - FASTER
    setInterval(() => {
        createSmokeParticle(smokeContainer);
    }, 1800);
}

function createSmokeParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'smoke-particle';
    
    const size = Math.random() * 300 + 250;
    const left = Math.random() * 100;
    const duration = Math.random() * 18 + 25;
    const delay = Math.random() * 1;
    const drift = (Math.random() - 0.5) * 500;
    const opacity = Math.random() * 0.6 + 0.5; // EVEN MORE VISIBLE
    
    particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${left}%;
        bottom: -${size}px;
        animation: smoke-rise ${duration}s ease-out ${delay}s;
        --drift: ${drift}px;
        opacity: ${opacity};
    `;
    
    container.appendChild(particle);
    
    setTimeout(() => {
        particle.remove();
    }, (duration + delay) * 1000);
}

// Initialize smoke on load
document.addEventListener('DOMContentLoaded', createSmokeParticles);

// ===== CONTACT FORM HANDLING =====
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="spinner">
                <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                <path d="M10 2a8 8 0 018 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>Sending...</span>
        `;
        submitBtn.disabled = true;
        
        // Add spinner animation
        const spinnerStyle = document.createElement('style');
        spinnerStyle.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .spinner {
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(spinnerStyle);
        
        // Simulate form submission (replace with actual API call)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Success state
        submitBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
            </svg>
            <span>Message Sent!</span>
        `;
        
        // Reset form
        contactForm.reset();
        
        // Reset button after 3 seconds
        setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }, 3000);
    });
}

// ===== COUNTER ANIMATION FOR STATS =====
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = formatNumber(target);
            clearInterval(timer);
        } else {
            element.textContent = formatNumber(Math.floor(current));
        }
    }, 16);
}

function formatNumber(num) {
    if (num >= 10000) {
        return (num / 1000).toFixed(0) + 'K+';
    }
    return num.toString();
}

// Animate stats when they come into view
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
            entry.target.classList.add('animated');
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            
            statNumbers.forEach(stat => {
                const text = stat.textContent;
                if (text.includes('K')) {
                    const number = parseFloat(text.replace('K+', '')) * 1000;
                    animateCounter(stat, number);
                } else if (text.includes('%')) {
                    const number = parseFloat(text.replace('%', ''));
                    let current = 0;
                    const timer = setInterval(() => {
                        current += 0.5;
                        if (current >= number) {
                            stat.textContent = number + '%';
                            clearInterval(timer);
                        } else {
                            stat.textContent = current.toFixed(1) + '%';
                        }
                    }, 16);
                }
            });
        }
    });
}, { threshold: 0.5 });

document.addEventListener('DOMContentLoaded', () => {
    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
        statsObserver.observe(heroStats);
    }
});

// ===== BUTTON HOVER RIPPLE EFFECT =====
document.querySelectorAll('.btn-primary, .btn-secondary, .btn-large').forEach(button => {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            animation: ripple 0.6s ease-out;
        `;
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// Add ripple animation CSS
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple {
        from {
            transform: scale(0);
            opacity: 1;
        }
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

// ===== FEATURE CARD TILT EFFECT =====
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});

// ===== LOGO ICON INTERACTION =====
const logoIcon = document.querySelector('.logo-icon');
if (logoIcon) {
    logoIcon.addEventListener('mouseenter', () => {
        logoIcon.style.animation = 'none';
        setTimeout(() => {
            logoIcon.style.animation = 'spin 1s ease-in-out, float 3s ease-in-out infinite';
        }, 10);
    });
}

const spinAnimation = document.createElement('style');
spinAnimation.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(spinAnimation);

// ===== SCROLL PROGRESS INDICATOR =====
const progressBar = document.createElement('div');
progressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, #4a7c3b, #6b9a5b, #8ba888);
    z-index: 10000;
    transition: width 0.1s ease;
`;
document.body.appendChild(progressBar);

window.addEventListener('scroll', () => {
    const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (window.pageYOffset / windowHeight) * 100;
    progressBar.style.width = scrolled + '%';
});

// ===== TYPING EFFECT FOR HERO TITLE (Optional Enhancement) =====
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.textContent = '';
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// ===== CANNABIS LEAF DECORATIONS =====
function addCannabisDecorations() {
    const cannabisLeafSVG = `
        <svg viewBox="0 0 50 50" fill="currentColor">
            <path d="M25 5 C23 8, 22 12, 22 15 L22 20 C20 18, 18 16, 15 14 C12 12, 10 11, 8 11 C10 13, 12 15, 13 18 C14 20, 14 22, 14 25 L14 25 C12 24, 10 23, 8 22 C6 21, 4 20, 2 20 C4 22, 6 24, 7 26 C8 28, 9 30, 10 32 L10 32 C15 28, 20 26, 25 25 L25 40 L25 25 C30 26, 35 28, 40 32 L40 32 C41 30, 42 28, 43 26 C44 24, 46 22, 48 20 C46 20, 44 21, 42 22 C40 23, 38 24, 36 25 L36 25 C36 22, 36 20, 37 18 C38 15, 40 13, 42 11 C40 11, 38 12, 35 14 C32 16, 30 18, 28 20 L28 15 C28 12, 27 8, 25 5 Z"/>
        </svg>
    `;
    
    // Cannabis leaf decorations - spread across the entire page
    const positions = [
        // Top section
        { top: '5%', left: '2%', size: '80px', rotation: 15, opacity: 0.12 },
        { top: '8%', left: '12%', size: '60px', rotation: -35, opacity: 0.1 },
        { top: '10%', right: '3%', size: '70px', rotation: 25, opacity: 0.13 },
        { top: '15%', right: '15%', size: '55px', rotation: -45, opacity: 0.11 },
        { top: '20%', left: '8%', size: '65px', rotation: 60, opacity: 0.12 },
        { top: '25%', right: '8%', size: '75px', rotation: -20, opacity: 0.14 },
        
        // Middle section
        { top: '35%', left: '5%', size: '85px', rotation: 40, opacity: 0.13 },
        { top: '38%', left: '18%', size: '50px', rotation: -55, opacity: 0.1 },
        { top: '42%', right: '6%', size: '70px', rotation: 30, opacity: 0.12 },
        { top: '45%', right: '20%', size: '58px', rotation: -40, opacity: 0.11 },
        { top: '50%', left: '3%', size: '65px', rotation: 70, opacity: 0.13 },
        { top: '52%', left: '25%', size: '52px', rotation: -25, opacity: 0.1 },
        { top: '55%', right: '4%', size: '78px', rotation: 15, opacity: 0.14 },
        
        // Bottom section
        { bottom: '5%', left: '4%', size: '90px', rotation: 50, opacity: 0.13 },
        { bottom: '8%', left: '20%', size: '58px', rotation: -30, opacity: 0.12 },
        { bottom: '12%', right: '3%', size: '75px', rotation: 45, opacity: 0.13 },
        { bottom: '15%', right: '18%', size: '62px', rotation: -50, opacity: 0.11 },
        { bottom: '20%', left: '10%', size: '70px', rotation: 35, opacity: 0.12 },
        { bottom: '25%', right: '10%', size: '82px', rotation: -15, opacity: 0.14 },
        { bottom: '30%', left: '15%', size: '55px', rotation: 65, opacity: 0.1 },
        { bottom: '35%', right: '25%', size: '65px', rotation: -40, opacity: 0.12 }
    ];
    
    positions.forEach(pos => {
        const decoration = document.createElement('div');
        decoration.className = 'cannabis-decoration';
        decoration.innerHTML = cannabisLeafSVG;
        decoration.style.cssText = `
            ${pos.top ? `top: ${pos.top};` : ''}
            ${pos.bottom ? `bottom: ${pos.bottom};` : ''}
            ${pos.left ? `left: ${pos.left};` : ''}
            ${pos.right ? `right: ${pos.right};` : ''}
            width: ${pos.size};
            height: ${pos.size};
            transform: rotate(${pos.rotation}deg);
            opacity: ${pos.opacity};
        `;
        document.body.appendChild(decoration);
    });
}

// ===== FLOATING LEAF PARTICLES =====
function createFloatingLeaves() {
    const leafContainer = document.createElement('div');
    leafContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        overflow: hidden;
    `;
    document.body.appendChild(leafContainer);
    
    // Create initial leaves - moderate amount
    for (let i = 0; i < 20; i++) {
        setTimeout(() => createFloatingLeaf(leafContainer), i * 1200);
    }
    
    // Keep adding new leaves continuously
    setInterval(() => createFloatingLeaf(leafContainer), 5000);
}

function createFloatingLeaf(container) {
    const leaf = document.createElement('div');
    const leafSVG = `
        <svg viewBox="0 0 50 50" fill="currentColor" style="fill: rgba(74, 124, 59, 0.35); filter: drop-shadow(0 0 8px rgba(74, 124, 59, 0.3));">
            <path d="M25 5 C23 8, 22 12, 22 15 L22 20 C20 18, 18 16, 15 14 C12 12, 10 11, 8 11 C10 13, 12 15, 13 18 C14 20, 14 22, 14 25 L14 25 C12 24, 10 23, 8 22 C6 21, 4 20, 2 20 C4 22, 6 24, 7 26 C8 28, 9 30, 10 32 L10 32 C15 28, 20 26, 25 25 L25 40 L25 25 C30 26, 35 28, 40 32 L40 32 C41 30, 42 28, 43 26 C44 24, 46 22, 48 20 C46 20, 44 21, 42 22 C40 23, 38 24, 36 25 L36 25 C36 22, 36 20, 37 18 C38 15, 40 13, 42 11 C40 11, 38 12, 35 14 C32 16, 30 18, 28 20 L28 15 C28 12, 27 8, 25 5 Z"/>
        </svg>
    `;
    
    leaf.innerHTML = leafSVG;
    
    const size = Math.random() * 35 + 25;
    const left = Math.random() * 100;
    const duration = Math.random() * 15 + 20;
    const rotation = Math.random() * 360;
    const drift = (Math.random() - 0.5) * 250;
    
    leaf.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${left}%;
        top: -${size}px;
        transform: rotate(${rotation}deg);
        animation: leaf-fall ${duration}s linear;
        pointer-events: none;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes leaf-fall {
            0% {
                transform: translateY(0) translateX(0) rotate(${rotation}deg);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translateY(100vh) translateX(${drift}px) rotate(${rotation + 360}deg);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    container.appendChild(leaf);
    
    setTimeout(() => {
        leaf.remove();
        style.remove();
    }, duration * 1000);
}

// Initialize decorations and floating leaves on load
document.addEventListener('DOMContentLoaded', () => {
    addCannabisDecorations();
    createFloatingLeaves();
});

// ===== CONSOLE EASTER EGG =====
console.log('%c🌿 Peddler ', 'color: #4a7c3b; font-size: 24px; font-weight: bold;');
console.log('%cCultivating Excellence, Naturally', 'color: #6b9a5b; font-size: 14px;');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4a7c3b;');
console.log('%cInterested in what we do? Get in touch!', 'color: #c4d4bd; font-size: 12px;');

// ===== PERFORMANCE OPTIMIZATION =====
// Lazy load images when implemented
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ===== ACCESSIBILITY ENHANCEMENTS =====
// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
    }
});

document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
});

const a11yStyle = document.createElement('style');
a11yStyle.textContent = `
    .keyboard-navigation *:focus {
        outline: 2px solid var(--primary);
        outline-offset: 4px;
    }
    
    @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
    }
`;
document.head.appendChild(a11yStyle);

// ===== TERMINAL TYPING ANIMATION =====
function typeText(element, text, speed = 50) {
    return new Promise((resolve) => {
        let index = 0;
        element.textContent = '';
        
        const interval = setInterval(() => {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
            } else {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
}

// Initialize terminal typing animation when terminal is in viewport
const terminalObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const typedElements = entry.target.querySelectorAll('.typed-text');
            let hasTyped = entry.target.dataset.hasTyped;
            
            if (!hasTyped && typedElements.length > 0) {
                entry.target.dataset.hasTyped = 'true';
                
                // Type each command sequentially
                let delay = 0;
                typedElements.forEach((element, index) => {
                    const text = element.dataset.text || element.textContent;
                    element.textContent = '';
                    
                    setTimeout(() => {
                        typeText(element, text, 60);
                    }, delay);
                    
                    // Increase delay for next command
                    delay += (text.length * 60) + 500;
                });
            }
        }
    });
}, { threshold: 0.3 });

const terminalBody = document.getElementById('terminalBody');
if (terminalBody) {
    terminalObserver.observe(terminalBody);
}

// ===== EMAIL REVEAL ANIMATION =====
const emailRevealContainer = document.getElementById('emailReveal');
const emailValue = document.querySelector('.email-value');

if (emailRevealContainer && emailValue) {
    emailRevealContainer.addEventListener('click', function() {
        if (emailValue.classList.contains('blurred')) {
            // Reveal the email
            emailValue.classList.remove('blurred');
            
            // After revealing, make it clickable as a mailto link
            setTimeout(() => {
                const email = emailValue.dataset.email;
                const emailLink = document.createElement('a');
                emailLink.href = `mailto:${email}`;
                emailLink.style.color = 'inherit';
                emailLink.style.textDecoration = 'none';
                emailLink.innerHTML = emailValue.innerHTML;
                
                // Replace the email value with the link
                emailValue.innerHTML = '';
                emailValue.appendChild(emailLink);
            }, 600); // Wait for the reveal animation to complete
        }
    });
    
    // Add visual feedback on hover when blurred
    emailRevealContainer.addEventListener('mouseenter', function() {
        if (emailValue.classList.contains('blurred')) {
            emailRevealContainer.style.cursor = 'pointer';
        }
    });
}

// ===== BLOG DROPDOWN =====
const blogDropdownBtn = document.getElementById('blogDropdownBtn');
const blogDropdownMenu = document.getElementById('blogDropdownMenu');

if (blogDropdownBtn && blogDropdownMenu) {
    // Toggle dropdown on button click
    blogDropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = blogDropdownMenu.classList.toggle('show');
        blogDropdownBtn.classList.toggle('active', isOpen);
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!blogDropdownBtn.contains(e.target) && !blogDropdownMenu.contains(e.target)) {
            blogDropdownMenu.classList.remove('show');
            blogDropdownBtn.classList.remove('active');
        }
    });
    
    // Prevent dropdown from closing when clicking inside it
    blogDropdownMenu.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// ===== WATCH DEMO COUNTER =====
// Tracking system:
// - Global counter stored in 'demoWatchCount' (shared across all users on this browser)
// - User click status stored in 'userDemoClicked' (prevents multiple clicks permanently)
// - Uses localStorage so data persists even after closing browser
// - Each user can only click once per browser/device
// - Starts at 0

const watchDemoBtn = document.getElementById('watchDemoBtn');
const demoCounter = document.getElementById('demoCounter');
const counterValue = document.getElementById('counterValue');

// One-time reset to 0 (check version to force reset for existing users)
const counterVersion = localStorage.getItem('counterVersion');
if (counterVersion !== '2.0') {
    localStorage.setItem('demoWatchCount', '0');
    localStorage.setItem('counterVersion', '2.0');
    localStorage.removeItem('userDemoClicked'); // Also reset user click status
}

// Initialize counter from localStorage or start at 0
let demoCount = parseInt(localStorage.getItem('demoWatchCount')) || 0;

// Display initial count
if (counterValue) {
    counterValue.textContent = demoCount.toLocaleString();
    demoCounter.style.display = 'flex'; // Show counter immediately
}

// Handle Watch Demo button click
if (watchDemoBtn && demoCounter && counterValue) {
    // Check if user already clicked before
    const hasClickedBefore = localStorage.getItem('userDemoClicked');
    
    // If user already clicked, update button text on load
    if (hasClickedBefore) {
        watchDemoBtn.querySelector('span').textContent = 'Already Registered ✓';
        watchDemoBtn.style.opacity = '0.7';
    }
    
    watchDemoBtn.addEventListener('click', function() {
        // Check if user already clicked (using localStorage - permanent)
        const hasClicked = localStorage.getItem('userDemoClicked');
        
        if (!hasClicked) {
            // Increment counter
            demoCount++;
            
            // Save to localStorage
            localStorage.setItem('demoWatchCount', demoCount);
            
            // Mark this user as clicked permanently in localStorage
            localStorage.setItem('userDemoClicked', 'true');
            
            // Animate the counter update
            counterValue.classList.add('counter-update');
            
            // Update the displayed number with animation
            animateCounter(parseInt(counterValue.textContent.replace(/,/g, '')), demoCount);
            
            // Remove animation class after animation completes
            setTimeout(() => {
                counterValue.classList.remove('counter-update');
            }, 600);
            
            // Add a celebration effect
            createConfetti();
            
            // Show thank you message
            const originalText = watchDemoBtn.querySelector('span').textContent;
            watchDemoBtn.querySelector('span').textContent = 'Thanks! Coming Soon';
            watchDemoBtn.classList.add('btn-clicked');
            
            setTimeout(() => {
                watchDemoBtn.querySelector('span').textContent = originalText;
                watchDemoBtn.classList.remove('btn-clicked');
            }, 3000);
        } else {
            // User already clicked before (permanent) - show persistent message
            const currentText = watchDemoBtn.querySelector('span').textContent;
            watchDemoBtn.querySelector('span').textContent = 'Already Registered!';
            
            // Flash effect
            watchDemoBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                watchDemoBtn.style.transform = 'scale(1)';
                // Revert to persistent registered state
                watchDemoBtn.querySelector('span').textContent = 'Already Registered ✓';
            }, 500);
        }
    });
}

// Animate counter with counting effect
function animateCounter(start, end) {
    const duration = 500; // 500ms animation
    const range = end - start;
    const increment = range / (duration / 16); // 60fps
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        counterValue.textContent = Math.floor(current).toLocaleString();
    }, 16);
}

// Create confetti effect
function createConfetti() {
    const colors = ['#4a7c3b', '#6b9a5b', '#8ba888', '#a0bf8f'];
    const confettiCount = 30;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = watchDemoBtn.offsetLeft + watchDemoBtn.offsetWidth / 2 + 'px';
        confetti.style.top = watchDemoBtn.offsetTop + watchDemoBtn.offsetHeight / 2 + 'px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.setProperty('--tx', (Math.random() - 0.5) * 400 + 'px');
        confetti.style.setProperty('--ty', (Math.random() - 0.5) * 400 - 100 + 'px');
        confetti.style.setProperty('--rotate', Math.random() * 720 + 'deg');
        confetti.style.animationDelay = (Math.random() * 0.1) + 's';
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 1000);
    }
}
