var SnakeGame = (function() {
    'use strict';

    var config = {
        canvas: null,
        ctx: null,
        gridSize: 20,
        tileCount: 20,
        difficulty: 'medium',
        soundEnabled: true,
        musicEnabled: false
    };

    var gameState = {
        snake: [],
        direction: { x: 1, y: 0 },
        nextDirection: { x: 1, y: 0 },
        food: { x: 10, y: 10 },
        score: 0,
        highScore: 0,
        level: 1,
        isRunning: false,
        isPaused: false,
        gameLoopId: null,
        speed: 150,
        foodEaten: 0,
        startTime: null,
        playTime: 0
    };

    var stats = {
        totalGames: 0,
        totalScore: 0,
        longestSnake: 0,
        totalPlayTime: 0,
        games: []
    };

    var difficultySettings = {
        easy: { speed: 200, gridSize: 15 },
        medium: { speed: 150, gridSize: 20 },
        hard: { speed: 100, gridSize: 25 },
        expert: { speed: 70, gridSize: 30 }
    };

    var db = null;

    function initIndexedDB() {
        var request = indexedDB.open('SnakeGameDB', 1);

        request.onerror = function() {
            console.error('IndexedDB error');
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            loadStatsFromDB();
        };

        request.onupgradeneeded = function(event) {
            var database = event.target.result;
            if (!database.objectStoreNames.contains('stats')) {
                database.createObjectStore('stats', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('games')) {
                var gamesStore = database.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
                gamesStore.createIndex('score', 'score', { unique: false });
                gamesStore.createIndex('date', 'date', { unique: false });
            }
        };
    }

    function saveStatsToDB() {
        if (!db) return;

        var transaction = db.transaction(['stats'], 'readwrite');
        var objectStore = transaction.objectStore('stats');
        
        var statsData = {
            id: 'globalStats',
            totalGames: stats.totalGames,
            totalScore: stats.totalScore,
            longestSnake: stats.longestSnake,
            totalPlayTime: stats.totalPlayTime
        };

        objectStore.put(statsData);
    }

    function loadStatsFromDB() {
        if (!db) return;

        var transaction = db.transaction(['stats'], 'readonly');
        var objectStore = transaction.objectStore('stats');
        var request = objectStore.get('globalStats');

        request.onsuccess = function(event) {
            var data = event.target.result;
            if (data) {
                stats.totalGames = data.totalGames || 0;
                stats.totalScore = data.totalScore || 0;
                stats.longestSnake = data.longestSnake || 0;
                stats.totalPlayTime = data.totalPlayTime || 0;
            }
            loadGamesFromDB();
        };
    }

    function saveGameToDB(gameData) {
        if (!db) return;

        var transaction = db.transaction(['games'], 'readwrite');
        var objectStore = transaction.objectStore('games');
        objectStore.add(gameData);
    }

    function loadGamesFromDB() {
        if (!db) return;

        var transaction = db.transaction(['games'], 'readonly');
        var objectStore = transaction.objectStore('games');
        var request = objectStore.openCursor(null, 'prev');
        
        stats.games = [];

        request.onsuccess = function(event) {
            var cursor = event.target.result;
            if (cursor && stats.games.length < 10) {
                stats.games.push(cursor.value);
                cursor.continue();
            }
        };
    }

    function clearStatsFromDB() {
        if (!db) return;

        var transaction = db.transaction(['stats', 'games'], 'readwrite');
        
        transaction.objectStore('stats').clear();
        transaction.objectStore('games').clear();

        transaction.oncomplete = function() {
            stats = {
                totalGames: 0,
                totalScore: 0,
                longestSnake: 0,
                totalPlayTime: 0,
                games: []
            };
            updateStatsDisplay();
        };
    }

    function loadSettings() {
        var savedHighScore = localStorage.getItem('snakeHighScore');
        if (savedHighScore) {
            gameState.highScore = parseInt(savedHighScore, 10);
            updateDisplay();
        }
    }

    function initCanvas() {
        config.canvas = document.getElementById('gameCanvas');
        config.ctx = config.canvas.getContext('2d');
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        var container = document.querySelector('.game-container');
        var maxWidth = container.clientWidth - 48;
        var maxHeight = Math.min(window.innerHeight - 200, 600);
        
        var size = Math.min(maxWidth, maxHeight);
        config.canvas.width = size;
        config.canvas.height = size;
        
        config.gridSize = config.canvas.width / config.tileCount;
        
        if (gameState.isRunning) {
            draw();
        }
    }

    function initGame() {
        var centerX = Math.floor(config.tileCount / 2);
        var centerY = Math.floor(config.tileCount / 2);
        
        gameState.snake = [
            { x: centerX, y: centerY },
            { x: centerX - 1, y: centerY },
            { x: centerX - 2, y: centerY }
        ];
        
        gameState.direction = { x: 1, y: 0 };
        gameState.nextDirection = { x: 1, y: 0 };
        gameState.score = 0;
        gameState.level = 1;
        gameState.foodEaten = 0;
        gameState.isPaused = false;
        gameState.startTime = Date.now();
        gameState.playTime = 0;
        
        spawnFood();
        updateDisplay();
        draw();
    }

    function startGame() {
        if (gameState.isRunning) {
            stopGame();
        }

        applyDifficultySettings();
        
        gameState.isRunning = true;
        initGame();
        
        document.getElementById('startBtn').classList.add('hidden');
        document.getElementById('pauseBtn').classList.remove('hidden');
        document.getElementById('gameOverlay').classList.add('hidden');
        gameLoop();
    }

    function pauseGame() {
        if (!gameState.isRunning || gameState.isPaused) return;
        
        gameState.isPaused = true;
        document.getElementById('pauseOverlay').classList.remove('hidden');
    }

    function resumeGame() {
        if (!gameState.isRunning || !gameState.isPaused) return;
        
        gameState.isPaused = false;
        document.getElementById('pauseOverlay').classList.add('hidden');
    }

    function stopGame() {
        gameState.isRunning = false;
        gameState.isPaused = false;
        
        if (gameState.gameLoopId) {
            clearTimeout(gameState.gameLoopId);
            gameState.gameLoopId = null;
        }

        if (gameState.startTime) {
            gameState.playTime = Math.floor((Date.now() - gameState.startTime) / 1000);
        }

        updateStats();
        
        document.getElementById('startBtn').classList.remove('hidden');
        document.getElementById('pauseBtn').classList.add('hidden');
        document.getElementById('pauseOverlay').classList.add('hidden');
    }

    function gameLoop() {
        if (!gameState.isRunning || gameState.isPaused) {
            if (gameState.isPaused) {
                gameState.gameLoopId = setTimeout(gameLoop, 100);
            }
            return;
        }

        update();
        draw();

        var speed = gameState.speed - (gameState.level - 1) * 5;
        speed = Math.max(speed, 50);
        
        gameState.gameLoopId = setTimeout(gameLoop, speed);
    }

    function update() {
        gameState.direction = { ...gameState.nextDirection };

        var head = { ...gameState.snake[0] };
        head.x += gameState.direction.x;
        head.y += gameState.direction.y;

        if (checkCollision(head)) {
            gameOver();
            return;
        }

        gameState.snake.unshift(head);

        if (head.x === gameState.food.x && head.y === gameState.food.y) {
            eatFood();
        } else {
            gameState.snake.pop();
        }
    }

    function checkCollision(head) {
        if (head.x < 0 || head.x >= config.tileCount || 
            head.y < 0 || head.y >= config.tileCount) {
            return true;
        }

        for (var i = 0; i < gameState.snake.length; i++) {
            if (head.x === gameState.snake[i].x && head.y === gameState.snake[i].y) {
                return true;
            }
        }

        return false;
    }

    function eatFood() {
        gameState.score += 10 * gameState.level;
        gameState.foodEaten++;

        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('snakeHighScore', gameState.highScore);
        }

        if (gameState.foodEaten % 5 === 0) {
            gameState.level++;
        }

        spawnFood();
        updateDisplay();
        playSound('eat');
    }

    function spawnFood() {
        var validPositions = [];
        
        for (var x = 0; x < config.tileCount; x++) {
            for (var y = 0; y < config.tileCount; y++) {
                var isSnake = false;
                for (var i = 0; i < gameState.snake.length; i++) {
                    if (gameState.snake[i].x === x && gameState.snake[i].y === y) {
                        isSnake = true;
                        break;
                    }
                }
                if (!isSnake) {
                    validPositions.push({ x: x, y: y });
                }
            }
        }

        if (validPositions.length > 0) {
            var randomIndex = Math.floor(Math.random() * validPositions.length);
            gameState.food = validPositions[randomIndex];
        }
    }

    function draw() {
        config.ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--bg-color').trim();
        config.ctx.fillRect(0, 0, config.canvas.width, config.canvas.height);

        drawGrid();
        drawFood();
        drawSnake();
    }

    function drawGrid() {
        config.ctx.strokeStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--grid-color').trim();
        config.ctx.lineWidth = 1;

        for (var i = 0; i <= config.tileCount; i++) {
            var pos = i * config.gridSize;
            config.ctx.beginPath();
            config.ctx.moveTo(pos, 0);
            config.ctx.lineTo(pos, config.canvas.height);
            config.ctx.stroke();

            config.ctx.beginPath();
            config.ctx.moveTo(0, pos);
            config.ctx.lineTo(config.canvas.width, pos);
            config.ctx.stroke();
        }
    }

    function drawSnake() {
        for (var i = 0; i < gameState.snake.length; i++) {
            var segment = gameState.snake[i];
            var isHead = i === 0;
            
            config.ctx.fillStyle = isHead ? 
                getComputedStyle(document.documentElement).getPropertyValue('--snake-head-color').trim() :
                getComputedStyle(document.documentElement).getPropertyValue('--snake-color').trim();
            
            var x = segment.x * config.gridSize + 2;
            var y = segment.y * config.gridSize + 2;
            var size = config.gridSize - 4;
            
            config.ctx.beginPath();
            config.ctx.roundRect(x, y, size, size, 4);
            config.ctx.fill();

            if (isHead) {
                drawEyes(segment);
            }
        }
    }

    function drawEyes(head) {
        var eyeSize = Math.max(2, config.gridSize / 8);
        var eyeOffset = config.gridSize / 4;
        var centerX = head.x * config.gridSize + config.gridSize / 2;
        var centerY = head.y * config.gridSize + config.gridSize / 2;

        config.ctx.fillStyle = '#ffffff';

        if (gameState.direction.x !== 0) {
            var eyeX = centerX + (gameState.direction.x * eyeOffset);
            config.ctx.beginPath();
            config.ctx.arc(eyeX, centerY - eyeOffset / 2, eyeSize, 0, Math.PI * 2);
            config.ctx.fill();
            config.ctx.beginPath();
            config.ctx.arc(eyeX, centerY + eyeOffset / 2, eyeSize, 0, Math.PI * 2);
            config.ctx.fill();
        } else {
            var eyeY = centerY + (gameState.direction.y * eyeOffset);
            config.ctx.beginPath();
            config.ctx.arc(centerX - eyeOffset / 2, eyeY, eyeSize, 0, Math.PI * 2);
            config.ctx.fill();
            config.ctx.beginPath();
            config.ctx.arc(centerX + eyeOffset / 2, eyeY, eyeSize, 0, Math.PI * 2);
            config.ctx.fill();
        }
    }

    function drawFood() {
        var x = gameState.food.x * config.gridSize + config.gridSize / 2;
        var y = gameState.food.y * config.gridSize + config.gridSize / 2;
        var radius = config.gridSize / 2 - 3;

        config.ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--food-color').trim();
        
        config.ctx.beginPath();
        config.ctx.arc(x, y, radius, 0, Math.PI * 2);
        config.ctx.fill();

        config.ctx.fillStyle = '#4CAF50';
        config.ctx.fillRect(x - 2, y - radius - 3, 4, 5);
    }

    function gameOver() {
        stopGame();
        
        document.getElementById('gameOverlay').classList.remove('hidden');
        
        playSound('gameOver');
    }

    function updateDisplay() {
        document.getElementById('scoreValue').textContent = gameState.score;
        document.getElementById('highScoreValue').textContent = gameState.highScore;
        document.getElementById('levelValue').textContent = gameState.level;
    }

    function updateStats() {
        stats.totalGames++;
        stats.totalScore += gameState.score;
        stats.totalPlayTime += gameState.playTime;
        
        var snakeLength = gameState.snake.length;
        if (snakeLength > stats.longestSnake) {
            stats.longestSnake = snakeLength;
        }

        var gameData = {
            score: gameState.score,
            level: gameState.level,
            snakeLength: snakeLength,
            foodEaten: gameState.foodEaten,
            playTime: gameState.playTime,
            difficulty: config.difficulty,
            date: new Date().toISOString()
        };

        saveGameToDB(gameData);
        saveStatsToDB();
    }

    function showStats() {
        updateStatsDisplay();
        document.getElementById('statsModal').classList.remove('hidden');
    }

    function hideStats() {
        document.getElementById('statsModal').classList.add('hidden');
    }

    function updateStatsDisplay() {
        document.getElementById('totalGamesValue').textContent = stats.totalGames;
        document.getElementById('totalScoreValue').textContent = stats.totalScore;
        
        var avgScore = stats.totalGames > 0 ? 
            Math.round(stats.totalScore / stats.totalGames) : 0;
        document.getElementById('averageScoreValue').textContent = avgScore;
        
        document.getElementById('longestSnakeValue').textContent = stats.longestSnake;
        
        var hours = Math.floor(stats.totalPlayTime / 3600);
        var minutes = Math.floor((stats.totalPlayTime % 3600) / 60);
        var timeText = hours > 0 ? 
            hours + ':' + minutes.toString().padStart(2, '0') :
            minutes.toString();
        document.getElementById('playTimeValue').textContent = timeText;

        var leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '';

        if (stats.games.length === 0) {
            return;
        }
        
        for (var i = 0; i < stats.games.length; i++) {
            var game = stats.games[i];
            var item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            var rank = document.createElement('div');
            rank.className = 'leaderboard-rank';
            rank.textContent = (i + 1);
            
            var info = document.createElement('div');
            info.className = 'leaderboard-info';
            
            var score = document.createElement('div');
            score.className = 'leaderboard-score';
            score.textContent = game.score;
            
            var details = document.createElement('div');
            details.className = 'leaderboard-details';
            var date = new Date(game.date);
            var dateStr = date.toLocaleDateString();
            var timeStr = Math.floor(game.playTime / 60) + ':' + 
                (game.playTime % 60).toString().padStart(2, '0');
            details.textContent = dateStr + ' • ' + game.level + 
                ' • ' + timeStr;
            
            info.appendChild(score);
            info.appendChild(details);
            
            item.appendChild(rank);
            item.appendChild(info);
            
            leaderboardList.appendChild(item);
        }
    }

    function resetStats() {
        if (confirm('آیا مطمئنید که می‌خواهید آمار را بازنشانی کنید؟\nAre you sure you want to reset statistics?')) {
            clearStatsFromDB();
        }
    }

    function applyDifficultySettings() {
        var settings = difficultySettings[config.difficulty];
        config.tileCount = settings.gridSize;
        gameState.speed = settings.speed;
        resizeCanvas();
    }

    function handleKeyPress(event) {
        if (event.code === 'Space') {
            event.preventDefault();
            if (gameState.isRunning) {
                if (gameState.isPaused) {
                    resumeGame();
                } else {
                    pauseGame();
                }
            }
            return;
        }

        if (event.code === 'KeyR') {
            event.preventDefault();
            if (gameState.isRunning) {
                startGame();
            }
            return;
        }

        if (!gameState.isRunning || gameState.isPaused) return;

        var newDirection = { ...gameState.direction };

        if (event.code === 'ArrowUp' || event.code === 'KeyW') {
            event.preventDefault();
            newDirection = { x: 0, y: -1 };
        } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
            event.preventDefault();
            newDirection = { x: 0, y: 1 };
        } else if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
            event.preventDefault();
            newDirection = { x: -1, y: 0 };
        } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
            event.preventDefault();
            newDirection = { x: 1, y: 0 };
        }

        if (newDirection.x !== -gameState.direction.x || newDirection.y !== -gameState.direction.y) {
            if (!(newDirection.x === gameState.direction.x && newDirection.y === gameState.direction.y)) {
                gameState.nextDirection = newDirection;
            }
        }
    }

    function playSound(type) {
        if (!config.soundEnabled) return;

        var frequency = type === 'eat' ? 800 : 200;
        var duration = type === 'eat' ? 100 : 300;

        try {
            var audioContext = new (window.AudioContext || window.webkitAudioContext)();
            var oscillator = audioContext.createOscillator();
            var gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration / 1000);
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    function bindEvents() {
        document.getElementById('startBtn').addEventListener('click', startGame);
        document.getElementById('pauseBtn').addEventListener('click', function() {
            if (gameState.isPaused) {
                resumeGame();
            } else {
                pauseGame();
            }
        });
        document.getElementById('restartBtn').addEventListener('click', startGame);

        document.getElementById('difficultySelect').addEventListener('change', function(e) {
            config.difficulty = e.target.value;
            if (!gameState.isRunning) {
                applyDifficultySettings();
            }
        });

        document.getElementById('gridSizeSelect').addEventListener('change', function(e) {
            var sizes = { small: 15, normal: 20, large: 25 };
            config.tileCount = sizes[e.target.value];
            if (!gameState.isRunning) {
                resizeCanvas();
            }
        });

        document.getElementById('soundEffectsCheck').addEventListener('change', function(e) {
            config.soundEnabled = e.target.checked;
        });

        document.getElementById('musicCheck').addEventListener('change', function(e) {
            config.musicEnabled = e.target.checked;
        });

        document.getElementById('statsBtn').addEventListener('click', showStats);
        document.getElementById('statsModalClose').addEventListener('click', hideStats);
        document.getElementById('closeStatsBtn').addEventListener('click', hideStats);
        document.getElementById('resetStatsBtn').addEventListener('click', resetStats);

        document.getElementById('statsModal').addEventListener('click', function(e) {
            if (e.target.id === 'statsModal') {
                hideStats();
            }
        });

        document.addEventListener('keydown', handleKeyPress);

        window.addEventListener('languageChanged', function() {
            if (window.ToolWrapper) {
                window.ToolWrapper.applyTranslations(window.ToolWrapper.getCurrentLanguage());
            }
        });
    }

    function init() {
        initIndexedDB();
        loadSettings();
        initCanvas();
        bindEvents();
        draw();
    }

    return {
        init: init
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', SnakeGame.init);
} else {
    SnakeGame.init();
}
