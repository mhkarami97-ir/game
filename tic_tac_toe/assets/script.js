var TicTacToeGame = (function() {
    'use strict';

    var gameState = {
        board: Array(9).fill(null),
        currentPlayer: 'X',
        gameMode: 'twoPlayers',
        difficulty: 'medium',
        gameActive: false,
        gameOver: false,
        winner: null,
        winningLine: null,
        moveHistory: [],
        playerNames: {X: 'Player X', O: 'Player O'},
        computerThinking: false,
        boardSize: 3
    };

    var gameStats = {
        totalGames: 0,
        playerXWins: 0,
        playerOWins: 0,
        draws: 0,
        gamesHistory: []
    };

    var settings = {
        soundEffects: true,
        animations: true,
        autoRestart: false,
        showHints: false,
        thinkingTime: 'normal',
        firstPlayer: 'X'
    };

    var winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    function init() {
        loadSettings();
        loadStats();
        setupEventListeners();
        renderBoard();
        updateUI();
        updateScoreDisplay();
    }

    function setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', startGame);
        document.getElementById('newGameBtn').addEventListener('click', resetGame);
        document.getElementById('undoBtn').addEventListener('click', undoMove);
        document.getElementById('hintBtn').addEventListener('click', showHint);
        document.getElementById('statsBtn').addEventListener('click', openStatsModal);
        document.getElementById('statsModalClose').addEventListener('click', closeStatsModal);
        document.getElementById('closeStatsBtn').addEventListener('click', closeStatsModal);
        document.getElementById('resetStatsBtn').addEventListener('click', resetStats);
        
        document.getElementById('gameModeSelect').addEventListener('change', function(e) {
            gameState.gameMode = e.target.value;
            saveSettings();
            toggleDifficultyDisplay();
        });
        
        document.getElementById('difficultySelect').addEventListener('change', function(e) {
            gameState.difficulty = e.target.value;
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

        window.addEventListener('languageChanged', function() {
            if (window.ToolWrapper) {
                window.ToolWrapper.applyTranslations(window.ToolWrapper.getCurrentLanguage());
            }
        });
    }

    function renderBoard() {
        var boardElement = document.getElementById('gameBoard');
        boardElement.innerHTML = '';
        
        for (var i = 0; i < 9; i++) {
            var cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.addEventListener('click', handleCellClick);
            boardElement.appendChild(cell);
        }
    }

    function handleCellClick(e) {
        if (!gameState.gameActive || gameState.gameOver) return;
        
        var index = parseInt(e.target.dataset.index);
        
        if (gameState.board[index] !== null) return;
        
        if (gameState.gameMode === 'vsComputer' && gameState.currentPlayer === 'O') return;
        
        makeMove(index);
    }

    function makeMove(index) {
        if (gameState.board[index] !== null) return;
        
        gameState.board[index] = gameState.currentPlayer;
        gameState.moveHistory.push({player: gameState.currentPlayer, index: index});
        
        updateCell(index);
        
        if (settings.soundEffects) {
            playSound('move');
        }
        
        if (checkWinner()) {
            endGame(gameState.currentPlayer);
            return;
        }
        
        if (checkDraw()) {
            endGame(null);
            return;
        }
        
        gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
        
        if (gameState.gameMode === 'vsComputer' && gameState.currentPlayer === 'O') {
            gameState.computerThinking = true;
            
            var delay = settings.thinkingTime === 'fast' ? 300 : 
                       settings.thinkingTime === 'slow' ? 1000 : 600;
            
            setTimeout(function() {
                computerMove();
                gameState.computerThinking = false;
            }, delay);
        }
    }

    function computerMove() {
        var move;
        
        if (gameState.difficulty === 'easy') {
            move = getRandomMove();
        } else if (gameState.difficulty === 'medium') {
            move = Math.random() < 0.5 ? getBestMove() : getRandomMove();
        } else {
            move = getBestMove();
        }
        
        if (move !== -1) {
            makeMove(move);
        }
    }

    function getRandomMove() {
        var availableMoves = [];
        for (var i = 0; i < gameState.board.length; i++) {
            if (gameState.board[i] === null) {
                availableMoves.push(i);
            }
        }
        
        if (availableMoves.length === 0) return -1;
        
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    function getBestMove() {
        return getBestMoveForPlayer('O');
    }

    function getBestMoveForPlayer(player) {
        var isMaximizing = player === 'O';
        var bestScore = isMaximizing ? -Infinity : Infinity;
        var bestMove = -1;
        
        for (var i = 0; i < gameState.board.length; i++) {
            if (gameState.board[i] === null) {
                gameState.board[i] = player;
                var score = minimax(gameState.board, 0, !isMaximizing);
                gameState.board[i] = null;
                
                if (isMaximizing) {
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = i;
                    }
                } else {
                    if (score < bestScore) {
                        bestScore = score;
                        bestMove = i;
                    }
                }
            }
        }
        
        return bestMove;
    }

    function minimax(board, depth, isMaximizing) {
        var result = checkWinnerForMinimax(board);
        
        if (result !== null) {
            if (result === 'O') return 10 - depth;
            if (result === 'X') return depth - 10;
            return 0;
        }
        
        if (isMaximizing) {
            var bestScore = -Infinity;
            for (var i = 0; i < board.length; i++) {
                if (board[i] === null) {
                    board[i] = 'O';
                    var score = minimax(board, depth + 1, false);
                    board[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            var bestScore = Infinity;
            for (var i = 0; i < board.length; i++) {
                if (board[i] === null) {
                    board[i] = 'X';
                    var score = minimax(board, depth + 1, true);
                    board[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    function checkWinnerForMinimax(board) {
        for (var i = 0; i < winPatterns.length; i++) {
            var pattern = winPatterns[i];
            var a = board[pattern[0]];
            var b = board[pattern[1]];
            var c = board[pattern[2]];
            
            if (a && a === b && a === c) {
                return a;
            }
        }
        
        var boardFull = true;
        for (var j = 0; j < board.length; j++) {
            if (board[j] === null) {
                boardFull = false;
                break;
            }
        }
        
        if (boardFull) return 'draw';
        
        return null;
    }

    function updateCell(index) {
        var cells = document.querySelectorAll('.cell');
        var cell = cells[index];
        
        cell.textContent = gameState.board[index];
        cell.classList.add('filled');
        
        if (settings.animations) {
            cell.classList.add('pop');
            setTimeout(function() {
                cell.classList.remove('pop');
            }, 300);
        }
    }

    function checkWinner() {
        for (var i = 0; i < winPatterns.length; i++) {
            var pattern = winPatterns[i];
            var a = gameState.board[pattern[0]];
            var b = gameState.board[pattern[1]];
            var c = gameState.board[pattern[2]];
            
            if (a && a === b && a === c) {
                gameState.winner = a;
                gameState.winningLine = pattern;
                return true;
            }
        }
        
        return false;
    }

    function checkDraw() {
        return gameState.board.every(function(cell) {
            return cell !== null;
        });
    }

    function endGame(winner) {
        gameState.gameOver = true;
        gameState.gameActive = false;
        
        var overlayMessage = document.getElementById('overlayMessage');
        
        if (winner) {
            if (overlayMessage) {
                overlayMessage.setAttribute('data-i18n', 'playerWins');
                overlayMessage.setAttribute('data-i18n-replace', '{player}');
                overlayMessage.setAttribute('data-i18n-value', winner);
            }
            highlightWinningLine();
            
            if (winner === 'X') {
                gameStats.playerXWins++;
            } else {
                gameStats.playerOWins++;
            }
        } else {
            if (overlayMessage) {
                overlayMessage.setAttribute('data-i18n', 'draw');
            }
            gameStats.draws++;
        }
        
        gameStats.totalGames++;
        
        var gameRecord = {
            date: new Date().toISOString(),
            winner: winner || 'draw',
            moves: gameState.moveHistory.length
        };
        
        gameStats.gamesHistory.unshift(gameRecord);
        if (gameStats.gamesHistory.length > 10) {
            gameStats.gamesHistory = gameStats.gamesHistory.slice(0, 10);
        }
        
        saveStats();
        updateStatsDisplay();
        updateScoreDisplay();
        
        var overlay = document.getElementById('gameOverlay');
        overlay.classList.remove('hidden');
        if (settings.animations) {
            overlay.classList.add('fade-in');
        }
        
        if (window.ToolWrapper) {
            window.ToolWrapper.applyTranslations(window.ToolWrapper.getCurrentLanguage());
        }
        
        if (settings.soundEffects) {
            playSound(winner ? 'win' : 'draw');
        }
        
        if (settings.autoRestart) {
            setTimeout(resetGame, 3000);
        }
    }

    function highlightWinningLine() {
        if (!gameState.winningLine) return;
        
        var cells = document.querySelectorAll('.cell');
        gameState.winningLine.forEach(function(index) {
            cells[index].classList.add('winning');
        });
    }

    function startGame() {
        gameState.gameActive = true;
        gameState.gameOver = false;
        document.getElementById('startBtn').classList.add('hidden');
        document.getElementById('gameControls').classList.remove('hidden');
        document.getElementById('gameOverlay').classList.add('hidden');
    }

    function resetGame() {
        gameState.board = Array(9).fill(null);
        gameState.currentPlayer = settings.firstPlayer;
        gameState.gameOver = false;
        gameState.winner = null;
        gameState.winningLine = null;
        gameState.moveHistory = [];
        
        var cells = document.querySelectorAll('.cell');
        cells.forEach(function(cell) {
            cell.textContent = '';
            cell.classList.remove('filled', 'winning', 'pop', 'hint');
        });
        
        document.getElementById('gameOverlay').classList.add('hidden');
        
        if (!gameState.gameActive) {
            startGame();
        }
        
        if (gameState.gameMode === 'vsComputer' && gameState.currentPlayer === 'O') {
            setTimeout(computerMove, 600);
        }
    }

    function undoMove() {
        if (gameState.moveHistory.length === 0 || gameState.gameOver) return;
        
        var movesToUndo = gameState.gameMode === 'vsComputer' ? 2 : 1;
        
        for (var i = 0; i < movesToUndo && gameState.moveHistory.length > 0; i++) {
            var lastMove = gameState.moveHistory.pop();
            gameState.board[lastMove.index] = null;
            
            var cells = document.querySelectorAll('.cell');
            cells[lastMove.index].textContent = '';
            cells[lastMove.index].classList.remove('filled');
            
            gameState.currentPlayer = lastMove.player;
        }
    }

    function showHint() {
        if (gameState.gameOver || !gameState.gameActive) return;
        
        if (gameState.gameMode === 'vsComputer' && gameState.currentPlayer === 'O') return;
        
        var bestMove = gameState.currentPlayer === 'X' ? getBestMoveForPlayer('X') : getBestMove();
        
        if (bestMove !== -1) {
            var cells = document.querySelectorAll('.cell');
            cells[bestMove].classList.add('hint');
            
            setTimeout(function() {
                cells[bestMove].classList.remove('hint');
            }, 1000);
        }
    }

    function toggleDifficultyDisplay() {
        var difficultyGroup = document.querySelector('.difficulty-group');
        if (gameState.gameMode === 'vsComputer') {
            difficultyGroup.classList.remove('hidden');
        } else {
            difficultyGroup.classList.add('hidden');
        }
    }

    function openStatsModal() {
        updateStatsDisplay();
        document.getElementById('statsModal').classList.remove('hidden');
    }

    function closeStatsModal() {
        document.getElementById('statsModal').classList.add('hidden');
    }

    function updateScoreDisplay() {
        document.getElementById('playerXScore').textContent = gameStats.playerXWins;
        document.getElementById('playerOScore').textContent = gameStats.playerOWins;
    }

    function updateStatsDisplay() {
        document.getElementById('totalGamesValue').textContent = gameStats.totalGames;
        document.getElementById('playerXWinsValue').textContent = gameStats.playerXWins;
        document.getElementById('playerOWinsValue').textContent = gameStats.playerOWins;
        document.getElementById('drawsValue').textContent = gameStats.draws;
        
        var historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        var currentLang = document.documentElement.lang || 'fa';
        
        gameStats.gamesHistory.forEach(function(game, index) {
            var item = document.createElement('div');
            item.className = 'history-item';
            
            var date = new Date(game.date);
            var dateStr = date.toLocaleDateString(currentLang === 'fa' ? 'fa-IR' : 'en-US');
            var timeStr = date.toLocaleTimeString(currentLang === 'fa' ? 'fa-IR' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            var winnerText = game.winner === 'draw' ? (currentLang === 'fa' ? 'مساوی' : 'Draw') : (currentLang === 'fa' ? 'بازیکن ' : 'Player ') + game.winner;
            
            item.innerHTML = '<span class="history-rank">' + (index + 1) + '</span>' +
                           '<span class="history-winner">' + winnerText + '</span>' +
                           '<span class="history-date">' + dateStr + ' ' + timeStr + '</span>';
            
            historyList.appendChild(item);
        });
        
        if (gameStats.gamesHistory.length === 0) {
            var noData = currentLang === 'fa' ? 'هنوز بازی انجام نشده' : 'No games yet';
            historyList.innerHTML = '<p class="no-data">' + noData + '</p>';
        }
    }

    function resetStats() {
        var currentLang = document.documentElement.lang || 'fa';
        var confirmMessage = currentLang === 'fa' ? 'آیا مطمئن هستید که می‌خواهید آمار را بازنشانی کنید؟' : 'Are you sure you want to reset statistics?';
        
        if (confirm(confirmMessage)) {
            gameStats = {
                totalGames: 0,
                playerXWins: 0,
                playerOWins: 0,
                draws: 0,
                gamesHistory: []
            };
            
            saveStats();
            updateStatsDisplay();
        }
    }

    function loadSettings() {
        try {
            var savedSettings = localStorage.getItem('ticTacToeSettings');
            if (savedSettings) {
                var parsed = JSON.parse(savedSettings);
                settings = Object.assign(settings, parsed);
            }
            
            var savedGameState = localStorage.getItem('ticTacToeGameState');
            if (savedGameState) {
                var parsedState = JSON.parse(savedGameState);
                gameState.gameMode = parsedState.gameMode || gameState.gameMode;
                gameState.difficulty = parsedState.difficulty || gameState.difficulty;
            }
            
            document.getElementById('gameModeSelect').value = gameState.gameMode;
            document.getElementById('difficultySelect').value = gameState.difficulty;
            document.getElementById('soundEffectsCheck').checked = settings.soundEffects;
            document.getElementById('animationsCheck').checked = settings.animations;
            
            toggleDifficultyDisplay();
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem('ticTacToeSettings', JSON.stringify(settings));
            localStorage.setItem('ticTacToeGameState', JSON.stringify({
                gameMode: gameState.gameMode,
                difficulty: gameState.difficulty
            }));
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    }

    function loadStats() {
        try {
            var savedStats = localStorage.getItem('ticTacToeStats');
            if (savedStats) {
                gameStats = JSON.parse(savedStats);
            }
        } catch (e) {
            console.error('Error loading stats:', e);
        }
    }

    function saveStats() {
        try {
            localStorage.setItem('ticTacToeStats', JSON.stringify(gameStats));
        } catch (e) {
            console.error('Error saving stats:', e);
        }
    }

    function playSound(type) {
        var audioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioContext) return;
        
        var context = new audioContext();
        var oscillator = context.createOscillator();
        var gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        if (type === 'move') {
            oscillator.frequency.value = 400;
            gainNode.gain.setValueAtTime(0.3, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.1);
        } else if (type === 'win') {
            oscillator.frequency.value = 600;
            gainNode.gain.setValueAtTime(0.3, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.3);
        } else if (type === 'draw') {
            oscillator.frequency.value = 300;
            gainNode.gain.setValueAtTime(0.3, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.2);
        }
    }

    function updateUI() {
        updateStatsDisplay();
    }

    return {
        init: init
    };
})();

document.addEventListener('DOMContentLoaded', function() {
    TicTacToeGame.init();
});
