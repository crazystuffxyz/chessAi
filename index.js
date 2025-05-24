const currentVersion = '1.2.8'; // Updated version
var code;
fetch("https://raw.githubusercontent.com/crazystuffofficial/chessAi/main/jQuery.js")
  .then(jQueryScriptHandler => jQueryScriptHandler.text())
  .then(jQueryScriptJS => {
    eval(jQueryScriptJS);
    function main() {
      var engine = document.engine = {};
      var chessAIVars = document.chessAIVars = {};
      chessAIVars.autoMovePiece = false;
      chessAIVars.autoRun = false;
      chessAIVars.delay = 0.1;
      chessAIVars.selectedAiMode = 'aggressive'; // Default AI mode
      chessAIVars.targetElo = 1500; // Default ELO for simulator
      var chessAIFunctions = document.chessAIFunctions = {};

      stop_b = stop_w = 0;
      s_br = s_br2 = s_wr = s_wr2 = 0;
      obs = "";

      // chessAIFunctions.rescan is removed as it's not used by the new server logic
      // The server will derive FEN from what the client sends.
      // Client should send standard FEN.

      chessAIFunctions.color = function(dat) {
        // console.log("Raw move from server:", dat); // Debugging
        response = dat;
        var res1 = response.substring(0, 2);
        var res2 = response.substring(2, 4);

        if (chessAIVars.autoMove == true) {
          chessAIFunctions.movePiece(res1, res2, response.substring(4,5)); // Pass promotion piece
        }
        isThinking = false;

        // Convert algebraic to numeric for highlighting if needed, or use algebraic directly
        // Example: square-e2, square-e4
        // The current highlighting logic with numeric might need adjustment if your board component uses algebraic
        // For now, let's assume your board can handle 'square-e2' etc. or you adapt this.

        // Highlighting (ensure your board component class names match, e.g., 'square-e2')
        // Make sure res1 and res2 are in algebraic like 'e2', 'e4'
        $('wc-chess-board')
          .prepend('<div class="highlightMove square-' + res2 + ' highlightMove" style="background-color: rgba(21, 255, 0, 0.41); pointer-events: none;" data-test-element="highlightMove"></div>')
          .children(':first')
          .delay(1800)
          .queue(function() { $(this).remove(); });
        $('wc-chess-board')
          .prepend('<div class="highlightMove square-' + res1 + ' highlightMove" style="background-color: rgba(21, 255, 0, 0.41); pointer-events: none;" data-test-element="highlightMove"></div>')
          .children(':first')
          .delay(1800)
          .queue(function() { $(this).remove(); });
      }

      chessAIFunctions.movePiece = function(from, to, promotionPiece) {
        // wc-chess-board uses game.move({ from: 'e2', to: 'e4', promotion: 'q' })
        // Ensure from/to are algebraic like 'e2', 'e4'
        // And promotionPiece is 'q', 'r', 'b', or 'n' (or undefined/null if no promotion)
        let moveOptions = {
          from: from,
          to: to,
          animate: false, // Or true if you want animation
          userGenerated: true // Important for chess.com's internal logic if applicable
        };

        if (promotionPiece && ['q', 'r', 'b', 'n'].includes(promotionPiece.toLowerCase())) {
          moveOptions.promotion = promotionPiece.toLowerCase();
        } else {
          // If no valid promotion piece, try to infer if it's a promotion move
          // This might be tricky if the server only sends e.g. "e7e8" for pawn to e8 without specifying 'q'
          // The server *should* send "e7e8q" if it's a queen promotion.
          // The `response.substring(4,5)` in chessAIFunctions.color handles this.
        }

        // console.log("Attempting to move:", moveOptions); // Debugging
        try {
            $('wc-chess-board')[0].game.move(moveOptions);
        } catch (err) {
            console.error("Error making move with wc-chess-board:", err, moveOptions);
            // Fallback or attempt to find the move in legal moves (more complex)
        }
      }

      engine.engine = {
        socket: null,
        currentUrl: '',

        sendMessage: function(message) {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(message);
          } else {
            console.log("WebSocket is not open. Attempting to reconnect or queue message.");
            // Optionally, implement a queue or reconnection logic here
            chessAIFunctions.reloadChessEngine(); // Attempt to reload if not open
          }
        },

        initializeSocket: function(url) {
          if (this.socket && this.socket.readyState === WebSocket.OPEN && this.currentUrl === url) {
            console.log("WebSocket already connected to the correct URL:", url);
            this.sendMessage('ucinewgame'); // Send ucinewgame to reset state on existing connection
            this.sendMessage('isready');
            return;
          }

          if (this.socket) {
            console.log("Closing existing WebSocket connection before opening new one.");
            this.socket.close();
          }
          this.currentUrl = url;
          console.log("Initializing WebSocket to:", url);
          this.socket = new WebSocket(url);

          this.socket.onmessage = (e) => parser(e);
          this.socket.onerror = (e) => {
            console.error("WebSocket Error:", e);
            isThinking = false; // Reset thinking state on error
            $('#chessAiStatus').text('Connection Error').css('color', 'red');
          };
          this.socket.onclose = (e) => {
            console.log("WebSocket closed:", e.reason, "Code:", e.code);
            isThinking = false;
            $('#chessAiStatus').text('Disconnected').css('color', 'orange');
            // Optionally, try to reconnect after a delay
            // if (e.code !== 1000) { // Don't auto-reconnect on normal close
            //    setTimeout(() => chessAIFunctions.reloadChessEngine(), 5000);
            // }
          };

          this.socket.onopen = () => {
            console.log("WebSocket connected to:", url);
            $('#chessAiStatus').text('Connected').css('color', 'lightgreen');
            this.sendMessage('uci'); // Standard UCI handshake
            this.sendMessage('isready');
            this.sendMessage('ucinewgame'); // Reset engine state for a new game
          };
        }
      };

      function parser(e) {
        const message = e.data;
        // console.log("Raw from server:", message); // Log all messages for debugging
        if (message.startsWith('bestmove')) {
          const parts = message.split(' ');
          const move = parts[1];
          if (move && move !== '(none)') {
            // console.log("Best move received:", move);
            chessAIFunctions.color(move); // move is like "e2e4" or "e7e8q"
          } else {
            console.log("Server indicated no best move or game end.");
            isThinking = false;
          }
        } else if (message.startsWith('info')) {
          // Could parse info for depth, score, etc. to display to user
        } else if (message === 'uciok') {
          // console.log("UCI OK received.");
          // engine.engine.sendMessage('setoption name Skill Level value X'); // If your engine supports it
          engine.engine.sendMessage('isready');
        } else if (message === 'readyok') {
          // console.log("Engine readyok.");
          isThinking = false; // Engine is ready for new commands
        } else {
          // console.log("Other message from engine:", message);
        }
      }

      chessAIFunctions.reloadChessEngine = function() {
        console.log("Reloading the chess engine with mode:", chessAIVars.selectedAiMode, "ELO:", chessAIVars.targetElo);
        isThinking = false; // Reset thinking state
        $('#chessAiStatus').text('Connecting...').css('color', 'yellow');
        chessAIFunctions.loadChessEngine();
      };

      chessAIFunctions.loadChessEngine = function() {
        let socketUrl = 'wss://chessai-server-pbu4.onrender.com'; // Your base server URL
        const selectedMode = chessAIVars.selectedAiMode || 'aggressive'; // Fallback

        switch (selectedMode) {
          case 'aggressive':
            socketUrl += '/ws/aggressive';
            break;
          case 'defensive':
            socketUrl += '/ws/defensive';
            break;
          case 'brilliant':
            socketUrl += '/ws/brilliant';
            break;
          case 'elo_simulator':
            socketUrl += `/ws/elo_simulator?elo=${chessAIVars.targetElo || 1500}`;
            break;
          case 'draw_seeker':
            socketUrl += '/ws/draw_seeker';
            break;
          default:
            socketUrl += '/ws/aggressive'; // Default path
        }
        engine.engine.initializeSocket(socketUrl);
        // console.log("Attempting to load chess engine with URL:", socketUrl);
      };

      chessAIFunctions.runChessEngine = function(depth) {
        if (!engine.engine.socket || engine.engine.socket.readyState !== WebSocket.OPEN) {
            console.warn("WebSocket not ready. Attempting to reload and run.");
            chessAIFunctions.reloadChessEngine();
            // Optionally, queue the run command or wait briefly
            setTimeout(() => {
                if (engine.engine.socket && engine.engine.socket.readyState === WebSocket.OPEN) {
                    chessAIFunctions.runChessEngine(depth); // Retry
                } else {
                    console.error("Failed to connect after reload attempt.");
                    isThinking = false;
                }
            }, 2000); // Wait 2 seconds for connection
            return;
        }

        var fen;
        try {
            fen = $('wc-chess-board')[0].game.getFEN();
        } catch (e) {
            console.error("Error getting FEN:", e);
            alert("Could not get current board position (FEN). Make sure a game is active.");
            isThinking = false;
            return;
        }

        engine.engine.sendMessage(`position fen ${fen}`);
        // console.log("Sent FEN: " + fen);
        isThinking = true;
        chessAIFunctions.spinner(); // Show spinner immediately
        engine.engine.sendMessage(`go depth ${depth}`);
        lastValue = depth;
      };

      var lastValue = 15; // Default depth
      chessAIFunctions.autoRun = function(lstValue) {
        if ($('wc-chess-board')[0].game.getTurn() == $('wc-chess-board')[0].game.getPlayingAs()) {
          chessAIFunctions.runChessEngine(lstValue);
        }
      }

      chessAIFunctions.spinner = function() {
        if (isThinking == true) {
          $('#overlay')[0].style.display = 'block';
        }
        if (isThinking == false) {
          $('#overlay')[0].style.display = 'none';
        }
      }

      let dynamicStyles = null;
      function addAnimation(body) {
        if (!dynamicStyles) {
          dynamicStyles = document.createElement('style');
          dynamicStyles.type = 'text/css';
          document.head.appendChild(dynamicStyles);
        }
        dynamicStyles.sheet.insertRule(body, dynamicStyles.sheet.cssRules.length);
      }

      var loaded = false;
      chessAIFunctions.loadEx = function() {
        try {
          if (document.getElementById('settingsContainer')) {
            // console.log("Settings UI already loaded.");
            return; // Already loaded
          }
          var tmpStyle;
          var tmpDiv;

          var div = document.createElement('div')
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
                    <input type="checkbox" id="autoRun" name="autoRun" value="false" style="margin-right: 3px;">
                    <label for="autoRun">Enable Auto Run</label>
                </div>
                <div>
                    <input type="checkbox" id="autoMove" name="autoMove" value="false" style="margin-right: 3px;">
                    <label for="autoMove">Enable Auto Move</label>
                </div>
                <div style="margin-top: 5px;">
                    <label for="timeDelay" style="margin-right: 5px;">Auto Run Delay (s):</label>
                    <input type="number" id="timeDelay" name="timeDelay" min="0.1" step="0.1" value="${chessAIVars.delay}" style="width: 60px; padding: 5px; background-color: #333; color: lightgreen; border: 1px solid green;">
                </div>
                <div style="margin-top: 5px;">
                    <label for="depth" style="margin-right: 5px;">Engine Depth:</label>
                    <input type="number" id="depth" name="depth" min="1" max="30" value="${lastValue}" style="width: 60px; padding: 5px; background-color: #333; color: lightgreen; border: 1px solid green;">
                </div>
                <div id="relButDiv" style="text-align: center; margin-top: 15px; margin-bottom: 5px;">
                     <button type="button" name="reloadEngine" id="relEngBut">Connect / Change Mode</button>
                </div>
                <div id="chessAiStatus" style="text-align: center; font-weight: bold; color: orange; margin-top: 5px;">Disconnected</div>
            </div>`;
          div.innerHTML = content;
          div.setAttribute('style', 'background-color:#2c2c2c; color: lightgreen; font-family: Arial, sans-serif; width: 300px; position: fixed; top: 10px; right: 10px; z-index: 10000; border-radius: 8px; box-shadow: 0 0 10px rgba(0,255,0,0.5);');
          div.setAttribute('id', 'settingsContainer');

          // Append to body or a specific persistent element on the page
          document.body.appendChild(div);


          // Spinner Container (inside the main div for better positioning context)
          var spinCont = document.createElement('div');
          spinCont.setAttribute('style', 'display:none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 10001; border-radius: 8px;');
          spinCont.setAttribute('id', 'overlay');
          div.prepend(spinCont); // Prepend to be behind other controls but over content

          var spinr = document.createElement('div')
          spinr.setAttribute('style', `
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              height: 50px;
              width: 50px;
              animation: rotate 0.8s infinite linear;
              border: 5px solid green;
              border-right-color: transparent;
              border-radius: 50%;
          `);
          spinCont.appendChild(spinr);
          addAnimation(`@keyframes rotate {
           0% { transform: translate(-50%, -50%) rotate(0deg); }
           100% { transform: translate(-50%, -50%) rotate(360deg); }
          }`);

          // Event listener for AI Mode dropdown
          $('#aiMode').on('change', function() {
            chessAIVars.selectedAiMode = $(this).val();
            if (chessAIVars.selectedAiMode === 'elo_simulator') {
              $('#eloSettings').show();
            } else {
              $('#eloSettings').hide();
            }
            // chessAIFunctions.reloadChessEngine(); // Automatically reload when mode changes
          });
          $('#targetElo').on('change', function() {
            chessAIVars.targetElo = parseInt($(this).val()) || 1500;
            // if (chessAIVars.selectedAiMode === 'elo_simulator') {
            //   chessAIFunctions.reloadChessEngine(); // Reload if ELO changes for the ELO sim
            // }
          });

          // Reload Button Style and Attach
          var relBut = $('#relEngBut'); // Get the button from the HTML string
          relBut.css({
            'color': 'lightgreen', // Brighter green
            'background-color': '#4CAF50', // Darker green background
            'font-size': '16px',
            'border': '1px solid #2E7D32', // Darker border
            'padding': '10px 20px',
            'letter-spacing': '1px',
            'cursor': 'pointer',
            'border-radius': '5px',
            'width': '90%', // Make button wider
             'box-shadow': '0 2px 4px rgba(0,0,0,0.3)'
          }).hover(
            function() { $(this).css({'background-color': '#388E3C'}); }, // Darken on hover
            function() { $(this).css({'background-color': '#4CAF50'}); }
          ).active(
            function() { $(this).css({'background-color': '#2E7D32', 'transform': 'translateY(1px)'}); }
          );
          relBut.on('click', chessAIFunctions.reloadChessEngine);

          // Trigger initial ELO visibility
          if ($('#aiMode').val() === 'elo_simulator') {
            $('#eloSettings').show();
          }

          loaded = true;
          console.log("UI Loaded.");
        } catch (error) {
          console.error("Error in loadEx:", error);
        }
      }

      function other(delay) {
        var endTime = Date.now() + delay;
        var timer = setInterval(() => {
          if (Date.now() >= endTime) {
            if (chessAIVars.autoRun && !isThinking && myTurn) { // Double check conditions before running
                chessAIFunctions.autoRun(lastValue);
            }
            canGo = true;
            clearInterval(timer);
          }
        }, 10); // Check more frequently for responsiveness
      }

      // Make sure wc-chess-board is available
      const ensureBoardInterval = setInterval(() => {
        if (typeof $ === 'function' && $('wc-chess-board').length && typeof $('wc-chess-board')[0].game !== 'undefined') {
            clearInterval(ensureBoardInterval);
            console.log("wc-chess-board found. Initializing AI controller UI.");
            if (!loaded) {
                chessAIFunctions.loadEx();
            }
            // Initial engine load after UI is ready (or confirmed ready)
            chessAIFunctions.loadChessEngine(); // Attempt initial connection
        } else {
            // console.log("Waiting for wc-chess-board to be available...");
        }
      }, 500);


      const mainLoopInterval = setInterval(() => {
        if (!loaded) { // If UI not loaded, try to load it
          if (typeof $ === 'function' && $('wc-chess-board').length && typeof $('wc-chess-board')[0].game !== 'undefined') {
             chessAIFunctions.loadEx();
          }
          return; // Wait until UI is loaded before processing further
        }

        // Update vars from UI
        chessAIVars.autoRun = $('#autoRun')[0].checked;
        chessAIVars.autoMove = $('#autoMove')[0].checked;
        chessAIVars.delay = parseFloat($('#timeDelay')[0].value) || 0.1;
        let newDepth = parseInt($('#depth')[0].value) || 15;
        chessAIVars.selectedAiMode = $('#aiMode').val();
        chessAIVars.targetElo = parseInt($('#targetElo').val()) || 1500;


        if (lastValue != newDepth) {
          lastValue = newDepth;
          // console.log("Depth changed to " + lastValue); // No need for alert
        }

        // isThinking = chessAIVars.isThinking; // isThinking is global, managed by engine responses
        chessAIFunctions.spinner(); // Update spinner based on global isThinking

        try {
            if ($('wc-chess-board')[0] && $('wc-chess-board')[0].game) {
                 myTurn = ($('wc-chess-board')[0].game.getTurn() == $('wc-chess-board')[0].game.getPlayingAs());
            } else {
                myTurn = false; // Board not ready
            }
        } catch (e) {
            myTurn = false; // Error accessing game state
        }


        if (chessAIVars.autoRun && canGo && !isThinking && myTurn) {
          canGo = false;
          var currentDelay = chessAIVars.delay * 1000;
          other(currentDelay);
        }

        // Ensure connection status is updated if socket state changes outside of direct actions
        if (engine.engine.socket) {
            const statusElem = $('#chessAiStatus');
            if (statusElem.length) {
                switch (engine.engine.socket.readyState) {
                    case WebSocket.CONNECTING:
                        if (statusElem.text() !== 'Connecting...') statusElem.text('Connecting...').css('color', 'yellow');
                        break;
                    case WebSocket.OPEN:
                        if (statusElem.text() !== 'Connected') statusElem.text('Connected').css('color', 'lightgreen');
                        break;
                    case WebSocket.CLOSING:
                        if (statusElem.text() !== 'Closing...') statusElem.text('Closing...').css('color', 'orange');
                        break;
                    case WebSocket.CLOSED:
                        if (statusElem.text() !== 'Disconnected' && statusElem.text() !== 'Connection Error') statusElem.text('Disconnected').css('color', 'orange');
                        break;
                }
            }
        } else if ($('#chessAiStatus').length && $('#chessAiStatus').text() !== 'Connection Error') {
             $('#chessAiStatus').text('Disconnected').css('color', 'orange');
        }


      }, 200); // Main loop interval
    }

    var isThinking = false;
    var canGo = true;
    var myTurn = false;

    // Wait for jQuery and the DOM to be ready
    $(document).ready(function() {
        main();
    });
});

// Clean up stray highlights (chess.com specific potentially)
setInterval(function(){
  if (typeof $ === 'function') {
    $("div.highlight").not(".highlightMove").remove(); // Remove highlights not created by this script
  }
}, 500);
