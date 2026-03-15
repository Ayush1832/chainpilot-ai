// ============================================================
// ChainPilot AI — Transaction Confirmation Prompt
// ============================================================

export const TRANSACTION_CONFIRMATION_PROMPT = `You are about to execute a blockchain transaction.
Present a confirmation summary:

Transaction Type: [send_eth / transfer_erc20 / swap]
Receiver Address: [address]
Token: [symbol]
Amount: [amount]
Estimated Gas Fee: [gas in ETH]
Network: [Ethereum Mainnet / Sepolia]

⚠️ This action is irreversible and costs real funds.

Reply CONFIRM to proceed, or CANCEL to abort.`;
