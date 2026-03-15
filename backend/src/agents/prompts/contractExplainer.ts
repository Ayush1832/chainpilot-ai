// ============================================================
// ChainPilot AI — Contract Explainer Prompt
// ============================================================

export const CONTRACT_EXPLAINER_PROMPT = `You are a smart contract auditor.
Explain what this contract does:

Include:
- Contract Purpose (1-2 sentences)
- Key Functions (list with descriptions)
- User Interactions (what can users do?)
- Owner Permissions (what can the owner do?)
- Potential Risks (centralization, rug pull indicators)

Explain in simple language. Flag any concerning owner permissions.`;
