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

    playSound(soundName) {
        try {
            // Resume AudioContext if it was suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            switch (soundName) {
                case 'move':
                    this.playTone(220, 0.1, 'sine'); // A3 note, short duration
                    break;
                case 'merge':
                    this.playTone(440, 0.15, 'square'); // A4 note, slightly longer
                    break;
                case 'gameOver':
                    // Play a sequence of tones for game over
                    this.playTone(440, 0.1, 'sine');
                    setTimeout(() => this.playTone(330, 0.1, 'sine'), 100);
                    setTimeout(() => this.playTone(220, 0.2, 'sine'), 200);
                    break;
            }
        } catch (error) {
            console.log(`Error playing sound: ${soundName}`, error);
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

            console.log('Raw leaderboard data:', data);

            // Process data to get highest score per user
            const highestScores = data.reduce((acc, current) => {
                if (!acc[current.username] || acc[current.username].score < current.score) {
                    acc[current.username] = current;
                }
                return acc;
            }, {});

            // Convert to array and sort by score
            const processedData = Object.values(highestScores)
                .sort((a, b) => b.score - a.score)
                .slice(0, 10); // Keep only top 10

            console.log('Processed leaderboard data:', processedData);
            
            this.updateLeaderboardUI(processedData);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    }
    
    async saveScore() {
        console.log('Attempting to save score:', { username: this.username, score: this.score });
        
        if (this.username && this.score > 0) {
            try {
                // Always insert a new record
                const { data: saveData, error: saveError } = await supabase
                    .from('leaderboard')
                    .insert({
                        username: this.username,
                        score: this.score,
                        created_at: new Date().toISOString()
                    });

                if (saveError) {
                    console.error('Error saving score:', saveError);
                    throw saveError;
                }

                console.log('Score saved successfully:', saveData);

                // Reload the leaderboard to show the updated score
                await this.loadLeaderboard();
            } catch (error) {
                console.error('Error in saveScore:', error);
            }
        } else {
            console.log('Score not saved - invalid username or score:', {
                username: this.username,
                score: this.score
            });
        }
    }
    
    updateLeaderboardUI(leaderboard) {
        this.leaderboardList.innerHTML = '';
        leaderboard.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            // Add special classes for top 3
            if (index === 0) item.classList.add('gold');
            if (index === 1) item.classList.add('silver');
            if (index === 2) item.classList.add('bronze');
            
            // Get medal emoji based on position
            let medal = '';
            if (index === 0) medal = '🏆';
            else if (index === 1) medal = '🥈';
            else if (index === 2) medal = '🥉';
            
            const playerInfo = document.createElement('div');
            playerInfo.className = 'player-info';
            
            if (medal) {
                const medalSpan = document.createElement('span');
                medalSpan.className = 'medal';
                medalSpan.textContent = medal;
                playerInfo.appendChild(medalSpan);
            }
            
            const rankSpan = document.createElement('span');
            rankSpan.className = 'rank';
            rankSpan.textContent = `#${index + 1}`;
            playerInfo.appendChild(rankSpan);
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = entry.username;
            if (index === 0) {
                const championBadge = document.createElement('span');
                championBadge.className = 'champion-badge';
                championBadge.textContent = 'Champion';
                nameSpan.appendChild(championBadge);
            }
            playerInfo.appendChild(nameSpan);
            
            const scoreSpan = document.createElement('span');
            scoreSpan.textContent = entry.score;
            
            item.appendChild(playerInfo);
            item.appendChild(scoreSpan);
            this.leaderboardList.appendChild(item);
        });
    }
    
    initGame() {
        // Reset board and score
        this.board = Array(4).fill().map(() => Array(4).fill(0));
        this.previousBoard = Array(4).fill().map(() => Array(4).fill(0));
        this.score = 0;
        this.scoreDisplay.textContent = '0';
        
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
}

// Prevent page refresh on swipe down
window.addEventListener('touchmove', function(event) {
    if (event.touches.length === 1 && event.touches[0].clientY > 0 && window.scrollY === 0) {
        event.preventDefault();
    }
}, { passive: false });

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
