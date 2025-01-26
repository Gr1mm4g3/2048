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
        this.username = '';
        
        // Touch handling variables
        this.touchStartX = null;
        this.touchStartY = null;
        
        this.newGameBtn.addEventListener('click', () => this.showUsernameModal());
        this.startGameBtn.addEventListener('click', () => this.handleStartGame());
        
        // Add keyboard event listeners
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Add touch event listeners
        this.gameBoard.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.gameBoard.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.gameBoard.addEventListener('touchend', () => this.handleTouchEnd());
        
        // Show username modal on initial load
        this.showUsernameModal();
        
        // Load leaderboard
        this.loadLeaderboard();
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
            this.initGame();
        } else {
            alert('Please enter a username');
        }
    }
    
    async loadLeaderboard() {
        try {
            // First get all scores
            const { data, error } = await supabase
                .from('leaderboard')
                .select('*');

            if (error) throw error;

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

            this.updateLeaderboardUI(processedData);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    }
    
    async saveScore() {
        if (this.username && this.score > 0) {
            try {
                // First check if user already has a higher score
                const { data, error: fetchError } = await supabase
                    .from('leaderboard')
                    .select('score')
                    .eq('username', this.username)
                    .order('score', { ascending: false })
                    .limit(1);

                if (fetchError) throw fetchError;

                // Only save if this is their first score or if it's higher than their previous best
                if (!data.length || this.score > data[0].score) {
                    const { error } = await supabase
                        .from('leaderboard')
                        .insert([
                            {
                                username: this.username,
                                score: this.score
                            }
                        ]);

                    if (error) throw error;
                    this.loadLeaderboard(); // Refresh the leaderboard
                }
            } catch (error) {
                console.error('Error saving score:', error);
            }
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
    
    handleKeyPress(e) {
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
            this.checkGameStatus();
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
    
    handleTouchEnd() {
        if (!this.touchStartX || !this.touchStartY) return;
        
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        
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
        
        // If the board changed, add a new tile and re-render
        if (moved) {
            this.addRandomTile();
            this.renderBoard();
            this.checkGameStatus();
        }
    }
    
    moveLeft() {
        let moved = false;
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
        }
        
        return moved;
    }
    
    moveRight() {
        let moved = false;
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
        }
        
        return moved;
    }
    
    moveUp() {
        let moved = false;
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
        }
        
        return moved;
    }
    
    moveDown() {
        let moved = false;
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
        }
        
        return moved;
    }
    
    checkGameStatus() {
        // Check if game is over
        let isGameOver = true;
        
        // Check for empty cells
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] === 0) {
                    isGameOver = false;
                    break;
                }
            }
        }
        
        // Check for possible merges
        if (isGameOver) {
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    if (
                        (r < 3 && this.board[r][c] === this.board[r + 1][c]) ||
                        (c < 3 && this.board[r][c] === this.board[r][c + 1])
                    ) {
                        isGameOver = false;
                        break;
                    }
                }
            }
        }
        
        if (isGameOver) {
            this.saveScore();
            setTimeout(() => {
                alert(`Game Over! Your score: ${this.score}`);
                this.showUsernameModal();
            }, 500);
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
