package amount

import (
	"errors"
	"math/big"
	"regexp"
)

var (
	unsignedIntegerPattern = regexp.MustCompile(`^(0|[1-9][0-9]*)$`)
	maxUint256             = new(big.Int).Sub(new(big.Int).Lsh(big.NewInt(1), 256), big.NewInt(1))
)

// ParseUnits parses an already-scaled integer amount without ever using floats.
func ParseUnits(value string) (*big.Int, error) {
	if !unsignedIntegerPattern.MatchString(value) {
		return nil, errors.New("amount must be an unsigned integer string in smallest units")
	}

	parsed, ok := new(big.Int).SetString(value, 10)
	if !ok || parsed.Sign() < 0 {
		return nil, errors.New("invalid amount")
	}
	if parsed.Cmp(maxUint256) > 0 {
		return nil, errors.New("amount exceeds uint256")
	}
	return parsed, nil
}

func ParsePositiveUnits(value string) (*big.Int, error) {
	parsed, err := ParseUnits(value)
	if err != nil {
		return nil, err
	}
	if parsed.Sign() == 0 {
		return nil, errors.New("amount must be greater than zero")
	}
	return parsed, nil
}

func Add(left, right string) (string, error) {
	a, err := ParseUnits(left)
	if err != nil {
		return "", err
	}
	b, err := ParseUnits(right)
	if err != nil {
		return "", err
	}
	sum := new(big.Int).Add(a, b)
	if sum.Cmp(maxUint256) > 0 {
		return "", errors.New("amount exceeds uint256")
	}
	return sum.String(), nil
}

func Sub(left, right string) (string, error) {
	a, err := ParseUnits(left)
	if err != nil {
		return "", err
	}
	b, err := ParseUnits(right)
	if err != nil {
		return "", err
	}
	if a.Cmp(b) < 0 {
		return "", errors.New("insufficient balance")
	}
	return new(big.Int).Sub(a, b).String(), nil
}
