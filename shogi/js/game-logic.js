// Shogi (Japanese Chess) Game Logic
// Board: board[row][col] — 9x9 array
// row 0 = top (gote's back rank), row 8 = bottom (sente's back rank)
// col 0 = leftmost on screen (file 9), col 8 = rightmost (file 1)
// Cell: null | {player: 0|1, piece: string, promoted: boolean}
// player 0 = sente, player 1 = gote

class ShogiGame {
    constructor() {
        this.board = this._createInitialBoard();
        this.hands = [
            {pawn: 0, lance: 0, knight: 0, silver: 0, gold: 0, bishop: 0, rook: 0},
            {pawn: 0, lance: 0, knight: 0, silver: 0, gold: 0, bishop: 0, rook: 0}
        ];
        this.currentPlayer = 0; // sente goes first
        this.moveHistory = [];
        this.gameOver = false;
        this.winner = null;
    }

    _createInitialBoard() {
        var board = [];
        for (var r = 0; r < 9; r++) {
            board[r] = [];
            for (var c = 0; c < 9; c++) {
                board[r][c] = null;
            }
        }

        // Back rank piece order (same for both sides)
        var backRank = ['lance', 'knight', 'silver', 'gold', 'king', 'gold', 'silver', 'knight', 'lance'];

        // Row 0: gote back rank (player 1)
        for (var c = 0; c < 9; c++) {
            board[0][c] = {player: 1, piece: backRank[c], promoted: false};
        }

        // Row 1: gote rook (col 1) and bishop (col 7)
        board[1][1] = {player: 1, piece: 'rook', promoted: false};
        board[1][7] = {player: 1, piece: 'bishop', promoted: false};

        // Row 2: gote pawns
        for (var c = 0; c < 9; c++) {
            board[2][c] = {player: 1, piece: 'pawn', promoted: false};
        }

        // Rows 3-5: empty (already null)

        // Row 6: sente pawns
        for (var c = 0; c < 9; c++) {
            board[6][c] = {player: 0, piece: 'pawn', promoted: false};
        }

        // Row 7: sente bishop (col 1) and rook (col 7)
        board[7][1] = {player: 0, piece: 'bishop', promoted: false};
        board[7][7] = {player: 0, piece: 'rook', promoted: false};

        // Row 8: sente back rank (player 0)
        for (var c = 0; c < 9; c++) {
            board[8][c] = {player: 0, piece: backRank[c], promoted: false};
        }

        return board;
    }

    _inBounds(row, col) {
        return row >= 0 && row < 9 && col >= 0 && col < 9;
    }

    // Returns the direction multiplier for a player's forward movement.
    // Sente (player 0) moves upward (negative row), gote (player 1) moves downward (positive row).
    _direction(player) {
        return (player === 0) ? -1 : 1;
    }

    // Returns raw destination squares for the piece at (row, col).
    // Does NOT filter for check. Returns array of [toRow, toCol].
    getPieceMovements(row, col) {
        var cell = this.board[row][col];
        if (!cell) return [];

        var player = cell.player;
        var piece = cell.piece;
        var promoted = cell.promoted;
        var dir = this._direction(player);
        var destinations = [];

        if (promoted && piece !== 'king' && piece !== 'gold' && piece !== 'rook' && piece !== 'bishop') {
            // Promoted silver, knight, lance, pawn all move like gold
            destinations = this._getStepMoves(row, col, player, this._goldDirections(dir));
        } else if (piece === 'king') {
            destinations = this._getStepMoves(row, col, player, this._kingDirections());
        } else if (piece === 'gold') {
            destinations = this._getStepMoves(row, col, player, this._goldDirections(dir));
        } else if (piece === 'silver') {
            destinations = this._getStepMoves(row, col, player, this._silverDirections(dir));
        } else if (piece === 'knight') {
            destinations = this._getKnightMoves(row, col, player, dir);
        } else if (piece === 'lance') {
            destinations = this._getLanceMoves(row, col, player, dir);
        } else if (piece === 'pawn') {
            destinations = this._getStepMoves(row, col, player, [[dir, 0]]);
        } else if (piece === 'rook') {
            if (promoted) {
                // Promoted rook: rook slides + 1 step diagonal
                destinations = this._getSlideMoves(row, col, player, [[0,1],[0,-1],[1,0],[-1,0]]);
                var diagonalSteps = this._getStepMoves(row, col, player, [[1,1],[1,-1],[-1,1],[-1,-1]]);
                destinations = destinations.concat(diagonalSteps);
            } else {
                destinations = this._getSlideMoves(row, col, player, [[0,1],[0,-1],[1,0],[-1,0]]);
            }
        } else if (piece === 'bishop') {
            if (promoted) {
                // Promoted bishop: bishop slides + 1 step orthogonal
                destinations = this._getSlideMoves(row, col, player, [[1,1],[1,-1],[-1,1],[-1,-1]]);
                var orthogonalSteps = this._getStepMoves(row, col, player, [[0,1],[0,-1],[1,0],[-1,0]]);
                destinations = destinations.concat(orthogonalSteps);
            } else {
                destinations = this._getSlideMoves(row, col, player, [[1,1],[1,-1],[-1,1],[-1,-1]]);
            }
        }

        return destinations;
    }

    _kingDirections() {
        return [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    }

    _goldDirections(dir) {
        return [[dir,-1],[dir,0],[dir,1],[0,-1],[0,1],[-dir,0]];
    }

    _silverDirections(dir) {
        return [[dir,-1],[dir,0],[dir,1],[-dir,-1],[-dir,1]];
    }

    _getStepMoves(row, col, player, directions) {
        var results = [];
        for (var i = 0; i < directions.length; i++) {
            var dr = directions[i][0];
            var dc = directions[i][1];
            var nr = row + dr;
            var nc = col + dc;
            if (this._inBounds(nr, nc)) {
                var target = this.board[nr][nc];
                if (!target || target.player !== player) {
                    results.push([nr, nc]);
                }
            }
        }
        return results;
    }

    _getKnightMoves(row, col, player, dir) {
        var results = [];
        var jumps = [[2 * dir, -1], [2 * dir, 1]];
        for (var i = 0; i < jumps.length; i++) {
            var nr = row + jumps[i][0];
            var nc = col + jumps[i][1];
            if (this._inBounds(nr, nc)) {
                var target = this.board[nr][nc];
                if (!target || target.player !== player) {
                    results.push([nr, nc]);
                }
            }
        }
        return results;
    }

    _getLanceMoves(row, col, player, dir) {
        var results = [];
        var r = row + dir;
        while (this._inBounds(r, col)) {
            var target = this.board[r][col];
            if (!target) {
                results.push([r, col]);
            } else {
                if (target.player !== player) {
                    results.push([r, col]);
                }
                break;
            }
            r += dir;
        }
        return results;
    }

    _getSlideMoves(row, col, player, directions) {
        var results = [];
        for (var i = 0; i < directions.length; i++) {
            var dr = directions[i][0];
            var dc = directions[i][1];
            var r = row + dr;
            var c = col + dc;
            while (this._inBounds(r, c)) {
                var target = this.board[r][c];
                if (!target) {
                    results.push([r, c]);
                } else {
                    if (target.player !== player) {
                        results.push([r, c]);
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }
        return results;
    }

    // Returns true if the piece MUST promote when moving to toRow.
    mustPromote(piece, player, toRow) {
        if (piece === 'pawn' || piece === 'lance') {
            if (player === 0 && toRow === 0) return true;
            if (player === 1 && toRow === 8) return true;
        }
        if (piece === 'knight') {
            if (player === 0 && toRow <= 1) return true;
            if (player === 1 && toRow >= 7) return true;
        }
        return false;
    }

    // Returns true if the piece CAN optionally promote (but is not forced to).
    // Pieces that must promote also can promote, but this method is about whether
    // promotion is available for a given move.
    canPromote(piece, player, fromRow, toRow) {
        // King and gold cannot promote
        if (piece === 'king' || piece === 'gold') return false;

        // Already promoted pieces cannot promote again (handled by caller checking promoted flag,
        // but we guard here too)
        // Note: This method checks piece type only. The caller should also verify the piece
        // is not already promoted.

        var promoZoneStart, promoZoneEnd;
        if (player === 0) {
            promoZoneStart = 0;
            promoZoneEnd = 2;
        } else {
            promoZoneStart = 6;
            promoZoneEnd = 8;
        }

        // Moving into, within, or out of the promotion zone
        var fromInZone = (fromRow >= promoZoneStart && fromRow <= promoZoneEnd);
        var toInZone = (toRow >= promoZoneStart && toRow <= promoZoneEnd);

        return fromInZone || toInZone;
    }

    // Returns valid drop target squares for the given piece type for the current player.
    getDropTargets(piece) {
        var player = this.currentPlayer;
        var targets = [];

        for (var r = 0; r < 9; r++) {
            for (var c = 0; c < 9; c++) {
                if (this.board[r][c] !== null) continue;

                // Check if the piece would have no legal moves from this position
                if (piece === 'pawn' || piece === 'lance') {
                    if (player === 0 && r === 0) continue;
                    if (player === 1 && r === 8) continue;
                }
                if (piece === 'knight') {
                    if (player === 0 && r <= 1) continue;
                    if (player === 1 && r >= 7) continue;
                }

                // Nifu rule: no two unpromoted pawns in the same column for the same player
                if (piece === 'pawn') {
                    var hasPawnInCol = false;
                    for (var checkRow = 0; checkRow < 9; checkRow++) {
                        var cell = this.board[checkRow][c];
                        if (cell && cell.player === player && cell.piece === 'pawn' && !cell.promoted) {
                            hasPawnInCol = true;
                            break;
                        }
                    }
                    if (hasPawnInCol) continue;
                }

                targets.push([r, c]);
            }
        }

        return targets;
    }

    // Find the king position for a given player.
    _findKing(player) {
        for (var r = 0; r < 9; r++) {
            for (var c = 0; c < 9; c++) {
                var cell = this.board[r][c];
                if (cell && cell.player === player && cell.piece === 'king') {
                    return [r, c];
                }
            }
        }
        return null; // Should never happen in a valid game state
    }

    // Returns true if the given player's king is under attack by any opponent piece.
    isInCheck(player) {
        var kingPos = this._findKing(player);
        if (!kingPos) return false;

        var opponent = 1 - player;
        var kingRow = kingPos[0];
        var kingCol = kingPos[1];

        // Check if any opponent piece can reach the king's position
        for (var r = 0; r < 9; r++) {
            for (var c = 0; c < 9; c++) {
                var cell = this.board[r][c];
                if (cell && cell.player === opponent) {
                    var moves = this.getPieceMovements(r, c);
                    for (var i = 0; i < moves.length; i++) {
                        if (moves[i][0] === kingRow && moves[i][1] === kingCol) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    // Generate all legal moves for the current player, filtering out those
    // that leave the own king in check.
    getLegalMoves() {
        var player = this.currentPlayer;
        var pseudoMoves = this._generatePseudoLegalMoves(player);
        var legalMoves = [];

        for (var i = 0; i < pseudoMoves.length; i++) {
            var move = pseudoMoves[i];
            if (this._isMoveLegal(move, player)) {
                legalMoves.push(move);
            }
        }

        return legalMoves;
    }

    // Generate all pseudo-legal moves (before check filtering) for a player.
    _generatePseudoLegalMoves(player) {
        var moves = [];

        // Board moves
        for (var r = 0; r < 9; r++) {
            for (var c = 0; c < 9; c++) {
                var cell = this.board[r][c];
                if (cell && cell.player === player) {
                    var destinations = this.getPieceMovements(r, c);
                    for (var i = 0; i < destinations.length; i++) {
                        var toRow = destinations[i][0];
                        var toCol = destinations[i][1];

                        if (cell.promoted || cell.piece === 'king' || cell.piece === 'gold') {
                            // Cannot promote further
                            moves.push({type: 'move', from: [r, c], to: [toRow, toCol], promote: false});
                        } else if (this.mustPromote(cell.piece, player, toRow)) {
                            // Must promote
                            moves.push({type: 'move', from: [r, c], to: [toRow, toCol], promote: true});
                        } else if (this.canPromote(cell.piece, player, r, toRow)) {
                            // Can choose to promote or not
                            moves.push({type: 'move', from: [r, c], to: [toRow, toCol], promote: true});
                            moves.push({type: 'move', from: [r, c], to: [toRow, toCol], promote: false});
                        } else {
                            // Normal move, no promotion
                            moves.push({type: 'move', from: [r, c], to: [toRow, toCol], promote: false});
                        }
                    }
                }
            }
        }

        // Drop moves
        var hand = this.hands[player];
        var pieceTypes = ['pawn', 'lance', 'knight', 'silver', 'gold', 'bishop', 'rook'];
        for (var p = 0; p < pieceTypes.length; p++) {
            var pieceType = pieceTypes[p];
            if (hand[pieceType] > 0) {
                var targets = this.getDropTargets(pieceType);
                for (var t = 0; t < targets.length; t++) {
                    moves.push({type: 'drop', piece: pieceType, to: [targets[t][0], targets[t][1]]});
                }
            }
        }

        return moves;
    }

    // Test whether a move is legal (does not leave own king in check).
    // Also filters out pawn drops that give immediate checkmate (uchifuzume).
    _isMoveLegal(move, player) {
        // Apply the move temporarily
        var undoInfo = this._applyMoveRaw(move);

        // Check if the move leaves own king in check
        var inCheck = this.isInCheck(player);

        // Undo the move
        this._undoMoveRaw(move, undoInfo);

        if (inCheck) return false;

        // Pawn drop checkmate rule (uchifuzume): cannot drop a pawn to give checkmate
        if (move.type === 'drop' && move.piece === 'pawn') {
            var undoInfo2 = this._applyMoveRaw(move);
            var opponent = 1 - player;
            var opponentInCheck = this.isInCheck(opponent);
            if (opponentInCheck) {
                // Check if this is checkmate for the opponent
                var opponentHasMoves = this._hasAnyLegalMove(opponent);
                if (!opponentHasMoves) {
                    this._undoMoveRaw(move, undoInfo2);
                    return false; // Pawn drop checkmate is illegal
                }
            }
            this._undoMoveRaw(move, undoInfo2);
        }

        return true;
    }

    // Check if a player has any legal move (used for uchifuzume check).
    _hasAnyLegalMove(player) {
        // Temporarily switch current player to generate moves for the given player
        var savedPlayer = this.currentPlayer;
        this.currentPlayer = player;

        // Board moves
        for (var r = 0; r < 9; r++) {
            for (var c = 0; c < 9; c++) {
                var cell = this.board[r][c];
                if (cell && cell.player === player) {
                    var destinations = this.getPieceMovements(r, c);
                    for (var i = 0; i < destinations.length; i++) {
                        var toRow = destinations[i][0];
                        var toCol = destinations[i][1];
                        var promote = false;

                        if (!cell.promoted && cell.piece !== 'king' && cell.piece !== 'gold') {
                            if (this.mustPromote(cell.piece, player, toRow)) {
                                promote = true;
                            }
                        }

                        var testMove = {type: 'move', from: [r, c], to: [toRow, toCol], promote: promote};
                        var undoInfo = this._applyMoveRaw(testMove);
                        var inCheck = this.isInCheck(player);
                        this._undoMoveRaw(testMove, undoInfo);

                        if (!inCheck) {
                            this.currentPlayer = savedPlayer;
                            return true;
                        }

                        // If this piece can promote optionally, also try with promotion
                        if (!cell.promoted && cell.piece !== 'king' && cell.piece !== 'gold'
                            && !promote && this.canPromote(cell.piece, player, r, toRow)) {
                            testMove = {type: 'move', from: [r, c], to: [toRow, toCol], promote: true};
                            undoInfo = this._applyMoveRaw(testMove);
                            inCheck = this.isInCheck(player);
                            this._undoMoveRaw(testMove, undoInfo);

                            if (!inCheck) {
                                this.currentPlayer = savedPlayer;
                                return true;
                            }
                        }
                    }
                }
            }
        }

        // Drop moves
        var hand = this.hands[player];
        var pieceTypes = ['pawn', 'lance', 'knight', 'silver', 'gold', 'bishop', 'rook'];
        for (var p = 0; p < pieceTypes.length; p++) {
            var pieceType = pieceTypes[p];
            if (hand[pieceType] > 0) {
                var targets = this.getDropTargets(pieceType);
                for (var t = 0; t < targets.length; t++) {
                    var testMove = {type: 'drop', piece: pieceType, to: [targets[t][0], targets[t][1]]};
                    var undoInfo = this._applyMoveRaw(testMove);
                    var inCheck = this.isInCheck(player);
                    this._undoMoveRaw(testMove, undoInfo);

                    if (!inCheck) {
                        this.currentPlayer = savedPlayer;
                        return true;
                    }
                }
            }
        }

        this.currentPlayer = savedPlayer;
        return false;
    }

    // Apply a move to the board without switching turns or checking legality.
    // Returns undo information.
    _applyMoveRaw(move) {
        var undoInfo = {};

        if (move.type === 'move') {
            var fromRow = move.from[0];
            var fromCol = move.from[1];
            var toRow = move.to[0];
            var toCol = move.to[1];

            var movingPiece = this.board[fromRow][fromCol];
            var capturedPiece = this.board[toRow][toCol];

            undoInfo.capturedPiece = capturedPiece;
            undoInfo.wasPromoted = movingPiece.promoted;

            // Handle capture
            if (capturedPiece) {
                this.hands[movingPiece.player][capturedPiece.piece]++;
            }

            // Move the piece
            this.board[toRow][toCol] = movingPiece;
            this.board[fromRow][fromCol] = null;

            // Handle promotion
            if (move.promote) {
                movingPiece.promoted = true;
            }
        } else if (move.type === 'drop') {
            var toRow = move.to[0];
            var toCol = move.to[1];
            var player = this.currentPlayer;

            this.hands[player][move.piece]--;
            this.board[toRow][toCol] = {player: player, piece: move.piece, promoted: false};

            undoInfo.droppedPlayer = player;
        }

        return undoInfo;
    }

    // Undo a raw move application.
    _undoMoveRaw(move, undoInfo) {
        if (move.type === 'move') {
            var fromRow = move.from[0];
            var fromCol = move.from[1];
            var toRow = move.to[0];
            var toCol = move.to[1];

            var movingPiece = this.board[toRow][toCol];

            // Undo promotion
            movingPiece.promoted = undoInfo.wasPromoted;

            // Move piece back
            this.board[fromRow][fromCol] = movingPiece;

            // Restore captured piece
            if (undoInfo.capturedPiece) {
                this.board[toRow][toCol] = undoInfo.capturedPiece;
                this.hands[movingPiece.player][undoInfo.capturedPiece.piece]--;
            } else {
                this.board[toRow][toCol] = null;
            }
        } else if (move.type === 'drop') {
            var toRow = move.to[0];
            var toCol = move.to[1];
            var player = undoInfo.droppedPlayer;

            this.board[toRow][toCol] = null;
            this.hands[player][move.piece]++;
        }
    }

    // Execute a move, switch turn, and check for checkmate.
    // Returns true if the move was successfully made, false if illegal.
    makeMove(move) {
        if (this.gameOver) return false;

        var player = this.currentPlayer;

        // Validate the move is legal
        if (!this._isMoveLegal(move, player)) return false;

        // For board moves, verify the piece belongs to the current player
        if (move.type === 'move') {
            var fromCell = this.board[move.from[0]][move.from[1]];
            if (!fromCell || fromCell.player !== player) return false;
        }

        // For drops, verify the player has the piece in hand
        if (move.type === 'drop') {
            if (this.hands[player][move.piece] <= 0) return false;
        }

        // Save state for undo
        var historyEntry = {
            move: {
                type: move.type,
                from: move.from ? [move.from[0], move.from[1]] : undefined,
                to: [move.to[0], move.to[1]],
                promote: move.promote,
                piece: move.piece
            },
            capturedPiece: null,
            wasPromoted: false,
            player: player
        };

        if (move.type === 'move') {
            var captured = this.board[move.to[0]][move.to[1]];
            if (captured) {
                historyEntry.capturedPiece = {
                    player: captured.player,
                    piece: captured.piece,
                    promoted: captured.promoted
                };
            }
            historyEntry.wasPromoted = this.board[move.from[0]][move.from[1]].promoted;
        }

        // Apply the move
        this._applyMoveRaw(move);

        this.moveHistory.push(historyEntry);

        // Switch turn
        this.currentPlayer = 1 - player;

        // Check for checkmate
        if (this.isCheckmate()) {
            this.gameOver = true;
            this.winner = player; // The player who just moved wins
        }

        return true;
    }

    // Undo the last move.
    undoMove() {
        if (this.moveHistory.length === 0) return false;

        var entry = this.moveHistory.pop();
        var move = entry.move;

        // Restore the current player
        this.currentPlayer = entry.player;

        // Undo game over state
        this.gameOver = false;
        this.winner = null;

        if (move.type === 'move') {
            var fromRow = move.from[0];
            var fromCol = move.from[1];
            var toRow = move.to[0];
            var toCol = move.to[1];

            var movingPiece = this.board[toRow][toCol];

            // Undo promotion
            movingPiece.promoted = entry.wasPromoted;

            // Move piece back to original position
            this.board[fromRow][fromCol] = movingPiece;

            // Restore captured piece or clear the destination
            if (entry.capturedPiece) {
                this.board[toRow][toCol] = {
                    player: entry.capturedPiece.player,
                    piece: entry.capturedPiece.piece,
                    promoted: entry.capturedPiece.promoted
                };
                // Remove captured piece from hand
                this.hands[entry.player][entry.capturedPiece.piece]--;
            } else {
                this.board[toRow][toCol] = null;
            }
        } else if (move.type === 'drop') {
            var toRow = move.to[0];
            var toCol = move.to[1];

            // Remove dropped piece from the board
            this.board[toRow][toCol] = null;

            // Return piece to hand
            this.hands[entry.player][move.piece]++;
        }

        return true;
    }

    // Returns true if the current player is in checkmate.
    isCheckmate() {
        var player = this.currentPlayer;

        // Must be in check first
        if (!this.isInCheck(player)) return false;

        // Check if there are any legal moves
        return !this._hasAnyLegalMove(player);
    }

    // Deep copy of the game state.
    clone() {
        var copy = new ShogiGame();

        // Deep copy board
        for (var r = 0; r < 9; r++) {
            for (var c = 0; c < 9; c++) {
                var cell = this.board[r][c];
                if (cell) {
                    copy.board[r][c] = {
                        player: cell.player,
                        piece: cell.piece,
                        promoted: cell.promoted
                    };
                } else {
                    copy.board[r][c] = null;
                }
            }
        }

        // Deep copy hands
        for (var p = 0; p < 2; p++) {
            copy.hands[p] = {
                pawn: this.hands[p].pawn,
                lance: this.hands[p].lance,
                knight: this.hands[p].knight,
                silver: this.hands[p].silver,
                gold: this.hands[p].gold,
                bishop: this.hands[p].bishop,
                rook: this.hands[p].rook
            };
        }

        copy.currentPlayer = this.currentPlayer;
        copy.gameOver = this.gameOver;
        copy.winner = this.winner;

        // Deep copy move history
        copy.moveHistory = [];
        for (var i = 0; i < this.moveHistory.length; i++) {
            var entry = this.moveHistory[i];
            var entryCopy = {
                move: {
                    type: entry.move.type,
                    to: [entry.move.to[0], entry.move.to[1]],
                    promote: entry.move.promote,
                    piece: entry.move.piece
                },
                capturedPiece: null,
                wasPromoted: entry.wasPromoted,
                player: entry.player
            };
            if (entry.move.from) {
                entryCopy.move.from = [entry.move.from[0], entry.move.from[1]];
            }
            if (entry.capturedPiece) {
                entryCopy.capturedPiece = {
                    player: entry.capturedPiece.player,
                    piece: entry.capturedPiece.piece,
                    promoted: entry.capturedPiece.promoted
                };
            }
            copy.moveHistory.push(entryCopy);
        }

        return copy;
    }
}
