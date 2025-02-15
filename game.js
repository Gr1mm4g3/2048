class Game2048 {
    constructor() {
        this.board = Array(4).fill().map(() => Array(4).fill(0));
        this.previousBoard = Array(4).fill().map(() => Array(4).fill(0));
        this.score = 0;
        this.gameBoard = document.getElementById('game-board');
        this.scoreDisplay = document.getElementById('score');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.usernameModal = document.getElementById('username-modal');
        this.usernameInput = document.getElementById('username-input');
        this.startGameBtn = document.getElementById('start-game-btn');
        this.leaderboardList = document.getElementById('leaderboard-list');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.restartGameBtn = document.getElementById('restart-game-btn');
        this.themeToggle = document.getElementById('theme-toggle');
        this.username = '';
        this.isSoundMuted = localStorage.getItem('soundMuted') === 'true';
        this.audioContext = null;
        this.soundToggleButton = document.getElementById('sound-toggle');
        this.soundIcon = this.soundToggleButton.querySelector('i');
        this.soundLabel = this.soundToggleButton.querySelector('.sound-label');
        
        // Initialize sounds with proper error handling
        this.sounds = {
            move: new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'),
            merge: new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAIA'),
            gameOver: new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAMA')
        };

        // Create AudioContext for better sound handling
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create oscillator function for generating sounds
        this.playTone = (frequency, duration, type = 'sine') => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
        };
        
        // Set volume for all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.3;
            // Preload sounds
            sound.load();
        });
        
        // Initialize theme
        this.initializeTheme();
        
        this.newGameBtn.addEventListener('click', () => this.showUsernameModal());
        this.startGameBtn.addEventListener('click', () => this.handleStartGame());
        this.restartGameBtn.addEventListener('click', () => this.handleStartGame());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Add keyboard event listeners
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Add touch event listeners
        this.gameBoard.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.gameBoard.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.gameBoard.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Show username modal on initial load
        this.showUsernameModal();
        
        // Load leaderboard
        this.loadLeaderboard();
        
        // Initialize sound toggle functionality
        this.setupSoundToggle();
    }
    
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeButton(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeButton(newTheme);
    }

    updateThemeButton(theme) {
        const icon = this.themeToggle.querySelector('i');
        const text = this.themeToggle.querySelector('span');
        
        if (theme === 'dark') {
            icon.className = 'fas fa-moon';
            text.textContent = 'Dark Mode';
        } else {
            icon.className = 'fas fa-sun';
            text.textContent = 'Light Mode';
        }
    }

    setupSoundToggle() {
        // Update UI based on initial state
        this.updateSoundToggleUI();

        // Add click event listener
        this.soundToggleButton.addEventListener('click', () => {
            this.isSoundMuted = !this.isSoundMuted;
            localStorage.setItem('soundMuted', this.isSoundMuted);
            this.updateSoundToggleUI();
        });
    }

    updateSoundToggleUI() {
        if (this.isSoundMuted) {
            this.soundToggleButton.classList.add('muted');
            this.soundIcon.className = 'fas fa-volume-mute';
            this.soundLabel.textContent = 'Sound Off';
        } else {
            this.soundToggleButton.classList.remove('muted');
            this.soundIcon.className = 'fas fa-volume-up';
            this.soundLabel.textContent = 'Sound On';
        }
    }

    playSound(soundName) {
        // Don't play sound if muted
        if (this.isSoundMuted) {
            return;
        }

        try {
            // Initialize audio context if needed
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Resume AudioContext if it was suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            // Create oscillator and gain nodes
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            // Configure sound based on type
            switch (soundName) {
                case 'move':
                    oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                    break;
                case 'merge':
                    oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
                    oscillator.type = 'triangle';
                    gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
                    break;
                case 'gameOver':
                    oscillator.frequency.setValueAtTime(180, this.audioContext.currentTime);
                    oscillator.type = 'sawtooth';
                    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                    break;
            }

            // Connect nodes and start sound
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }
    
    async showGameOver(won = false) {
        // Save the score first
        await this.saveScore();
        
        const title = document.getElementById('game-over-title');
        const scoreSpan = document.querySelector('#game-over-score span');
        
        title.textContent = won ? 'You Won!' : 'Game Over!';
        scoreSpan.textContent = this.score;
        
        this.gameOverModal.style.display = 'block';
        this.playSound('gameOver');
    }
    
    showUsernameModal() {
        this.usernameModal.style.display = 'block';
        this.usernameInput.value = this.username;
        this.usernameInput.focus();
    }
    
    handleStartGame() {
        const username = this.usernameInput.value.trim();
        if (username) {
            this.username = username;
            this.usernameModal.style.display = 'none';
            this.gameOverModal.style.display = 'none';
            this.initGame();
        } else {
            alert('Please enter a username');
        }
    }
    
    async loadLeaderboard() {
        try {
            console.log('Loading leaderboard...');
            // Get all scores
            const { data, error } = await supabase
                .from('leaderboard')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching leaderboard:', error);
                throw error;
            }

            // Process data to get highest score and total games per user
            const userStats = data.reduce((acc, current) => {
                if (!acc[current.username]) {
                    acc[current.username] = {
                        username: current.username,
                        score: current.score,
                        gamesPlayed: 1,
                        totalScore: current.score,
                        minScore: current.score,
                        maxScore: current.score,
                        scores: [current.score],
                        highestTile: current.highest_tile || 0,
                        fastestHighScore: current.score >= 10000 ? current.duration : Infinity,
                        nightGames: this.isNightTime(current.created_at) ? 1 : 0,
                        weekendGames: this.isWeekend(current.created_at) ? 1 : 0,
                        earlyGames: this.isEarlyMorning(current.created_at) ? 1 : 0,
                        allDates: [current.created_at]
                    };
                } else {
                    // Update existing stats...
                    if (acc[current.username].score < current.score) {
                        acc[current.username].score = current.score;
                    }
                    acc[current.username].maxScore = Math.max(acc[current.username].maxScore, current.score);
                    acc[current.username].minScore = Math.min(acc[current.username].minScore, current.score);
                    acc[current.username].scores.push(current.score);
                    acc[current.username].gamesPlayed++;
                    acc[current.username].totalScore += current.score;
                    acc[current.username].highestTile = Math.max(acc[current.username].highestTile, current.highest_tile || 0);
                    
                    if (current.score >= 10000) {
                        acc[current.username].fastestHighScore = Math.min(
                            acc[current.username].fastestHighScore,
                            current.duration || Infinity
                        );
                    }
                    
                    if (this.isNightTime(current.created_at)) {
                        acc[current.username].nightGames++;
                    }
                    
                    if (this.isWeekend(current.created_at)) {
                        acc[current.username].weekendGames++;
                    }
                    
                    if (this.isEarlyMorning(current.created_at)) {
                        acc[current.username].earlyGames++;
                    }
                    
                    acc[current.username].allDates.push(current.created_at);
                }
                return acc;
            }, {});

            // Calculate score improvements and consistency
            Object.values(userStats).forEach(user => {
                if (user.gamesPlayed >= 10) {
                    // Calculate improvement (difference between max and min scores)
                    user.improvement = user.maxScore - user.minScore;
                    
                    // Calculate consistency (standard deviation of scores)
                    const mean = user.totalScore / user.gamesPlayed;
                    const squareDiffs = user.scores.map(score => Math.pow(score - mean, 2));
                    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b) / user.scores.length;
                    user.consistency = Math.sqrt(avgSquareDiff);
                }
            });

            // Convert to array and sort by score
            const processedData = Object.values(userStats)
                .sort((a, b) => b.score - a.score)
                .slice(0, 20); // Keep top 20 instead of 10

            console.log('Processed leaderboard data:', processedData);
            this.updateLeaderboardUI(processedData);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    }
    
    async saveScore() {
        if (!this.username) return;
        
        // Calculate highest tile from the cells array
        const highestTile = Math.max(...this.board.flat()
            .filter(cell => cell !== 0)
            .map(cell => cell));
            
        // Prepare the game data with all columns
        const gameData = {
            username: this.username,
            score: this.score,
            highest_tile: highestTile,
            duration: Math.floor((Date.now() - this.gameStartTime) / 1000), // Duration in seconds
            created_at: new Date().toISOString()
        };
        
        try {
            const { data, error } = await supabase
                .from('leaderboard')
                .insert([gameData]);
                
            if (error) throw error;
            
            console.log('Score saved:', gameData);
            await this.loadLeaderboard();
        } catch (error) {
            console.error('Error saving score:', error);
        }
    }
    
    updateLeaderboardUI(leaderboard) {
        this.leaderboardList.innerHTML = '';
        
        // Find players with special achievements
        const mostGamesPlayed = Math.max(...leaderboard.map(entry => entry.gamesPlayed));
        const highestTotalScore = Math.max(...leaderboard.map(entry => entry.totalScore));
        const highestTileAchieved = Math.max(...leaderboard.map(entry => entry.highestTile || 0));
        const fastestHighScore = Math.min(...leaderboard.map(entry => entry.fastestHighScore || Infinity));
        const mostNightGames = Math.max(...leaderboard.map(entry => entry.nightGames || 0));
        const mostWeekendGames = Math.max(...leaderboard.map(entry => entry.weekendGames || 0));
        const mostEarlyGames = Math.max(...leaderboard.map(entry => entry.earlyGames || 0));
        
        leaderboard.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            if (index === 0) item.classList.add('gold');
            if (index === 1) item.classList.add('silver');
            if (index === 2) item.classList.add('bronze');
            
            let medal = '';
            if (index === 0) medal = '🏆';
            else if (index === 1) medal = '🥈';
            else if (index === 2) medal = '🥉';
            
            const leftSection = document.createElement('div');
            leftSection.className = 'leaderboard-left';
            
            const rankAndName = document.createElement('div');
            rankAndName.className = 'rank-and-name';
            
            if (medal) {
                const medalSpan = document.createElement('span');
                medalSpan.className = 'medal';
                medalSpan.textContent = medal;
                rankAndName.appendChild(medalSpan);
            }
            
            const rankSpan = document.createElement('span');
            rankSpan.className = 'rank';
            rankSpan.textContent = `#${index + 1}`;
            rankAndName.appendChild(rankSpan);
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = ` ${entry.username}`;
            
            if (index === 0) {
                const championBadge = document.createElement('span');
                championBadge.className = 'champion-badge';
                championBadge.textContent = 'CHAMPION';
                championBadge.title = 'Highest single game score - you are the champion!';
                nameSpan.appendChild(championBadge);
                championBadge.addEventListener('mouseenter', this.createFireworks.bind(this));
            }

            // Add Most Active badge if this player has the most games
            if (entry.gamesPlayed === mostGamesPlayed && mostGamesPlayed > 1) {
                const activeBadge = document.createElement('span');
                activeBadge.className = 'active-badge';
                activeBadge.textContent = 'MOST ACTIVE';
                activeBadge.title = 'Play more games than anyone else to earn this badge';
                nameSpan.appendChild(activeBadge);
            }

            // Add Total Score badge if this player has the highest total score
            if (entry.totalScore === highestTotalScore && entry.gamesPlayed > 1) {
                const totalScoreBadge = document.createElement('span');
                totalScoreBadge.className = 'total-score-badge';
                
                const mvpText = document.createElement('span');
                mvpText.className = 'mvp-text';
                mvpText.textContent = 'MVP';
                
                const totalPoints = document.createElement('span');
                totalPoints.className = 'total-points';
                totalPoints.textContent = ` ${entry.totalScore.toLocaleString()}`;
                
                totalScoreBadge.appendChild(mvpText);
                totalScoreBadge.appendChild(totalPoints);
                totalScoreBadge.title = 'Have the highest combined score across all games';
                nameSpan.appendChild(totalScoreBadge);
            }

            // Add Comeback King badge for biggest score improvement
            if (entry.improvement === Math.max(...leaderboard.map(entry => entry.improvement)) && entry.gamesPlayed >= 10) {
                const comebackBadge = document.createElement('span');
                comebackBadge.className = 'comeback-badge';
                comebackBadge.textContent = 'COMEBACK KING';
                comebackBadge.title = `Play at least 10 games and have the biggest improvement between your lowest and highest scores\nCurrent improvement: ${entry.improvement.toLocaleString()} points`;
                nameSpan.appendChild(comebackBadge);
            }

            // Add Consistent badge for smallest score variance
            if (entry.consistency === Math.min(...leaderboard.map(entry => entry.consistency)) && entry.gamesPlayed >= 10) {
                const consistentBadge = document.createElement('span');
                consistentBadge.className = 'consistent-badge';
                consistentBadge.textContent = 'CONSISTENT';
                consistentBadge.title = `Play at least 10 games and maintain the most consistent scores\nCurrent variance: ${Math.round(entry.consistency).toLocaleString()} points`;
                nameSpan.appendChild(consistentBadge);
            }
            
            // Add Perfectionist badge for highest tile
            if (entry.highestTile === highestTileAchieved && entry.highestTile >= 2048) {
                const perfectionistBadge = document.createElement('span');
                perfectionistBadge.className = 'perfectionist-badge';
                perfectionistBadge.textContent = 'PERFECTIONIST';
                perfectionistBadge.title = `Reached the highest tile: ${entry.highestTile}`;
                nameSpan.appendChild(perfectionistBadge);
            }

            // Add Speedster badge for fastest high score
            if (entry.fastestHighScore === fastestHighScore && entry.fastestHighScore < 180) { // 3 minutes
                const speedsterBadge = document.createElement('span');
                speedsterBadge.className = 'speedster-badge';
                speedsterBadge.textContent = 'SPEEDSTER';
                const minutes = Math.floor(entry.fastestHighScore / 60);
                const seconds = entry.fastestHighScore % 60;
                speedsterBadge.title = `Scored 10,000+ points in ${minutes}m ${seconds}s`;
                nameSpan.appendChild(speedsterBadge);
            }

            // Add Night Owl badge for most night games
            if (entry.nightGames === mostNightGames && entry.nightGames >= 5) {
                const nightOwlBadge = document.createElement('span');
                nightOwlBadge.className = 'night-owl-badge';
                nightOwlBadge.textContent = 'NIGHT OWL';
                nightOwlBadge.title = `Played ${entry.nightGames} games between 11 PM and 5 AM`;
                nameSpan.appendChild(nightOwlBadge);
            }

            // Add Weekend Warrior badge
            if (entry.weekendGames === mostWeekendGames && entry.weekendGames >= 10) {
                const weekendBadge = document.createElement('span');
                weekendBadge.className = 'weekend-badge';
                weekendBadge.textContent = 'WEEKEND WARRIOR';
                weekendBadge.title = `Played ${entry.weekendGames} games on weekends`;
                nameSpan.appendChild(weekendBadge);
            }

            // Add Early Bird badge
            if (entry.earlyGames === mostEarlyGames && entry.earlyGames >= 5) {
                const earlyBadge = document.createElement('span');
                earlyBadge.className = 'early-bird-badge';
                earlyBadge.textContent = 'EARLY BIRD';
                earlyBadge.title = `Played ${entry.earlyGames} games between 5 AM and 8 AM`;
                nameSpan.appendChild(earlyBadge);
            }

            // Add Streak badge
            const streak = this.calculateStreak(entry.allDates);
            if (streak >= 3) {
                const streakBadge = document.createElement('span');
                streakBadge.className = 'streak-badge';
                streakBadge.textContent = 'DAILY STREAK';
                streakBadge.title = `Played ${streak} days in a row!`;
                nameSpan.appendChild(streakBadge);
            }
            
            rankAndName.appendChild(nameSpan);
            leftSection.appendChild(rankAndName);
            
            const rightSection = document.createElement('div');
            rightSection.className = 'leaderboard-right';
            
            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'score-info';
            scoreDiv.textContent = entry.score;
            
            const gamesDiv = document.createElement('div');
            gamesDiv.className = 'games-info';
            gamesDiv.textContent = `${entry.gamesPlayed} games`;
            
            rightSection.appendChild(scoreDiv);
            rightSection.appendChild(gamesDiv);
            
            item.appendChild(leftSection);
            item.appendChild(rightSection);
            this.leaderboardList.appendChild(item);
        });
    }
    
    initGame() {
        // Reset board and score
        this.board = Array(4).fill().map(() => Array(4).fill(0));
        this.previousBoard = Array(4).fill().map(() => Array(4).fill(0));
        this.score = 0;
        this.scoreDisplay.textContent = '0';
        this.gameStartTime = Date.now();
        
        // Add two initial tiles
        this.addRandomTile();
        this.addRandomTile();
        
        // Render the board
        this.renderBoard();
    }
    
    addRandomTile() {
        const emptyCells = [];
        
        // Find empty cells
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] === 0) {
                    emptyCells.push({r, c});
                }
            }
        }
        
        // If there are empty cells, add a new tile
        if (emptyCells.length > 0) {
            const {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            // 90% chance of 2, 10% chance of 4
            this.board[r][c] = Math.random() < 0.9 ? 2 : 4;
        }
    }
    
    renderBoard() {
        // Clear existing board
        this.gameBoard.innerHTML = '';
        
        // Create grid and tiles
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                // Create grid cell
                const gridCell = document.createElement('div');
                gridCell.classList.add('grid-cell');
                
                // Add tile if there's a value
                if (this.board[r][c] !== 0) {
                    const tileElement = document.createElement('div');
                    tileElement.classList.add('tile');
                    tileElement.classList.add(`tile-${this.board[r][c]}`);
                    tileElement.textContent = this.board[r][c];
                    
                    // Add animation classes if needed
                    if (this.board[r][c] !== this.previousBoard?.[r]?.[c]) {
                        if (!this.previousBoard?.[r]?.[c]) {
                            tileElement.classList.add('new');
                        } else if (this.board[r][c] > this.previousBoard[r][c]) {
                            tileElement.classList.add('merge');
                        }
                    }
                    
                    gridCell.appendChild(tileElement);
                }
                
                this.gameBoard.appendChild(gridCell);
            }
        }
        
        // Store current board state for next render
        this.previousBoard = this.board.map(row => [...row]);
    }
    
    async handleKeyPress(e) {
        // Prevent default behavior for arrow keys
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
        }
        
        let moved = false;
        
        switch(e.key) {
            case 'ArrowUp':
                moved = this.moveUp();
                break;
            case 'ArrowDown':
                moved = this.moveDown();
                break;
            case 'ArrowLeft':
                moved = this.moveLeft();
                break;
            case 'ArrowRight':
                moved = this.moveRight();
                break;
            default:
                return;
        }
        
        // If the board changed, add a new tile and re-render
        if (moved) {
            this.addRandomTile();
            this.renderBoard();
            await this.checkGameStatus();
        }
    }
    
    handleTouchStart(e) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        // Prevent scrolling while touching the game board
        e.preventDefault();
    }
    
    handleTouchMove(e) {
        if (!this.touchStartX || !this.touchStartY) return;
        e.preventDefault();
    }
    
    handleTouchEnd(e) {
        if (!this.touchStartX || !this.touchStartY) return;
        
        const touch = e.changedTouches[0];
        this.touchEndX = touch.clientX;
        this.touchEndY = touch.clientY;
        
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        
        // Minimum swipe distance to trigger a move (in pixels)
        const minSwipeDistance = 50;
        
        let moved = false;
        
        // Determine swipe direction based on which delta is larger
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    moved = this.moveRight();
                } else {
                    moved = this.moveLeft();
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY > 0) {
                    moved = this.moveDown();
                } else {
                    moved = this.moveUp();
                }
            }
        }
        
        // Reset touch coordinates
        this.touchStartX = null;
        this.touchStartY = null;
        this.touchEndX = null;
        this.touchEndY = null;
        
        // If the board changed, add a new tile and re-render
        if (moved) {
            this.addRandomTile();
            this.renderBoard();
            this.checkGameStatus();
        }
    }
    
    async checkGameStatus() {
        // Check for 2048 tile
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] === 2048) {
                    await this.showGameOver(true);
                    return;
                }
            }
        }
        
        // Check for available moves
        if (this.isGameOver()) {
            await this.showGameOver(false);
        }
    }

    isGameOver() {
        // Check for empty cells
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] === 0) return false;
            }
        }
        
        // Check for possible merges
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const current = this.board[r][c];
                
                // Check right
                if (c < 3 && current === this.board[r][c + 1]) return false;
                
                // Check down
                if (r < 3 && current === this.board[r + 1][c]) return false;
            }
        }
        
        return true;
    }
    
    moveLeft() {
        let moved = false;
        let mergeHappened = false;
        const newBoard = this.board.map(row => [...row]);
        
        for (let r = 0; r < 4; r++) {
            const row = this.board[r].filter(val => val !== 0);
            
            // Merge tiles
            for (let c = 0; c < row.length - 1; c++) {
                if (row[c] === row[c + 1]) {
                    row[c] *= 2;
                    this.score += row[c];
                    row.splice(c + 1, 1);
                    moved = true;
                    mergeHappened = true;
                }
            }
            
            // Pad with zeros
            while (row.length < 4) {
                row.push(0);
            }
            
            // Check if the row changed
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] !== row[c]) {
                    moved = true;
                }
                this.board[r][c] = row[c];
            }
        }
        
        if (moved) {
            this.scoreDisplay.textContent = this.score;
            // Play sound after the move is confirmed
            if (mergeHappened) {
                this.playSound('merge');
            } else {
                this.playSound('move');
            }
        }
        
        return moved;
    }
    
    moveRight() {
        let moved = false;
        let mergeHappened = false;
        const newBoard = this.board.map(row => [...row]);
        
        for (let r = 0; r < 4; r++) {
            const row = this.board[r].filter(val => val !== 0);
            
            // Merge tiles
            for (let c = row.length - 1; c > 0; c--) {
                if (row[c] === row[c - 1]) {
                    row[c] *= 2;
                    this.score += row[c];
                    row.splice(c - 1, 1);
                    moved = true;
                    mergeHappened = true;
                }
            }
            
            // Pad with zeros
            while (row.length < 4) {
                row.unshift(0);
            }
            
            // Check if the row changed
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] !== row[c]) {
                    moved = true;
                }
                this.board[r][c] = row[c];
            }
        }
        
        if (moved) {
            this.scoreDisplay.textContent = this.score;
            // Play sound after the move is confirmed
            if (mergeHappened) {
                this.playSound('merge');
            } else {
                this.playSound('move');
            }
        }
        
        return moved;
    }
    
    moveUp() {
        let moved = false;
        let mergeHappened = false;
        const newBoard = this.board.map(row => [...row]);
        
        for (let c = 0; c < 4; c++) {
            const column = [];
            for (let r = 0; r < 4; r++) {
                if (this.board[r][c] !== 0) {
                    column.push(this.board[r][c]);
                }
            }
            
            // Merge tiles
            for (let i = 0; i < column.length - 1; i++) {
                if (column[i] === column[i + 1]) {
                    column[i] *= 2;
                    this.score += column[i];
                    column.splice(i + 1, 1);
                    moved = true;
                    mergeHappened = true;
                }
            }
            
            // Pad with zeros
            while (column.length < 4) {
                column.push(0);
            }
            
            // Check if the column changed and update
            for (let r = 0; r < 4; r++) {
                if (this.board[r][c] !== column[r]) {
                    moved = true;
                }
                this.board[r][c] = column[r];
            }
        }
        
        if (moved) {
            this.scoreDisplay.textContent = this.score;
            // Play sound after the move is confirmed
            if (mergeHappened) {
                this.playSound('merge');
            } else {
                this.playSound('move');
            }
        }
        
        return moved;
    }
    
    moveDown() {
        let moved = false;
        let mergeHappened = false;
        const newBoard = this.board.map(row => [...row]);
        
        for (let c = 0; c < 4; c++) {
            const column = [];
            for (let r = 0; r < 4; r++) {
                if (this.board[r][c] !== 0) {
                    column.push(this.board[r][c]);
                }
            }
            
            // Merge tiles
            for (let i = column.length - 1; i > 0; i--) {
                if (column[i] === column[i - 1]) {
                    column[i] *= 2;
                    this.score += column[i];
                    column.splice(i - 1, 1);
                    moved = true;
                    mergeHappened = true;
                }
            }
            
            // Pad with zeros
            while (column.length < 4) {
                column.unshift(0);
            }
            
            // Check if the column changed and update
            for (let r = 0; r < 4; r++) {
                if (this.board[r][c] !== column[r]) {
                    moved = true;
                }
                this.board[r][c] = column[r];
            }
        }
        
        if (moved) {
            this.scoreDisplay.textContent = this.score;
            // Play sound after the move is confirmed
            if (mergeHappened) {
                this.playSound('merge');
            } else {
                this.playSound('move');
            }
        }
        
        return moved;
    }

    createFireworks(event) {
        // Get the position of the hovered element
        const rect = event.target.getBoundingClientRect();
        const x = (rect.left + rect.right) / 2;
        const y = (rect.top + rect.bottom) / 2;

        // Convert to normalized coordinates (0 to 1)
        const normalizedX = x / window.innerWidth;
        const normalizedY = y / window.innerHeight;

        // Create multiple firework bursts
        const fireworkCount = 3;
        const colors = ['#FFD700', '#FFA500', '#FF4500']; // Gold, Orange, Red

        for (let i = 0; i < fireworkCount; i++) {
            setTimeout(() => {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { x: normalizedX, y: normalizedY },
                    colors: colors,
                    startVelocity: 30,
                    gravity: 0.8,
                    scalar: 0.9,
                    ticks: 100
                });
            }, i * 200); // Stagger the fireworks
        }
    }

    isNightTime(timestamp) {
        const hour = new Date(timestamp).getHours();
        return hour >= 23 || hour < 5;
    }

    isWeekend(timestamp) {
        const day = new Date(timestamp).getDay();
        return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
    }

    isEarlyMorning(timestamp) {
        const hour = new Date(timestamp).getHours();
        return hour >= 5 && hour < 8;
    }

    calculateStreak(dates) {
        // Convert dates to day strings (YYYY-MM-DD)
        const dayStrings = [...new Set(dates.map(date => 
            new Date(date).toISOString().split('T')[0]
        ))].sort();

        let currentStreak = 1;
        let longestStreak = 1;
        
        for (let i = 1; i < dayStrings.length; i++) {
            const prevDate = new Date(dayStrings[i - 1]);
            const currDate = new Date(dayStrings[i]);
            const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
            
            if (diffDays === 1) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }
        
        return longestStreak;
    }
}

// Allow swiping but prevent refresh on downward swipe at top
window.addEventListener('touchstart', function(event) {
    this.startY = event.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchmove', function(event) {
    const moveY = event.touches[0].clientY;
    if (this.startY < moveY && window.scrollY === 0) {
        event.preventDefault();
    }
}, { passive: false });

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
