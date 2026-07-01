package server

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/classical-bit/monopoly/internal/engine"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type ActionMessage struct {
	Action   string `json:"action"`
	PlayerID string `json:"player_id"`
}

type GameHub struct {
	mu         sync.RWMutex
	Clients    map[string][]*websocket.Conn
	GameStates map[string]*engine.GameState
}

func NewGameHub() *GameHub {
	return &GameHub{
		Clients:    make(map[string][]*websocket.Conn),
		GameStates: make(map[string]*engine.GameState),
	}
}

func (h *GameHub) HandleWS(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("room")
	playerID := r.URL.Query().Get("player")
	playerName := r.URL.Query().Get("name")

	if roomID == "" || playerID == "" {
		http.Error(w, "Missing connection metrics", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade Error:", err)
		return
	}
	defer conn.Close()

	h.mu.Lock()
	if h.GameStates[roomID] == nil {
		specs := map[string]string{playerID: playerName}
		h.GameStates[roomID] = engine.NewGame(roomID, specs)
	} else {
		found := false
		for _, p := range h.GameStates[roomID].Players {
			if p.ID == playerID {
				found = true
				break
			}
		}

		if !found {
			h.GameStates[roomID].Players = append(h.GameStates[roomID].Players, &engine.Player{
				ID:       playerID,
				Name:     playerName,
				Position: 0,
				Balance:  1500,
			})
		}
	}
	h.mu.Unlock()

	// Initial State broadcast
	initialState, err := json.Marshal(h.GameStates[roomID])
	if err != nil {
		log.Println("Marshal err:", err)
		return
	}
	conn.WriteMessage(websocket.TextMessage, initialState)

	// Event loop
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var msg ActionMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Println("Unmarshal err:", err)
			continue
		}

		h.mu.Lock()
		game := h.GameStates[roomID]
		updatedState, err := game.ExecuteTurn(msg.PlayerID, msg.Action)
		h.mu.Unlock()

		if err == nil {
			h.Broadcast(roomID, updatedState)
		}
	}
}

func (h *GameHub) Broadcast(roomID string, payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, client := range h.Clients[roomID] {
		client.WriteMessage(websocket.TextMessage, payload)
	}
}
