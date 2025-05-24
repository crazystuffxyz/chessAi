const express = require('express');
const WebSocket = require('ws');
const { URL } = require('url'); // For parsing URL and query parameters

const stockfish = require("./stockfish");

const { Chess } = require('chess.js');
const request = require('request');
const app = express();

// --- Configuration ---
const SEARCH_DEPTH = 15;
const QUICK_EVAL_DEPTH = 5;
const WINNING_THRESHOLD_CP = 150;
const EVALUATION_TIMEOUT_MS = 10000;
const STOCKFISH_CMD_TIMEOUT_MS = 45000;

const PIECE_VALUES = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
const DEFAULT_SIMULATED_ELO = 1500;

stockfish()().then((engine) => {
    app.get('/', (req, res) => {
        res.send("Express server with Chess Logic (Stockfish) is working!\n" +
                 "Available WebSocket paths: /ws/aggressive, /ws/defensive, /ws/brilliant, /ws/elo_simulator?elo=XXXX, /ws/draw_seeker\n");
    });

    app.all("/*", (req, res) => {
        if (req.url.startsWith('/ws/')) {
            return;
        }
        // console.log(`Proxying HTTP request for: ${req.url}`); // Less verbose
        if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
             console.log("WebSocket upgrade request detected for a non-specific path, skipping proxy.");
        } else {
            try {
                request("https://webresolver.nl" + req.url)
                    .on('error', (err) => {
                        console.error("Proxy request error:", err);
                        if (!res.headersSent) res.status(502).send("Proxy error");
                    })
                    .pipe(res);
            } catch (err) {
                console.error("Error initiating proxy request:", err);
                if (!res.headersSent) res.status(500).send("Internal Server Error");
            }
        }
    });

    const server = app.listen(8080, () => {
        console.log(`Express server running on port 8080`);
        console.log(`WebSocket endpoints available.`);
    });

    const wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
        const parsedUrl = new URL(request.url, `ws://${request.headers.host}`);
        const pathname = parsedUrl.pathname;

        const allowedPaths = ['/ws/aggressive', '/ws/defensive', '/ws/brilliant', '/ws/elo_simulator', '/ws/draw_seeker', '/ws'];
        if (allowedPaths.includes(pathname)) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request, parsedUrl); // Pass parsedUrl
            });
        } else {
            console.log(`Rejecting WebSocket connection for unknown path: ${pathname}`);
            socket.destroy();
        }
    });

    console.log("WebSocket server initialized with path handling.");

    wss.on('connection', (ws, req, parsedUrl) => { // Receive parsedUrl
        const pathname = parsedUrl.pathname;
        console.log(`New client connected on path: ${pathname}`);

        let engineReady = false;
        let currentMessageId = 0;
        const pendingRequests = new Map();
        ws.currentFen = null;
        ws.game = new Chess();
        let activeEvaluation = null;

        let moveLogicHandler;
        let botType = "aggressive"; // Default
        ws.targetElo = DEFAULT_SIMULATED_ELO; // For ELO simulator

        if (pathname === '/ws/defensive') {
            moveLogicHandler = findDefensiveMove;
            botType = "defensive";
        } else if (pathname === '/ws/brilliant') {
            moveLogicHandler = findBrilliantMove;
            botType = "brilliant";
        } else if (pathname === '/ws/elo_simulator') {
            moveLogicHandler = findEloSimulatedMove;
            botType = "elo_simulator";
            const eloParam = parsedUrl.searchParams.get('elo');
            if (eloParam && !isNaN(parseInt(eloParam))) {
                ws.targetElo = Math.max(400, Math.min(3000, parseInt(eloParam))); // Clamp ELO
                console.log(`ELO Simulator ELO set to: ${ws.targetElo}`);
            } else {
                console.log(`ELO Simulator using default ELO: ${ws.targetElo}`);
            }
        } else if (pathname === '/ws/draw_seeker') {
            moveLogicHandler = findDrawSeekingMove;
            botType = "draw_seeker";
        } else { // Default to aggressive for /ws/aggressive or /ws
            moveLogicHandler = findAggressiveMove;
            botType = "aggressive";
        }
        console.log(`Client on ${pathname} using ${botType} logic.`);

        const queryStockfish = (command, expectedResponsePrefix) => {
            return new Promise((resolve, reject) => {
                if (!engineReady && command !== 'uci' && !command.startsWith('setoption')) {
                    return reject(new Error("Stockfish engine not ready."));
                }
                const messageId = ++currentMessageId;
                const timeout = setTimeout(() => {
                    pendingRequests.delete(messageId);
                    console.error(`[Stockfish Query ${messageId}] TIMEOUT for command: ${command}`);
                    reject(new Error(`Stockfish timeout for command: ${command}`));
                }, STOCKFISH_CMD_TIMEOUT_MS);

                pendingRequests.set(messageId, (line) => {
                    if (line.startsWith(expectedResponsePrefix)) {
                        clearTimeout(timeout);
                        pendingRequests.delete(messageId);
                        resolve(line);
                        return true;
                    }
                    if (line.includes("Unknown command") || line.toLowerCase().includes("no option")) {
                        clearTimeout(timeout);
                        pendingRequests.delete(messageId);
                        reject(new Error(`Stockfish Engine Error/Unknown: ${line}`));
                        return true;
                    }
                    return false;
                });
                try { engine.postMessage(command); }
                catch (e) {
                    clearTimeout(timeout); pendingRequests.delete(messageId);
                    reject(new Error(`Error posting message to Stockfish: ${e.message}`));
                }
            });
        };

        engine.onmessage = (line) => {
            if (typeof line !== 'string') return;
            let handledByRequest = false;
            const handlers = Array.from(pendingRequests.values());
            for (const handler of handlers) { if (handler && handler(line)) { handledByRequest = true; } }
            if (handledByRequest) return;

            if (activeEvaluation) {
                if (line.startsWith('info')) {
                    if (line.includes(' score cp ')) {
                        const match = line.match(/score cp (-?\d+)/);
                        if (match) activeEvaluation.lastScoreCp = parseInt(match[1], 10);
                    } else if (line.includes(' score mate ')) {
                        const match = line.match(/score mate (-?\d+)/);
                        if (match) activeEvaluation.lastScoreMate = parseInt(match[1], 10);
                    }
                    return;
                } else if (line.startsWith('bestmove')) {
                    const { resolve, board, lastScoreCp, lastScoreMate, timeoutId } = activeEvaluation;
                    clearTimeout(timeoutId); activeEvaluation = null;
                    if (lastScoreMate !== null) {
                        const scoreForWhite = (board.turn() === 'w' ? lastScoreMate : -lastScoreMate);
                        resolve(scoreForWhite > 0 ? 99999 : -99999);
                    } else if (lastScoreCp !== null) {
                        const scoreForWhite = (board.turn() === 'w' ? lastScoreCp : -lastScoreCp);
                        resolve(scoreForWhite);
                    } else { resolve(0); }
                    return;
                }
            }
            if (line === 'uciok') { engine.postMessage('isready'); return; }
            if (line === 'readyok') { if (!engineReady) { engineReady = true; console.log('Stockfish engine ready.'); } return; }
        };

        async function getEvaluation(fen, depth) {
            return new Promise(async (resolve, reject) => {
                if (activeEvaluation) return reject(new Error("Evaluation already in progress."));
                if (!engineReady) return reject(new Error("Engine not ready for evaluation."));
                const board = new Chess(fen);
                let timeoutId = null;
                activeEvaluation = {
                    resolve, reject, fen, board, lastScoreCp: null, lastScoreMate: null,
                    timeoutId: setTimeout(() => {
                        if (activeEvaluation && activeEvaluation.timeoutId === timeoutId) {
                            activeEvaluation = null;
                            reject(new Error(`Evaluation timed out after ${EVALUATION_TIMEOUT_MS}ms`));
                        }
                    }, EVALUATION_TIMEOUT_MS)
                };
                timeoutId = activeEvaluation.timeoutId;
                try {
                    engine.postMessage(`position fen ${fen}`);
                    engine.postMessage(`go depth ${depth}`);
                } catch (error) { clearTimeout(activeEvaluation.timeoutId); activeEvaluation = null; reject(error); }
            });
        }

        async function getBestMove(fen, depth) {
            try {
                engine.postMessage(`position fen ${fen}`);
                const bestMoveLine = await queryStockfish(`go depth ${depth}`, 'bestmove');
                const parts = bestMoveLine.split(' ');
                if (parts.length >= 2 && parts[0] === 'bestmove') {
                    const bestMove = parts[1];
                    return (bestMove === '(none)') ? null : bestMove;
                } else throw new Error(`Unexpected bestmove format: ${bestMoveLine}`);
            } catch (error) { console.error(`Error getting best move for FEN ${fen}:`, error); throw error; }
        }

        function calculateMaterial(boardInstance) {
            let whiteMaterial = 0, blackMaterial = 0;
            boardInstance.board().forEach(row => row.forEach(square => {
                if (square) {
                    const value = PIECE_VALUES[square.type];
                    if (square.color === 'w') whiteMaterial += value; else blackMaterial += value;
                }
            }));
            return { w: whiteMaterial, b: blackMaterial };
        }

        async function checkMoveOutcome(gameInstanceOfConnection, moveObjectOrSan, originalTurn) {
            // ... (Keep existing checkMoveOutcome from previous answer - it's good for aggressive bot)
            // For brevity, assuming it's the same as the one in the previous response.
            // This function is mostly used by the aggressive bot. Other bots might do direct evaluations.
            const clonedGame = new Chess();
            clonedGame.load_pgn(gameInstanceOfConnection.pgn());
            let moveResult;
            try { moveResult = clonedGame.move(moveObjectOrSan); }
            catch (e) { moveResult = null; }

            if (moveResult === null) return { isValid: false, evaluation: (originalTurn === 'w' ? -999999 : 999999), uci: null, isRepetition: false, isCheck: false, isCheckmate: false, isDraw: true, fenAfter: gameInstanceOfConnection.fen()};

            const nextFen = clonedGame.fen();
            const evalForWhite = await getEvaluation(nextFen, QUICK_EVAL_DEPTH);
            const isOpponentInCheck = clonedGame.inCheck();
            const didWeCheckmate = clonedGame.isCheckmate();
            const isPositionDrawn = clonedGame.isDraw();
            const isThreefoldRep = clonedGame.isThreefoldRepetition();
            const evalForCurrentPlayer = (originalTurn === 'w') ? evalForWhite : -evalForWhite;
            const isWinningEval = evalForCurrentPlayer > WINNING_THRESHOLD_CP;
            const isValidStrategicMove = didWeCheckmate || (isWinningEval && !isPositionDrawn);

            return { isValid: isValidStrategicMove, evaluation: evalForWhite, uci: moveResult.lan || moveResult.uci || `${moveResult.from}${moveResult.to}${moveResult.promotion || ''}`, isRepetition: isThreefoldRep, isCheck: isOpponentInCheck, isCheckmate: didWeCheckmate, isDraw: isPositionDrawn, fenAfter: nextFen };
        }

        // --- AGGRESSIVE BOT LOGIC (findAggressiveMove) ---
        // ... (Keep existing findAggressiveMove from previous answer)
        async function findAggressiveMove(currentFenForMove, depth) { /* ... Same as before ... */
            const board = ws.game;
            if (board.isGameOver()) return null;
            const currentTurn = board.turn();
            let initialEvalForWhite;
            try { initialEvalForWhite = await getEvaluation(currentFenForMove, QUICK_EVAL_DEPTH); }
            catch (e) { return getBestMove(currentFenForMove, depth); }
            const initialEvalForCurrentPlayer = (currentTurn === 'w') ? initialEvalForWhite : -initialEvalForWhite;
            if (initialEvalForCurrentPlayer <= WINNING_THRESHOLD_CP) return getBestMove(currentFenForMove, depth);

            const legalMoves = board.moves({ verbose: true });
            const winningCaptures = [];
            for (const move of legalMoves.filter(m => m.flags.includes('c'))) {
                const result = await checkMoveOutcome(board, move, currentTurn);
                if (result.isValid && !result.isDraw) winningCaptures.push({ ...result, san: move.san });
            }
            if (winningCaptures.length > 0) {
                winningCaptures.sort((a,b) => (currentTurn === 'w' ? b.evaluation - a.evaluation : a.evaluation - b.evaluation));
                return winningCaptures[0].uci;
            }
            const winningChecks = [];
            for (const move of legalMoves) {
                const tempBoard = new Chess(); tempBoard.load_pgn(board.pgn()); tempBoard.move(move);
                if (tempBoard.inCheck()) {
                    const result = await checkMoveOutcome(board, move, currentTurn);
                    if (result.isValid && !result.isDraw && !(result.isCheck && result.isRepetition)) winningChecks.push({ ...result, san: move.san });
                }
            }
            if (winningChecks.length > 0) {
                winningChecks.sort((a,b) => (currentTurn === 'w' ? b.evaluation - a.evaluation : a.evaluation - b.evaluation));
                return winningChecks[0].uci;
            }
            const winningPawnPushes = [];
            for (const move of legalMoves.filter(m => m.piece === 'p' && !m.flags.includes('c') && !m.promotion)) {
                const result = await checkMoveOutcome(board, move, currentTurn);
                if (result.isValid && !result.isDraw) winningPawnPushes.push({ ...result, san: move.san });
            }
            if (winningPawnPushes.length > 0) return winningPawnPushes[Math.floor(Math.random() * winningPawnPushes.length)].uci;
            return getBestMove(currentFenForMove, depth);
        }


        // --- DEFENSIVE BOT LOGIC (findDefensiveMove) ---
        // ... (Keep existing findDefensiveMove from previous answer)
         async function findDefensiveMove(currentFenForMove, depth) { /* ... Same as before ... */
            const board = ws.game;
            if (board.isGameOver()) return null;
            const myColor = board.turn();
            const legalMoves = board.moves({ verbose: true });
            const candidateDefensiveMoves = [];

            for (const move of legalMoves) {
                if (move.flags.includes('c')) continue;
                const simBoard = new Chess(); simBoard.load_pgn(board.pgn()); simBoard.move(move);
                if (simBoard.isDraw() && !board.isDraw()) continue;
                const opponentMovesAfter = simBoard.moves({ verbose: true });
                if (opponentMovesAfter.some(oppMove => oppMove.flags.includes('c'))) continue;
                if (simBoard.isCheckmate()) {
                    candidateDefensiveMoves.push({ uci: move.lan || move.uci, fenAfter: simBoard.fen(), san: move.san, eval: myColor === 'w' ? 99999 : -99999 });
                    continue;
                }
                candidateDefensiveMoves.push({ uci: move.lan || move.uci, fenAfter: simBoard.fen(), san: move.san, eval: null });
            }
            if (candidateDefensiveMoves.length === 0) {
                const nonCapturingMoves = [];
                for (const move of legalMoves) {
                    if (move.flags.includes('c')) continue;
                    const tempBoard = new Chess(board.fen()); tempBoard.move(move);
                    nonCapturingMoves.push({ uci: move.lan || move.uci, fenAfter: tempBoard.fen(), san: move.san, eval: null});
                }
                if(nonCapturingMoves.length === 0) return getBestMove(currentFenForMove, depth);
                for(let cand of nonCapturingMoves) if (cand.eval === null) cand.eval = await getEvaluation(cand.fenAfter, QUICK_EVAL_DEPTH);
                nonCapturingMoves.sort((a, b) => myColor === 'w' ? b.eval - a.eval : a.eval - b.eval);
                return nonCapturingMoves.length > 0 ? nonCapturingMoves[0].uci : getBestMove(currentFenForMove, depth);
            }
            for (let cand of candidateDefensiveMoves) if (cand.eval === null) cand.eval = await getEvaluation(cand.fenAfter, QUICK_EVAL_DEPTH);
            candidateDefensiveMoves.sort((a, b) => myColor === 'w' ? b.eval - a.eval : a.eval - b.eval);
            return candidateDefensiveMoves[0].uci;
        }

        // --- BRILLIANT MOVE FARMER LOGIC (findBrilliantMove) ---
        // ... (Keep existing findBrilliantMove from previous answer)
        async function findBrilliantMove(currentFenForMove, depth) { /* ... Same as before ... */
            const board = ws.game;
            if (board.isGameOver()) return null;
            const myColor = board.turn();
            const initialEvalForWhite = await getEvaluation(currentFenForMove, QUICK_EVAL_DEPTH);
            const initialEvalForCurrentPlayer = (myColor === 'w') ? initialEvalForWhite : -initialEvalForWhite;
            if (initialEvalForCurrentPlayer <= WINNING_THRESHOLD_CP) return getBestMove(currentFenForMove, depth);

            const materialBefore = calculateMaterial(board)[myColor];
            const legalMoves = board.moves({ verbose: true });
            const brilliantCandidates = [];
            for (const move of legalMoves) {
                const simBoard = new Chess(); simBoard.load_pgn(board.pgn()); simBoard.move(move);
                if (simBoard.isDraw()) continue;
                const materialAfter = calculateMaterial(simBoard)[myColor];
                if (materialAfter >= materialBefore) continue;
                const nextEvalForWhite = await getEvaluation(simBoard.fen(), QUICK_EVAL_DEPTH);
                const nextEvalForCurrentPlayer = (myColor === 'w') ? nextEvalForWhite : -nextEvalForWhite;
                if (nextEvalForCurrentPlayer > WINNING_THRESHOLD_CP) brilliantCandidates.push({ uci: move.lan || move.uci, san: move.san, eval: nextEvalForWhite });
            }
            if (brilliantCandidates.length === 0) return getBestMove(currentFenForMove, depth);
            brilliantCandidates.sort((a, b) => myColor === 'w' ? b.eval - a.eval : a.eval - b.eval);
            return brilliantCandidates[0].uci;
        }

        // --- ELO SIMULATOR LOGIC ---
        async function findEloSimulatedMove(currentFenForMove, depth) {
            const board = ws.game;
            const targetElo = ws.targetElo; // Get from connection-specific state
            if (board.isGameOver()) return null;

            const myColor = board.turn();
            const legalMoves = board.moves({ verbose: true });
            if (legalMoves.length === 0) return null;

            // Get best move and its evaluation (from White's perspective)
            let bestMoveUci = null;
            let bestMoveEvalWhite = myColor === 'w' ? -Infinity : Infinity; // Initialize for comparison

            try {
                bestMoveUci = await getBestMove(currentFenForMove, depth); // Use main depth for finding "true" best
                if (bestMoveUci) {
                    const tempBoard = new Chess(currentFenForMove);
                    tempBoard.move(bestMoveUci);
                    bestMoveEvalWhite = await getEvaluation(tempBoard.fen(), QUICK_EVAL_DEPTH);
                } else { // No best move (e.g., mate/stalemate already)
                     return legalMoves[Math.floor(Math.random() * legalMoves.length)].lan; // Just pick a random legal one
                }
            } catch (e) {
                console.error("ELO Sim: Error getting best move/eval", e);
                return legalMoves[Math.floor(Math.random() * legalMoves.length)].lan; // Fallback
            }


            // --- ELO-based parameters (simplified heuristics) ---
            let blunderProbability = 0.1; // Chance to make a significant mistake
            let acceptableDeviationCp = 50; // How far from best move's eval is "ok"

            if (targetElo < 800) { blunderProbability = 0.6; acceptableDeviationCp = 400; }
            else if (targetElo < 1200) { blunderProbability = 0.4; acceptableDeviationCp = 250; }
            else if (targetElo < 1600) { blunderProbability = 0.2; acceptableDeviationCp = 150; }
            else if (targetElo < 2000) { blunderProbability = 0.1; acceptableDeviationCp = 80; }
            else if (targetElo < 2400) { blunderProbability = 0.05; acceptableDeviationCp = 40; }
            else { blunderProbability = 0.01; acceptableDeviationCp = 20; } // Stronger players

            // Decide if we make a "blunder"
            if (Math.random() < blunderProbability && legalMoves.length > 1) {
                console.log(`ELO Sim (${targetElo}): Attempting a blunder.`);
                const nonBestMoves = legalMoves.filter(m => (m.lan || m.uci) !== bestMoveUci);
                if (nonBestMoves.length > 0) {
                    const blunderMove = nonBestMoves[Math.floor(Math.random() * nonBestMoves.length)];
                    console.log(`ELO Sim: Chosen blunder: ${blunderMove.san}`);
                    return blunderMove.lan || blunderMove.uci;
                }
            }

            // Find "acceptable" moves within the deviation
            const acceptableMoves = [];
            for (const move of legalMoves) {
                const simBoard = new Chess(currentFenForMove);
                simBoard.move(move);
                const evalAfterMoveWhite = await getEvaluation(simBoard.fen(), QUICK_EVAL_DEPTH);

                let deviation;
                if (myColor === 'w') {
                    deviation = bestMoveEvalWhite - evalAfterMoveWhite; // Positive if worse for white
                } else { // myColor === 'b'
                    // bestMoveEvalWhite is eval for white. Lower is better for black.
                    // evalAfterMoveWhite is eval for white. Lower is better for black.
                    // We want evalAfterMoveWhite to be not too much higher than bestMoveEvalWhite.
                    deviation = evalAfterMoveWhite - bestMoveEvalWhite; // Positive if worse for black
                }

                if (deviation <= acceptableDeviationCp) { // If current move is not too much worse
                    acceptableMoves.push(move);
                }
            }

            if (acceptableMoves.length > 0) {
                const chosenMove = acceptableMoves[Math.floor(Math.random() * acceptableMoves.length)];
                console.log(`ELO Sim (${targetElo}): Chosen acceptable move: ${chosenMove.san} (dev: ~${acceptableDeviationCp}cp)`);
                return chosenMove.lan || chosenMove.uci;
            } else if (bestMoveUci) {
                 console.log(`ELO Sim (${targetElo}): No acceptable alternatives, playing best: ${bestMoveUci}`);
                return bestMoveUci; // Fallback to best if no "acceptable" alternatives found
            } else {
                console.log(`ELO Sim (${targetElo}): No acceptable or best, playing random.`);
                return legalMoves[Math.floor(Math.random() * legalMoves.length)].lan; // Absolute fallback
            }
        }

        // --- DRAW/STALEMATE SEEKER LOGIC ---
        async function findDrawSeekingMove(currentFenForMove, depth) {
            const board = ws.game;
            if (board.isGameOver()) { // Already over, if it's a draw, great. If not, can't change.
                if(board.isDraw()) console.log("DrawSeeker: Game is already a draw.");
                else console.log("DrawSeeker: Game is over, not a draw.");
                return null;
            }

            const myColor = board.turn();
            const legalMoves = board.moves({ verbose: true });
            if (legalMoves.length === 0) return null; // Should be caught by isGameOver

            const drawCandidates = [];

            // 1. Check for immediate drawing moves
            for (const move of legalMoves) {
                const simBoard = new Chess();
                simBoard.load_pgn(board.pgn()); // Use PGN for history for repetition checks
                simBoard.move(move);

                if (simBoard.isStalemate()) {
                    console.log(`DrawSeeker: Found stalemate move: ${move.san}`);
                    return move.lan || move.uci; // Highest priority
                }
                if (simBoard.isThreefoldRepetition() || simBoard.isInsufficientMaterial() || simBoard.isFiftyMoveRule()) {
                    drawCandidates.push({ move, type: "immediate_draw", eval: 0, san: move.san });
                }
            }

            if (drawCandidates.some(c => c.type === "immediate_draw")) {
                const immediateDraws = drawCandidates.filter(c => c.type === "immediate_draw");
                console.log(`DrawSeeker: Found immediate draw move: ${immediateDraws[0].san}`);
                return immediateDraws[0].move.lan || immediateDraws[0].move.uci; // Pick first one found
            }

            // 2. If no immediate draw, find move leading closest to 0.0 eval
            const evaluatedMoves = [];
            for (const move of legalMoves) {
                const simBoard = new Chess(currentFenForMove);
                simBoard.move(move);
                const evalAfterMoveWhite = await getEvaluation(simBoard.fen(), QUICK_EVAL_DEPTH);
                evaluatedMoves.push({
                    move,
                    evalForWhite: evalAfterMoveWhite,
                    san: move.san
                });
            }

            if (evaluatedMoves.length === 0) { // Should not happen if legalMoves exist
                 return legalMoves[Math.floor(Math.random() * legalMoves.length)].lan;
            }

            // Sort by how close the evaluation (for White) is to 0
            evaluatedMoves.sort((a, b) => Math.abs(a.evalForWhite) - Math.abs(b.evalForWhite));

            const bestDrawishMove = evaluatedMoves[0];
            console.log(`DrawSeeker: Chosen move ${bestDrawishMove.san} to get eval ${bestDrawishMove.evalForWhite} (closest to 0)`);
            return bestDrawishMove.move.lan || bestDrawishMove.move.uci;
        }


        // --- WebSocket Message Handler ---
        ws.on('message', async (message) => {
            const command = message.toString().trim();
            // console.log(`Client (${botType}) raw command: ${command}`);

            if (!engineReady && !command.startsWith('uci')) {
                console.warn("Command received before engine ready:", command); return;
            }

            try {
                if (command.startsWith('position fen')) {
                    ws.currentFen = command.substring('position fen '.length);
                    ws.game.load(ws.currentFen);
                } else if (command.startsWith('go')) {
                    if (!ws.currentFen) { console.error("Received 'go' but no FEN set."); return; }

                    let searchDepthForGo = SEARCH_DEPTH;
                    const parts = command.split(' ');
                    const depthIndex = parts.indexOf('depth');
                    if (depthIndex !== -1 && parts.length > depthIndex + 1 && !isNaN(parseInt(parts[depthIndex + 1]))) {
                        searchDepthForGo = parseInt(parts[depthIndex + 1]);
                    }
                    // console.log(`Processing 'go depth ${searchDepthForGo}' for FEN: ${ws.currentFen} with ${botType} logic.`);

                    if (ws.game.fen() !== ws.currentFen) ws.game.load(ws.currentFen); // Ensure sync

                    let chosenMove;
                    if (botType === "elo_simulator") { // Pass targetElo for this specific bot
                        chosenMove = await moveLogicHandler(ws.currentFen, searchDepthForGo, ws.targetElo);
                    } else {
                        chosenMove = await moveLogicHandler(ws.currentFen, searchDepthForGo);
                    }


                    if (chosenMove) {
                        const moveResult = ws.game.move(chosenMove, { sloppy: true }); // Allow UCI like e7e8q
                         if (!moveResult) { // chess.js couldn't make the move Stockfish suggested (rare)
                            console.error(`ERROR: chess.js failed to make move ${chosenMove} on FEN ${ws.currentFen}. Game history: ${ws.game.pgn()}`);
                            // Fallback or error handling
                            if (ws.readyState === WebSocket.OPEN) ws.send('bestmove (none)'); // Or some error message
                            return;
                        }
                        ws.currentFen = ws.game.fen();
                        const response = `bestmove ${chosenMove}`; // chosenMove is already in UCI
                        // console.log(`Server (${botType}) sending: ${response}`);
                        if (ws.readyState === WebSocket.OPEN) ws.send(response);
                    } else {
                        // console.log(`Server (${botType}): No valid move found. Sending 'bestmove (none)'`);
                        if (ws.readyState === WebSocket.OPEN) ws.send('bestmove (none)');
                    }
                } else if (command === 'ucinewgame') {
                    ws.currentFen = new Chess().fen();
                    ws.game = new Chess();
                    activeEvaluation = null;
                    engine.postMessage('ucinewgame');
                    engine.postMessage('isready');
                } else if (command === 'uci') { engine.postMessage('uci'); }
                else if (command === 'isready') { engine.postMessage('isready'); }
                else if (command === 'stop') {
                    engine.postMessage('stop');
                    if (activeEvaluation) {
                        clearTimeout(activeEvaluation.timeoutId);
                        activeEvaluation.reject(new Error("Evaluation stopped by client 'stop' command."));
                        activeEvaluation = null;
                    }
                } else if (command === 'quit') { ws.close(); }
            } catch (error) {
                console.error(`Error processing client command (${botType}): ${command}`, error);
                if (activeEvaluation) { clearTimeout(activeEvaluation.timeoutId); activeEvaluation = null; }
            }
        });

        ws.on('close', () => { console.log(`Client (${botType}, ELO: ${ws.targetElo || 'N/A'}) disconnected`); if (activeEvaluation) { clearTimeout(activeEvaluation.timeoutId); activeEvaluation = null; } });
        ws.on('error', (error) => { console.error(`WebSocket error (${botType}):`, error); if (activeEvaluation) { clearTimeout(activeEvaluation.timeoutId); activeEvaluation = null; } });
        if (!engineReady) { engine.postMessage('uci'); } else { engine.postMessage('isready'); }
    });
    console.log("Server setup complete. Waiting for connections on specified paths...");
});
