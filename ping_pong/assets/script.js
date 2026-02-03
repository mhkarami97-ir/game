var PingPongGame = (function() {
    'use strict';

    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');

    var gameState = {
        gameMode: 'twoPlayers',
        difficulty: 'medium',
        ballSpeed: 'normal',
        winScore: 10,
        gameActive: false,
        gamePaused: false,
        gameOver: false,
        player1Score: 0,
        player2Score: 0,
        startTime: null,
        elapsedTime: 0,
        timerInterval: null,
        countdown: 0,
        showMessage: '',
        messageTimer: 0
    };

    var gameStats = {
        totalGames: 0,
        player1Wins: 0,
        player2Wins: 0,
        gamesHistory: []
    };

    var settings = {
        soundEffects: true,
        showFps: false
    };

    var paddle1 = {
        x: 20,
        y: 0,
        width: 12,
        height: 100,
        speed: 8,
        dy: 0
    };

    var paddle2 = {
        x: 0,
        y: 0,
        width: 12,
        height: 100,
        speed: 8,
        dy: 0
    };

    var ball = {
        x: 0,
        y: 0,
        radius: 8,
        speed: 5,
        dx: 0,
        dy: 0,
        maxSpeed: 15
    };

    var keys = {
        w: false,
        s: false,
        arrowUp: false,
        arrowDown: false
    };

    var fps = {
        lastTime: 0,
        frames: 0,
        fps: 0
    };

    var animationId = null;

    function init() {
        loadSettings();
        loadStats();
        setupCanvas();
        setupEventListeners();
        updateUI();
        updateScoreDisplay();
        drawInitialScreen();
    }

    function setupCanvas() {
        var container = document.querySelector('.game-container');
        var maxWidth = Math.min(container.clientWidth - 40, 800);
        var height = maxWidth * 0.6;
        
        canvas.width = maxWidth;
        canvas.height = height;
        
        paddle2.x = canvas.width - paddle2.width - 20;
    }

    function setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', startGame);
        document.getElementById('pauseBtn').addEventListener('click', togglePause);
        document.getElementById('newGameBtn').addEventListener('click', resetGame);
        document.getElementById('resumeBtn').addEventListener('click', togglePause);
        document.getElementById('restartBtn').addEventListener('click', function() {
            hideOverlay('gameOverlay');
            resetGame();
        });
        
        document.getElementById('statsBtn').addEventListener('click', openStatsModal);
        document.getElementById('statsModalClose').addEventListener('click', closeStatsModal);
        document.getElementById('closeStatsBtn').addEventListener('click', closeStatsModal);
        document.getElementById('resetStatsBtn').addEventListener('click', resetStats);
        
        document.getElementById('gameModeSelect').addEventListener('change', function(e) {
            gameState.gameMode = e.target.value;
            toggleDifficultyDisplay();
        });
        
        document.getElementById('difficultySelect').addEventListener('change', function(e) {
            gameState.difficulty = e.target.value;
        });
        
        document.getElementById('ballSpeedSelect').addEventListener('change', function(e) {
            gameState.ballSpeed = e.target.value;
            updateBallSpeed();
        });
        
        document.getElementById('winScoreSelect').addEventListener('change', function(e) {
            gameState.winScore = parseInt(e.target.value);
        });
        
        document.getElementById('soundEffectsCheck').addEventListener('change', function(e) {
            settings.soundEffects = e.target.checked;
            saveSettings();
        });
        
        document.getElementById('showFpsCheck').addEventListener('change', function(e) {
            settings.showFps = e.target.checked;
        });

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        window.addEventListener('resize', function() {
            if (!gameState.gameActive) {
                setupCanvas();
                drawInitialScreen();
            }
        });

        window.addEventListener('languageChanged', function() {
            if (window.ToolWrapper) {
                window.ToolWrapper.applyTranslations(window.ToolWrapper.getCurrentLanguage());
            }
        });
    }

    function handleKeyDown(e) {
        if (!gameState.gameActive) return;
        
        if (e.code === 'Space') {
            e.preventDefault();
            togglePause();
            return;
        }
        
        if (gameState.gamePaused) return;
        
        switch(e.key.toLowerCase()) {
            case 'w':
                keys.w = true;
                break;
            case 's':
                keys.s = true;
                break;
            case 'arrowup':
                e.preventDefault();
                keys.arrowUp = true;
                break;
            case 'arrowdown':
                e.preventDefault();
                keys.arrowDown = true;
                break;
        }
    }

    function handleKeyUp(e) {
        switch(e.key.toLowerCase()) {
            case 'w':
                keys.w = false;
                break;
            case 's':
                keys.s = false;
                break;
            case 'arrowup':
                keys.arrowUp = false;
                break;
            case 'arrowdown':
                keys.arrowDown = false;
                break;
        }
    }

    function startGame() {
        resetGameState();
        gameState.gameActive = true;
        gameState.gamePaused = false;
        gameState.gameOver = false;
        
        document.getElementById('startBtn').classList.add('hidden');
        document.getElementById('gameControls').classList.remove('hidden');
        
        resetBall();
        startTimer();
        gameLoop();
    }

    function resetGame() {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        stopTimer();
        resetGameState();
        gameState.gameActive = true;
        gameState.gamePaused = false;
        resetBall();
        startTimer();
        gameLoop();
    }

    function resetGameState() {
        paddle1.y = (canvas.height - paddle1.height) / 2;
        paddle2.y = (canvas.height - paddle2.height) / 2;
        paddle1.dy = 0;
        paddle2.dy = 0;
        
        keys.w = false;
        keys.s = false;
        keys.arrowUp = false;
        keys.arrowDown = false;
        
        particles = [];
    }

    function resetBall() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.trail = [];
        
        var angle = (Math.random() * Math.PI / 3) - Math.PI / 6;
        var direction = Math.random() > 0.5 ? 1 : -1;
        
        updateBallSpeed();
        ball.dx = ball.speed * Math.cos(angle) * direction;
        ball.dy = ball.speed * Math.sin(angle);
    }

    function updateBallSpeed() {
        switch(gameState.ballSpeed) {
            case 'slow':
                ball.speed = 4;
                break;
            case 'normal':
                ball.speed = 6;
                break;
            case 'fast':
                ball.speed = 8;
                break;
        }
    }

    function togglePause() {
        if (!gameState.gameActive || gameState.gameOver) return;
        
        gameState.gamePaused = !gameState.gamePaused;
        
        if (gameState.gamePaused) {
            showOverlay('pauseOverlay');
            stopTimer();
        } else {
            hideOverlay('pauseOverlay');
            startTimer();
            gameLoop();
        }
    }

    function gameLoop(currentTime) {
        if (!gameState.gameActive || gameState.gamePaused || gameState.gameOver) return;
        
        animationId = requestAnimationFrame(gameLoop);
        
        if (settings.showFps) {
            updateFPS(currentTime);
        }
        
        update();
        draw();
    }

    function update() {
        updatePaddles();
        updateBall();
        updateParticles();
        checkCollisions();
        checkScore();
        
        if (gameState.messageTimer > 0) {
            gameState.messageTimer--;
            if (gameState.messageTimer === 0) {
                gameState.showMessage = '';
            }
        }
    }

    function updatePaddles() {
        if (keys.w) {
            paddle1.dy = -paddle1.speed;
        } else if (keys.s) {
            paddle1.dy = paddle1.speed;
        } else {
            paddle1.dy = 0;
        }
        
        paddle1.y += paddle1.dy;
        paddle1.y = Math.max(0, Math.min(canvas.height - paddle1.height, paddle1.y));
        
        if (gameState.gameMode === 'twoPlayers') {
            if (keys.arrowUp) {
                paddle2.dy = -paddle2.speed;
            } else if (keys.arrowDown) {
                paddle2.dy = paddle2.speed;
            } else {
                paddle2.dy = 0;
            }
        } else {
            updateComputerPaddle();
        }
        
        paddle2.y += paddle2.dy;
        paddle2.y = Math.max(0, Math.min(canvas.height - paddle2.height, paddle2.y));
    }

    function updateComputerPaddle() {
        var paddleCenter = paddle2.y + paddle2.height / 2;
        var ballPrediction = ball.y;
        
        var reactionSpeed;
        switch(gameState.difficulty) {
            case 'easy':
                reactionSpeed = 0.3;
                break;
            case 'medium':
                reactionSpeed = 0.6;
                break;
            case 'hard':
                reactionSpeed = 0.95;
                break;
        }
        
        var diff = ballPrediction - paddleCenter;
        
        if (Math.abs(diff) > 10) {
            paddle2.dy = Math.sign(diff) * paddle2.speed * reactionSpeed;
        } else {
            paddle2.dy = 0;
        }
    }

    function updateBall() {
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
            ball.dy = -ball.dy;
            playSound('hit');
        }
    }

    function checkCollisions() {
        if (ball.x - ball.radius <= paddle1.x + paddle1.width &&
            ball.y >= paddle1.y &&
            ball.y <= paddle1.y + paddle1.height &&
            ball.dx < 0) {
            
            var hitPos = (ball.y - paddle1.y) / paddle1.height;
            var angle = (hitPos - 0.5) * Math.PI / 3;
            var speed = Math.min(Math.abs(ball.dx) * 1.05, ball.maxSpeed);
            
            ball.dx = speed * Math.cos(angle);
            ball.dy = speed * Math.sin(angle);
            ball.x = paddle1.x + paddle1.width + ball.radius;
            
            createParticles(ball.x, ball.y, 8);
            playSound('hit');
        }
        
        if (ball.x + ball.radius >= paddle2.x &&
            ball.y >= paddle2.y &&
            ball.y <= paddle2.y + paddle2.height &&
            ball.dx > 0) {
            
            var hitPos = (ball.y - paddle2.y) / paddle2.height;
            var angle = (hitPos - 0.5) * Math.PI / 3;
            var speed = Math.min(Math.abs(ball.dx) * 1.05, ball.maxSpeed);
            
            ball.dx = -speed * Math.cos(angle);
            ball.dy = speed * Math.sin(angle);
            ball.x = paddle2.x - ball.radius;
            
            createParticles(ball.x, ball.y, 8);
            playSound('hit');
        }
    }

    function checkScore() {
        if (ball.x - ball.radius <= 0) {
            gameState.player2Score++;
            updateScoreDisplay();
            playSound('score');
            
            var lang = window.ToolWrapper ? window.ToolWrapper.getCurrentLanguage() : 'fa';
            gameState.showMessage = lang === 'fa' ? 'امتیاز بازیکن ۲!' : 'Player 2 Scores!';
            gameState.messageTimer = 60;
            
            if (gameState.player2Score >= gameState.winScore) {
                endGame(2);
            } else {
                resetBall();
            }
        }
        
        if (ball.x + ball.radius >= canvas.width) {
            gameState.player1Score++;
            updateScoreDisplay();
            playSound('score');
            
            var lang = window.ToolWrapper ? window.ToolWrapper.getCurrentLanguage() : 'fa';
            gameState.showMessage = lang === 'fa' ? 'امتیاز بازیکن ۱!' : 'Player 1 Scores!';
            gameState.messageTimer = 60;
            
            if (gameState.player1Score >= gameState.winScore) {
                endGame(1);
            } else {
                resetBall();
            }
        }
    }

    function draw() {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        drawNet();
        drawParticles();
        drawPaddle(paddle1);
        drawPaddle(paddle2);
        drawBall();
        
        if (settings.showFps) {
            drawFPS();
        }
    }

    function drawInitialScreen() {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        drawNet();
        
        paddle1.y = (canvas.height - paddle1.height) / 2;
        paddle2.y = (canvas.height - paddle2.height) / 2;
        drawPaddle(paddle1);
        drawPaddle(paddle2);
        
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        drawBall();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '24px Vazirmatn';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var lang = window.ToolWrapper ? window.ToolWrapper.getCurrentLanguage() : 'fa';
        var text = lang === 'fa' ? 'شروع بازی را بزنید' : 'Press Start Game';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 60);
    }

    function drawNet() {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawScoresOnCanvas() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = 'bold 48px Vazirmatn';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        ctx.fillText(gameState.player1Score.toString(), canvas.width / 4, 30);
        ctx.fillText(gameState.player2Score.toString(), (canvas.width * 3) / 4, 30);
    }

    function drawPaddle(paddle) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    }

    function drawBall() {
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function drawBallTrail() {
        for (var i = 0; i < ball.trail.length; i++) {
            var alpha = (i + 1) / ball.trail.length * 0.3;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ball.trail[i].x, ball.trail[i].y, ball.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    function createParticles(x, y, count) {
        for (var i = 0; i < count; i++) {
            var angle = (Math.PI * 2 * i) / count;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * (2 + Math.random() * 2),
                vy: Math.sin(angle) * (2 + Math.random() * 2),
                life: 1.0,
                size: 2 + Math.random() * 2
            });
        }
    }

    function updateParticles() {
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function drawParticles() {
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.globalAlpha = p.life;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    function drawFPS() {
        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('FPS: ' + fps.fps, 10, 20);
    }

    function drawMessage(message) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px Vazirmatn';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }

    function updateFPS(currentTime) {
        if (!currentTime) return;
        
        fps.frames++;
        var elapsed = currentTime - fps.lastTime;
        
        if (elapsed >= 1000) {
            fps.fps = Math.round((fps.frames * 1000) / elapsed);
            fps.frames = 0;
            fps.lastTime = currentTime;
        }
    }

    function endGame(winner) {
        gameState.gameOver = true;
        gameState.gameActive = false;
        stopTimer();
        
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        saveGameToHistory(winner);
        updateStats(winner);
        showGameOver(winner);
        
        document.getElementById('startBtn').classList.remove('hidden');
        document.getElementById('gameControls').classList.add('hidden');
    }

    function showGameOver(winner) {
        var lang = window.ToolWrapper ? window.ToolWrapper.getCurrentLanguage() : 'fa';
        var overlayMessage = document.getElementById('overlayMessage');
        
        if (lang === 'fa') {
            overlayMessage.textContent = 'بازیکن ' + winner + ' برنده شد!\nامتیاز: ' + 
                gameState.player1Score + ' - ' + gameState.player2Score;
        } else {
            overlayMessage.textContent = 'Player ' + winner + ' wins!\nScore: ' + 
                gameState.player1Score + ' - ' + gameState.player2Score;
        }
        
        showOverlay('gameOverlay');
        playSound('win');
    }

    function showOverlay(overlayId) {
        document.getElementById(overlayId).classList.remove('hidden');
    }

    function hideOverlay(overlayId) {
        document.getElementById(overlayId).classList.add('hidden');
    }

    function startTimer() {
        gameState.startTime = Date.now() - gameState.elapsedTime;
        gameState.timerInterval = setInterval(updateTimer, 100);
    }

    function stopTimer() {
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
        }
    }

    function updateTimer() {
        gameState.elapsedTime = Date.now() - gameState.startTime;
        var seconds = Math.floor(gameState.elapsedTime / 1000);
        var minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        
        var timerDisplay = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        document.getElementById('timerValue').textContent = timerDisplay;
    }

    function updateScoreDisplay() {
        document.getElementById('player1Score').textContent = gameState.player1Score;
        document.getElementById('player2Score').textContent = gameState.player2Score;
    }

    function toggleDifficultyDisplay() {
        var difficultyGroup = document.querySelector('.difficulty-group');
        if (gameState.gameMode === 'vsComputer') {
            difficultyGroup.classList.add('visible');
        } else {
            difficultyGroup.classList.remove('visible');
        }
    }

    function playSound(type) {
        if (!settings.soundEffects) return;
        
        var audioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioContext) return;
        
        var context = new audioContext();
        var oscillator = context.createOscillator();
        var gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        switch(type) {
            case 'hit':
                oscillator.frequency.value = 300;
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(context.currentTime + 0.05);
                break;
            case 'score':
                oscillator.frequency.value = 200;
                gainNode.gain.value = 0.15;
                oscillator.start();
                oscillator.stop(context.currentTime + 0.1);
                break;
            case 'win':
                oscillator.frequency.value = 500;
                gainNode.gain.value = 0.2;
                oscillator.start();
                oscillator.stop(context.currentTime + 0.2);
                break;
        }
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
        document.getElementById('player1WinsValue').textContent = gameStats.player1Wins;
        document.getElementById('player2WinsValue').textContent = gameStats.player2Wins;
        
        document.getElementById('avgGameTimeValue').textContent = calculateAverageTime();
        
        displayHistory();
    }

    function calculateAverageTime() {
        if (gameStats.gamesHistory.length === 0) return '0:00';
        
        var totalSeconds = gameStats.gamesHistory.reduce(function(sum, game) {
            return sum + game.duration;
        }, 0);
        
        var avgSeconds = Math.floor(totalSeconds / gameStats.gamesHistory.length);
        var minutes = Math.floor(avgSeconds / 60);
        var seconds = avgSeconds % 60;
        
        return minutes + ':' + String(seconds).padStart(2, '0');
    }

    function displayHistory() {
        var historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        if (gameStats.gamesHistory.length === 0) {
            var lang = window.ToolWrapper ? window.ToolWrapper.getCurrentLanguage() : 'fa';
            historyList.innerHTML = '<p style="text-align: center; opacity: 0.7;">' + 
                (lang === 'fa' ? 'هنوز بازی‌ای انجام نشده است' : 'No games played yet') + '</p>';
            return;
        }
        
        var recentGames = gameStats.gamesHistory.slice(-10).reverse();
        
        recentGames.forEach(function(game) {
            var item = document.createElement('div');
            item.className = 'history-item';
            
            var lang = window.ToolWrapper ? window.ToolWrapper.getCurrentLanguage() : 'fa';
            var winnerText = lang === 'fa' ? 'بازیکن ' + game.winner : 'Player ' + game.winner;
            
            item.innerHTML = 
                '<div class="history-winner">' + winnerText + '</div>' +
                '<div class="history-score">' + game.score + '</div>' +
                '<div class="history-time">' + game.time + '</div>' +
                '<div class="history-time">' + game.date + '</div>';
            
            historyList.appendChild(item);
        });
    }

    function saveGameToHistory(winner) {
        var now = new Date();
        var date = now.toLocaleDateString('fa-IR');
        var time = now.toLocaleTimeString('fa-IR', {hour: '2-digit', minute: '2-digit'});
        var duration = Math.floor(gameState.elapsedTime / 1000);
        
        gameStats.gamesHistory.push({
            winner: winner,
            score: gameState.player1Score + ' - ' + gameState.player2Score,
            date: date,
            time: time,
            duration: duration
        });
        
        saveStats();
    }

    function updateStats(winner) {
        gameStats.totalGames++;
        
        if (winner === 1) {
            gameStats.player1Wins++;
        } else {
            gameStats.player2Wins++;
        }
        
        saveStats();
    }

    function resetStats() {
        var lang = window.ToolWrapper ? window.ToolWrapper.getCurrentLanguage() : 'fa';
        var message = lang === 'fa' ? 
            'آیا مطمئن هستید که می‌خواهید آمار را بازنشانی کنید؟' :
            'Are you sure you want to reset statistics?';
        
        if (confirm(message)) {
            gameStats = {
                totalGames: 0,
                player1Wins: 0,
                player2Wins: 0,
                gamesHistory: []
            };
            
            saveStats();
            updateStatsDisplay();
        }
    }

    function loadSettings() {
        try {
            var saved = localStorage.getItem('pingPongSettings');
            if (saved) {
                var loaded = JSON.parse(saved);
                settings = Object.assign(settings, loaded);
                
                document.getElementById('soundEffectsCheck').checked = settings.soundEffects;
                document.getElementById('showFpsCheck').checked = settings.showFps;
            }
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem('pingPongSettings', JSON.stringify(settings));
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    }

    function loadStats() {
        try {
            var saved = localStorage.getItem('pingPongStats');
            if (saved) {
                gameStats = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading stats:', e);
        }
    }

    function saveStats() {
        try {
            localStorage.setItem('pingPongStats', JSON.stringify(gameStats));
        } catch (e) {
            console.error('Error saving stats:', e);
        }
    }

    function updateUI() {
        toggleDifficultyDisplay();
    }

    return {
        init: init
    };
})();

document.addEventListener('DOMContentLoaded', function() {
    PingPongGame.init();
});

