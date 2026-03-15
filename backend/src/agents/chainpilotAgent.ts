// ============================================================
// ChainPilot AI — LangChain Agent Executor
// ============================================================
// Orchestrates the AI agent with:
// - System prompt + tool instructions
// - 9 registered tools (DynamicStructuredTool)
// - Conversation memory backed by Supabase
// - Intent pre-detection and validation
// ============================================================

import { ChatOpenAI } from '@langchain/openai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from '@langchain/core/messages';
import { z } from 'zod';

import { SYSTEM_PROMPT } from './prompts/systemPrompt';
import { TOOL_INSTRUCTIONS } from './prompts/toolInstructions';
import { detectIntent, validateIntentParams } from './intentDetector';

// Tool implementations
import { getWalletInfo } from '../tools/walletAnalyzer';
import { getTransactionInfo } from '../tools/transactionExplainer';
import { getTokenRisk } from '../tools/tokenRisk';
import { getContractSource } from '../tools/contractExplainer';
import { getWhaleActivity } from '../tools/whaleTracker';
import { getDefiYields } from '../tools/defiAdvisor';
import { resolveEns } from '../tools/ensResolver';
import { sendETH, transferERC20 } from '../tools/transactionExecutor';

// Services
import * as supabaseService from '../services/supabaseService';

// ── Tool Definitions ──

const agentTools: DynamicStructuredTool[] = [
  new DynamicStructuredTool({
    name: 'get_wallet_info',
    description:
      'Fetches comprehensive wallet data including ETH balance, ERC-20 token holdings, NFTs, transaction history, and DeFi protocol usage. Use when the user asks to analyze a wallet address.',
    schema: z.object({
      address: z
        .string()
        .describe('Ethereum address (0x...) or ENS name (e.g. vitalik.eth)'),
    }),
    func: async ({ address }) => {
      try {
        const result = await getWalletInfo(address);
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        return JSON.stringify({ error: error.message });
      }
    },
  }),

  new DynamicStructuredTool({
    name: 'get_transaction',
    description:
      'Fetches detailed transaction data including value, token transfers, gas used, contract interactions, and protocol identification. Use when the user provides a transaction hash.',
    schema: z.object({
      txHash: z
        .string()
        .describe('Transaction hash (66 characters, starts with 0x)'),
    }),
    func: async ({ txHash }) => {
      try {
        const result = await getTransactionInfo(txHash);
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        return JSON.stringify({ error: error.message });
      }
    },
  }),

  new DynamicStructuredTool({
    name: 'get_token_info',
    description:
      'Analyzes an ERC-20 token for risks including holder concentration, mint functions, blacklist capability, liquidity lock status, and honeypot indicators. Use when the user asks about token safety.',
    schema: z.object({
      contractAddress: z.string().describe('ERC-20 token contract address'),
    }),
    func: async ({ contractAddress }) => {
      try {
        const result = await getTokenRisk(contractAddress);
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        return JSON.stringify({ error: error.message });
      }
    },
  }),

  new DynamicStructuredTool({
    name: 'get_contract_source',
    description:
      'Fetches the verified source code of a smart contract from Etherscan and provides a summary. Use when the user asks what a contract does.',
    schema: z.object({
      contractAddress: z.string().describe('Smart contract address'),
    }),
    func: async ({ contractAddress }) => {
      try {
        const result = await getContractSource(contractAddress);
        return JSON.stringify(
          {
            contractInfo: {
              name: result.contractInfo.name,
              isVerified: result.contractInfo.isVerified,
              compiler: result.contractInfo.compiler,
            },
            summaryContext: result.summaryContext,
          },
          null,
          2
        );
      } catch (error: any) {
        return JSON.stringify({ error: error.message });
      }
    },
  }),

  new DynamicStructuredTool({
    name: 'get_whale_activity',
    description:
      'Checks recent activity of known whale wallets including large transactions, swaps, and transfers. Use when the user asks about whale movements.',
    schema: z.object({
      address: z
        .string()
        .optional()
        .describe(
          'Optional: specific whale address to track. If omitted, checks all known whales.'
        ),
    }),
    func: async ({ address }) => {
      try {
        const result = await getWhaleActivity(address);
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        return JSON.stringify({ error: error.message });
      }
    },
  }),

  new DynamicStructuredTool({
    name: 'get_defi_yields',
    description:
      'Fetches current DeFi yield opportunities from DeFiLlama. Use when the user asks about earning yield, staking, or farming.',
    schema: z.object({
      token: z
        .string()
        .optional()
        .describe('Filter by token symbol (e.g. "ETH", "USDC")'),
      minApy: z.number().optional().describe('Minimum APY threshold'),
    }),
    func: async ({ token, minApy }) => {
      try {
        const result = await getDefiYields(token, minApy);
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        return JSON.stringify({ error: error.message });
      }
    },
  }),

  new DynamicStructuredTool({
    name: 'resolve_ens',
    description:
      'Resolves an ENS name (e.g. vitalik.eth) to an Ethereum address. Use when the user references an .eth name.',
    schema: z.object({
      name: z.string().describe('ENS name to resolve (e.g. vitalik.eth)'),
    }),
    func: async ({ name }) => {
      try {
        const result = await resolveEns(name);
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        return JSON.stringify({ error: error.message });
      }
    },
  }),

  new DynamicStructuredTool({
    name: 'send_eth',
    description:
      'Sends ETH to a specified address. This is a WRITE operation that costs real funds. NEVER call this without user confirmation. First present a transaction summary and wait for explicit "CONFIRM" from the user.',
    schema: z.object({
      to: z.string().describe('Receiver address or ENS name'),
      amount: z.string().describe('Amount in ETH (e.g. "0.5")'),
      confirmed: z
        .boolean()
        .describe(
          'MUST be true. Agent should ensure user confirmed before setting this.'
        ),
    }),
    func: async ({ to, amount, confirmed }) => {
      try {
        const result = await sendETH(to, amount, confirmed);
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        return JSON.stringify({ error: error.message });
      }
    },
  }),

  new DynamicStructuredTool({
    name: 'transfer_erc20',
    description:
      'Transfers ERC-20 tokens to a specified address. Write operation. NEVER call without user confirmation.',
    schema: z.object({
      tokenAddress: z.string().describe('ERC-20 contract address'),
      to: z.string().describe('Receiver address or ENS name'),
      amount: z.string().describe('Human-readable amount (e.g. "100.0")'),
      confirmed: z.boolean().describe('Must be true'),
    }),
    func: async ({ tokenAddress, to, amount, confirmed }) => {
      try {
        const result = await transferERC20(tokenAddress, to, amount, confirmed);
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        return JSON.stringify({ error: error.message });
      }
    },
  }),
];

// ── Agent Factory ──

/**
 * Create the LLM with bound tools (OpenAI function calling)
 */
function createToolCallingLLM() {
  const llm = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: 0.3,
    maxTokens: 2048,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Bind tools to the model for function calling
  return llm.bindTools(agentTools);
}

/**
 * Build a tool lookup map for fast access by name
 */
function getToolMap(): Map<string, DynamicStructuredTool> {
  const map = new Map<string, DynamicStructuredTool>();
  for (const tool of agentTools) {
    map.set(tool.name, tool);
  }
  return map;
}

/**
 * Run the agent loop: invoke LLM → execute tool calls → repeat until done
 * Implements the ReAct-style loop manually for full control.
 */
async function runAgentLoop(
  llmWithTools: ReturnType<typeof createToolCallingLLM>,
  messages: BaseMessage[],
  maxIterations: number = 5
): Promise<{ response: string; toolCalls: string[] }> {
  const toolMap = getToolMap();
  const toolCallNames: string[] = [];

  for (let i = 0; i < maxIterations; i++) {
    const aiMessage = await llmWithTools.invoke(messages);
    messages.push(aiMessage);

    // Check if the model wants to call tools
    const toolCalls = aiMessage.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      // No tool calls — model is done, return its text content
      const content =
        typeof aiMessage.content === 'string'
          ? aiMessage.content
          : JSON.stringify(aiMessage.content);
      return { response: content, toolCalls: toolCallNames };
    }

    // Execute each tool call
    for (const toolCall of toolCalls) {
      const tool = toolMap.get(toolCall.name);
      toolCallNames.push(toolCall.name);

      if (!tool) {
        // Unknown tool — send error back to model
        const { ToolMessage } = await import('@langchain/core/messages');
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id || '',
            content: JSON.stringify({ error: `Unknown tool: ${toolCall.name}` }),
          })
        );
        continue;
      }

      try {
        console.log(`[Agent] Calling tool: ${toolCall.name}`, toolCall.args);
        const toolResult = await tool.invoke(toolCall.args);
        const { ToolMessage } = await import('@langchain/core/messages');
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id || '',
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
          })
        );
      } catch (error: any) {
        console.error(`[Agent] Tool ${toolCall.name} failed:`, error.message);
        const { ToolMessage } = await import('@langchain/core/messages');
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id || '',
            content: JSON.stringify({ error: error.message }),
          })
        );
      }
    }
  }

  // If we hit max iterations, return whatever we have
  return {
    response:
      'I reached the maximum number of tool calls for this request. Here is what I found so far — please try again with a more specific question.',
    toolCalls: toolCallNames,
  };
}

// ── Message Handling ──

/**
 * Process a user message through the full agent pipeline
 *
 * Flow:
 * 1. Detect intent (lightweight LLM call)
 * 2. Validate parameters
 * 3. Load conversation history
 * 4. Build message array with system prompt + history + user message
 * 5. Run agent loop (LLM + tool calls)
 * 6. Save messages to database
 * 7. Return response
 */
export async function processMessage(
  message: string,
  conversationId?: string,
  walletAddress?: string
): Promise<{
  response: string;
  conversationId: string;
  intent: string;
  toolCalls: string[];
}> {
  // Step 1: Detect intent
  const intent = await detectIntent(message);
  console.log(`[Agent] Intent: ${intent.intent} (${intent.confidence})`);

  // Step 2: Validate parameters
  const validation = validateIntentParams(intent);
  if (!validation.valid) {
    return {
      response: `⚠️ ${validation.error}\n\nPlease provide a valid Ethereum address (0x...) or ENS name (.eth).`,
      conversationId: conversationId || '',
      intent: intent.intent,
      toolCalls: [],
    };
  }

  // Step 3: Get or create conversation
  let convId: string = conversationId || '';
  if (!convId) {
    try {
      const user = walletAddress
        ? await supabaseService.findOrCreateUser(walletAddress)
        : null;
      const conv = await supabaseService.createConversation(
        user?.id,
        message.slice(0, 50)
      );
      convId = conv.id;
    } catch (error) {
      console.error('[Agent] Failed to create conversation:', error);
      convId = `local-${Date.now()}`;
    }
  }

  // Step 4: Load chat history
  let chatHistory: BaseMessage[] = [];
  try {
    const recentMessages = await supabaseService.getRecentMessages(convId, 20);
    chatHistory = recentMessages.map((msg: any) =>
      msg.role === 'user'
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    );
  } catch {
    // No history available
  }

  // Step 5: Save user message
  try {
    await supabaseService.saveMessage(convId, 'user', message, {
      intent: intent.intent,
      params: intent.params,
      walletAddress,
    });
  } catch (error) {
    console.error('[Agent] Failed to save user message:', error);
  }

  // Step 6: Build message array and invoke agent
  const fullSystemPrompt = `${SYSTEM_PROMPT}\n\n${TOOL_INSTRUCTIONS}`;
  const messages: BaseMessage[] = [
    new SystemMessage(fullSystemPrompt),
    ...chatHistory,
    new HumanMessage(message),
  ];

  const llmWithTools = createToolCallingLLM();

  try {
    const { response, toolCalls } = await runAgentLoop(llmWithTools, messages, 5);

    // Step 7: Save assistant message
    try {
      await supabaseService.saveMessage(convId, 'assistant', response, {
        intent: intent.intent,
        toolCalls,
      });

      // Log individual tool calls
      for (const toolName of toolCalls) {
        try {
          await supabaseService.logToolCall(
            convId,
            null,
            toolName,
            {},
            null,
            'success'
          );
        } catch {
          // Non-critical
        }
      }
    } catch (error) {
      console.error('[Agent] Failed to save assistant message:', error);
    }

    return {
      response,
      conversationId: convId,
      intent: intent.intent,
      toolCalls,
    };
  } catch (error: any) {
    console.error('[Agent] Execution error:', error);

    const errorResponse = `I encountered an error while processing your request: ${error.message}\n\nPlease try again or rephrase your question.`;

    try {
      await supabaseService.saveMessage(convId, 'assistant', errorResponse, {
        error: error.message,
      });
    } catch {
      // Non-critical
    }

    return {
      response: errorResponse,
      conversationId: convId,
      intent: intent.intent,
      toolCalls: [],
    };
  }
}
