// GAME STATE
const gameState = {
  players: [],
  currentPlayerIndex: 0,
  tokens: [],
  turnOrder: [],
  turnDirection: 1,
  currentCard: null,
  turnTimer: null,
  turnSeconds: 8,
  isShopOpen: false,
  selectingToken: false,
  totalTurns: 0,
  maxTurns: 30
};

// CARD TYPES
const cardTypes = [
  { type: 'trash', value: 1, name: 'Basura +1', description: 'Ganas 1 punto de basura' },
  { type: 'trash', value: 1, name: 'Basura +1', description: 'Ganas 1 punto de basura' },
  { type: 'trash', value: 2, name: 'Basura +2', description: 'Ganas 2 puntos de basura' },
  { type: 'trash', value: 2, name: 'Basura +2', description: 'Ganas 2 puntos de basura' },
  { type: 'trash', value: 3, name: 'Basura +3', description: 'Ganas 3 puntos de basura' },
  { type: 'steal-trash', name: 'Robo-Basura', description: 'Tira un dado y roba esa cantidad de basura a otro jugador' },
  { type: 'fishing', name: 'Hora de Pescar', description: 'Recoge una ficha de ajolote del tablero' },
  { type: 'fishing', name: 'Hora de Pescar', description: 'Recoge una ficha de ajolote del tablero' },
  { type: 'duel-tokens', name: 'Intercambio de Ajolotes', description: 'Duelo con dado: el ganador roba una ficha al perdedor' },
  { type: 'duel-turn', name: 'Duelo de Perder Turno', description: 'Duelo con dado: el perdedor pierde su siguiente turno' },
  { type: 'rotate-trash', name: 'Rotación de Basura', description: 'Rota los puntos de basura entre todos los jugadores' },
  { type: 'reverse-order', name: 'Cambio de Rotación', description: 'Invierte el orden de los turnos' }
];

// SHOP ITEMS
const shopItems = [
  { name: 'Planta Acuática', cost: 3, points: 1 },
  { name: 'Comida Premium', cost: 6, points: 2 },
  { name: 'Refugio Deluxe', cost: 10, points: 4 }
];

// UTILITY FUNCTIONS
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

function showModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function showMessage(title, text, callback) {
  document.getElementById('message-title').textContent = title;
  document.getElementById('message-text').textContent = text;
  showModal('message-modal');
  
  const closeBtn = document.querySelector('#message-modal .btn');
  closeBtn.onclick = () => {
    hideModal('message-modal');
    if (callback) callback();
  };
}

function confirmExit() {
  if (confirm('¿Estás seguro de que quieres salir?')) {
    window.close();
  }
}

// GAME INITIALIZATION
function startGame() {
  initializePlayers();
  initializeTokens();
  determineFirstPlayer();
  showScreen('gameplay');
}

function initializePlayers() {
  const playerNames = ['Tu', 'Pato', 'Eli', 'Roger'];
  gameState.players = playerNames.map((name, index) => ({
    name,
    isHuman: index === 0,
    trash: 0,
    score: 0,
    tokens: [],
    hand: [],
    skipNextTurn: false
  }));
  
  updatePlayerUI();
}

function initializeTokens() {
  const tokenColors = [
    ...Array(4).fill({ color: 'pink', value: 0.5 }),
    ...Array(4).fill({ color: 'brown', value: 1.0 }),
    ...Array(4).fill({ color: 'yellow', value: 1.5 })
  ];
  
  gameState.tokens = shuffleArray(tokenColors).map((token, index) => ({
    id: index,
    color: token.color,
    value: token.value,
    collected: false
  }));
  
  renderTokens();
}

function renderTokens() {
  const grid = document.getElementById('tokens-grid');
  grid.innerHTML = '';
  
  gameState.tokens.forEach((token, index) => {
    const tokenEl = document.createElement('div');
    tokenEl.className = 'token hidden';
    tokenEl.dataset.index = index;
    tokenEl.textContent = '🔒';
    
    if (token.collected) {
      tokenEl.classList.add('collected');
    }
    
    grid.appendChild(tokenEl);
  });
}

function determineFirstPlayer() {
  const rolls = gameState.players.map((player, index) => ({
    index,
    roll: rollDice()
  }));
  
  rolls.sort((a, b) => b.roll - a.roll);
  
  const message = rolls.map(r => 
    `${gameState.players[r.index].name}: ${r.roll}`
  ).join('\n');
  
  showMessage(
    'Determinando primer jugador',
    `Resultados de dados:\n${message}\n\n${gameState.players[rolls[0].index].name} comienza!`,
    () => {
      gameState.currentPlayerIndex = rolls[0].index;
      gameState.turnOrder = rolls.map(r => r.index);
      startTurn();
    }
  );
}

// TURN MANAGEMENT
function startTurn() {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // Check if player should skip turn
  if (currentPlayer.skipNextTurn) {
    currentPlayer.skipNextTurn = false;
    showMessage('Turno Perdido', `${currentPlayer.name} pierde su turno!`, () => {
      nextTurn();
    });
    return;
  }
  
  updatePlayerUI();
  updateTurnIndicator();
  
  if (currentPlayer.isHuman) {
    startHumanTurn();
  } else {
    startBotTurn();
  }
}

function startHumanTurn() {
  document.getElementById('pick-card-btn').style.display = 'block';
  document.getElementById('end-turn-btn').style.display = 'none';
}

function startBotTurn() {
  setTimeout(() => {
    botPickCard();
  }, 1000);
}

function pickCard() {
  const card = cardTypes[Math.floor(Math.random() * cardTypes.length)];
  gameState.currentCard = card;
  
  document.getElementById('card-title').textContent = card.name;
  document.getElementById('card-description').textContent = card.description;
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const canStore = currentPlayer.hand.length < 5;
  
  document.getElementById('store-card-btn').style.display = canStore ? 'block' : 'none';
  
  showModal('card-modal');
  document.getElementById('pick-card-btn').style.display = 'none';
}

function storeCard() {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  currentPlayer.hand.push(gameState.currentCard);
  
  hideModal('card-modal');
  updatePlayerUI();
  showEndTurnButton();
}

function applyCard() {
  hideModal('card-modal');
  executeCardAction(gameState.currentCard, gameState.currentPlayerIndex);
}

function executeCardAction(card, playerIndex) {
  const player = gameState.players[playerIndex];
  
  switch (card.type) {
    case 'trash':
      player.trash += card.value;
      showMessage('Basura Recogida', `${player.name} ganó ${card.value} basura!`, () => {
        updatePlayerUI();
        showEndTurnButton();
      });
      break;
      
    case 'steal-trash':
      handleStealTrash(playerIndex);
      break;
      
    case 'fishing':
      handleFishing(playerIndex);
      break;
      
    case 'duel-tokens':
      handleDuelTokens(playerIndex);
      break;
      
    case 'duel-turn':
      handleDuelTurn(playerIndex);
      break;
      
    case 'rotate-trash':
      handleRotateTrash();
      break;
      
    case 'reverse-order':
      handleReverseOrder();
      break;
  }
}

function handleStealTrash(playerIndex) {
  const player = gameState.players[playerIndex];
  const diceRoll = rollDice();
  
  showDiceRoll(diceRoll, `${player.name} sacó ${diceRoll}!`, () => {
    if (player.isHuman) {
      selectOpponentForSteal(playerIndex, diceRoll);
    } else {
      const opponentIndex = selectRandomOpponent(playerIndex);
      stealTrashFromPlayer(playerIndex, opponentIndex, diceRoll);
    }
  });
}

function selectOpponentForSteal(playerIndex, amount) {
  const title = document.getElementById('player-select-title');
  title.textContent = `Selecciona a quién robar ${amount} basura`;
  
  const options = document.getElementById('player-select-options');
  options.innerHTML = '';
  
  gameState.players.forEach((player, index) => {
    if (index !== playerIndex) {
      const btn = document.createElement('button');
      btn.className = 'btn btn--primary';
      btn.textContent = `${player.name} (Basura: ${player.trash})`;
      btn.onclick = () => {
        hideModal('player-select-modal');
        stealTrashFromPlayer(playerIndex, index, amount);
      };
      options.appendChild(btn);
    }
  });
  
  showModal('player-select-modal');
}

function stealTrashFromPlayer(thiefIndex, victimIndex, amount) {
  const thief = gameState.players[thiefIndex];
  const victim = gameState.players[victimIndex];
  
  const stolen = Math.min(amount, victim.trash);
  victim.trash -= stolen;
  thief.trash += stolen;
  
  showMessage(
    'Robo de Basura',
    `${thief.name} robó ${stolen} basura de ${victim.name}!`,
    () => {
      updatePlayerUI();
      showEndTurnButton();
    }
  );
}

function handleFishing(playerIndex) {
  gameState.selectingToken = true;
  showModal('token-select-modal');
  
  const tokens = document.querySelectorAll('.token:not(.collected)');
  tokens.forEach(tokenEl => {
    tokenEl.classList.add('selectable');
    tokenEl.onclick = () => collectToken(parseInt(tokenEl.dataset.index), playerIndex);
  });
}

function collectToken(tokenIndex, playerIndex) {
  const token = gameState.tokens[tokenIndex];
  if (token.collected) return;
  
  const player = gameState.players[playerIndex];
  token.collected = true;
  player.tokens.push(token);
  player.score += token.value;
  
  gameState.selectingToken = false;
  hideModal('token-select-modal');
  
  // Remove selectable class from all tokens
  document.querySelectorAll('.token').forEach(t => {
    t.classList.remove('selectable');
    t.onclick = null;
  });
  
  showMessage(
    'Ajolote Rescatado!',
    `${player.name} rescató un ajolote ${token.color}!\n+${token.value} puntos`,
    () => {
      renderTokens();
      updatePlayerUI();
      checkVictoryCondition();
      if (!checkVictoryCondition()) {
        showEndTurnButton();
      }
    }
  );
}

function cancelTokenSelection() {
  gameState.selectingToken = false;
  hideModal('token-select-modal');
  document.querySelectorAll('.token').forEach(t => {
    t.classList.remove('selectable');
    t.onclick = null;
  });
  showEndTurnButton();
}

function handleDuelTokens(playerIndex) {
  const player = gameState.players[playerIndex];
  
  if (player.isHuman) {
    selectOpponentForDuel(playerIndex, 'tokens');
  } else {
    const opponentIndex = selectRandomOpponent(playerIndex);
    executeDuel(playerIndex, opponentIndex, 'tokens');
  }
}

function handleDuelTurn(playerIndex) {
  const player = gameState.players[playerIndex];
  
  if (player.isHuman) {
    selectOpponentForDuel(playerIndex, 'turn');
  } else {
    const opponentIndex = selectRandomOpponent(playerIndex);
    executeDuel(playerIndex, opponentIndex, 'turn');
  }
}

function selectOpponentForDuel(playerIndex, duelType) {
  const title = document.getElementById('player-select-title');
  title.textContent = duelType === 'tokens' ? 'Selecciona oponente para duelo de fichas' : 'Selecciona oponente para duelo de turno';
  
  const options = document.getElementById('player-select-options');
  options.innerHTML = '';
  
  gameState.players.forEach((player, index) => {
    if (index !== playerIndex) {
      const btn = document.createElement('button');
      btn.className = 'btn btn--primary';
      btn.textContent = player.name;
      btn.onclick = () => {
        hideModal('player-select-modal');
        executeDuel(playerIndex, index, duelType);
      };
      options.appendChild(btn);
    }
  });
  
  showModal('player-select-modal');
}

function executeDuel(player1Index, player2Index, duelType) {
  const player1 = gameState.players[player1Index];
  const player2 = gameState.players[player2Index];
  
  const roll1 = rollDice();
  const roll2 = rollDice();
  
  showDiceRoll([roll1, roll2], `${player1.name}: ${roll1}\n${player2.name}: ${roll2}`, () => {
    if (roll1 > roll2) {
      resolveDuel(player1Index, player2Index, duelType);
    } else if (roll2 > roll1) {
      resolveDuel(player2Index, player1Index, duelType);
    } else {
      showMessage('Empate!', 'Nadie gana el duelo', () => {
        updatePlayerUI();
        showEndTurnButton();
      });
    }
  });
}

function resolveDuel(winnerIndex, loserIndex, duelType) {
  const winner = gameState.players[winnerIndex];
  const loser = gameState.players[loserIndex];
  
  if (duelType === 'tokens') {
    if (loser.tokens.length > 0) {
      const stolenToken = loser.tokens.pop();
      winner.tokens.push(stolenToken);
      winner.score += stolenToken.value;
      loser.score -= stolenToken.value;
      
      showMessage(
        'Duelo Ganado!',
        `${winner.name} robó una ficha ${stolenToken.color} de ${loser.name}!`,
        () => {
          updatePlayerUI();
          showEndTurnButton();
        }
      );
    } else {
      showMessage(
        'Duelo Ganado!',
        `${loser.name} no tiene fichas para robar`,
        () => {
          updatePlayerUI();
          showEndTurnButton();
        }
      );
    }
  } else if (duelType === 'turn') {
    loser.skipNextTurn = true;
    showMessage(
      'Duelo Ganado!',
      `${loser.name} perderá su siguiente turno!`,
      () => {
        updatePlayerUI();
        showEndTurnButton();
      }
    );
  }
}

function handleRotateTrash() {
  if (gameState.players[gameState.currentPlayerIndex].isHuman) {
    showModal('direction-modal');
  } else {
    const direction = Math.random() > 0.5 ? 'left' : 'right';
    rotateTrash(direction);
  }
}

function rotateTrash(direction) {
  hideModal('direction-modal');
  
  const trashValues = gameState.players.map(p => p.trash);
  
  if (direction === 'left') {
    const first = trashValues.shift();
    trashValues.push(first);
  } else {
    const last = trashValues.pop();
    trashValues.unshift(last);
  }
  
  gameState.players.forEach((player, index) => {
    player.trash = trashValues[index];
  });
  
  showMessage(
    'Rotación de Basura',
    `La basura ha rotado hacia la ${direction === 'left' ? 'izquierda' : 'derecha'}!`,
    () => {
      updatePlayerUI();
      showEndTurnButton();
    }
  );
}

function handleReverseOrder() {
  gameState.turnDirection *= -1;
  
  showMessage(
    'Cambio de Rotación',
    '¡El orden de los turnos se ha invertido!',
    () => {
      updatePlayerUI();
      showEndTurnButton();
    }
  );
}

function showDiceRoll(roll, message, callback) {
  const diceDisplay = document.getElementById('dice-display');
  const resultDiv = document.getElementById('dice-result');
  
  diceDisplay.textContent = '🎲';
  resultDiv.textContent = '';
  
  showModal('dice-modal');
  
  setTimeout(() => {
    if (Array.isArray(roll)) {
      diceDisplay.textContent = roll.join(' 🎲 ');
    } else {
      diceDisplay.textContent = roll;
    }
    resultDiv.textContent = message;
    
    setTimeout(() => {
      hideModal('dice-modal');
      if (callback) callback();
    }, 2000);
  }, 1000);
}

function showEndTurnButton() {
  if (!gameState.players[gameState.currentPlayerIndex].isHuman) {
    setTimeout(() => endTurn(), 2000);
    return;
  }
  
  document.getElementById('end-turn-btn').style.display = 'block';
  startTurnTimer();
}

function startTurnTimer() {
  if (gameState.turnTimer) {
    clearInterval(gameState.turnTimer);
  }
  
  gameState.turnSeconds = 8;
  document.getElementById('turn-timer').style.display = 'block';
  document.getElementById('timer-seconds').textContent = gameState.turnSeconds;
  
  gameState.turnTimer = setInterval(() => {
    if (gameState.isShopOpen) return;
    
    gameState.turnSeconds--;
    document.getElementById('timer-seconds').textContent = gameState.turnSeconds;
    
    if (gameState.turnSeconds <= 0) {
      clearInterval(gameState.turnTimer);
      endTurn();
    }
  }, 1000);
}

function endTurn() {
  if (gameState.turnTimer) {
    clearInterval(gameState.turnTimer);
  }
  
  document.getElementById('turn-timer').style.display = 'none';
  document.getElementById('end-turn-btn').style.display = 'none';
  
  nextTurn();
}

function nextTurn() {
  gameState.totalTurns++;
  
  if (checkVictoryCondition()) {
    return;
  }
  
  // Find next player index
  const currentOrder = gameState.turnOrder.indexOf(gameState.currentPlayerIndex);
  let nextOrder = currentOrder + gameState.turnDirection;
  
  if (nextOrder >= gameState.turnOrder.length) {
    nextOrder = 0;
  } else if (nextOrder < 0) {
    nextOrder = gameState.turnOrder.length - 1;
  }
  
  gameState.currentPlayerIndex = gameState.turnOrder[nextOrder];
  startTurn();
}

// BOT AI
function botPickCard() {
  const card = cardTypes[Math.floor(Math.random() * cardTypes.length)];
  gameState.currentCard = card;
  
  const bot = gameState.players[gameState.currentPlayerIndex];
  
  showMessage(
    `Turno de ${bot.name}`,
    `${bot.name} recogió: ${card.name}`,
    () => {
      // Bot decides whether to store or apply
      if (bot.hand.length < 5 && Math.random() > 0.4) {
        bot.hand.push(card);
        updatePlayerUI();
        showEndTurnButton();
      } else {
        executeCardAction(card, gameState.currentPlayerIndex);
      }
    }
  );
}

function selectRandomOpponent(playerIndex) {
  const opponents = gameState.players
    .map((p, i) => i)
    .filter(i => i !== playerIndex);
  return opponents[Math.floor(Math.random() * opponents.length)];
}

// SHOP
function openShop() {
  gameState.isShopOpen = true;
  showModal('shop-modal');
}

function closeShop() {
  gameState.isShopOpen = false;
  hideModal('shop-modal');
}

function buyItem(itemIndex) {
  const item = shopItems[itemIndex];
  const player = gameState.players[gameState.currentPlayerIndex];
  
  if (player.trash >= item.cost) {
    player.trash -= item.cost;
    player.score += item.points;
    
    showMessage(
      'Compra Exitosa!',
      `Compraste ${item.name}!\n-${item.cost} basura\n+${item.points} puntos`,
      () => {
        updatePlayerUI();
      }
    );
  } else {
    showMessage(
      'Basura Insuficiente',
      `Necesitas ${item.cost} basura. Tienes ${player.trash}.`
    );
  }
}

// UI UPDATES
function updatePlayerUI() {
  gameState.players.forEach((player, index) => {
    const card = document.getElementById(`player-${index}`);
    card.querySelector('.player-name').textContent = player.name;
    card.querySelector('.basura-count').textContent = player.trash;
    card.querySelector('.puntaje-count').textContent = player.score.toFixed(1);
    card.querySelector('.hand-count').textContent = player.hand.length;
    
    // Update tokens display
    const tokensDiv = card.querySelector('.player-tokens');
    tokensDiv.innerHTML = '';
    player.tokens.forEach(token => {
      const tokenEl = document.createElement('div');
      tokenEl.className = `player-token ${token.color}`;
      tokensDiv.appendChild(tokenEl);
    });
    
    // Highlight active player
    if (index === gameState.currentPlayerIndex) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
  
  // Update human player's hand
  const humanPlayer = gameState.players[0];
  const handDiv = document.getElementById('hand-cards');
  handDiv.innerHTML = '';
  
  humanPlayer.hand.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'hand-card';
    cardEl.innerHTML = `
      <div class="hand-card-title">${card.name}</div>
      <div class="hand-card-desc">${card.description}</div>
    `;
    cardEl.onclick = () => useHandCard(index);
    handDiv.appendChild(cardEl);
  });
  
  document.querySelector('.player-hand h3').textContent = 
    `Tus Cartas (${humanPlayer.hand.length}/5)`;
}

function useHandCard(cardIndex) {
  if (gameState.currentPlayerIndex !== 0) {
    showMessage('No es tu turno', 'Solo puedes usar cartas en tu turno');
    return;
  }
  
  const humanPlayer = gameState.players[0];
  const card = humanPlayer.hand[cardIndex];
  
  if (confirm(`¿Usar ${card.name}?`)) {
    humanPlayer.hand.splice(cardIndex, 1);
    executeCardAction(card, 0);
  }
}

function updateTurnIndicator() {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  document.getElementById('current-turn-player').textContent = currentPlayer.name;
}

// VICTORY
function checkVictoryCondition() {
  const allTokensCollected = gameState.tokens.every(t => t.collected);
  const maxTurnsReached = gameState.totalTurns >= gameState.maxTurns;
  
  if (allTokensCollected || maxTurnsReached) {
    showVictoryScreen();
    return true;
  }
  return false;
}

function showVictoryScreen() {
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
  
  const winnerDiv = document.getElementById('winner-announcement');
  winnerDiv.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 20px;">🏆</div>
    <div>¡${sortedPlayers[0].name} GANA!</div>
    <div style="font-size: 18px; margin-top: 10px;">Con ${sortedPlayers[0].score.toFixed(1)} puntos</div>
  `;
  
  const rankingDiv = document.getElementById('ranking');
  rankingDiv.innerHTML = '<h3 style="text-align: center; margin-bottom: 16px;">Clasificación Final</h3>';
  
  sortedPlayers.forEach((player, index) => {
    const rankItem = document.createElement('div');
    rankItem.className = 'rank-item';
    rankItem.innerHTML = `
      <span class="rank-position">${index + 1}°</span>
      <span class="rank-name">${player.name}</span>
      <span class="rank-score">${player.score.toFixed(1)} pts</span>
    `;
    rankingDiv.appendChild(rankItem);
  });
  
  showModal('victory-modal');
}

function closeMessage() {
  hideModal('message-modal');
}