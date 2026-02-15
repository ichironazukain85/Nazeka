# shogi/AGENTS.md — Shogi Game Agent Teams

Browser-based Shogi (Japanese Chess) game built with vanilla JavaScript.

## Shared Interface Contract

All agents must use these exact data structures:

### Board Representation
```javascript
// board[row][col] — 9x9 array
// row 0 = top (gote's back rank), row 8 = bottom (sente's back rank)
// col 0 = leftmost on screen (file 9), col 8 = rightmost (file 1)
// Cell: null | {player: 0|1, piece: string, promoted: boolean}
// player 0 = sente (先手, bottom), player 1 = gote (後手, top)
```

### Piece Types
`'king'`, `'rook'`, `'bishop'`, `'gold'`, `'silver'`, `'knight'`, `'lance'`, `'pawn'`

### Move Format
```javascript
{type: 'move', from: [row, col], to: [row, col], promote: boolean}
{type: 'drop', piece: string, to: [row, col]}
```

### Hand (Captured Pieces)
```javascript
// hands[player] = {pawn: n, lance: n, knight: n, silver: n, gold: n, bishop: n, rook: n}
```

### ShogiGame Class API
```javascript
class ShogiGame {
    board       // 9x9 array
    hands       // [sente_hand, gote_hand]
    currentPlayer // 0 or 1
    moveHistory // array of {move, captured, previousPromoted}
    gameOver    // boolean
    winner      // null | 0 | 1

    constructor()           // Initialize starting position
    getLegalMoves()          // Returns array of all legal moves for currentPlayer
    makeMove(move)           // Execute move, switch turn, return true if successful
    undoMove()               // Undo last move
    isInCheck(player)        // Returns boolean
    isCheckmate()            // Returns boolean (for currentPlayer)
    clone()                  // Deep copy
    getPieceMovements(row, col) // Returns array of [toRow, toCol] (raw moves, no legality check)
}
```

## Agent: game-logic

**Owns:** `js/game-logic.js`
**Role:** Implements complete ShogiGame class with all shogi rules.

## Agent: ui

**Owns:** `index.html`, `css/style.css`, `js/ui.js`
**Role:** Board rendering, piece display (kanji), click interaction, hand display, game status.

## Agent: ai

**Owns:** `js/ai.js`
**Role:** AI opponent using minimax with alpha-beta pruning.
