/**
 * ShogiAI — Minimax with alpha-beta pruning for browser-based Shogi.
 *
 * Depends on ShogiGame (defined in game-logic.js) being available in the
 * global scope.  This file adds a single global class: ShogiAI.
 */

class ShogiAI {
    constructor(depth = 3) {
        this.depth = depth;
        this.timeLimit = 3000; // milliseconds
        this.startTime = 0;
        this.timedOut = false;

        // -----------------------------------------------------------
        // Piece value tables
        // -----------------------------------------------------------
        this.pieceValues = {
            pawn:   100,
            lance:  300,
            knight: 350,
            silver: 500,
            gold:   550,
            bishop: 800,
            rook:   1000,
            king:   100000
        };

        this.promotedValues = {
            pawn:   550,   // tokin
            lance:  550,
            knight: 550,
            silver: 550,
            bishop: 1100,  // horse
            rook:   1300   // dragon
        };

        // Hand-piece multiplier (drops are flexible, so slightly more
        // valuable than the same piece sitting on the board).
        this.handMultiplier = 1.1;
    }

    // ---------------------------------------------------------------
    // Public entry point
    // ---------------------------------------------------------------

    /**
     * Return the best move for game.currentPlayer.
     * The returned object is in the same format accepted by game.makeMove().
     */
    getBestMove(game) {
        const moves = game.getLegalMoves();
        if (moves.length === 0) return null;

        // Determine whether we are maximising (sente) or minimising (gote).
        const maximizing = game.currentPlayer === 0;

        this.startTime = performance.now();
        this.timedOut = false;

        // Order moves at the root as well for better cutoffs.
        this._orderMoves(moves, game);

        let bestMove = moves[0];
        let bestScore = maximizing ? -Infinity : Infinity;

        for (let i = 0; i < moves.length; i++) {
            if (this._isTimeUp()) break;

            const move = moves[i];

            // Use makeMove / undoMove on a single clone for the entire
            // search tree — avoids re-cloning at every node.
            const clone = game.clone();
            const ok = clone.makeMove(move);
            if (!ok) continue;

            const score = this.minimax(
                clone,
                this.depth - 1,
                -Infinity,
                Infinity,
                !maximizing
            );

            // Small random jitter to break ties so the AI is not
            // deterministic when several moves evaluate equally.
            const jitter = (Math.random() - 0.5) * 2; // ±1

            if (maximizing) {
                if (score + jitter > bestScore) {
                    bestScore = score + jitter;
                    bestMove = move;
                }
            } else {
                if (score + jitter < bestScore) {
                    bestScore = score + jitter;
                    bestMove = move;
                }
            }
        }

        return bestMove;
    }

    // ---------------------------------------------------------------
    // Minimax with alpha-beta pruning
    // ---------------------------------------------------------------

    /**
     * @param {ShogiGame} game  — a (cloned) game state
     * @param {number}   depth  — remaining search depth
     * @param {number}   alpha
     * @param {number}   beta
     * @param {boolean}  maximizingPlayer — true when evaluating for sente
     * @returns {number} evaluation score from sente's perspective
     */
    minimax(game, depth, alpha, beta, maximizingPlayer) {
        // Terminal / leaf checks
        if (game.gameOver) {
            if (game.winner === 0) return  90000 + depth; // sente wins; prefer faster mate
            if (game.winner === 1) return -90000 - depth;
            return 0; // draw / stalemate (rare in shogi but be safe)
        }

        if (depth === 0 || this._isTimeUp()) {
            return this.evaluate(game, depth === 0);
        }

        const moves = game.getLegalMoves();

        if (moves.length === 0) {
            // No legal moves — this player is in stalemate (or mated).
            // In shogi, no-legal-moves usually means checkmate.
            if (game.isInCheck(game.currentPlayer)) {
                // Current player is checkmated.
                return game.currentPlayer === 0
                    ? -90000 - depth
                    :  90000 + depth;
            }
            // Stalemate (extremely rare): treat as roughly even.
            return 0;
        }

        this._orderMoves(moves, game);

        if (maximizingPlayer) {
            let value = -Infinity;
            for (let i = 0; i < moves.length; i++) {
                if (this._isTimeUp()) break;

                game.makeMove(moves[i]);
                value = Math.max(value, this.minimax(game, depth - 1, alpha, beta, false));
                game.undoMove();

                alpha = Math.max(alpha, value);
                if (alpha >= beta) break; // beta cutoff
            }
            return value;
        } else {
            let value = Infinity;
            for (let i = 0; i < moves.length; i++) {
                if (this._isTimeUp()) break;

                game.makeMove(moves[i]);
                value = Math.min(value, this.minimax(game, depth - 1, alpha, beta, true));
                game.undoMove();

                beta = Math.min(beta, value);
                if (alpha >= beta) break; // alpha cutoff
            }
            return value;
        }
    }

    // ---------------------------------------------------------------
    // Static evaluation
    // ---------------------------------------------------------------

    /**
     * Evaluate the position from sente's (player 0) perspective.
     * Positive = good for sente, negative = good for gote.
     *
     * @param {ShogiGame} game
     * @param {boolean}   includeMobility — only at leaf nodes (depth 0)
     * @returns {number}
     */
    evaluate(game, includeMobility) {
        let score = 0;

        // ----- 1. Material on the board + positional bonuses -----
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = game.board[row][col];
                if (!cell) continue;

                const sign = cell.player === 0 ? 1 : -1;

                // Base piece value
                let value;
                if (cell.piece === 'king') {
                    value = this.pieceValues.king;
                } else if (cell.promoted) {
                    value = this.promotedValues[cell.piece] || this.pieceValues[cell.piece];
                } else {
                    value = this.pieceValues[cell.piece] || 0;
                }

                // --- Positional adjustments ---

                // Pawns: advanced pawns are more valuable.
                // Sente pawns advance toward row 0; gote pawns toward row 8.
                if (cell.piece === 'pawn' && !cell.promoted) {
                    if (cell.player === 0) {
                        // Sente pawn: rows 0-2 are promotion zone, row 6 is starting rank.
                        value += (6 - row) * 5;
                    } else {
                        // Gote pawn: rows 6-8 are promotion zone, row 2 is starting rank.
                        value += (row - 2) * 5;
                    }
                }

                // Promotion-zone bonus for non-pawn pieces
                if (cell.piece !== 'king') {
                    const inPromotionZone = cell.player === 0
                        ? row <= 2
                        : row >= 6;
                    if (inPromotionZone && !cell.promoted) {
                        value += 20; // potential to promote
                    }
                    if (cell.promoted) {
                        value += 15; // already promoted, small extra bonus
                    }
                }

                // Rook / Bishop centre-board bonus
                if (cell.piece === 'rook' || cell.piece === 'bishop') {
                    const centreRowDist = Math.abs(row - 4);
                    const centreColDist = Math.abs(col - 4);
                    value += (4 - centreRowDist) * 5 + (4 - centreColDist) * 5;
                }

                score += sign * value;
            }
        }

        // ----- 2. Material in hand -----
        for (let player = 0; player < 2; player++) {
            const sign = player === 0 ? 1 : -1;
            const hand = game.hands[player];
            for (const piece in hand) {
                if (hand[piece] > 0) {
                    const baseVal = this.pieceValues[piece] || 0;
                    score += sign * hand[piece] * baseVal * this.handMultiplier;
                }
            }
        }

        // ----- 3. King safety -----
        for (let player = 0; player < 2; player++) {
            const sign = player === 0 ? 1 : -1;

            // Penalty for being in check
            if (game.isInCheck(player)) {
                score -= sign * 200;
            }

            // Bonus for gold/silver adjacent to the king (defensive formation)
            const kingPos = this._findKing(game, player);
            if (kingPos) {
                const [kr, kc] = kingPos;
                const adjacentOffsets = [
                    [-1, -1], [-1, 0], [-1, 1],
                    [ 0, -1],          [ 0, 1],
                    [ 1, -1], [ 1, 0], [ 1, 1]
                ];
                let defenders = 0;
                for (const [dr, dc] of adjacentOffsets) {
                    const r = kr + dr;
                    const c = kc + dc;
                    if (r < 0 || r > 8 || c < 0 || c > 8) continue;
                    const adj = game.board[r][c];
                    if (!adj) continue;
                    if (adj.player !== player) continue;
                    if (adj.piece === 'gold' ||
                        adj.piece === 'silver' ||
                        (adj.promoted && adj.piece !== 'rook' && adj.piece !== 'bishop')) {
                        defenders++;
                    }
                }
                score += sign * defenders * 30;
            }
        }

        // ----- 4. Mobility (only at leaf nodes to save time) -----
        if (includeMobility) {
            // We need move counts for both players. The game object
            // only gives legal moves for currentPlayer, so we evaluate
            // just the current player's mobility and approximate.
            const moves = game.getLegalMoves();
            const mobilitySign = game.currentPlayer === 0 ? 1 : -1;
            score += mobilitySign * moves.length * 2;
        }

        return score;
    }

    // ---------------------------------------------------------------
    // Move ordering
    // ---------------------------------------------------------------

    /**
     * Sort moves in-place so that captures, promotions and checks are
     * tried first.  This dramatically improves alpha-beta pruning.
     */
    _orderMoves(moves, game) {
        // Precompute a score for each move. Higher = tried first.
        const scores = new Array(moves.length);
        for (let i = 0; i < moves.length; i++) {
            scores[i] = this._moveOrderScore(moves[i], game);
        }

        // Simple indexed sort (avoids closure allocation cost of
        // Array.prototype.sort with a comparator that captures `scores`).
        // We only need a rough ordering, so an insertion sort on a
        // presorted-ish array is fine and avoids overhead.
        for (let i = 1; i < moves.length; i++) {
            const scoreI = scores[i];
            const moveI = moves[i];
            let j = i - 1;
            while (j >= 0 && scores[j] < scoreI) {
                scores[j + 1] = scores[j];
                moves[j + 1] = moves[j];
                j--;
            }
            scores[j + 1] = scoreI;
            moves[j + 1] = moveI;
        }
    }

    /**
     * Heuristic score for move ordering (higher = search first).
     */
    _moveOrderScore(move, game) {
        let score = 0;

        if (move.type === 'move') {
            const [toR, toC] = move.to;
            const target = game.board[toR][toC];

            // Captures: value of captured piece (prefer capturing expensive pieces)
            if (target) {
                let capturedVal;
                if (target.promoted) {
                    capturedVal = this.promotedValues[target.piece] || this.pieceValues[target.piece];
                } else {
                    capturedVal = this.pieceValues[target.piece] || 0;
                }
                // MVV-LVA: captured value minus a fraction of the attacker value
                const [fromR, fromC] = move.from;
                const attacker = game.board[fromR][fromC];
                let attackerVal = 0;
                if (attacker) {
                    if (attacker.promoted) {
                        attackerVal = this.promotedValues[attacker.piece] || this.pieceValues[attacker.piece];
                    } else {
                        attackerVal = this.pieceValues[attacker.piece] || 0;
                    }
                }
                score += 10000 + capturedVal - (attackerVal / 100);
            }

            // Promotions
            if (move.promote) {
                score += 5000;
            }
        } else if (move.type === 'drop') {
            // Drops are generally useful; prioritise higher-value drops.
            score += 1000 + (this.pieceValues[move.piece] || 0);
        }

        return score;
    }

    // ---------------------------------------------------------------
    // Utility helpers
    // ---------------------------------------------------------------

    /**
     * Find the king's position for a given player.
     * Returns [row, col] or null.
     */
    _findKing(game, player) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = game.board[row][col];
                if (cell && cell.player === player && cell.piece === 'king') {
                    return [row, col];
                }
            }
        }
        return null;
    }

    /**
     * Check whether the time budget has been exceeded.
     */
    _isTimeUp() {
        if (this.timedOut) return true;
        if (performance.now() - this.startTime > this.timeLimit) {
            this.timedOut = true;
            return true;
        }
        return false;
    }
}
