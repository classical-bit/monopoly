import { useEffect, useRef, useState } from "react";

interface Player {
    id: string;
    name: string;
    position: number;
    balance: number;
}

interface Tile {
  id: number;
  name: string;
  price: number;
  owner?: string;
  color?: string;
}

interface GameState {
  game_id: string;
  players: Player[];
  board: Tile[];
  current_turn: number;
  dice1: number;
  dice2: number;
  last_message: string;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState | null> (null);
  const [playerId] = useState(()=> "player_" + Math.random().toString(36).substring(2,9));
  const [playerName, setPlayerName] = useState("Guest");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close()
      }
    };
  }, []);

  const connectToRoom = () => {
    if (!playerName.trim()) return;
    
    setError(null);
    const wsUrl = import.meta.env.VITE_WS_URL || `ws://localhost:8080/ws/game`;
    ws.current = new WebSocket(`${wsUrl}?room=global_lobby&player=${playerId}&name=${encodeURIComponent(playerName)}`);

    ws.current.onopen = () => {
      setJoined(true);
    }
    ws.current.onmessage = (event) => {
      try {
        const data: GameState = JSON.parse(event.data);
        setGameState(data);
      } catch (err) {
        console.error("Payload parsing error:", err);
      }
    };
    ws.current.onerror = (err) => {
      console.error("WebSocket transport breakdown:", err);
      setError("Check connection!");
    }
    ws.current.onclose = () => {
      setJoined(false);
    }
  };

  const sendAction = (action: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({action, player_id: playerId}));
    } else {
      setError("Action dropped: Connection context lost.");
    }
  };

  if (!joined) {
    return (
      <div style={{padding: '3rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif', maxWidth: '400px', margin: 'auto'}}>
        <h2 style={{ marginBottom: '1.5rem'}}>Monopoly Game</h2>
        {error && <div style={{color: 'red', marginBottom: '1rem', fontSize: '0.9rem'}}>{error}</div>}
        <div style={{display: 'flex', gap: '0.543m'}}>
          <input 
          value={playerName} 
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter Handle"
          style={{padding: '0.75rem', flex: 1, borderRadius: '6px', border: '1px solid #ccc'}}
          />
          <button onClick={connectToRoom} style={{padding: '0.75rem 1.5rem', borderRadius: '6px', background: '#22c55e', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>Join</button>
        </div>
      </div>
    )
  }

  const activePlayer = gameState?.players[gameState.current_turn];
  const isMyTurn = activePlayer?.id === playerId;

  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'sans-serif', padding: '1rem'}}>
      <h1>Monopoly Game</h1>
      <p style={{fontStyle: 'italic', color: '#555'}}>{gameState?.last_message}</p>

      {gameState && (
        <div>
          <h3>Dice Output: {gameState.dice1} + {gameState.dice2} = {gameState.dice1 + gameState.dice2}</h3>

          {/* Simple Linear Representation of Board*/}
          <div style={{display: 'flex', gap: '10px', margin: '2rem 0', background: '#eee', padding: '1rem', borderRadius: '8px'}}>
            {gameState.board.map((tile) => {
              const playersOnTile = gameState.players.filter(p => p.position === tile.id);
              return (
                <div key={tile.id} style={{border: '2px solid #333', padding: '0.5rem', width: '100px', minHeight: '120px', background: '#fff'}}>
                  <strong>{tile.name}</strong>
                  <div style={{fontSize: '0.8rem', color: '#666'}}>{tile.price > 0 ? `$${tile.price}`: '' }</div>
                  <div style={{fontSize: '0.75rem', color: 'blue'}}>{tile.owner ? `Owner: ${tile.owner.slice(0,5)}`: '' }</div>
                  <div style={{marginTop: '10px'}}>
                    {playersOnTile.map(p => (
                      <span key={p.id} style={{background: '#f0ad4e', padding: '2px 4px', borderRadius: '4px', display: 'block', fontSize: '0.7rem', marginBottom: '2px'}}>
                        {p.name}
                      </span>
                    ))}
                  </div>

                </div>
              )
            })}
          </div>
          
          <div style={{background: '#f9f9f9', padding: '1rem', borderRadius: '8px', width: '100%', maxWidth: '500px'}}>
            <h4>Standings</h4>
            {gameState.players.map(p => (
              <div key={p.id} style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                <span style={{fontWeight: p.id === playerId ? 'bold' : 'normal'}}>{p.name} {p.id === playerId ? '(You)' : ''}</span>
                <span>${p.balance}</span>
              </div>
            ))}
          </div>

          <div style={{marginTop: '1.5rem', display: 'flex', gap: '10px'}}>
            <button disabled={!isMyTurn} onClick={() => sendAction('ROLL_DICE')}>Roll Dice</button>
            <button disabled={!isMyTurn} onClick={() => sendAction('BUY_PROPERTY')}>Buy Property</button>
            <button disabled={!isMyTurn} onClick={() => sendAction('END_TURN')}>End Turn</button>
          </div>
        </div>
      )}
    </div>
  )
}