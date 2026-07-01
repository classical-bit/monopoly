package main

import (
	"log"
	"net/http"

	"github.com/classical-bit/monopoly/internal/server"
)

func main() {
	hub := server.NewGameHub()
	http.HandleFunc("/ws/game", hub.HandleWS)

	log.Println("Server executing seamlessly on port :8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
