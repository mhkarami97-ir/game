var MemoryCardGame = (function() {
    'use strict';

    var gameState = {
        cards: [],
        flippedCards: [],
        matchedPairs: 0,
        moves: 0,
        score: 0,
        timer: 0,
        timerInterval: null,
        gameActive: false,
        isPaused: false,
        difficulty: 'medium',
        cardTheme: 'emoji',
        totalPairs: 0
    };

    var gameStats = {
        totalGames: 0,
        completedGames: 0,
        bestTime: null,
        bestScore: 0,
        totalMoves: 0,
        totalPlayTime: 0
    };

    var settings = {
        soundEffects: true,
        animations: true,
        timerEnabled: true
    };

    var cardThemes = {
        emoji: ['🎮', '🎯', '🎨', '🎭', '🎪', '🎸', '🎹', '🎺', '🎻', '🎲', '🎰', '🎳', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸', '🏒', '🏑', '🥊', '🥋', '🎿', '⛷️', '🏂', '⛸️', '🛷', '⛹️', '🏋️', '🚴', '🚵', '🏇'],
        numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'],
        colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788', '#E63946', '#F77F00', '#06FFA5', '#5A189A', '#00B4D8', '#F72585', '#4CC9F0', '#7209B7']
    };

    var difficultySettings = {
        easy: { rows: 4, cols: 4, pairs: 8 },
        medium: { rows: 4, cols: 6, pairs: 12 },
        hard: { rows: 6, cols: 6, pairs: 18 }
    };

    function init() {
        loadSettings();
        loadStats();
        setupEventListeners();
        updateUI();
    }

    function setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', startGame);
        document.getElementById('newGameBtn').addEventListener('click', resetGame);
        document.getElementById('pauseBtn').addEventListener('click', togglePause);
        document.getElementById('playAgainBtn').addEventListener('click', resetGame);
        document.getElementById('statsBtn').addEventListener('click', openStatsModal);
        document.getElementById('leaderboardBtn').addEventListener('click', openLeaderboardModal);

        document.getElementById('statsModalClose').addEventListener('click', closeStatsModal);
        document.getElementById('closeStatsBtn').addEventListener('click', closeStatsModal);
        document.getElementById('resetStatsBtn').addEventListener('click', resetStats);

        document.getElementById('leaderboardModalClose').addEventListener('click', closeLeaderboardModal);
        document.getElementById('closeLeaderboardBtn').addEventListener('click', closeLeaderboardModal);
        document.getElementById('clearLeaderboardBtn').addEventListener('click', clearLeaderboard);

        var tabBtns = document.querySelectorAll('.tab-btn');
        for (var i = 0; i < tabBtns.length; i++) {
            tabBtns[i].addEventListener('click', handleTabClick);
        }

        document.getElementById('difficultySelect').addEventListener('change', function(e) {
            gameState.difficulty = e.target.value;
            saveSettings();
        });

        document.getElementById('themeSelect').addEventListener('change', function(e) {
            gameState.cardTheme = e.target.value;
            saveSettings();
        });

        document.getElementById('soundEffectsCheck').addEventListener('change', function(e) {
            settings.soundEffects = e.target.checked;
            saveSettings();
        });

        document.getElementById('animationsCheck').addEventListener('change', function(e) {
            settings.animations = e.target.checked;
            saveSettings();
        });

        document.getElementById('timerCheck').addEventListener('change', function(e) {
            settings.timerEnabled = e.target.checked;
            saveSettings();
        });

        window.addEventListener('languageChanged', function() {
            if (window.ToolWrapper) {
                window.ToolWrapper.applyTranslations(window.ToolWrapper.getCurrentLanguage());
            }
        });
    }

    function startGame() {
        document.getElementById('startBtn').classList.add('hidden');
        document.getElementById('gameControls').classList.remove('hidden');
        resetGame();
    }

    function resetGame() {
        clearInterval(gameState.timerInterval);
        
        gameState.flippedCards = [];
        gameState.matchedPairs = 0;
        gameState.moves = 0;
        gameState.score = 0;
        gameState.timer = 0;
        gameState.gameActive = true;
        gameState.isPaused = false;

        var difficulty = difficultySettings[gameState.difficulty];
        gameState.totalPairs = difficulty.pairs;

        updateUI();
        createBoard();
        
        if (settings.timerEnabled) {
            startTimer();
        }

        document.getElementById('gameOverlay').classList.add('hidden');
        document.getElementById('pauseBtn').textContent = getPauseText();
        
        gameStats.totalGames++;
        saveStats();
    }

    function createBoard() {
        var board = document.getElementById('gameBoard');
        board.innerHTML = '';

        var difficulty = difficultySettings[gameState.difficulty];
        board.className = 'game-board ' + gameState.difficulty;

        var selectedTheme = cardThemes[gameState.cardTheme];
        var cardValues = [];
        
        for (var i = 0; i < difficulty.pairs; i++) {
            var value = selectedTheme[i % selectedTheme.length];
            cardValues.push(value);
            cardValues.push(value);
        }

        cardValues = shuffleArray(cardValues);
        gameState.cards = cardValues;

        for (var j = 0; j < cardValues.length; j++) {
            var card = createCard(j, cardValues[j]);
            board.appendChild(card);
        }
    }

    function createCard(index, value) {
        var card = document.createElement('div');
        card.className = 'card';
        card.dataset.index = index;
        card.dataset.value = value;

        var cardBack = document.createElement('div');
        cardBack.className = 'card-face card-back';

        var cardFront = document.createElement('div');
        cardFront.className = 'card-face card-front ' + gameState.cardTheme;
        
        if (gameState.cardTheme === 'color') {
            cardFront.style.backgroundColor = value;
        } else {
            cardFront.textContent = value;
        }

        card.appendChild(cardBack);
        card.appendChild(cardFront);

        card.addEventListener('click', function() {
            handleCardClick(card);
        });

        return card;
    }

    function handleCardClick(card) {
        if (!gameState.gameActive || gameState.isPaused) return;
        if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
        if (gameState.flippedCards.length >= 2) return;

        flipCard(card);
        gameState.flippedCards.push(card);

        if (settings.soundEffects) {
            playSound('flip');
        }

        if (gameState.flippedCards.length === 2) {
            gameState.moves++;
            updateUI();
            checkMatch();
        }
    }

    function flipCard(card) {
        if (settings.animations) {
            card.classList.add('flipped');
        } else {
            card.classList.add('flipped');
        }
    }

    function checkMatch() {
        var card1 = gameState.flippedCards[0];
        var card2 = gameState.flippedCards[1];

        var value1 = card1.dataset.value;
        var value2 = card2.dataset.value;

        if (value1 === value2) {
            handleMatch(card1, card2);
        } else {
            handleMismatch(card1, card2);
        }
    }

    function handleMatch(card1, card2) {
        setTimeout(function() {
            card1.classList.add('matched');
            card2.classList.add('matched');
            gameState.matchedPairs++;

            var pairBonus = 100;
            var timeBonus = Math.max(0, 50 - Math.floor(gameState.timer / 2));
            var moveBonus = Math.max(0, 30 - gameState.moves);
            gameState.score += pairBonus + timeBonus + moveBonus;

            updateUI();

            if (settings.soundEffects) {
                playSound('match');
            }

            gameState.flippedCards = [];

            if (gameState.matchedPairs === gameState.totalPairs) {
                endGame();
            }
        }, 500);
    }

    function handleMismatch(card1, card2) {
        setTimeout(function() {
            if (settings.animations) {
                card1.classList.add('shake');
                card2.classList.add('shake');
            }

            if (settings.soundEffects) {
                playSound('mismatch');
            }

            setTimeout(function() {
                card1.classList.remove('flipped', 'shake');
                card2.classList.remove('flipped', 'shake');
                gameState.flippedCards = [];
            }, 500);
        }, 800);
    }

    function endGame() {
        clearInterval(gameState.timerInterval);
        gameState.gameActive = false;

        gameStats.completedGames++;
        gameStats.totalMoves += gameState.moves;
        gameStats.totalPlayTime += gameState.timer;

        if (!gameStats.bestTime || gameState.timer < gameStats.bestTime) {
            gameStats.bestTime = gameState.timer;
        }

        if (gameState.score > gameStats.bestScore) {
            gameStats.bestScore = gameState.score;
        }

        saveStats();
        saveToLeaderboard();

        setTimeout(function() {
            showGameOverlay();
        }, 500);
    }

    function showGameOverlay() {
        var overlay = document.getElementById('gameOverlay');
        var message = document.getElementById('overlayMessage');
        
        var messageText = getTranslation('gameCompleted') || 'بازی با موفقیت تکمیل شد!';
        message.textContent = messageText;

        document.getElementById('finalTime').textContent = formatTime(gameState.timer);
        document.getElementById('finalMoves').textContent = gameState.moves;
        document.getElementById('finalScore').textContent = gameState.score;

        overlay.classList.remove('hidden');

        if (settings.soundEffects) {
            playSound('win');
        }
    }

    function togglePause() {
        if (!gameState.gameActive) return;

        gameState.isPaused = !gameState.isPaused;
        
        if (gameState.isPaused) {
            clearInterval(gameState.timerInterval);
            var cards = document.querySelectorAll('.card');
            for (var i = 0; i < cards.length; i++) {
                cards[i].style.pointerEvents = 'none';
            }
        } else {
            if (settings.timerEnabled) {
                startTimer();
            }
            var cards = document.querySelectorAll('.card');
            for (var i = 0; i < cards.length; i++) {
                cards[i].style.pointerEvents = 'auto';
            }
        }

        document.getElementById('pauseBtn').textContent = getPauseText();
    }

    function getPauseText() {
        if (gameState.isPaused) {
            return getTranslation('resume') || 'ادامه';
        }
        return getTranslation('pause') || 'توقف';
    }

    function startTimer() {
        gameState.timerInterval = setInterval(function() {
            if (!gameState.isPaused && gameState.gameActive) {
                gameState.timer++;
                updateUI();
            }
        }, 1000);
    }

    function updateUI() {
        document.getElementById('movesCount').textContent = gameState.moves;
        document.getElementById('scoreDisplay').textContent = gameState.score;
        document.getElementById('timerDisplay').textContent = formatTime(gameState.timer);
    }

    function formatTime(seconds) {
        var mins = Math.floor(seconds / 60);
        var secs = seconds % 60;
        return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function formatTotalTime(seconds) {
        var hours = Math.floor(seconds / 3600);
        var mins = Math.floor((seconds % 3600) / 60);
        var secs = seconds % 60;
        return (hours < 10 ? '0' : '') + hours + ':' + 
               (mins < 10 ? '0' : '') + mins + ':' + 
               (secs < 10 ? '0' : '') + secs;
    }

    function shuffleArray(array) {
        var newArray = array.slice();
        for (var i = newArray.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = newArray[i];
            newArray[i] = newArray[j];
            newArray[j] = temp;
        }
        return newArray;
    }

    function openStatsModal() {
        updateStatsDisplay();
        document.getElementById('statsModal').classList.remove('hidden');
    }

    function closeStatsModal() {
        document.getElementById('statsModal').classList.add('hidden');
    }

    function updateStatsDisplay() {
        document.getElementById('totalGamesValue').textContent = gameStats.totalGames;
        document.getElementById('completedGamesValue').textContent = gameStats.completedGames;
        document.getElementById('bestTimeValue').textContent = gameStats.bestTime ? formatTime(gameStats.bestTime) : '--:--';
        document.getElementById('bestScoreValue').textContent = gameStats.bestScore;
        
        document.getElementById('averageMovesValue').textContent = gameStats.completedGames > 0 ? 
            Math.round(gameStats.totalMoves / gameStats.completedGames) : 0;
        
        document.getElementById('totalPlayTimeValue').textContent = formatTotalTime(gameStats.totalPlayTime);
    }

    function resetStats() {
        var confirmText = getTranslation('confirmReset') || 'آیا مطمئن هستید که می‌خواهید آمار را بازنشانی کنید؟';
        if (confirm(confirmText)) {
            gameStats = {
                totalGames: 0,
                completedGames: 0,
                bestTime: null,
                bestScore: 0,
                totalMoves: 0,
                totalPlayTime: 0
            };
            saveStats();
            updateStatsDisplay();
        }
    }

    function openLeaderboardModal() {
        updateLeaderboardDisplay('easy');
        document.getElementById('leaderboardModal').classList.remove('hidden');
    }

    function closeLeaderboardModal() {
        document.getElementById('leaderboardModal').classList.add('hidden');
    }

    function handleTabClick(e) {
        var tabBtns = document.querySelectorAll('.tab-btn');
        for (var i = 0; i < tabBtns.length; i++) {
            tabBtns[i].classList.remove('active');
        }
        e.target.classList.add('active');
        
        var difficulty = e.target.dataset.difficulty;
        updateLeaderboardDisplay(difficulty);
    }

    function updateLeaderboardDisplay(difficulty) {
        var leaderboard = getLeaderboard(difficulty);
        var listElement = document.getElementById('leaderboardList');
        listElement.innerHTML = '';

        if (leaderboard.length === 0) {
            var emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-leaderboard';
            emptyMsg.textContent = getTranslation('noRecords') || 'هیچ رکوردی ثبت نشده است';
            listElement.appendChild(emptyMsg);
            return;
        }

        for (var i = 0; i < leaderboard.length; i++) {
            var item = leaderboard[i];
            var itemElement = createLeaderboardItem(item, i + 1);
            listElement.appendChild(itemElement);
        }
    }

    function createLeaderboardItem(item, rank) {
        var element = document.createElement('div');
        element.className = 'leaderboard-item';

        var rankElement = document.createElement('div');
        rankElement.className = 'leaderboard-rank';
        if (rank === 1) rankElement.classList.add('gold');
        if (rank === 2) rankElement.classList.add('silver');
        if (rank === 3) rankElement.classList.add('bronze');
        rankElement.textContent = rank;

        var infoElement = document.createElement('div');
        infoElement.className = 'leaderboard-info';

        var timeElement = document.createElement('div');
        timeElement.className = 'leaderboard-time';
        timeElement.textContent = formatTime(item.time);

        var detailsElement = document.createElement('div');
        detailsElement.className = 'leaderboard-details';
        var movesText = getTranslation('moves') || 'حرکت‌ها';
        var dateText = new Date(item.date).toLocaleDateString('fa-IR');
        detailsElement.textContent = movesText + ': ' + item.moves + ' | ' + dateText;

        infoElement.appendChild(timeElement);
        infoElement.appendChild(detailsElement);

        var scoreElement = document.createElement('div');
        scoreElement.className = 'leaderboard-score';
        scoreElement.textContent = item.score;

        element.appendChild(rankElement);
        element.appendChild(infoElement);
        element.appendChild(scoreElement);

        return element;
    }

    function saveToLeaderboard() {
        var leaderboard = getLeaderboard(gameState.difficulty);
        
        var newEntry = {
            time: gameState.timer,
            moves: gameState.moves,
            score: gameState.score,
            date: Date.now()
        };

        leaderboard.push(newEntry);
        leaderboard.sort(function(a, b) {
            if (a.time !== b.time) return a.time - b.time;
            return b.score - a.score;
        });

        leaderboard = leaderboard.slice(0, 10);

        localStorage.setItem('memoryCard_leaderboard_' + gameState.difficulty, JSON.stringify(leaderboard));
    }

    function getLeaderboard(difficulty) {
        var data = localStorage.getItem('memoryCard_leaderboard_' + difficulty);
        return data ? JSON.parse(data) : [];
    }

    function clearLeaderboard() {
        var confirmText = getTranslation('confirmClear') || 'آیا مطمئن هستید که می‌خواهید جدول رتبه‌بندی را پاک کنید؟';
        if (confirm(confirmText)) {
            var difficulty = document.querySelector('.tab-btn.active').dataset.difficulty;
            localStorage.removeItem('memoryCard_leaderboard_' + difficulty);
            updateLeaderboardDisplay(difficulty);
        }
    }

    function playSound(type) {
        var audioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioContext) return;

        var ctx = new audioContext();
        var oscillator = ctx.createOscillator();
        var gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        var duration = 0.1;
        var frequency = 440;

        if (type === 'flip') {
            frequency = 523.25;
            duration = 0.1;
        } else if (type === 'match') {
            frequency = 659.25;
            duration = 0.2;
        } else if (type === 'mismatch') {
            frequency = 293.66;
            duration = 0.15;
        } else if (type === 'win') {
            frequency = 783.99;
            duration = 0.3;
        }

        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    }

    function loadSettings() {
        var savedSettings = localStorage.getItem('memoryCard_settings');
        if (savedSettings) {
            var parsed = JSON.parse(savedSettings);
            gameState.difficulty = parsed.difficulty || 'medium';
            gameState.cardTheme = parsed.cardTheme || 'emoji';
            settings.soundEffects = parsed.soundEffects !== false;
            settings.animations = parsed.animations !== false;
            settings.timerEnabled = parsed.timerEnabled !== false;

            document.getElementById('difficultySelect').value = gameState.difficulty;
            document.getElementById('themeSelect').value = gameState.cardTheme;
            document.getElementById('soundEffectsCheck').checked = settings.soundEffects;
            document.getElementById('animationsCheck').checked = settings.animations;
            document.getElementById('timerCheck').checked = settings.timerEnabled;
        }
    }

    function saveSettings() {
        var settingsData = {
            difficulty: gameState.difficulty,
            cardTheme: gameState.cardTheme,
            soundEffects: settings.soundEffects,
            animations: settings.animations,
            timerEnabled: settings.timerEnabled
        };
        localStorage.setItem('memoryCard_settings', JSON.stringify(settingsData));
    }

    function loadStats() {
        var savedStats = localStorage.getItem('memoryCard_stats');
        if (savedStats) {
            var parsed = JSON.parse(savedStats);
            gameStats.totalGames = parsed.totalGames || 0;
            gameStats.completedGames = parsed.completedGames || 0;
            gameStats.bestTime = parsed.bestTime || null;
            gameStats.bestScore = parsed.bestScore || 0;
            gameStats.totalMoves = parsed.totalMoves || 0;
            gameStats.totalPlayTime = parsed.totalPlayTime || 0;
        }
    }

    function saveStats() {
        localStorage.setItem('memoryCard_stats', JSON.stringify(gameStats));
    }

    function getTranslation(key) {
        if (window.ToolWrapper && window.ToolWrapper.getTranslation) {
            return window.ToolWrapper.getTranslation(key);
        }
        return null;
    }

    return {
        init: init
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        MemoryCardGame.init();
    });
} else {
    MemoryCardGame.init();
}

