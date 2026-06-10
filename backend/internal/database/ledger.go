package database

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"math/big"
	"strings"

	"rwaGateway/internal/amount"
)

var ErrDuplicateRequest = errors.New("duplicate request")

type UnitAuditLog struct {
	ID            int    `json:"id"`
	Action        string `json:"action"`
	UserAddress   string `json:"userAddress"`
	AssetID       string `json:"assetId"`
	AmountUnits   string `json:"amountUnits"`
	TargetAddress string `json:"targetAddress"`
	RequestNonce  string `json:"requestNonce"`
	PreviousHash  string `json:"previousHash"`
	EventHash     string `json:"eventHash"`
	Details       string `json:"details"`
	CreatedAt     string `json:"createdAt"`
}

func UnitBalance(userAddress, assetID string) (string, error) {
	var balance string
	err := DB.QueryRow(
		"SELECT balance_units FROM user_asset_unit_balances WHERE user_address = ? AND asset_id = ?",
		strings.ToLower(userAddress), assetID,
	).Scan(&balance)
	if err == sql.ErrNoRows {
		return "0", nil
	}
	return balance, err
}

func UnitBalances(userAddress string) ([]UserAssetBalance, error) {
	rows, err := DB.Query(`
		SELECT user_address, asset_id, balance_units, updated_at
		FROM user_asset_unit_balances WHERE user_address = ? ORDER BY asset_id
	`, strings.ToLower(userAddress))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var balances []UserAssetBalance
	for rows.Next() {
		var balance UserAssetBalance
		if err := rows.Scan(&balance.UserAddress, &balance.AssetID, &balance.BalanceUnits, &balance.UpdatedAt); err != nil {
			return nil, err
		}
		balances = append(balances, balance)
	}
	return balances, rows.Err()
}

func DepositUnits(userAddress, assetID, valueUnits, nonce string) error {
	value, err := amount.ParsePositiveUnits(valueUnits)
	if err != nil {
		return err
	}
	userAddress = strings.ToLower(userAddress)
	return withLedgerTx(func(tx *sql.Tx) error {
		if err := consumeNonce(tx, nonce, userAddress, "deposit"); err != nil {
			return err
		}
		var totalSupply string
		var active bool
		if err := tx.QueryRow(`
			SELECT l.total_token_units, a.is_active
			FROM asset_unit_ledgers l JOIN assets a ON a.asset_id = l.asset_id
			WHERE l.asset_id = ?
		`, assetID).Scan(&totalSupply, &active); err != nil {
			return err
		}
		if !active {
			return errors.New("asset is not active")
		}
		sold, err := totalUnitBalances(tx, assetID)
		if err != nil {
			return err
		}
		supply, _ := amount.ParseUnits(totalSupply)
		if new(big.Int).Add(sold, value).Cmp(supply) > 0 {
			return errors.New("exceeds total token supply")
		}
		if err := addUnitBalance(tx, userAddress, assetID, valueUnits); err != nil {
			return err
		}
		return insertUnitAudit(tx, "deposit", userAddress, assetID, valueUnits, "", nonce, "Deposit allocated at 1:1 smallest-unit peg")
	})
}

func RedeemUnits(userAddress, assetID, tokenUnits, nonce string) error {
	if _, err := amount.ParsePositiveUnits(tokenUnits); err != nil {
		return err
	}
	userAddress = strings.ToLower(userAddress)
	return withLedgerTx(func(tx *sql.Tx) error {
		if err := consumeNonce(tx, nonce, userAddress, "redeem"); err != nil {
			return err
		}
		if err := subtractUnitBalance(tx, userAddress, assetID, tokenUnits); err != nil {
			return err
		}
		return insertUnitAudit(tx, "redeem", userAddress, assetID, tokenUnits, "", nonce, "Redeem returned units to available supply")
	})
}

func TransferUnits(fromAddress, toAddress, assetID, tokenUnits, nonce string) error {
	if _, err := amount.ParsePositiveUnits(tokenUnits); err != nil {
		return err
	}
	fromAddress = strings.ToLower(fromAddress)
	toAddress = strings.ToLower(toAddress)
	if fromAddress == toAddress {
		return errors.New("sender and recipient must differ")
	}
	return withLedgerTx(func(tx *sql.Tx) error {
		if err := consumeNonce(tx, nonce, fromAddress, "transfer"); err != nil {
			return err
		}
		var active bool
		if err := tx.QueryRow("SELECT is_active FROM assets WHERE asset_id = ?", assetID).Scan(&active); err != nil {
			return err
		}
		if !active {
			return errors.New("asset is not active")
		}
		if err := subtractUnitBalance(tx, fromAddress, assetID, tokenUnits); err != nil {
			return err
		}
		if err := addUnitBalance(tx, toAddress, assetID, tokenUnits); err != nil {
			return err
		}
		return insertUnitAudit(tx, "transfer", fromAddress, assetID, tokenUnits, toAddress, nonce, "Atomic compliant transfer")
	})
}

func SetAssetStatus(actor, assetID string, active bool, action, nonce string) error {
	actor = strings.ToLower(actor)
	return withLedgerTx(func(tx *sql.Tx) error {
		if err := consumeNonce(tx, nonce, actor, action); err != nil {
			return err
		}
		result, err := tx.Exec("UPDATE assets SET is_active = ? WHERE asset_id = ?", active, assetID)
		if err != nil {
			return err
		}
		affected, err := result.RowsAffected()
		if err != nil {
			return err
		}
		if affected != 1 {
			return errors.New("asset not found")
		}
		details := "Asset status changed to inactive"
		if active {
			details = "Asset status changed to active"
		}
		return insertUnitAudit(tx, action, actor, assetID, "0", "", nonce, details)
	})
}

func UnitTotalBalance(assetID string) (string, error) {
	tx, err := DB.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()
	total, err := totalUnitBalances(tx, assetID)
	if err != nil {
		return "", err
	}
	return total.String(), nil
}

func UnitAuditLogs(assetID string) ([]UnitAuditLog, error) {
	rows, err := DB.Query(`
		SELECT id, action, user_address, asset_id, amount_units, target_address,
		       request_nonce, previous_hash, event_hash, details, created_at
		FROM audit_unit_logs WHERE asset_id = ? ORDER BY id DESC
	`, assetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var logs []UnitAuditLog
	for rows.Next() {
		var entry UnitAuditLog
		if err := rows.Scan(
			&entry.ID, &entry.Action, &entry.UserAddress, &entry.AssetID,
			&entry.AmountUnits, &entry.TargetAddress, &entry.RequestNonce,
			&entry.PreviousHash, &entry.EventHash, &entry.Details, &entry.CreatedAt,
		); err != nil {
			return nil, err
		}
		logs = append(logs, entry)
	}
	return logs, rows.Err()
}

func VerifyUnitAuditChain(assetID string) (bool, error) {
	logs, err := auditLogsAscending(assetID)
	if err != nil {
		return false, err
	}
	previousHash := ""
	for _, entry := range logs {
		if entry.PreviousHash != previousHash {
			return false, nil
		}
		expected := auditHash(
			previousHash, entry.RequestNonce, entry.Action, entry.UserAddress,
			entry.AssetID, entry.AmountUnits, entry.TargetAddress, entry.Details,
		)
		if entry.EventHash != expected {
			return false, nil
		}
		previousHash = entry.EventHash
	}
	return true, nil
}

func withLedgerTx(operation func(*sql.Tx) error) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := operation(tx); err != nil {
		return err
	}
	return tx.Commit()
}

func consumeNonce(tx *sql.Tx, nonce, actor, action string) error {
	if nonce == "" || len(nonce) > 128 {
		return errors.New("invalid nonce")
	}
	if _, err := tx.Exec(
		"INSERT INTO request_nonces (nonce, actor_address, action) VALUES (?, ?, ?)",
		nonce, actor, action,
	); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return ErrDuplicateRequest
		}
		return err
	}
	return nil
}

func totalUnitBalances(tx *sql.Tx, assetID string) (*big.Int, error) {
	rows, err := tx.Query("SELECT balance_units FROM user_asset_unit_balances WHERE asset_id = ?", assetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	total := new(big.Int)
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		value, err := amount.ParseUnits(raw)
		if err != nil {
			return nil, err
		}
		total.Add(total, value)
	}
	return total, rows.Err()
}

func addUnitBalance(tx *sql.Tx, userAddress, assetID, delta string) error {
	current, err := txUnitBalance(tx, userAddress, assetID)
	if err != nil {
		return err
	}
	next, err := amount.Add(current, delta)
	if err != nil {
		return err
	}
	_, err = tx.Exec(`
		INSERT INTO user_asset_unit_balances (user_address, asset_id, balance_units)
		VALUES (?, ?, ?)
		ON CONFLICT(user_address, asset_id) DO UPDATE
		SET balance_units = excluded.balance_units, updated_at = CURRENT_TIMESTAMP
	`, userAddress, assetID, next)
	return err
}

func subtractUnitBalance(tx *sql.Tx, userAddress, assetID, delta string) error {
	current, err := txUnitBalance(tx, userAddress, assetID)
	if err != nil {
		return err
	}
	next, err := amount.Sub(current, delta)
	if err != nil {
		return err
	}
	_, err = tx.Exec(`
		INSERT INTO user_asset_unit_balances (user_address, asset_id, balance_units)
		VALUES (?, ?, ?)
		ON CONFLICT(user_address, asset_id) DO UPDATE
		SET balance_units = excluded.balance_units, updated_at = CURRENT_TIMESTAMP
	`, userAddress, assetID, next)
	return err
}

func txUnitBalance(tx *sql.Tx, userAddress, assetID string) (string, error) {
	var balance string
	err := tx.QueryRow(`
		SELECT balance_units FROM user_asset_unit_balances
		WHERE user_address = ? AND asset_id = ?
	`, userAddress, assetID).Scan(&balance)
	if err == sql.ErrNoRows {
		return "0", nil
	}
	return balance, err
}

func insertUnitAudit(tx *sql.Tx, action, actor, assetID, amountUnits, target, nonce, details string) error {
	var previousHash string
	err := tx.QueryRow(`
		SELECT event_hash FROM audit_unit_logs
		WHERE asset_id = ? ORDER BY id DESC LIMIT 1
	`, assetID).Scan(&previousHash)
	if err != nil && err != sql.ErrNoRows {
		return err
	}
	eventHash := auditHash(previousHash, nonce, action, actor, assetID, amountUnits, target, details)
	_, err = tx.Exec(`
		INSERT INTO audit_unit_logs
			(action, user_address, asset_id, amount_units, target_address,
			 request_nonce, previous_hash, event_hash, details)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, action, actor, assetID, amountUnits, target, nonce, previousHash, eventHash, details)
	return err
}

func auditLogsAscending(assetID string) ([]UnitAuditLog, error) {
	rows, err := DB.Query(`
		SELECT id, action, user_address, asset_id, amount_units, target_address,
		       request_nonce, previous_hash, event_hash, details, created_at
		FROM audit_unit_logs WHERE asset_id = ? ORDER BY id ASC
	`, assetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var logs []UnitAuditLog
	for rows.Next() {
		var entry UnitAuditLog
		if err := rows.Scan(
			&entry.ID, &entry.Action, &entry.UserAddress, &entry.AssetID,
			&entry.AmountUnits, &entry.TargetAddress, &entry.RequestNonce,
			&entry.PreviousHash, &entry.EventHash, &entry.Details, &entry.CreatedAt,
		); err != nil {
			return nil, err
		}
		logs = append(logs, entry)
	}
	return logs, rows.Err()
}

func auditHash(previousHash, nonce, action, actor, assetID, amountUnits, target, details string) string {
	canonical := strings.Join(
		[]string{previousHash, nonce, action, actor, assetID, amountUnits, target, details},
		"|",
	)
	sum := sha256.Sum256([]byte(canonical))
	return hex.EncodeToString(sum[:])
}
