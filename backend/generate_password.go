//go:build tools

package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "password123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Println("Error generating password hash:", err)
		return
	}
	fmt.Println("Password:", password)
	fmt.Println("Hashed password:", string(hashedPassword))
}
