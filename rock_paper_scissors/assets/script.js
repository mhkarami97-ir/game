var RockPaperScissorsGame = (function() {
    'use strict';

    var gameState = {
        playerScore: 0,
        computerScore: 0,
        roundNumber: 0,
        gameMode: 'bestOf5',
        difficulty: 'medium',
        isPlaying: false,
        currentRound: null,
        maxRounds: 5
    };

    var gameStats = {
        totalGames: 0,
        playerWins: 0,
        playerLosses: 0,
        draws: 0,
        gamesHistory: []
    };

    var settings = {
        animations: true,
        sound: true
    };

    var choices = ['rock', 'paper', 'scissors'];
    
    var choiceIcons = {
        rock: '✊',
        paper: '✋',
        scissors: '✌️'
    };

    var playerHistory = [];
    var roundHistory = [];

    function init() {
        loadSettings();
        loadStats();
        setupEventListeners();
        updateUI();
    }

    function setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', startGame);
        document.getElementById('resetBtn').addEventListener('click', resetGame);
        document.getElementById('playAgainBtn').addEventListener('click', playAgain);
        document.getElementById('closeModalBtn').addEventListener('click', closeModal);
        document.getElementById('resetStatsBtn').addEventListener('click', resetStats);

        var choiceBtns = document.querySelectorAll('.choice-btn');
        choiceBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                handlePlayerChoice(this.dataset.choice);
            });
        });

        document.getElementById('gameModeSelect').addEventListener('change', function(e) {
            gameState.gameMode = e.target.value;
            updateMaxRounds();
            saveSettings();
        });

        document.getElementById('difficultySelect').addEventListener('change', function(e) {
            gameState.difficulty = e.target.value;
            saveSettings();
        });

        document.getElementById('animationsCheck').addEventListener('change', function(e) {
            settings.animations = e.target.checked;
            saveSettings();
        });

        document.getElementById('soundCheck').addEventListener('change', function(e) {
            settings.sound = e.target.checked;
            saveSettings();
        });

        window.addEventListener('languageChanged', function() {
            if (window.ToolWrapper) {
                window.ToolWrapper.applyTranslations(window.ToolWrapper.getCurrentLanguage());
            }
            updateUI();
        });
    }

    function startGame() {
        gameState.isPlaying = true;
        gameState.playerScore = 0;
        gameState.computerScore = 0;
        gameState.roundNumber = 0;
        playerHistory = [];
        roundHistory = [];

        updateMaxRounds();
        enableChoices();
        updateUI();

        document.getElementById('startBtn').classList.add('hidden');
        document.getElementById('resetBtn').classList.remove('hidden');

        resetChoiceDisplays();
    }

    function updateMaxRounds() {
        switch(gameState.gameMode) {
            case 'bestOf3':
                gameState.maxRounds = 2;
                break;
            case 'bestOf5':
                gameState.maxRounds = 3;
                break;
            case 'bestOf7':
                gameState.maxRounds = 4;
                break;
            default:
                gameState.maxRounds = Infinity;
        }
    }

    function resetGame() {
        if (gameState.isPlaying) {
            if (!confirm(getTranslation('confirmReset'))) {
                return;
            }
        }
        
        gameState.isPlaying = false;
        gameState.playerScore = 0;
        gameState.computerScore = 0;
        gameState.roundNumber = 0;
        playerHistory = [];
        roundHistory = [];

        disableChoices();
        resetChoiceDisplays();
        updateUI();

        document.getElementById('startBtn').classList.remove('hidden');
        document.getElementById('resetBtn').classList.add('hidden');
    }

    function handlePlayerChoice(choice) {
        if (!gameState.isPlaying) return;

        gameState.roundNumber++;
        playerHistory.push(choice);

        var computerChoice = getComputerChoice();
        var result = determineWinner(choice, computerChoice);

        if (result === 'win') {
            gameState.playerScore++;
        } else if (result === 'lose') {
            gameState.computerScore++;
        }

        roundHistory.push({
            round: gameState.roundNumber,
            playerChoice: choice,
            computerChoice: computerChoice,
            result: result
        });

        displayRound(choice, computerChoice, result);
        updateUI();

        if (checkGameOver()) {
            endGame();
        }
    }

    function getComputerChoice() {
        if (gameState.difficulty === 'easy') {
            return getRandomChoice();
        } else if (gameState.difficulty === 'medium') {
            if (Math.random() < 0.3 && playerHistory.length > 0) {
                return getCounterChoice(playerHistory[playerHistory.length - 1]);
            }
            return getRandomChoice();
        } else if (gameState.difficulty === 'hard') {
            if (playerHistory.length >= 3) {
                var pattern = analyzePattern();
                if (pattern) {
                    return getCounterChoice(pattern);
                }
            }
            if (Math.random() < 0.6 && playerHistory.length > 0) {
                return getCounterChoice(playerHistory[playerHistory.length - 1]);
            }
            return getRandomChoice();
        }
        return getRandomChoice();
    }

    function getRandomChoice() {
        return choices[Math.floor(Math.random() * choices.length)];
    }

    function getCounterChoice(choice) {
        var counters = {
            rock: 'paper',
            paper: 'scissors',
            scissors: 'rock'
        };
        return counters[choice];
    }

    function analyzePattern() {
        if (playerHistory.length < 3) return null;

        var lastThree = playerHistory.slice(-3);
        var rockCount = 0, paperCount = 0, scissorsCount = 0;

        lastThree.forEach(function(choice) {
            if (choice === 'rock') rockCount++;
            else if (choice === 'paper') paperCount++;
            else if (choice === 'scissors') scissorsCount++;
        });

        if (rockCount > paperCount && rockCount > scissorsCount) return 'rock';
        if (paperCount > rockCount && paperCount > scissorsCount) return 'paper';
        if (scissorsCount > rockCount && scissorsCount > paperCount) return 'scissors';

        return null;
    }

    function determineWinner(playerChoice, computerChoice) {
        if (playerChoice === computerChoice) return 'draw';

        var winConditions = {
            rock: 'scissors',
            paper: 'rock',
            scissors: 'paper'
        };

        return winConditions[playerChoice] === computerChoice ? 'win' : 'lose';
    }

    function displayRound(playerChoice, computerChoice, result) {
        var playerDisplay = document.getElementById('playerChoice');
        var computerDisplay = document.getElementById('computerChoice');
        var resultDisplay = document.getElementById('resultDisplay');
        var resultText = document.getElementById('resultText');

        playerDisplay.querySelector('.choice-icon').textContent = choiceIcons[playerChoice];
        computerDisplay.querySelector('.choice-icon').textContent = choiceIcons[computerChoice];

        if (settings.animations) {
            playerDisplay.classList.add('spin');
            computerDisplay.classList.add('spin');
            setTimeout(function() {
                playerDisplay.classList.remove('spin');
                computerDisplay.classList.remove('spin');
            }, 500);
        }

        playerDisplay.className = 'choice-display';
        computerDisplay.className = 'choice-display';
        resultDisplay.className = 'result-display';

        if (result === 'win') {
            playerDisplay.classList.add('player-won');
            resultDisplay.classList.add('win');
            resultText.textContent = getTranslation('youWin');
        } else if (result === 'lose') {
            computerDisplay.classList.add('computer-won');
            resultDisplay.classList.add('lose');
            resultText.textContent = getTranslation('youLose');
        } else {
            playerDisplay.classList.add('draw');
            computerDisplay.classList.add('draw');
            resultDisplay.classList.add('draw');
            resultText.textContent = getTranslation('draw');
        }
    }

    function checkGameOver() {
        if (gameState.gameMode === 'unlimited') return false;
        return gameState.playerScore > gameState.maxRounds || 
               gameState.computerScore > gameState.maxRounds;
    }

    function endGame() {
        gameState.isPlaying = false;
        disableChoices();

        var winner = gameState.playerScore > gameState.computerScore ? 'player' : 'computer';
        
        gameStats.totalGames++;
        if (winner === 'player') {
            gameStats.playerWins++;
        } else {
            gameStats.playerLosses++;
        }

        gameStats.gamesHistory.unshift({
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            playerScore: gameState.playerScore,
            computerScore: gameState.computerScore,
            winner: winner,
            rounds: gameState.roundNumber
        });

        if (gameStats.gamesHistory.length > 10) {
            gameStats.gamesHistory = gameStats.gamesHistory.slice(0, 10);
        }

        saveStats();
        updateUI();
        showGameOverModal(winner);
    }

    function showGameOverModal(winner) {
        var modal = document.getElementById('gameOverModal');
        var modalResult = document.getElementById('modalResult');
        var modalFinalScore = document.getElementById('modalFinalScore');
        var modalTotalRounds = document.getElementById('modalTotalRounds');

        if (winner === 'player') {
            modalResult.textContent = getTranslation('youWonGame');
        } else {
            modalResult.textContent = getTranslation('youLostGame');
        }

        modalFinalScore.textContent = gameState.playerScore + ' - ' + gameState.computerScore;
        modalTotalRounds.textContent = gameState.roundNumber;

        modal.classList.remove('hidden');
    }

    function closeModal() {
        document.getElementById('gameOverModal').classList.add('hidden');
    }

    function playAgain() {
        closeModal();
        startGame();
    }

    function enableChoices() {
        var choiceBtns = document.querySelectorAll('.choice-btn');
        choiceBtns.forEach(function(btn) {
            btn.disabled = false;
        });
    }

    function disableChoices() {
        var choiceBtns = document.querySelectorAll('.choice-btn');
        choiceBtns.forEach(function(btn) {
            btn.disabled = true;
        });
    }

    function resetChoiceDisplays() {
        var playerDisplay = document.getElementById('playerChoice');
        var computerDisplay = document.getElementById('computerChoice');
        var resultDisplay = document.getElementById('resultDisplay');
        var resultText = document.getElementById('resultText');

        playerDisplay.className = 'choice-display';
        computerDisplay.className = 'choice-display';
        resultDisplay.className = 'result-display';

        playerDisplay.querySelector('.choice-icon').textContent = '❓';
        computerDisplay.querySelector('.choice-icon').textContent = '❓';
        resultText.textContent = getTranslation('makeChoice');
    }

    function updateUI() {
        document.getElementById('playerScore').textContent = gameState.playerScore;
        document.getElementById('computerScore').textContent = gameState.computerScore;
        document.getElementById('roundNumber').textContent = gameState.roundNumber;

        document.getElementById('totalGames').textContent = gameStats.totalGames;
        document.getElementById('playerWins').textContent = gameStats.playerWins;
        document.getElementById('playerLosses').textContent = gameStats.playerLosses;
        document.getElementById('draws').textContent = gameStats.draws;

        var winRate = gameStats.totalGames > 0 
            ? Math.round((gameStats.playerWins / gameStats.totalGames) * 100) 
            : 0;
        document.getElementById('winRate').textContent = winRate + '%';

        updateHistoryDisplay();
    }

    function updateHistoryDisplay() {
        var historyList = document.getElementById('historyList');
        historyList.innerHTML = '';

        if (gameStats.gamesHistory.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; opacity: 0.6;">' + 
                getTranslation('noHistory') + '</p>';
            return;
        }

        gameStats.gamesHistory.forEach(function(game) {
            var historyItem = document.createElement('div');
            historyItem.className = 'history-item ' + (game.winner === 'player' ? 'win' : 'lose');

            var resultText = game.winner === 'player' 
                ? getTranslation('win') 
                : getTranslation('loss');

            historyItem.innerHTML = 
                '<div class="history-header">' +
                    '<span>' + resultText + '</span>' +
                    '<span>' + game.playerScore + ' - ' + game.computerScore + '</span>' +
                '</div>' +
                '<div class="history-details">' +
                    '<span>' + game.date + ' ' + game.time + '</span>' +
                    '<span>' + getTranslation('rounds') + ': ' + game.rounds + '</span>' +
                '</div>';

            historyList.appendChild(historyItem);
        });
    }

    function resetStats() {
        if (!confirm(getTranslation('confirmResetStats'))) {
            return;
        }

        gameStats.totalGames = 0;
        gameStats.playerWins = 0;
        gameStats.playerLosses = 0;
        gameStats.draws = 0;
        gameStats.gamesHistory = [];

        saveStats();
        updateUI();
    }

    function loadSettings() {
        var savedSettings = localStorage.getItem('rps_settings');
        if (savedSettings) {
            var parsed = JSON.parse(savedSettings);
            gameState.gameMode = parsed.gameMode || 'bestOf5';
            gameState.difficulty = parsed.difficulty || 'medium';
            settings.animations = parsed.animations !== undefined ? parsed.animations : true;
            settings.sound = parsed.sound !== undefined ? parsed.sound : true;

            document.getElementById('gameModeSelect').value = gameState.gameMode;
            document.getElementById('difficultySelect').value = gameState.difficulty;
            document.getElementById('animationsCheck').checked = settings.animations;
            document.getElementById('soundCheck').checked = settings.sound;
        }
    }

    function saveSettings() {
        var settingsData = {
            gameMode: gameState.gameMode,
            difficulty: gameState.difficulty,
            animations: settings.animations,
            sound: settings.sound
        };
        localStorage.setItem('rps_settings', JSON.stringify(settingsData));
    }

    function loadStats() {
        var savedStats = localStorage.getItem('rps_stats');
        if (savedStats) {
            var parsed = JSON.parse(savedStats);
            gameStats.totalGames = parsed.totalGames || 0;
            gameStats.playerWins = parsed.playerWins || 0;
            gameStats.playerLosses = parsed.playerLosses || 0;
            gameStats.draws = parsed.draws || 0;
            gameStats.gamesHistory = parsed.gamesHistory || [];
        }
    }

    function saveStats() {
        localStorage.setItem('rps_stats', JSON.stringify(gameStats));
    }

    function getTranslation(key) {
        if (window.ToolWrapper && window.ToolWrapper.translations) {
            var lang = window.ToolWrapper.getCurrentLanguage();
            var translations = window.ToolWrapper.translations;
            return translations[lang] && translations[lang][key] 
                ? translations[lang][key] 
                : key;
        }
        return key;
    }

    return {
        init: init
    };
})();

document.addEventListener('DOMContentLoaded', function() {
    RockPaperScissorsGame.init();
});

