import { domBuilder } from "./dombuilder.js"

// UI management functions
export function createUI() {
  const ui = domBuilder(['.ui', {
    style: {
      position: 'fixed',
      top: '10px',
      left: '10px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      zIndex: '1000',
      pointerEvents: 'none'
    }
  }]);
  
  document.body.appendChild(ui);
  return ui;
}

export function updateUI(ui, mode, gamepadManager, gameState) {
  const connectedGamepads = gamepadManager.getConnectedGamepads();
  const players = gameState.getPlayers();
  
  let content = '';
  
  if (mode === 'MENU') {
    content += '<div><strong>SHIP SELECTION</strong></div><br>';
    
    content += '<div><strong>Gamepad Controls:</strong></div>';
    content += '<div>• D-pad/Left stick: Navigate</div>';
    content += '<div>• A button: Select ship</div>';
    content += '<div>• START: Ready up</div><br>';
    
    content += '<div><strong>Keyboard Controls:</strong></div>';
    content += '<div>• Arrow keys: Navigate</div>';
    content += '<div>• SPACE: Select ship</div>';
    content += '<div>• ENTER: Ready up</div><br>';
    
    if (connectedGamepads.length > 0) {
      content += `<div>Connected Gamepads: ${connectedGamepads.length}</div>`;
    } else {
      content += '<div>No gamepads connected - use keyboard</div>';
    }
    
    if (players.length > 0) {
      content += '<br><div><strong>Players:</strong></div>';
      for (const player of players) {
        const ready = player.ready ? ' (READY)' : '';
        const inputType = player.gamepadIndex === 99 ? 'Keyboard' : `Gamepad ${player.gamepadIndex + 1}`;
        content += `<div>${inputType}: Ship ${player.shipIndex + 1}${ready}</div>`;
      }
    }
  } else {
    content += '<div><strong>GAME MODE</strong></div><br>';
    
    content += '<div><strong>Gamepad Controls:</strong></div>';
    content += '<div>• Left stick up: Thrust forward</div>';
    content += '<div>• Left stick left/right: Rotate</div>';
    content += '<div>• Left stick down: Thrust backward</div>';
    content += '<div>• SELECT: Return to menu</div><br>';
    
    content += '<div><strong>Keyboard Controls:</strong></div>';
    content += '<div>• W: Thrust forward</div>';
    content += '<div>• A/D: Rotate left/right</div>';
    content += '<div>• S: Thrust backward</div>';
    content += '<div>• ESC: Return to menu</div>';
  }
  
  ui.innerHTML = content;
}