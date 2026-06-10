package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

const complianceEngineABI = `[
  {
    "inputs":[
      {"internalType":"address","name":"user","type":"address"},
      {"internalType":"string","name":"dataHash","type":"string"}
    ],
    "name":"setKYCDataHash",
    "outputs":[],
    "stateMutability":"nonpayable",
    "type":"function"
  }
]`

type ContractService struct {
	client   *ethclient.Client
	contract *bind.BoundContract
	auth     *bind.TransactOpts
}

func NewContractService() (*ContractService, error) {
	rpcURL := strings.TrimSpace(os.Getenv("RPC_URL"))
	privateKeyHex := strings.TrimPrefix(strings.TrimSpace(os.Getenv("ANCHOR_PRIVATE_KEY")), "0x")
	contractAddress := strings.TrimSpace(os.Getenv("COMPLIANCE_ENGINE_ADDRESS"))
	if rpcURL == "" || privateKeyHex == "" || !common.IsHexAddress(contractAddress) {
		return nil, errors.New("on-chain KYC anchoring is not configured")
	}

	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("connect to Ethereum RPC: %w", err)
	}
	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("parse anchor private key: %w", err)
	}
	chainID, err := client.ChainID(context.Background())
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("read chain ID: %w", err)
	}
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("create transaction signer: %w", err)
	}
	parsedABI, err := abi.JSON(strings.NewReader(complianceEngineABI))
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("parse compliance ABI: %w", err)
	}
	address := common.HexToAddress(contractAddress)
	return &ContractService{
		client:   client,
		contract: bind.NewBoundContract(address, parsedABI, client, client, client),
		auth:     auth,
	}, nil
}

func (s *ContractService) SetKYCDataHash(userAddress, dataHash string) error {
	if !common.IsHexAddress(userAddress) {
		return errors.New("invalid user address")
	}
	if strings.TrimSpace(dataHash) == "" {
		return errors.New("KYC data hash is required")
	}
	tx, err := s.contract.Transact(s.auth, "setKYCDataHash", common.HexToAddress(userAddress), dataHash)
	if err != nil {
		return fmt.Errorf("submit KYC anchor transaction: %w", err)
	}
	if _, err := bind.WaitMined(context.Background(), s.client, tx); err != nil {
		return fmt.Errorf("confirm KYC anchor transaction: %w", err)
	}
	return nil
}

func (s *ContractService) Close() {
	if s.client != nil {
		s.client.Close()
	}
}
