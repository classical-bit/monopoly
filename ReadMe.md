# Real-Time Multiplayer Monopoly Game (MVP)

## System Architecture

Refer Image: [System Architecture.jpg]

- Authoritative Game Server: The client only sends intents. The Go backend processes the logic, updates the state, and broadcasts the delta to all connected players. This prevents client side cheating
- Redis for game state and Pub/Sub: Active games lives in Redis hashes for sub milli-seconds read/writes. If a game server instance crashes another instance can hydrate the game state from Redis instantly and resume the session.
- Websocket Concurrency: Go's goroutines consumes minimal memory (~2KB per connection), allowing a single modest cloud instance to handle tens of thousands of concurrent player.

## Database Schema

'''
CREATE TABLE users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
username VARCHAR(50) UNIQUE NOT NULL,
email VARCHAR(255) UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
'''

'''
CREATE TABLE match_history (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
game_id VARCHAR(64) NOT NULL,
winner_id UUID REFERENCES users(id),
total_turns INT NOT NULL,
duration_seconds INT NOT NULL,
ended_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
'''

## Redis Schema

Key: game:{game_id} -> Hash containing stringified game state.
Key: lobby:{lobby_id} -> Set of user IDs currently waiting in a lobby.

## API Endpoints

POST | /api/v1/auth/register | Create a new player account | No Auth
POST | /api/v1/auth/login | Authenticate and receive JWT | No Auth
POST | /api/v1/games/create | Instantiate a new Game Room | Auth
GET | /api/v1/games/join | Validate access to room ID | Auth

- Websocket Gateway
  /ws/game?room={game_id}&token={jwt}

## UI Architecture

Refer Image: [UI Architecture.jpg]
