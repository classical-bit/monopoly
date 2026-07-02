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
  const [playerId] = useState(()=> {
    const cachedId = localStorage.getItem('monopoly_game_player_id');
    if (cachedId) return cachedId;

    const newId = "p_" + Math.random().toString(36).substring(2,9);
    localStorage.setItem('monopoly_game_player_id', newId);
    return newId;
  });
  const [playerName, setPlayerName] = useState("Guest");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    if (localStorage.getItem('monopoly_game_player_id')) {
      connectToRoom();
    }
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

  const getGridArea = (id: number): string => {
    if (id === 0) return "3 / 3";
    if (id === 1) return "3 / 2";
    if (id === 2) return "3 / 1";
    if (id === 3) return "2 / 1";
    if (id === 4) return "1 / 1";
    if (id === 5) return "1 / 2";
    if (id === 6) return "1 / 3";
    if (id === 7) return "2 / 3";
    return "auto";
  }

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
    <div style={{display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto'}}>
      {/* Left Column: Board */}
      <div>
        <header style={{marginBottom: '1rem'}}>
          <h1 style={{margin: 0}}>Monopoly Game</h1>
          <p style={{color: '#666', background: '#f3f4f6', padding: '0.75rem', borderRadius: '6px', borderLeft: '4px solid #3b82f6', marginTop: '1rem'}}>
            {gameState?.last_message || "Awaiting state sync..."}
          </p>
        </header>

        {gameState && (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 160px)', gridTemplateRows: 'repeat(3, 160px)', gap: '8px', background: '#dee2e6', padding: '12px', borderRadius: '12px', width: 'fit-content'}}>
            <div style={{gridArea: '2 / 2 / 3 / 3', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#fff', borderRadius: '4px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937'}}>🎲 {gameState.dice1 + gameState.dice2}</div>
              <div style={{fontSize: '0.8rem', color: '#6b7280'}}>({gameState.dice1} & {gameState.dice2})</div>
            </div>

            {gameState.board.map((tile) => {
              const playersOnTile = gameState.players.filter(p => p.position === tile.id);
              return (
                <div key={tile.id} style={{gridArea: getGridArea(tile.id), border: '1px solid #9ca3af', padding: '0.5rem', background: '#fff', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
                  <div style={{fontSize: '0.85rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{tile.name}</div>
                  <div>
                    <div style={{fontSize: '0.8rem', color: '#059669', fontWeight: '600'}}>{tile.price > 0 ? `$${tile.price}`: '' }</div>
                    {tile.owner && <div style={{fontSize: '0.75rem', color: 'blue'}}>{tile.owner.slice(0,6)}</div>}
                  </div>

                  <div style={{display: 'flex', gap: '2px', flexWrap: 'wrap', marginTop: '4px'}}>
                    {playersOnTile.map(p => (
                      <span key={p.id} style={{background: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold'}}>
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

          </div>
        )}
      </div>

      {/* Right Column: Status and Actions */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
        {gameState && (
          <>
            <div style={{background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
              <h3 style={{marginTop: 0, marginBottom: '1rem'}}>Active Standings</h3>
              {gameState.players.map((p, index) => (
                <div key={p.id} style={{display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0', alignItems: 'center'}}>
                  <span style={{fontWeight: p.id === playerId ? '700' : '400', color: gameState.current_turn === index ? '#ef4444' : 'inherit'}}>
                    {p.name} {p.id === playerId ? '(You)' : ''} {gameState.current_turn === index ? '⏱️' : ''}
                  </span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a'}}>${p.balance}</span>
                </div>
              ))}
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '0.7rem'}}>
              <button disabled={!isMyTurn} onClick={() => sendAction('ROLL_DICE')} style={{...btnStyle, background: isMyTurn? '#3b82f6' : '#cbd5e1', color: 'white'}}>Roll Dice</button>
              <button disabled={!isMyTurn} onClick={() => sendAction('BUY_PROPERTY')} style={{...btnStyle, background: isMyTurn? '#3b82f6' : '#cbd5e1', color: 'white'}}>Buy Property</button>
              <button disabled={!isMyTurn} onClick={() => sendAction('END_TURN')} style={{...btnStyle, background: isMyTurn? '#3b82f6' : '#cbd5e1', color: 'white'}}>End Turn</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const btnStyle = {
  padding: '0.85rem 1.5rem',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  border: 'none',
  borderRadius: '8px',
  transition: 'all 0.2s ease'
}