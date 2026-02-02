// Tools data
const tools = [
    {
        path: 'snake',
        faName: 'مار',
        enName: 'Snake Game',
        faDesc: 'بازی کلاسیک مار',
        enDesc: 'Classic snake game',
        icon: '🐍'
    },
    {
        path: 'tic_tac_toe',
        faName: 'دوز',
        enName: 'Tic Tac Toe',
        faDesc: 'بازی دوز کلاسیک',
        enDesc: 'Classic tic tac toe game',
        icon: '⭕❌'
    },
    {
        path: 'memory_card',
        faName: 'حافظه کارتی',
        enName: 'Memory Card',
        faDesc: 'بازی پیدا کردن کارت‌های مشابه',
        enDesc: 'Find matching cards game',
        icon: '🃏'
    },
];

// Sort tools alphabetically by Persian name
tools.sort((a, b) => a.faName.localeCompare(b.faName, 'fa'));

let filteredTools = [...tools];

// Render tools list
function renderTools() {
    const toolsList = document.getElementById('toolsList');
    const noResults = document.getElementById('noResults');

    if (filteredTools.length === 0) {
        toolsList.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }

    noResults.classList.add('hidden');

    toolsList.innerHTML = filteredTools.map(tool => `
        <li>
            <a class="link" href="/${tool.path}/">
                <div class="icon">${tool.icon}</div>
                <div class="content">
                    <div class="lang-section fa">
                        <div class="name">${tool.faName}</div>
                        <div class="desc">${tool.faDesc}</div>
                    </div>
                    <div class="lang-section en">
                        <div class="name">${tool.enName}</div>
                        <div class="desc">${tool.enDesc}</div>
                    </div>
                </div>
            </a>
        </li>
    `).join('');

    updateStats();
}

// Update statistics
function updateStats() {
    const totalCount = document.getElementById('totalCount');
    const filteredInfo = document.getElementById('filteredInfo');

    totalCount.textContent = tools.length;

    if (filteredTools.length < tools.length) {
        filteredInfo.textContent = `نمایش ${filteredTools.length} مورد`;
    } else {
        filteredInfo.textContent = '';
    }
}

// Search functionality
function handleSearch(query) {
    const q = query.toLowerCase().trim();

    if (!q) {
        filteredTools = [...tools];
    } else {
        filteredTools = tools.filter(tool =>
            tool.faName.toLowerCase().includes(q) ||
            tool.enName.toLowerCase().includes(q) ||
            tool.faDesc.toLowerCase().includes(q) ||
            tool.enDesc.toLowerCase().includes(q) ||
            tool.path.toLowerCase().includes(q)
        );
    }

    renderTools();
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', (e) => {
    handleSearch(e.target.value);
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});

// Initial render
renderTools();

// Theme management
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const body = document.body;

// Load saved theme or use system preference
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = prefersDark ? 'dark' : 'light';
        body.setAttribute('data-theme', theme);
        updateThemeIcon(theme);
    }
}

// Update theme icon based on current theme
function updateThemeIcon(theme) {
    themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// Toggle theme
function toggleTheme() {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

// Event listeners for theme
themeToggle.addEventListener('click', toggleTheme);

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        const theme = e.matches ? 'dark' : 'light';
        body.setAttribute('data-theme', theme);
        updateThemeIcon(theme);
    }
});

// Initialize theme
loadTheme();

// PWA Install Prompt
let deferredPrompt;
const installPromptDismissed = localStorage.getItem('installPromptDismissed');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (!installPromptDismissed) {
        showInstallPrompt();
    }
});

function showInstallPrompt() {
    const prompt = document.createElement('div');
    prompt.className = 'install-prompt';
    prompt.innerHTML = `
        <div class="install-prompt-text">
            <div class="install-prompt-title">📱 نصب اپلیکیشن</div>
        </div>
        <button class="install-btn" id="installBtn">نصب</button>
        <button class="close-install" id="closeInstall">✕</button>
    `;
    document.body.appendChild(prompt);

    document.getElementById('installBtn').addEventListener('click', async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const {outcome} = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }

        deferredPrompt = null;
        prompt.remove();
    });

    document.getElementById('closeInstall').addEventListener('click', () => {
        localStorage.setItem('installPromptDismissed', 'true');
        prompt.remove();
    });
}

// Register Service Worker
if ('serviceWorker' in navigator) {
    let newWorker;

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered:', registration);

                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60000); // Check every minute

                // Listen for waiting worker
                registration.addEventListener('updatefound', () => {
                    newWorker = registration.installing;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker is ready
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch(err => {
                console.log('SW registration failed:', err);
            });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SW_UPDATED') {
                showUpdateNotification();
            }
        });

        // Handle controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    });

    // Show update notification
    function showUpdateNotification() {
        const notification = document.getElementById('updateNotification');
        if (notification) {
            notification.classList.remove('hidden');
            notification.classList.add('show');
        }
    }

    // Handle update button click
    document.addEventListener('DOMContentLoaded', () => {
        const updateButton = document.getElementById('updateButton');
        const dismissButton = document.getElementById('dismissUpdate');
        const notification = document.getElementById('updateNotification');

        if (updateButton) {
            updateButton.addEventListener('click', () => {
                // Clear all caches and reload
                if ('caches' in window) {
                    caches.keys().then(names => {
                        names.forEach(name => {
                            caches.delete(name);
                        });
                    }).then(() => {
                        // Tell the service worker to skip waiting
                        if (newWorker) {
                            newWorker.postMessage({type: 'SKIP_WAITING'});
                        } else {
                            window.location.reload();
                        }
                    });
                } else {
                    window.location.reload();
                }
            });
        }

        if (dismissButton) {
            dismissButton.addEventListener('click', () => {
                notification.classList.remove('show');
                notification.classList.add('hidden');
            });
        }
    });
}

// Handle app installation
window.addEventListener('appinstalled', () => {
    console.log('App installed successfully');
    deferredPrompt = null;
});

