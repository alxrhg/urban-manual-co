import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, END, START } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { AI_CONFIG, getLLM } from '../config.js';

export interface AgentState {
  messages: BaseMessage[];
  context: Record<string, any>;
  output: string;
  error?: string;
  iterations: number;
}

export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  temperature?: number;
  maxIterations?: number;
}

export class BaseAgent {
  protected llm: ChatAnthropic | ChatOpenAI;
  protected config: AgentConfig;
  protected graph: StateGraph<AgentState>;

  constructor(config: AgentConfig) {
    this.config = config;
    this.llm = this.initializeLLM();
    this.graph = this.buildGraph();
  }

  private initializeLLM() {
    const llmConfig = getLLM();

    if (llmConfig.provider === 'anthropic') {
      console.log(`🤖 Using Claude ${llmConfig.model} (Most admired LLM 2025! 🏆)`);
      return new ChatAnthropic({
        anthropicApiKey: llmConfig.apiKey,
        modelName: llmConfig.model,
        temperature: this.config.temperature ?? AI_CONFIG.agent.temperature,
      });
    } else {
      console.log(`🤖 Using OpenAI ${llmConfig.model}`);
      return new ChatOpenAI({
        openAIApiKey: llmConfig.apiKey,
        modelName: llmConfig.model,
        temperature: this.config.temperature ?? AI_CONFIG.agent.temperature,
      });
    }
  }

  protected buildGraph(): StateGraph<AgentState> {
    const workflow = new StateGraph<AgentState>({
      channels: {
        messages: {
          value: (left: BaseMessage[], right: BaseMessage[]) => left.concat(right),
          default: () => [],
        },
        context: {
          value: (left: Record<string, any>, right: Record<string, any>) => ({
            ...left,
            ...right,
          }),
          default: () => ({}),
        },
        output: {
          value: (_: string, right: string) => right,
          default: () => '',
        },
        error: {
          value: (_: string | undefined, right: string | undefined) => right,
          default: () => undefined,
        },
        iterations: {
          value: (left: number, right: number) => left + right,
          default: () => 0,
        },
      },
    });

    // Add nodes
    workflow.addNode('process', this.processNode.bind(this));
    workflow.addNode('finalize', this.finalizeNode.bind(this));

    // Add edges
    workflow.addEdge(START, 'process');
    workflow.addConditionalEdges('process', this.shouldContinue.bind(this), {
      continue: 'process',
      finalize: 'finalize',
    });
    workflow.addEdge('finalize', END);

    return workflow;
  }

  protected async processNode(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Add system message if first iteration
      if (state.iterations === 0) {
        state.messages.unshift(new HumanMessage(this.config.systemPrompt));
      }

      const response = await this.llm.invoke(state.messages);
      const aiMessage = new AIMessage(response.content as string);

      return {
        messages: [aiMessage],
        iterations: 1,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        iterations: 1,
      };
    }
  }

  protected async finalizeNode(state: AgentState): Promise<Partial<AgentState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const output = lastMessage ? lastMessage.content.toString() : '';

    return {
      output,
    };
  }

  protected shouldContinue(state: AgentState): 'continue' | 'finalize' {
    const maxIterations = this.config.maxIterations ?? AI_CONFIG.agent.maxIterations;

    if (state.error) {
      return 'finalize';
    }

    if (state.iterations >= maxIterations) {
      return 'finalize';
    }

    // Override in subclasses for custom logic
    return 'finalize';
  }

  async execute(input: string, context?: Record<string, any>): Promise<string> {
    const initialState: AgentState = {
      messages: [new HumanMessage(input)],
      context: context ?? {},
      output: '',
      iterations: 0,
    };

    const compiledGraph = this.graph.compile();
    const result = await compiledGraph.invoke(initialState);

    if (result.error) {
      throw new Error(`Agent execution failed: ${result.error}`);
    }

    return result.output;
  }
}
