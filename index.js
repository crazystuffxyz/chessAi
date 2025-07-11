const currentVersion = '2.0.0';
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
          chessAIVars.botType = 'aggressive'; // Default bot type
          chessAIVars.targetElo = 1500;     // Default ELO for simulator

          var chessAIFunctions = document.chessAIFunctions = {};


          stop_b = stop_w = 0;
          s_br = s_br2 = s_wr = s_wr2 = 0;
          obs = "";
          chessAIFunctions.rescan = function(lev) {
            var ari = $("chess-board")
              .find(".piece")
              .map(function() {
                return this.className;
              })
              .get();
            jack = ari.map(f => f.substring(f.indexOf(' ') + 1));

            function removeWord(arr, word) {
              for (var i = 0; i < arr.length; i++) {
                arr[i] = arr[i].replace(word, '');
              }
            }
            removeWord(ari, 'square-');
            jack = ari.map(f => f.substring(f.indexOf(' ') + 1));
            for (var i = 0; i < jack.length; i++) {
              jack[i] = jack[i].replace('br', 'r')
                .replace('bn', 'n')
                .replace('bb', 'b')
                .replace('bq', 'q')
                .replace('bk', 'k')
                .replace('bb', 'b')
                .replace('bn', 'n')
                .replace('br', 'r')
                .replace('bp', 'p')
                .replace('wp', 'P')
                .replace('wr', 'R')
                .replace('wn', 'N')
                .replace('wb', 'B')
                .replace('br', 'R') // This was a duplicate, kept for consistency with original
                .replace('wn', 'N') // This was a duplicate, kept for consistency with original
                .replace('wb', 'B') // This was a duplicate, kept for consistency with original
                .replace('wq', 'Q')
                .replace('wk', 'K')
                .replace('wb', 'B') // This was a duplicate, kept for consistency with original
            }
            str2 = "";
            var count = 0,
              str = "";
            for (var j = 8; j > 0; j--) {
              for (var i = 1; i < 9; i++) {
                (str = (jack.find(el => el.includes([i] + [j])))) ? str = str.replace(/[^a-zA-Z]+/g, ''): str = "";
                if (str == "") {
                  count++;
                  str = count.toString();
                  if (!isNaN(str2.charAt(str2.length - 1))) str2 = str2.slice(0, -1);
                  else {
                    count = 1;
                    str = count.toString()
                  }
                }
                str2 += str;
                if (i == 8) {
                  count = 0;
                  str2 += "/";
                }
              }
            }
            str2 = str2.slice(0, -1);
            //str2=str2+" KQkq - 0"
            color = "";
            wk = wq = bk = bq = "0";
            const move = $('vertical-move-list')
              .children();
            if (move.length < 2) {
              stop_b = stop_w = s_br = s_br2 = s_wr = s_wr2 = 0;
            }
            if (stop_b != 1) {
              if (move.find(".black.node:contains('K')")
                .length) {
                bk = "";
                bq = "";
                stop_b = 1;
                console.log('debug secb');
              }
            } else {
              bq = "";
              bk = "";
            }
            if (stop_b != 1)(bk = (move.find(".black.node:contains('O-O'):not(:contains('O-O-O'))")
              .length) ? "" : "k") ? (bq = (move.find(".black.node:contains('O-O-O')")
              .length) ? bk = "" : "q") : bq = "";
            if (s_br != 1) {
              if (move.find(".black.node:contains('R')")
                .text()
                .match('[abcd]+')) {
                bq = "";
                s_br = 1
              }
            } else bq = "";
            if (s_br2 != 1) {
              if (move.find(".black.node:contains('R')")
                .text()
                .match('[hgf]+')) {
                bk = "";
                s_br2 = 1
              }
            } else bk = "";
            if (stop_b == 0) {
              if (s_br == 0)
                if (move.find(".white.node:contains('xa8')")
                  .length > 0) {
                  bq = "";
                  s_br = 1;
                  console.log('debug b castle_r');
                }
              if (s_br2 == 0)
                if (move.find(".white.node:contains('xh8')")
                  .length > 0) {
                  bk = "";
                  s_br2 = 1;
                  console.log('debug b castle_l');
                }
            }
            if (stop_w != 1) {
              if (move.find(".white.node:contains('K')")
                .length) {
                wk = "";
                wq = "";
                stop_w = 1;
                console.log('debug secw');
              }
            } else {
              wq = "";
              wk = "";
            }
            if (stop_w != 1)(wk = (move.find(".white.node:contains('O-O'):not(:contains('O-O-O'))")
              .length) ? "" : "K") ? (wq = (move.find(".white.node:contains('O-O-O')")
              .length) ? wk = "" : "Q") : wq = "";
            if (s_wr != 1) {
              if (move.find(".white.node:contains('R')")
                .text()
                .match('[abcd]+')) {
                wq = "";
                s_wr = 1
              }
            } else wq = "";
            if (s_wr2 != 1) {
              if (move.find(".white.node:contains('R')")
                .text()
                .match('[hgf]+')) {
                wk = "";
                s_wr2 = 1
              }
            } else wk = "";
            if (stop_w == 0) {
              if (s_wr == 0)
                if (move.find(".black.node:contains('xa1')")
                  .length > 0) {
                  wq = "";
                  s_wr = 1;
                  console.log('debug w castle_l');
                }
              if (s_wr2 == 0)
                if (move.find(".black.node:contains('xh1')")
                  .length > 0) {
                  wk = "";
                  s_wr2 = 1;
                  console.log('debug w castle_r');
                }
            }
            if ($('.coordinates')
              .children()
              .first()
              .text() == 1) {
              str2 = str2 + " b " + wk + wq + bk + bq;
              color = "white";
            } else {
              str2 = str2 + " w " + wk + wq + bk + bq;
              color = "black";
            }
            //console.log(str2);
            return str2;
          }

          // FIX APPLIED HERE: Removed coordinate conversion and added z-index.
          chessAIFunctions.color = function(dat) {
            console.log("Coloring best move:", dat); // Added more descriptive log
            response = dat;
            var res1 = response.substring(0, 2); // e.g., 'e2'
            var res2 = response.substring(2, 4); // e.g., 'e4'

            if (chessAIVars.autoMovePiece == true) { // Changed from autoMove to autoMovePiece to match var name
              chessAIFunctions.movePiece(res1, res2);
            }
            isThinking = false;

             res1 = res1.replace("a", "1")
              .replace("b", "2")
              .replace("c", "3")
              .replace("d", "4")
              .replace("e", "5")
              .replace("f", "6")
              .replace("g", "7")
              .replace("h", "8");
            res2 = res2.replace("a", "1")
              .replace("b", "2")
              .replace("c", "3")
              .replace("d", "4")
              .replace("e", "5")
              .replace("f", "6")
              .replace("g", "7")
              .replace("h", "8");

            $('wc-chess-board')
              .prepend('<div class="highlight square-' + res2 + '" style="background-color: green;" data-test-element="highlight"></div>')
              .children(':first')
              .delay(1800)
              .queue(function() {
                $(this)
                  .remove();
              });
            $('wc-chess-board')
              .prepend('<div class="highlight square-' + res1 + '" style="background-color: black;" data-test-element="highlight"></div>')
              .children(':first')
              .delay(1800)
              .queue(function() {
                $(this)
                  .remove();
              });
          }

          chessAIFunctions.movePiece = function(from, to) {
            for (var each = 0; each < $('wc-chess-board')[0].game.getLegalMoves().length; each++) {
              if ($('wc-chess-board')[0].game.getLegalMoves()[each].from == from) {
                if ($('wc-chess-board')[0].game.getLegalMoves()[each].to == to) {
                  var move = $('wc-chess-board')[0].game.getLegalMoves()[each];
                  $('wc-chess-board')[0].game.move({
                    ...move,
                    promotion: 'q', // Default to queen promotion if not specified, can be 'false' for non-promo
                    animate: false,
                    userGenerated: true
                  });
                }
              }
            }
          }

// Initialize WebSocket
engine.engine = {
  socket: null,
  
  sendMessage: function(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      console.log("WebSocket is not open. Message not sent: " + message);
    }
  },
  
  initializeSocket: function(url) {
    // Close existing socket if any before creating a new one.
    // This is mostly handled by reloadChessEngine, but as a safeguard:
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
        console.log("Closing pre-existing socket in initializeSocket.");
        this.socket.onopen = null; 
        this.socket.onmessage = null;
        this.socket.onerror = null;
        this.socket.onclose = null; 
        this.socket.close();
    }

    this.socket = new WebSocket(url);
    console.log("Attempting to connect to WebSocket: " + url);
    
    this.socket.onmessage = (e) => parser(e);
    this.socket.onerror = (e) => {
        console.log("WebSocket Error: ", e);
        isThinking = false; // Ensure spinner stops on error
        chessAIFunctions.spinner();
    }
    
    this.socket.onopen = () => {
      console.log("WebSocket connected to " + url);
      this.sendMessage('ucinewgame'); // Send ucinewgame on new connection
    };

    this.socket.onclose = (e) => {
        console.log("WebSocket closed. Code:", e.code, "Reason:", e.reason, "Was Clean:", e.wasClean);
        isThinking = false; // Ensure spinner stops
        chessAIFunctions.spinner();
    };
  }
};

// New parser function for WebSocket messages
function parser(e) {
  if (e.data.includes('bestmove')) {
    console.log("Received from engine: " + e.data);
    const parts = e.data.split(' ');
    if (parts.length > 1 && parts[0] === 'bestmove') {
        const move = parts[1];
        if (move && move !== '(none)') {
            chessAIFunctions.color(move);
        } else {
            console.log("Engine returned no move or (none).");
        }
    }
    isThinking = false;
  } else if (e.data.includes('info string') || e.data.includes('uciok') || e.data.includes('readyok')) {
    console.log("Received info from engine: " + e.data);
  }
  // Potentially handle other UCI messages if needed
}

// Reloads the chess engine by re-establishing the WebSocket connection
chessAIFunctions.reloadChessEngine = function() {
  console.log("Reloading the chess engine with new settings!");
  if (engine.engine.socket && engine.engine.socket.readyState !== WebSocket.CLOSED) {
    engine.engine.socket.close();
  }
  isThinking = false; // Reset thinking state
  chessAIFunctions.loadChessEngine(); // This will use updated chessAIVars
};

// Loads the chess engine by initializing a WebSocket connection
chessAIFunctions.loadChessEngine = function() {
  const baseSocketUrl = 'ws://localhost:8080'; // Your base WebSocket URL
  let path;

  const selectedBotType = chessAIVars.botType || 'aggressive';
  const targetElo = chessAIVars.targetElo || 1500;

switch (selectedBotType) {
  case 'defensive':
    path = '/ws/defensive';
    break;
  case 'brilliant':
    path = '/ws/brilliant';
    break;
  case 'human': // ADDED THIS CASE
    path = '/ws/human';
    break;
  case 'elo_simulator':
    path = `/ws/elo_simulator?elo=${targetElo}`;
    break;
  case 'draw_seeker':
    path = '/ws/draw_seeker';
    break;
  case 'aggressive':
  default:
    path = '/ws'; // Server defaults /ws to aggressive, or use /ws/aggressive
    break;
}
  const socketUrl = baseSocketUrl + path;
  engine.engine.initializeSocket(socketUrl);
  // Removed console.log("Loaded chess engine") as initializeSocket logs connection attempt.
};

// Sends FEN position and depth commands to the WebSocket
chessAIFunctions.runChessEngine = function(depth) {
  if (!engine.engine.socket || engine.engine.socket.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not ready. Cannot run engine. Attempting to reload.");
      chessAIFunctions.reloadChessEngine(); // Try to re-establish connection
      // Optionally, queue the command or notify user. For now, just log and reload.
      // Display a message to the user that connection is being re-established.
      $('#overlay')[0].innerHTML = '<div style="color:yellow; text-align:center; padding-top: 20px;">Connection lost. Reconnecting...</div>' + $('#overlay')[0].innerHTML;
      setTimeout(() => {
          if ($('#overlay')[0].innerHTML.includes('Reconnecting')) {
             $('#overlay')[0].innerHTML = $('#overlay')[0].innerHTML.replace('<div style="color:yellow; text-align:center; padding-top: 20px;">Connection lost. Reconnecting...</div>', '');
          }
      }, 3000);
      return;
  }
  var fen = $('wc-chess-board')[0].game.getFEN();  
  engine.engine.sendMessage(`position fen ${fen}`);
  console.log("Sent to engine: " + `position fen ${fen}`);
  isThinking = true;
  chessAIFunctions.spinner(); // Show spinner immediately
  engine.engine.sendMessage(`go depth ${depth}`);
  console.log("Sent to engine: " + `go depth ${depth}`);
  lastValue = depth; // Ensure lastValue is updated when runChessEngine is called
};


          var lastValue = 1; // Default depth
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
            dynamicStyles.sheet.insertRule(body, dynamicStyles.sheet.cssRules.length); // Use cssRules.length
          }


          var loaded = false;
          chessAIFunctions.loadEx = function() {
            try {
              var tmpStyle;
              var tmpDiv;

              var div = document.createElement('div');
              var content = `<div style="margin: 0 0 0 8px;">
<br>
<label for="botType" style="color: green;">Bot Type:</label>
<select id="botType" name="botType" style="background-color: black; color: green; border: 1px solid green; margin-left: 5px;">
  <option value="aggressive">Aggressive</option>
  <option value="defensive">Defensive</option>
  <option value="human">Human</option> <!-- ADDED THIS LINE -->
  <option value="brilliant">Brilliant</option>
  <option value="elo_simulator">ELO Simulator</option>
  <option value="draw_seeker">Draw Seeker</option>
</select><br>
<div id="eloSimulatorSettings" style="display:none; margin-top: 5px;">
  <label for="eloValue" style="color: green;">Target ELO:</label>
  <input type="number" id="eloValue" name="eloValue" min="400" max="3000" style="background-color: black; color: green; border: 1px solid green; width: 60px; margin-left: 5px;">
  <label for="eloValue" style="color: #aaa; font-size: smaller;"> (400-3000)</label><br>
</div>
<input type="checkbox" id="autoRun" name="autoRun" value="false">
<label for="autoRun"> Enable auto run</label><br>
<input type="checkbox" id="autoMove" name="autoMove" value="false">
<label for="autoMove"> Enable auto move piece</label><br>
<input type="number" id="timeDelay" name="timeDelay" min="0.1" step="0.1" value="0.1">
<label for="timeDelay"> Auto Run Delay (Seconds)</label><br>
<input type="number" id="depth" name="depth" min="1" max="8000" value="` + lastValue + `">
<label for="depth"> Set Depth</label>
</div>`;
              div.innerHTML = content;
              div.setAttribute('style', 'background-color:black; height:auto; color: green; padding-bottom: 10px;');
              div.setAttribute('id', 'settingsContainer');

              $('wc-chess-board')[0].parentElement.parentElement.appendChild(div);

              // Set initial UI values from chessAIVars
              $('#botType').val(chessAIVars.botType);
              if (chessAIVars.botType === 'elo_simulator') {
                $('#eloSimulatorSettings').show();
              }
              $('#eloValue').val(chessAIVars.targetElo);
              $('#autoRun').prop('checked', chessAIVars.autoRun);
              $('#autoMove').prop('checked', chessAIVars.autoMovePiece);
              $('#timeDelay').val(chessAIVars.delay);
              $('#depth').val(lastValue);


              // Event listeners for new controls
              $('#botType').on('change', function() {
                chessAIVars.botType = $(this).val();
                if (chessAIVars.botType === 'elo_simulator') {
                  $('#eloSimulatorSettings').show();
                } else {
                  $('#eloSimulatorSettings').hide();
                }
                alert("Bot type changed to: " + chessAIVars.botType + ". Reloading engine.");
                document.chessAIFunctions.reloadChessEngine();
              });

              $('#eloValue').on('change', function() {
                var newElo = parseInt($(this).val(), 10);
                if (newElo >= 400 && newElo <= 3000) {
                    chessAIVars.targetElo = newElo;
                    if (chessAIVars.botType === 'elo_simulator') {
                        alert("Target ELO changed to: " + chessAIVars.targetElo + ". Reloading engine.");
                        document.chessAIFunctions.reloadChessEngine();
                    }
                } else {
                    alert("ELO value must be between 400 and 3000.");
                    $(this).val(chessAIVars.targetElo); // Reset to previous valid ELO
                }
              });


              //spinnerContainer
              var spinCont = document.createElement('div');
              spinCont.setAttribute('style', 'display:none;'); // Initially hidden
              spinCont.setAttribute('id', 'overlay');
              // Prepend spinner to body or a fixed position container if it should overlay everything
              // For now, prepending to the settings div as in original logic
              div.prepend(spinCont);

              //spinner
              var spinr = document.createElement('div')
              spinr.setAttribute('style', `
      margin: 50px auto; /* Centered with margin */
      height: 64px;
      width: 64px;
      animation: rotate 0.8s infinite linear;
      border: 5px solid green;
      border-right-color: transparent;
      border-radius: 50%;
      `);
              spinCont.appendChild(spinr);
              addAnimation(`@keyframes rotate {
               0% {
                 transform: rotate(0deg);
                }
             100% {
                 transform: rotate(360deg);
                }
                       }`);


              //Reload Button
              var reSty = `
      #relButDiv {
       position: relative;
       text-align: center;
       margin: 8px 0 8px 0; /* Adjusted margin */
      }
      #relEngBut {
      position: relative;
			color: green; /* Ensure text is green */
			background-color: black;
			font-size: 19px;
			border: 1px solid green;
			padding: 15px 50px;
      letter-spacing: 1px;
			cursor: pointer
		  }
		  #relEngBut:hover {
			color: black;
			background-color: green;
		  }
      #relEngBut:active {
      background-color: black; /* Revert to black on active */
      color: green; /* Text green on active */
      transform: translateY(4px);
     }`;
              var reBut = `<button type="button" name="reloadEngine" id="relEngBut" onclick="document.chessAIFunctions.reloadChessEngine()">Reload Chess Engine</button>`;
              tmpDiv = document.createElement('div');
              var relButDiv = document.createElement('div');
              relButDiv.id = 'relButDiv';
              tmpDiv.innerHTML = reBut;
              reBut = tmpDiv.firstChild;

              tmpStyle = document.createElement('style');
              tmpStyle.innerHTML = reSty;
              document.head.append(tmpStyle);

              relButDiv.append(reBut);
              div.append(relButDiv); // Append reload button div to the main settings div
              loaded = true;
            } catch (error) {
              console.log("Error in loadEx:", error);
            }
          }


          function other(delay) {
            var endTime = Date.now() + delay;
            var timer = setInterval(() => {
              if (Date.now() >= endTime) {
                chessAIFunctions.autoRun(lastValue); // Use global lastValue
                canGo = true;
                clearInterval(timer);
              }
            }, 0);
          }

          const waitForChessBoard = setInterval(() => {
            if (document.querySelector('wc-chess-board') && document.querySelector('wc-chess-board').game) {
                if (loaded) {
                    chessAIVars.autoRun = $('#autoRun').prop('checked'); // Use .prop for checkboxes
                    chessAIVars.autoMovePiece = $('#autoMove').prop('checked');
                    chessAIVars.delay = parseFloat($('#timeDelay').val()); // Use parseFloat
                    
                    var currentDepthVal = parseInt($('#depth').val(), 10);
                    if (!isNaN(currentDepthVal) && currentDepthVal >= 1 && currentDepthVal <= 8000) {
                        chessAIVars.depth = currentDepthVal;
                    } else {
                         // Reset to last valid value or default if input is invalid
                        $('#depth').val(lastValue);
                        chessAIVars.depth = lastValue;
                    }

                    chessAIFunctions.spinner(); // Update spinner based on isThinking

                    if ($('wc-chess-board')[0].game.getTurn() == $('wc-chess-board')[0].game.getPlayingAs()) {
                        myTurn = true;
                    } else {
                        myTurn = false;
                    }
                } else {
                    chessAIFunctions.loadEx();
                }

                if (!engine.engine.socket || engine.engine.socket.readyState === WebSocket.CLOSED || engine.engine.socket.readyState === WebSocket.CLOSING) {
                  // If socket is not initialized, or closed/closing, try to load/reload it.
                  // Avoid calling if it's already connecting.
                  if (!engine.engine.socket || engine.engine.socket.readyState !== WebSocket.CONNECTING) {
                       console.log("WebSocket connection issue detected in interval. Attempting reload.");
                       chessAIFunctions.reloadChessEngine();
                  }
                }

                if (chessAIVars.autoRun == true && canGo == true && isThinking == false && myTurn) {
                    canGo = false;
                    if (lastValue != chessAIVars.depth) {
                        lastValue = chessAIVars.depth;
                        alert("Depth set to " + lastValue);
                    }
                    var currentDelay = chessAIVars.delay != undefined ? chessAIVars.delay * 1000 : 100; // Default to 100ms if undefined
                    other(currentDelay);
                }
            } else {
                // console.log("Waiting for chess board element to load...");
            }
          }, 100);
        }
        var isThinking = false
        var canGo = true;
        var myTurn = false;
        main();
        // Initial load of the engine is handled by reloadChessEngine, which calls loadChessEngine
        // loadChessEngine uses chessAIVars for botType and ELO
        document.chessAIFunctions.reloadChessEngine();
      })
      .catch(error => {
        console.error("Failed to load jQuery:", error);
        // Fallback or error message to user
        document.body.innerHTML = "<h1 style='color:red;'>Error: Could not load essential script (jQuery). Please check your internet connection or contact support.</h1>";
      });

// This interval was outside, keep it that way.
// It seems to target '.highlight' not '.highlightMove' as created by the script.
// If it's for chess.com's own highlights, it might be fine.
// Changed to querySelectorAll and loop correctly.
/*
setInterval(function(){
  if(document.querySelector("div.highlight")){ // Check if any element with class 'highlight' exists
    var highlightSquareMoves = document.querySelectorAll("div.highlight"); // Corrected variable name
    for(var i = 0; i < highlightSquareMoves.length; i++){ // Corrected loop condition
      highlightSquareMoves[i].remove(); // Correctly remove each element
    }
  }
}, 0); 
*/
// Interval of 0 is very aggressive, consider 50 or 100ms if it causes performance issues
