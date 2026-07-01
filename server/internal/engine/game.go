package engine

import (
	"encoding/json"
	"math/rand"
	"time"
)

type Player struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Position   int    `json:"position"`
	Balance    int    `json:"balance"`
	IsBankrupt bool   `json:"is_bankrupt"`
}

type Tile struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Price int    `json:"price"`
	Owner string `json:"owner,omitempty"`
}

type GameState struct {
	GameID      string    `json:"game_id"`
	Players     []*Player `json:"players"`
	Board       []Tile    `json:"board"`
	CurrentTurn int       `json:"current_turn"`
	Dice1       int       `json:"dice1"`
	Dice2       int       `json:"dice2"`
	LastMessage string    `json:"last_message"`
}

func NewGame(gameID string, playerSpecs map[string]string) *GameState {
	rand.Seed(time.Now().UnixNano())

	players := make([]*Player, 0, len(playerSpecs))
	for id, name := range playerSpecs {
		players = append(players, &Player{
			ID:       id,
			Name:     name,
			Position: 0,
			Balance:  1500,
		})
	}

	// 8-Tile Board
	board := []Tile{
		{ID: 0, Name: "GO", Price: 0},
		{ID: 1, Name: "Mediterranean Avenue", Price: 60},
		{ID: 2, Name: "Community Chest", Price: 0},
		{ID: 3, Name: "Baltic Avenue", Price: 60},
		{ID: 4, Name: "Income Tax", Price: 0},
		{ID: 5, Name: "Reading Railroad", Price: 200},
		{ID: 6, Name: "Oriental Avenue", Price: 100},
		{ID: 7, Name: "Vermont Avenue", Price: 100},
	}

	return &GameState{
		GameID:      gameID,
		Players:     players,
		Board:       board,
		CurrentTurn: 0,
		LastMessage: "Game initialized. Player 1 turn!",
	}
}

func (g *GameState) ExecuteTurn(playerID, action string) ([]byte, error) {
	activePlayer := g.Players[g.CurrentTurn]
	if activePlayer.ID != playerID {
		return json.Marshal(map[string]string{"error": "Not your turn"})
	}

	switch action {
	case "ROLL_DICE":
		g.Dice1 = rand.Intn(6) + 1
		g.Dice2 = rand.Intn(6) + 1
		rollTotal := g.Dice1 + g.Dice2

		// Handle movement
		oldPos := activePlayer.Position
		activePlayer.Position = (activePlayer.Position + rollTotal) % len(g.Board)

		g.LastMessage = activePlayer.Name + " rolled a " + string(rune(g.Dice1+'0')) + " and " + string(rune(g.Dice2+'0'))

		// Passed Go reward
		if activePlayer.Position < oldPos {
			activePlayer.Balance += 200
			g.LastMessage += " and passed GO! Collected $200."
		}

		// Landing Tile evaluation
		currentSpace := g.Board[activePlayer.Position]
		if currentSpace.Price > 0 && currentSpace.Owner == "" {
			g.LastMessage += " Landed on " + currentSpace.Name + ". Can choose to buy."
		}

	case "BUY_PROPERTY":
		currentSpace := &g.Board[activePlayer.Position]
		if currentSpace.Price > 0 && currentSpace.Owner == "" {
			if activePlayer.Balance >= currentSpace.Price {
				activePlayer.Balance -= currentSpace.Price
				currentSpace.Owner = activePlayer.ID
				g.LastMessage = activePlayer.Name + " bought " + currentSpace.Name
			} else {
				g.LastMessage = "Insufficient funds to buy property."
			}
		}

	case "END_TURN":
		g.CurrentTurn = (g.CurrentTurn + 1) % len(g.Players)
		g.LastMessage = g.Players[g.CurrentTurn].Name + "'s turn now."
	}

	return json.Marshal(g)
}
