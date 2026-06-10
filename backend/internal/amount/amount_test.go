package amount

import (
	"math/big"
	"testing"
)

func TestParsePositiveUnitsBoundaries(t *testing.T) {
	max := new(big.Int).Sub(new(big.Int).Lsh(big.NewInt(1), 256), big.NewInt(1)).String()

	for _, value := range []string{"1", "100", max} {
		if _, err := ParsePositiveUnits(value); err != nil {
			t.Fatalf("expected %s to be accepted: %v", value, err)
		}
	}

	for _, value := range []string{"", "0", "-1", "+1", "1.00", "01", "1e18", "abc"} {
		if _, err := ParsePositiveUnits(value); err == nil {
			t.Fatalf("expected %q to be rejected", value)
		}
	}

	overflow := new(big.Int).Lsh(big.NewInt(1), 256).String()
	if _, err := ParsePositiveUnits(overflow); err == nil {
		t.Fatal("expected uint256 overflow to be rejected")
	}
}

func TestAddAndSubRejectOverflowAndUnderflow(t *testing.T) {
	max := new(big.Int).Sub(new(big.Int).Lsh(big.NewInt(1), 256), big.NewInt(1)).String()
	if _, err := Add(max, "1"); err == nil {
		t.Fatal("expected addition overflow")
	}
	if _, err := Sub("1", "2"); err == nil {
		t.Fatal("expected subtraction underflow")
	}
}
