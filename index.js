const currentVersion = '2.0.0'; // Updated version
var code;
fetch("https://raw.githubusercontent.com/crazystuffofficial/chessAi/main/jQuery.js")
  .then(jQueryScriptHandler => jQueryScriptHandler.text())
  .then(jQueryScriptJS => {
    eval(jQueryScriptJS);
    function main() {
      var engine = document.engine = {};
      var chessAIVars = document.chessAIVars = {};
      chessAIVars.autoMovePiece = false; // Will be set from checkbox
      chessAIVars.autoRun = false; // Will be set from checkbox
      chessAIVars.delay = 0.1;
      chessAIVars.selectedAiMode = 'aggressive';
      chessAIVars.targetElo = 1500;
      var chessAIFunctions = document.chessAIFunctions = {};

      // Removed rescan as it's not needed with direct FEN sending

      chessAIFunctions.color = function(moveDataString) { // e.g., "e2e4" or "e7e8q"
        console.log("CLIENT: chessAIFunctions.color called with move:", moveDataString);
        const fromSq = moveDataString.substring(0, 2);
        const toSq = moveDataString.substring(2, 4);
        const promotion = moveDataString.length === 5 ? moveDataString.substring(4, 5) : null;

        if (chessAIVars.autoMove == true) {
          chessAIFunctions.movePiece(fromSq, toSq, promotion);
        }
        // isThinking should be set to false in the parser when 'bestmove' is received
        // chessAIFunctions.spinner(); // Spinner updated in parser

        // Highlighting
        $('wc-chess-board')
          .prepend(`<div class="highlightMove square-${toSq} highlightMove" style="background-color: rgba(21, 255, 0, 0.41); pointer-events: none;" data-test-element="highlightMove"></div>`)
          .children(':first')
          .delay(1800)
          .queue(function() { $(this).remove(); });
        $('wc-chess-board')
          .prepend(`<div class="highlightMove square-${fromSq} highlightMove" style="background-color: rgba(21, 255, 0, 0.41); pointer-events: none;" data-test-element="highlightMove"></div>`)
          .children(':first')
          .delay(1800)
          .queue(function() { $(this).remove(); });
      }

      chessAIFunctions.movePiece = function(from, to, promotionPiece) {
        let moveOptions = { from: from, to: to, animate: false, userGenerated: true };
        if (promotionPiece && ['q', 'r', 'b', 'n'].includes(promotionPiece.toLowerCase())) {
          moveOptions.promotion = promotionPiece.toLowerCase();
        }
        console.log("CLIENT: Attempting to move on board:", moveOptions);
        try {
          $('wc-chess-board')[0].game.move(moveOptions);
        } catch (err) {
          console.error("CLIENT: Error making move with wc-chess-board:", err, moveOptions);
        }
      }

      engine.engine = {
        socket: null,
        currentUrl: '',
        isReadyForCommands: false, // New flag

        sendMessage: function(message) {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log("CLIENT SENDING:", message);
            this.socket.send(message);
          } else {
            console.warn("CLIENT: WebSocket is NOT OPEN or NULL when trying to send. State:", this.socket ? this.socket.readyState : 'null socket', "Message:", message);
            if (message !== 'uci' && !message.startsWith('setoption')) { // Don't try to reload for initial handshake commands
                 // chessAIFunctions.reloadChessEngine(); // Consider if auto-reload is desired here
            }
          }
        },

        initializeSocket: function(url) {
          this.isReadyForCommands = false; // Reset on new initialization
          if (this.socket && this.socket.readyState !== WebSocket.CLOSED && this.currentUrl === url) {
            console.log("CLIENT: WebSocket already connected/connecting to the correct URL:", url, "State:", this.socket.readyState);
            if (this.socket.readyState === WebSocket.OPEN) {
                this.isReadyForCommands = true; // Assume ready if open and same URL
                this.sendMessage('ucinewgame');
                this.sendMessage('isready'); // Re-check readiness
            }
            return;
          }

          if (this.socket) {
            console.log("CLIENT: Closing existing WebSocket connection. Current state:", this.socket.readyState);
            this.socket.onopen = null; this.socket.onmessage = null; this.socket.onerror = null; this.socket.onclose = null;
            this.socket.close();
          }
          this.currentUrl = url;
          console.log("CLIENT: Initializing WebSocket to:", url);
          $('#chessAiStatus').text('Connecting...').css('color', 'yellow');
          try {
            this.socket = new WebSocket(url);
          } catch (e) {
            console.error("CLIENT: Error creating WebSocket:", e);
            $('#chessAiStatus').text('Connection Error').css('color', 'red');
            isThinking = false; // Reset
            return;
          }

          this.socket.onopen = () => {
            console.log("CLIENT: WebSocket CONNECTED to:", url);
            $('#chessAiStatus').text('Connected').css('color', 'lightgreen');
            this.sendMessage('uci'); // Start UCI handshake
          };

          this.socket.onmessage = (e) => {
            // console.log("CLIENT RAW RECEIVED:", e.data); // Log if parser issues
            parser(e);
          };
          this.socket.onerror = (e) => {
            console.error("CLIENT: WebSocket Error event. Target URL:", url, e);
            $('#chessAiStatus').text('Connection Error').css('color', 'red');
            isThinking = false; this.isReadyForCommands = false;
            chessAIFunctions.spinner();
          };
          this.socket.onclose = (e) => {
            console.log(`CLIENT: WebSocket CLOSED. Code: ${e.code}, Reason: '${e.reason}', Clean: ${e.wasClean}, Target URL: ${url}`);
            $('#chessAiStatus').text('Disconnected').css('color', 'orange');
            isThinking = false; this.isReadyForCommands = false;
            chessAIFunctions.spinner();
          };
        }
      };

      function parser(e) {
        const message = e.data;
        console.log("PARSER received:", message);

        if (message.startsWith('bestmove')) {
          const parts = message.split(' ');
          const moveData = parts[1];
          console.log("PARSER: Best move data from server:", moveData);
          if (moveData && moveData !== '(none)') {
            chessAIFunctions.color(moveData);
          } else {
            console.log("PARSER: Server indicated no best move or game end.");
          }
          isThinking = false;
          engine.engine.isReadyForCommands = true; // Ready for next command after bestmove
          chessAIFunctions.spinner();
        } else if (message === 'uciok') {
          console.log("PARSER: UCI OK received. Sending isready.");
          engine.engine.sendMessage('isready'); // Crucial step
        } else if (message === 'readyok') {
          console.log("PARSER: Engine readyok. Engine is ready for commands.");
          engine.engine.isReadyForCommands = true;
          isThinking = false; // Ensure isThinking is false when engine is ready
          chessAIFunctions.spinner();
          // Potentially trigger a queued command if any
        } else if (message.startsWith('info depth')) {
             // Optionally update UI with thinking progress
        } else {
          // console.log("PARSER: Other message from engine:", message);
        }
      }

      chessAIFunctions.reloadChessEngine = function() {
        console.log("CLIENT: Reloading chess engine. Mode:", chessAIVars.selectedAiMode, "ELO:", chessAIVars.targetElo);
        isThinking = false; // Reset thinking state
        engine.engine.isReadyForCommands = false; // Not ready until handshake completes
        chessAIFunctions.spinner();
        chessAIFunctions.loadChessEngine();
      };

      chessAIFunctions.loadChessEngine = function() {
        let socketUrl = 'wss://chessai-server-pbu4.onrender.com';
        const selectedMode = chessAIVars.selectedAiMode || 'aggressive';
        switch (selectedMode) {
          case 'aggressive': socketUrl += '/ws/aggressive'; break;
          case 'defensive': socketUrl += '/ws/defensive'; break;
          case 'brilliant': socketUrl += '/ws/brilliant'; break;
          case 'elo_simulator': socketUrl += `/ws/elo_simulator?elo=${chessAIVars.targetElo || 1500}`; break;
          case 'draw_seeker': socketUrl += '/ws/draw_seeker'; break;
          default: socketUrl += '/ws/aggressive';
        }
        console.log("CLIENT: Attempting to load chess engine with URL:", socketUrl);
        engine.engine.initializeSocket(socketUrl);
      };

      chessAIFunctions.runChessEngine = function(depth) {
        console.log("CLIENT: runChessEngine called. isThinking:", isThinking, "isReadyForCommands:", engine.engine.isReadyForCommands);
        if (!engine.engine.socket || engine.engine.socket.readyState !== WebSocket.OPEN) {
          console.warn("CLIENT: runChessEngine - WebSocket not ready or open. State:", engine.engine.socket ? engine.engine.socket.readyState : 'null socket', "Attempting to reload.");
          chessAIFunctions.reloadChessEngine(); // This will try to connect
          // It might be better to queue the command or notify user connection is pending
          isThinking = false; // Not thinking if we can't send
          chessAIFunctions.spinner();
          return;
        }
        if (!engine.engine.isReadyForCommands) {
            console.warn("CLIENT: runChessEngine - Engine not confirmed ready for commands (waiting for readyok). Queuing or delaying might be needed.");
            // For simplicity, we'll just not send if not ready. The main loop should retry.
            isThinking = false; // Not thinking if we can't send
            chessAIFunctions.spinner();
            return;
        }

        var fen;
        try {
          const boardElement = $('wc-chess-board')[0];
          if (!boardElement || !boardElement.game || typeof boardElement.game.getFEN !== 'function') {
            console.error("CLIENT: wc-chess-board or game object not ready for FEN.");
            alert("Chess board component is not ready.");
            isThinking = false; chessAIFunctions.spinner(); return;
          }
          fen = boardElement.game.getFEN();
          if (!fen || fen.split(" ").length < 6) {
            console.error("CLIENT: Invalid FEN retrieved:", fen);
            alert("Invalid FEN from board.");
            isThinking = false; chessAIFunctions.spinner(); return;
          }
          console.log("CLIENT: Retrieved FEN for runChessEngine:", fen);
        } catch (e) {
          console.error("CLIENT: Error getting FEN:", e);
          alert("Could not get board position (FEN).");
          isThinking = false; chessAIFunctions.spinner(); return;
        }

        console.log("CLIENT: Setting engine state to thinking and sending commands.");
        isThinking = true;
        chessAIFunctions.spinner(); // Show spinner

        // Ensure FEN is for current turn, then send position and go
        engine.engine.sendMessage(`position fen ${fen}`);
        engine.engine.sendMessage(`go depth ${depth}`);
        lastValue = depth; // This seems to be a global used for UI, ensure it's managed if needed
      };

      var lastValue = 15; // Default depth, ensure it's updated from UI elsewhere
      chessAIFunctions.autoRun = function(currentDepth) {
        // This function is called by 'other' after a delay
        console.log("CLIENT: autoRun triggered. Depth:", currentDepth, "isThinking:", isThinking, "myTurn:", myTurn);
        // Condition check is also in main loop, but good to have here too
        if (!isThinking && myTurn && engine.engine.isReadyForCommands) {
            console.log("CLIENT: autoRun conditions met, calling runChessEngine.");
            chessAIFunctions.runChessEngine(currentDepth);
        } else {
            console.log("CLIENT: autoRun conditions NOT met. isThinking:", isThinking, "myTurn:", myTurn, "isReadyForCommands:", engine.engine.isReadyForCommands);
            canGo = true; // Allow next attempt from main loop if conditions not met here
        }
      }

      chessAIFunctions.spinner = function() {
        try {
            if (isThinking == true) {
                $('#overlay').show();
            } else {
                $('#overlay').hide();
            }
        } catch(e) {/*UI not ready*/}
      }

      let dynamicStyles = null;
      function addAnimation(body) { /* ... (same as before) ... */
        if (!dynamicStyles) {
          dynamicStyles = document.createElement('style');
          dynamicStyles.type = 'text/css';
          document.head.appendChild(dynamicStyles);
        }
        dynamicStyles.sheet.insertRule(body, dynamicStyles.sheet.cssRules.length);
      }

      var loaded = false;
      chessAIFunctions.loadEx = function() { /* ... (same as before, ensure all IDs are correct) ... */
        try {
          if (document.getElementById('settingsContainer')) return;
          var div = document.createElement('div');
          // ... (HTML content same as your last version) ...
          var content = `
            <div style="margin: 10px; padding: 10px; border: 1px solid green; border-radius: 5px;">
                <h3 style="margin-top:0; color: lightgreen;">Chess.com AI Controller ${currentVersion}</h3>
                <div style="margin-bottom: 10px;">
                    <label for="aiMode" style="margin-right: 5px;">AI Mode:</label>
                    <select id="aiMode" name="aiMode" style="padding: 5px; background-color: #333; color: lightgreen; border: 1px solid green;">
                        <option value="aggressive">Aggressive</option>
                        <option value="defensive">Defensive</option>
                        <option value="brilliant">Brilliant Farmer</option>
                        <option value="elo_simulator">ELO Simulator</option>
                        <option value="draw_seeker">Draw Seeker</option>
                    </select>
                </div>
                <div id="eloSettings" style="margin-bottom: 10px; display: none;">
                    <label for="targetElo" style="margin-right: 5px;">Target ELO:</label>
                    <input type="number" id="targetElo" name="targetElo" min="400" max="3000" value="${chessAIVars.targetElo}" style="width: 70px; padding: 5px; background-color: #333; color: lightgreen; border: 1px solid green;">
                </div>
                <div>
                    <input type="checkbox" id="autoRunCb" name="autoRunCb" value="false" style="margin-right: 3px;">
                    <label for="autoRunCb">Enable Auto Run</label>
                </div>
                <div>
                    <input type="checkbox" id="autoMoveCb" name="autoMoveCb" value="false" style="margin-right: 3px;">
                    <label for="autoMoveCb">Enable Auto Move</label>
                </div>
                <div style="margin-top: 5px;">
                    <label for="timeDelayInput" style="margin-right: 5px;">Auto Run Delay (s):</label>
                    <input type="number" id="timeDelayInput" name="timeDelayInput" min="0.1" step="0.1" value="${chessAIVars.delay}" style="width: 60px; padding: 5px; background-color: #333; color: lightgreen; border: 1px solid green;">
                </div>
                <div style="margin-top: 5px;">
                    <label for="depthInput" style="margin-right: 5px;">Engine Depth:</label>
                    <input type="number" id="depthInput" name="depthInput" min="1" max="30" value="${lastValue}" style="width: 60px; padding: 5px; background-color: #333; color: lightgreen; border: 1px solid green;">
                </div>
                <div id="relButDiv" style="text-align: center; margin-top: 15px; margin-bottom: 5px;">
                     <button type="button" name="reloadEngine" id="relEngBut">Connect / Change Mode</button>
                </div>
                <div id="chessAiStatus" style="text-align: center; font-weight: bold; color: orange; margin-top: 5px;">Disconnected</div>
            </div>`;
          div.innerHTML = content;
          div.setAttribute('style', 'background-color:#2c2c2c; color: lightgreen; font-family: Arial, sans-serif; width: 300px; position: fixed; top: 10px; right: 10px; z-index: 10000; border-radius: 8px; box-shadow: 0 0 10px rgba(0,255,0,0.5);');
          div.setAttribute('id', 'settingsContainer');
          document.body.appendChild(div);

          var spinCont = document.createElement('div');
          spinCont.setAttribute('style', 'display:none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 10001; border-radius: 8px;');
          spinCont.setAttribute('id', 'overlay');
          div.prepend(spinCont);
          var spinr = document.createElement('div');
          spinr.setAttribute('style', `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); height: 50px; width: 50px; animation: rotate 0.8s infinite linear; border: 5px solid green; border-right-color: transparent; border-radius: 50%;`);
          spinCont.appendChild(spinr);
          addAnimation(`@keyframes rotate {0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); }}`);

          $('#aiMode').on('change', function() {
            chessAIVars.selectedAiMode = $(this).val();
            $('#eloSettings').toggle(chessAIVars.selectedAiMode === 'elo_simulator');
          });
          $('#targetElo').on('change', function() { chessAIVars.targetElo = parseInt($(this).val()) || 1500; });
          $('#relEngBut').css({ /* styles */ }).hover( /* hover styles */ ).active( /* active styles */ ); // Simplified for brevity
          $('#relEngBut').on('click', chessAIFunctions.reloadChessEngine);
          if ($('#aiMode').val() === 'elo_simulator') $('#eloSettings').show();
          loaded = true; console.log("CLIENT: UI Loaded.");
        } catch (error) { console.error("CLIENT: Error in loadEx:", error); }
      }

      function other(delay) { // This is the delayed function call
        var endTime = Date.now() + delay;
        var timer = setInterval(() => {
          if (Date.now() >= endTime) {
            console.log("CLIENT: 'other' timer expired. Calling chessAIFunctions.autoRun.");
            // current depth value is now read from UI in main loop and stored in chessAIVars.depth
            chessAIFunctions.autoRun(chessAIVars.depth); // Use the globally updated depth
            canGo = true; // Reset flag for next turn cycle
            clearInterval(timer);
          }
        }, 20); // Check frequently
      }

      const ensureBoardInterval = setInterval(() => {
        if (typeof $ === 'function' && $('wc-chess-board').length && typeof $('wc-chess-board')[0].game !== 'undefined') {
            clearInterval(ensureBoardInterval);
            console.log("CLIENT: wc-chess-board found. Initializing UI and engine connection.");
            if (!loaded) chessAIFunctions.loadEx(); // Load UI if not already
            // Don't auto-connect here, let user click "Connect" button
            // chessAIFunctions.loadChessEngine(); // Initial connection attempt
        }
      }, 500);

      const mainLoopInterval = setInterval(() => {
        if (!loaded) {
          if (typeof $ === 'function' && $('wc-chess-board').length && typeof $('wc-chess-board')[0].game !== 'undefined') {
             chessAIFunctions.loadEx();
          }
          return;
        }

        // Update vars from UI - use different IDs for inputs to avoid conflict with chessAIVars
        chessAIVars.autoRun = $('#autoRunCb').is(':checked'); // Use .is(':checked') for checkboxes
        chessAIVars.autoMove = $('#autoMoveCb').is(':checked');
        chessAIVars.delay = parseFloat($('#timeDelayInput').val()) || 0.1;
        chessAIVars.depth = parseInt($('#depthInput').val()) || 15; // Store depth in chessAIVars
        // chessAIVars.selectedAiMode and targetElo are updated by their own change handlers

        //Spinner update moved to parser and where isThinking is set
        // chessAIFunctions.spinner();

        try {
          if ($('wc-chess-board')[0] && $('wc-chess-board')[0].game) {
            myTurn = ($('wc-chess-board')[0].game.getTurn() === $('wc-chess-board')[0].game.getPlayingAs());
          } else { myTurn = false; }
        } catch (e) { myTurn = false; }

        if (chessAIVars.autoRun && canGo && !isThinking && myTurn && engine.engine.isReadyForCommands) {
          console.log("CLIENT: Main loop conditions MET. Auto-running. isThinking:", isThinking, "myTurn:", myTurn, "canGo:", canGo, "isReadyForCommands:", engine.engine.isReadyForCommands);
          canGo = false; // Prevent immediate re-trigger
          var currentDelay = chessAIVars.delay * 1000;
          other(currentDelay); // Call the delayed function
        } else if (chessAIVars.autoRun && myTurn && !isThinking && !engine.engine.isReadyForCommands) {
            // console.log("CLIENT: Main loop - autoRun is on, myTurn, not thinking, BUT engine not ready. Waiting.");
        }


        // Update connection status text (simplified)
        const statusElem = $('#chessAiStatus');
        if (statusElem.length) {
            if (engine.engine.socket) {
                let currentStatusText = statusElem.text();
                let newStatusText = currentStatusText;
                let newColor = statusElem.css('color');

                switch (engine.engine.socket.readyState) {
                    case WebSocket.CONNECTING: newStatusText = 'Connecting...'; newColor = 'yellow'; break;
                    case WebSocket.OPEN: newStatusText = 'Connected'; newColor = 'lightgreen'; break;
                    case WebSocket.CLOSING: newStatusText = 'Closing...'; newColor = 'orange'; break;
                    case WebSocket.CLOSED:
                        if (currentStatusText !== 'Connection Error') { // Don't overwrite specific error
                           newStatusText = 'Disconnected'; newColor = 'orange';
                        }
                        break;
                }
                if(currentStatusText !== newStatusText) statusElem.text(newStatusText).css('color', newColor);
            } else if (statusElem.text() !== 'Connection Error' && statusElem.text() !== 'Disconnected') {
                 statusElem.text('Disconnected').css('color', 'orange');
            }
        }


      }, 250); // Main loop interval
    }

    var isThinking = false;
    var canGo = true;   // Flag to control if 'other' (delayed call) can be initiated
    var myTurn = false;

    $(document).ready(function() {
        main();
    });
});

setInterval(function(){
  if (typeof $ === 'function') {
    $("div.highlight").not(".highlightMove").remove();
  }
}, 500);
