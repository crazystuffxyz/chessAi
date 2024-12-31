const currentVersion = '1.2.7';
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
                .replace('br', 'R')
                .replace('wn', 'N')
                .replace('wb', 'B')
                .replace('wq', 'Q')
                .replace('wk', 'K')
                .replace('wb', 'B')
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
          chessAIFunctions.color = function(dat) {
            console.log(dat);
            response = dat;
            var res1 = response.substring(0, 2);
            var res2 = response.substring(2, 4);

            if (chessAIVars.autoMove == true) {
              chessAIFunctions.movePiece(res1, res2);
            }
            isThinking = false;

            res1 = res1.replace(/^a/, "1")
              .replace(/^b/, "2")
              .replace(/^c/, "3")
              .replace(/^d/, "4")
              .replace(/^e/, "5")
              .replace(/^f/, "6")
              .replace(/^g/, "7")
              .replace(/^h/, "8");
            res2 = res2.replace(/^a/, "1")
              .replace(/^b/, "2")
              .replace(/^c/, "3")
              .replace(/^d/, "4")
              .replace(/^e/, "5")
              .replace(/^f/, "6")
              .replace(/^g/, "7")
              .replace(/^h/, "8");
            $('wc-chess-board')
              .prepend('<div class="highlightMove square-' + res2 + ' highlightMove" style="background-color: green;" data-test-element="highlightMove"></div>')
              .children(':first')
              .delay(1800)
              .queue(function() {
                $(this)
                  .remove();
              });
            $('wc-chess-board')
              .prepend('<div class="highlightMove square-' + res1 + ' highlightMove" style="background-color: black;" data-test-element="highlightMove"></div>')
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
                    promotion: 'false',
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
      console.log("WebSocket is not open.");
    }
  },
  
  initializeSocket: function(url) {
    this.socket = new WebSocket(url);
    
    this.socket.onmessage = (e) => parser(e);
    this.socket.onerror = (e) => console.log("WebSocket Error: " + e);
    
    this.socket.onopen = () => {
      console.log("WebSocket connected");
      this.sendMessage('ucinewgame');
    };
  }
};

// New parser function for WebSocket messages
function parser(e) {
  if (e.data.includes('bestmove')) {
    console.log(e.data.split(' ')[1]);
    chessAIFunctions.color(e.data.split(' ')[1]);
    isThinking = false;
  }
}

// Reloads the chess engine by re-establishing the WebSocket connection
chessAIFunctions.reloadChessEngine = function() {
  console.log("Reloading the chess engine!");
  if (engine.engine.socket) {
    engine.engine.socket.close();
  }
  isThinking = false;
  chessAIFunctions.loadChessEngine();
};

// Loads the chess engine by initializing a WebSocket connection
chessAIFunctions.loadChessEngine = function() {
  const socketUrl = 'wss://chessai-server-pbu4.onrender.com'; // Replace with your actual WebSocket URL
  engine.engine.initializeSocket(socketUrl);
  console.log("Loaded chess engine");
};

// Sends FEN position and depth commands to the WebSocket
chessAIFunctions.runChessEngine = function(depth) {
  var fen = $('wc-chess-board')[0].game.getFEN();
  engine.engine.sendMessage(`position fen ${fen}`);
  console.log("updated: " + `position fen ${fen}`);
  isThinking = true;
  engine.engine.sendMessage(`go depth ${depth}`);
  lastValue = depth;
};


          var lastValue = 1;
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

            dynamicStyles.sheet.insertRule(body, dynamicStyles.length);
          }



          var loaded = false;
          chessAIFunctions.loadEx = function() {
            try {
              var tmpStyle;
              var tmpDiv;

              var div = document.createElement('div')
              var content = `<div style="margin: 0 0 0 8px;"><br><input type="checkbox" id="autoRun" name="autoRun" value="false">
<label for="autoRun"> Enable auto run</label><br>
<input type="checkbox" id="autoMove" name="autoMove" value="false">
<label for="autoMove"> Enable auto move</label><br>
<input type="number" id="timeDelay" name="timeDelay" min="0.1" value=0.1>
<label for="timeDelay">Auto Run Delay (Seconds)</label><br>
<input type="number" id="depth" name="depth" min="1" max="8000" value=` + lastValue + `>
<label for="depth">Set Depth</label>
</div>`;
              div.innerHTML = content;
              div.setAttribute('style', 'background-color:black; height:auto; color: green');
              div.setAttribute('id', 'settingsContainer');

              $('wc-chess-board')[0].parentElement.parentElement.appendChild(div);

              //spinnerContainer
              var spinCont = document.createElement('div');
              spinCont.setAttribute('style', 'display:none;');
              spinCont.setAttribute('id', 'overlay');
              div.prepend(spinCont);
              //spinner
              var spinr = document.createElement('div')
              spinr.setAttribute('style', `
      margin: 0 auto;
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
       margin: 0 0 8px 0;
      }
      #relEngBut {
      position: relative;
			color: #green;
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
      background-color: black;
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
              div.append(relButDiv);
              loaded = true;
            } catch (error) {
              console.log(error)
            }
          }


          function other(delay) {
            var endTime = Date.now() + delay;
            var timer = setInterval(() => {
              if (Date.now() >= endTime) {
                chessAIFunctions.autoRun(lastValue);
                canGo = true;
                clearInterval(timer);
              }
            }, 0);
          }

          const waitForChessBoard = setInterval(() => {
            if (loaded) {
              chessAIVars.autoRun = $('#autoRun')[0].checked;
              chessAIVars.autoMove = $('#autoMove')[0].checked;
              chessAIVars.delay = $('#timeDelay')[0].value;
              chessAIVars.isThinking = isThinking;
              chessAIVars.depth = eval($('#depth')[0].value);
              chessAIFunctions.spinner();
              if ($('wc-chess-board')[0].game.getTurn() == $('wc-chess-board')[0].game.getPlayingAs()) {
                myTurn = true;
              } else {
                myTurn = false;
              }
            } else {
              chessAIFunctions.loadEx();
            }

            if (!engine.engine) {
              chessAIFunctions.loadChessEngine();
            }
            if (chessAIVars.autoRun == true && canGo == true && isThinking == false && myTurn) {
              //console.log(`going: ${canGo} ${isThinking} ${myTurn}`);
              canGo = false;
              if (lastValue != chessAIVars.depth) {
                lastValue = chessAIVars.depth;
                alert("Set value to " + lastValue);
              }
              var currentDelay = chessAIVars.delay != undefined ? chessAIVars.delay * 1000 : 10;
              other(currentDelay);
            }
          }, 100);
        }
        var isThinking = false
        var canGo = true;
        var myTurn = false;
        main();
        document.chessAIFunctions.reloadChessEngine();
      });
setInterval(function(){
  if(document.querySelector("div.highlight")){
    var highlightSquareMove = document.querySelectorAll("div.highlight");
    for(var i = 0; i < highlightSquareMove; i++){
      highlightSquareMove.remove();
    }
  }
}, 0);
