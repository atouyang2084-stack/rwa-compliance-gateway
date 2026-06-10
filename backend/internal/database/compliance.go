package database

import (
	"database/sql"
	"errors"
	"regexp"
	"strings"
)

var jurisdictionPattern = regexp.MustCompile(`^[A-Z0-9_-]{2,16}$`)

func normalizeJurisdiction(value string) (string, error) {
	code := strings.ToUpper(strings.TrimSpace(value))
	if !jurisdictionPattern.MatchString(code) {
		return "", errors.New("invalid jurisdiction code")
	}
	return code, nil
}

func AddJurisdiction(code string) (string, error) {
	normalized, err := normalizeJurisdiction(code)
	if err != nil {
		return "", err
	}
	_, err = DB.Exec("INSERT INTO jurisdictions (code) VALUES (?)", normalized)
	return normalized, err
}

func RestrictJurisdiction(code string, restricted bool) (string, error) {
	normalized, err := normalizeJurisdiction(code)
	if err != nil {
		return "", err
	}
	result, err := DB.Exec(`
		UPDATE jurisdictions SET restricted = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?
	`, restricted, normalized)
	if err != nil {
		return "", err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return "", err
	}
	if affected != 1 {
		return "", errors.New("jurisdiction not found")
	}
	return normalized, nil
}

func SetAddressJurisdiction(address, code string) (string, error) {
	normalized, err := normalizeJurisdiction(code)
	if err != nil {
		return "", err
	}
	var restricted bool
	if err := DB.QueryRow("SELECT restricted FROM jurisdictions WHERE code = ?", normalized).Scan(&restricted); err != nil {
		if err == sql.ErrNoRows {
			return "", errors.New("jurisdiction not found")
		}
		return "", err
	}
	_, err = DB.Exec(`
		INSERT INTO address_jurisdictions (user_address, jurisdiction_code)
		VALUES (?, ?)
		ON CONFLICT(user_address) DO UPDATE
		SET jurisdiction_code = excluded.jurisdiction_code, updated_at = CURRENT_TIMESTAMP
	`, strings.ToLower(address), normalized)
	return normalized, err
}

func GetAddressJurisdiction(address string) (string, bool, error) {
	var code string
	var restricted bool
	err := DB.QueryRow(`
		SELECT j.code, j.restricted
		FROM address_jurisdictions a
		JOIN jurisdictions j ON j.code = a.jurisdiction_code
		WHERE a.user_address = ?
	`, strings.ToLower(address)).Scan(&code, &restricted)
	if err == sql.ErrNoRows {
		return "", false, errors.New("jurisdiction not set")
	}
	return code, restricted, err
}
