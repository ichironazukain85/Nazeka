// ===== Piece Kanji Display Map =====

const PIECE_KANJI = {
    king:   { normal: ['玉', '王'], promoted: null },
    rook:   { normal: '飛', promoted: '龍' },
    bishop: { normal: '角', promoted: '馬' },
    gold:   { normal: '金', promoted: null },
    silver: { normal: '銀', promoted: '全' },
    knight: { normal: '桂', promoted: '圭' },
    lance:  { normal: '香', promoted: '杏' },
    pawn:   { normal: '歩', promoted: 'と' }
};

const ROW_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

// ===== ShogiUI Class =====

class ShogiUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.game = new ShogiGame();
        this.ai = new ShogiAI();
        this.selectedCell = null;
        this.selectedHandPiece = null;
        this.legalMoves = [];
        this.lastMove = null;
        this.playerMode = 'vs-ai';
        this.aiPlayer = 1;
        this.pendingPromotionMove = null;
        this.boardCells = [];
        this.init();
    }

    // ----- Initialization -----

    init() {
        this._buildBoard();
        this._buildColumnLabels();
        this._buildRowLabels();
        this._attachControls();
        this.render();
    }

    _buildBoard() {
        var board_el = document.getElementById('board');
        this.boardCells = [];
        for (var r = 0; r < 9; r++) {
            var row_cells = [];
            for (var c = 0; c < 9; c++) {
                var cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.addEventListener('click', this._onCellClickHandler.bind(this, r, c));
                board_el.appendChild(cell);
                row_cells.push(cell);
            }
            this.boardCells.push(row_cells);
        }
    }

    _buildColumnLabels() {
        var labels_el = document.getElementById('column-labels');
        for (var c = 0; c < 9; c++) {
            var lbl = document.createElement('div');
            lbl.classList.add('column-label');
            lbl.textContent = String(9 - c);
            labels_el.appendChild(lbl);
        }
    }

    _buildRowLabels() {
        var labels_el = document.getElementById('row-labels');
        for (var r = 0; r < 9; r++) {
            var lbl = document.createElement('div');
            lbl.classList.add('row-label');
            lbl.textContent = ROW_KANJI[r];
            labels_el.appendChild(lbl);
        }
    }

    _attachControls() {
        document.getElementById('btn-new-game').addEventListener('click', this.newGame.bind(this));
        document.getElementById('btn-undo').addEventListener('click', this.undoMove.bind(this));

        var mode_select = document.getElementById('mode-select');
        mode_select.addEventListener('change', function(e) {
            this.playerMode = e.target.value;
            this.newGame();
        }.bind(this));

        document.getElementById('btn-promote-yes').addEventListener('click', function() {
            this._resolvePromotion(true);
        }.bind(this));

        document.getElementById('btn-promote-no').addEventListener('click', function() {
            this._resolvePromotion(false);
        }.bind(this));
    }

    // ----- Rendering -----

    render() {
        this.renderBoard();
        this.renderHands();
        this.renderStatus();
    }

    renderBoard() {
        var board = this.game.board;
        var legal_targets = {};
        for (var i = 0; i < this.legalMoves.length; i++) {
            var m = this.legalMoves[i];
            var key = m.to[0] + ',' + m.to[1];
            legal_targets[key] = true;
        }

        for (var r = 0; r < 9; r++) {
            for (var c = 0; c < 9; c++) {
                var cell = this.boardCells[r][c];
                var piece = board[r][c];

                // Clear children
                while (cell.firstChild) {
                    cell.removeChild(cell.firstChild);
                }

                // Reset classes
                cell.className = 'cell';

                // Highlight selected cell
                if (this.selectedCell && this.selectedCell[0] === r && this.selectedCell[1] === c) {
                    cell.classList.add('selected');
                }

                // Highlight legal move targets
                var target_key = r + ',' + c;
                if (legal_targets[target_key]) {
                    cell.classList.add('legal-target');
                    if (piece) {
                        cell.classList.add('has-enemy');
                    }
                }

                // Highlight last move
                if (this.lastMove) {
                    if (this.lastMove.to[0] === r && this.lastMove.to[1] === c) {
                        cell.classList.add('last-move-to');
                    }
                    if (this.lastMove.from &&
                        this.lastMove.from[0] === r && this.lastMove.from[1] === c) {
                        cell.classList.add('last-move-from');
                    }
                }

                // Render piece kanji
                if (piece) {
                    var span = document.createElement('span');
                    span.classList.add('piece-kanji');
                    span.textContent = this._getPieceKanji(piece);

                    if (piece.player === 0) {
                        span.classList.add('sente');
                    } else {
                        span.classList.add('gote');
                    }

                    if (piece.promoted) {
                        span.classList.add('promoted');
                    }

                    cell.appendChild(span);
                }
            }
        }
    }

    renderHands() {
        this._renderHandForPlayer(0);
        this._renderHandForPlayer(1);
    }

    _renderHandForPlayer(player) {
        var container_id = player === 0 ? 'hand-pieces-sente' : 'hand-pieces-gote';
        var container = document.getElementById(container_id);

        // Clear
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        var hand = this.game.hands[player];
        var piece_types = ['rook', 'bishop', 'gold', 'silver', 'knight', 'lance', 'pawn'];
        var has_pieces = false;

        for (var i = 0; i < piece_types.length; i++) {
            var pt = piece_types[i];
            var count = hand[pt] || 0;
            if (count > 0) {
                has_pieces = true;
                var piece_el = document.createElement('div');
                piece_el.classList.add('hand-piece');

                if (player === 1) {
                    piece_el.classList.add('gote-hand-piece');
                }

                // Check if this hand piece is selected
                if (this.selectedHandPiece &&
                    this.selectedHandPiece.player === player &&
                    this.selectedHandPiece.piece === pt) {
                    piece_el.classList.add('selected');
                }

                var kanji_span = document.createElement('span');
                kanji_span.classList.add('hand-kanji');
                var kanji_info = PIECE_KANJI[pt];
                kanji_span.textContent = typeof kanji_info.normal === 'string' ? kanji_info.normal : kanji_info.normal[player];
                piece_el.appendChild(kanji_span);

                if (count > 1) {
                    var count_span = document.createElement('span');
                    count_span.classList.add('piece-count');
                    count_span.textContent = '\u00d7' + count;
                    piece_el.appendChild(count_span);
                }

                piece_el.addEventListener('click', this._onHandPieceClickHandler.bind(this, player, pt));
                container.appendChild(piece_el);
            }
        }

        if (!has_pieces) {
            var empty_el = document.createElement('span');
            empty_el.classList.add('hand-empty');
            empty_el.textContent = 'なし';
            container.appendChild(empty_el);
        }
    }

    renderStatus() {
        var status_el = document.getElementById('status-text');
        status_el.className = 'status-text';

        if (this.game.gameOver) {
            var winner = this.game.winner;
            if (winner === 0) {
                status_el.textContent = '先手の勝ち！';
            } else if (winner === 1) {
                status_el.textContent = '後手の勝ち！';
            } else {
                status_el.textContent = '引き分け';
            }
            status_el.classList.add('game-over');
            return;
        }

        var turn = this.game.currentPlayer;
        var turn_text = turn === 0 ? '先手' : '後手';

        if (this.game.isInCheck(turn)) {
            status_el.textContent = turn_text + 'の番です（王手！）';
            status_el.classList.add('check');
        } else {
            status_el.textContent = turn_text + 'の番です';
        }
    }

    // ----- Piece Kanji Lookup -----

    _getPieceKanji(piece) {
        var info = PIECE_KANJI[piece.piece];
        if (!info) return '？';

        if (piece.promoted && info.promoted) {
            return info.promoted;
        }

        if (typeof info.normal === 'string') {
            return info.normal;
        }

        // Array form (king): [sente_kanji, gote_kanji]
        return info.normal[piece.player];
    }

    // ----- Event Handlers -----

    _onCellClickHandler(row, col) {
        if (this.game.gameOver) return;
        if (this.pendingPromotionMove) return;

        // If AI's turn in vs-ai mode, ignore clicks
        if (this.playerMode === 'vs-ai' && this.game.currentPlayer === this.aiPlayer) return;

        this.onCellClick(row, col);
    }

    _onHandPieceClickHandler(player, piece) {
        if (this.game.gameOver) return;
        if (this.pendingPromotionMove) return;

        if (this.playerMode === 'vs-ai' && this.game.currentPlayer === this.aiPlayer) return;

        this.onHandPieceClick(player, piece);
    }

    onCellClick(row, col) {
        // If we have a piece or hand piece selected, try to move to this cell
        if (this.selectedCell || this.selectedHandPiece) {
            // Check if clicking the same selected cell => deselect
            if (this.selectedCell && this.selectedCell[0] === row && this.selectedCell[1] === col) {
                this._deselect();
                return;
            }

            // Check if this is a legal move target
            var target_key = row + ',' + col;
            var is_legal = false;
            for (var i = 0; i < this.legalMoves.length; i++) {
                if (this.legalMoves[i].to[0] === row && this.legalMoves[i].to[1] === col) {
                    is_legal = true;
                    break;
                }
            }

            if (is_legal) {
                this.handleMoveSelection(row, col);
                return;
            }

            // Clicking a non-target cell: if it has current player's piece, select that instead
            var cell_piece = this.game.board[row][col];
            if (cell_piece && cell_piece.player === this.game.currentPlayer) {
                this._selectBoardPiece(row, col);
                return;
            }

            // Otherwise deselect
            this._deselect();
            return;
        }

        // No selection yet: try to select a piece on this cell
        var piece = this.game.board[row][col];
        if (piece && piece.player === this.game.currentPlayer) {
            this._selectBoardPiece(row, col);
        }
    }

    onHandPieceClick(player, piece) {
        if (player !== this.game.currentPlayer) return;

        // If clicking the same hand piece, deselect
        if (this.selectedHandPiece &&
            this.selectedHandPiece.player === player &&
            this.selectedHandPiece.piece === piece) {
            this._deselect();
            return;
        }

        this._deselect();
        this.selectedHandPiece = { player: player, piece: piece };
        this.selectedCell = null;

        // Get legal drop moves for this piece
        var all_moves = this.game.getLegalMoves();
        this.legalMoves = [];
        for (var i = 0; i < all_moves.length; i++) {
            var m = all_moves[i];
            if (m.type === 'drop' && m.piece === piece) {
                this.legalMoves.push(m);
            }
        }

        this.render();
    }

    _selectBoardPiece(row, col) {
        this.selectedCell = [row, col];
        this.selectedHandPiece = null;

        // Get legal moves from this cell
        var all_moves = this.game.getLegalMoves();
        this.legalMoves = [];
        for (var i = 0; i < all_moves.length; i++) {
            var m = all_moves[i];
            if (m.type === 'move' && m.from[0] === row && m.from[1] === col) {
                this.legalMoves.push(m);
            }
        }

        this.render();
    }

    _deselect() {
        this.selectedCell = null;
        this.selectedHandPiece = null;
        this.legalMoves = [];
        this.render();
    }

    // ----- Move Execution -----

    handleMoveSelection(row, col) {
        // Gather all legal moves that target this destination
        var matching_moves = [];
        for (var i = 0; i < this.legalMoves.length; i++) {
            var m = this.legalMoves[i];
            if (m.to[0] === row && m.to[1] === col) {
                matching_moves.push(m);
            }
        }

        if (matching_moves.length === 0) return;

        // For drops, there's always exactly one move
        if (matching_moves[0].type === 'drop') {
            this._executeMove(matching_moves[0]);
            return;
        }

        // For board moves, check if there's a promotion choice
        var promote_move = null;
        var no_promote_move = null;
        for (var j = 0; j < matching_moves.length; j++) {
            if (matching_moves[j].promote) {
                promote_move = matching_moves[j];
            } else {
                no_promote_move = matching_moves[j];
            }
        }

        // If both promotion and non-promotion are possible, ask the user
        if (promote_move && no_promote_move) {
            this.showPromotionDialog({
                promote: promote_move,
                noPromote: no_promote_move
            });
            return;
        }

        // If only one option, execute it (forced promotion or no promotion available)
        this._executeMove(matching_moves[0]);
    }

    showPromotionDialog(moveOptions) {
        this.pendingPromotionMove = moveOptions;
        var overlay = document.getElementById('promotion-overlay');
        overlay.classList.add('visible');
    }

    _resolvePromotion(doPromote) {
        var overlay = document.getElementById('promotion-overlay');
        overlay.classList.remove('visible');

        if (!this.pendingPromotionMove) return;

        var move = doPromote ? this.pendingPromotionMove.promote : this.pendingPromotionMove.noPromote;
        this.pendingPromotionMove = null;

        this._executeMove(move);
    }

    _executeMove(move) {
        this.game.makeMove(move);
        this.lastMove = move;
        this.selectedCell = null;
        this.selectedHandPiece = null;
        this.legalMoves = [];

        this.render();

        // If game is over, stop
        if (this.game.gameOver) return;

        // If vs AI mode and it's now the AI's turn, trigger AI
        if (this.playerMode === 'vs-ai' && this.game.currentPlayer === this.aiPlayer) {
            this.makeAIMove();
        }
    }

    // ----- AI -----

    makeAIMove() {
        setTimeout(function() {
            if (this.game.gameOver) return;
            if (this.game.currentPlayer !== this.aiPlayer) return;

            var ai_move = this.ai.getBestMove(this.game);
            if (ai_move) {
                this.game.makeMove(ai_move);
                this.lastMove = ai_move;
                this.render();
            }
        }.bind(this), 300);
    }

    // ----- Game Controls -----

    newGame() {
        this.game = new ShogiGame();
        this.selectedCell = null;
        this.selectedHandPiece = null;
        this.legalMoves = [];
        this.lastMove = null;
        this.pendingPromotionMove = null;

        // Hide promotion dialog if open
        var overlay = document.getElementById('promotion-overlay');
        overlay.classList.remove('visible');

        this.render();
    }

    undoMove() {
        if (this.game.gameOver) {
            // Allow undo from game-over state
        }

        // In vs-ai mode, undo two moves (the AI's move and the player's move)
        if (this.playerMode === 'vs-ai') {
            if (this.game.currentPlayer === this.aiPlayer) {
                // It's the AI's turn, undo one move (the player's last move was already made, AI hasn't moved)
                this.game.undoMove();
            } else {
                // It's the player's turn, undo two moves (AI's last move + player's last move before that)
                this.game.undoMove();
                this.game.undoMove();
            }
        } else {
            this.game.undoMove();
        }

        this.selectedCell = null;
        this.selectedHandPiece = null;
        this.legalMoves = [];
        this.lastMove = null;

        this.render();
    }
}

// ===== Auto-initialize on DOM ready =====

document.addEventListener('DOMContentLoaded', function() {
    window.shogiUI = new ShogiUI('game-container');
});
