/**
 * AI Tool Calling System
 * Provides Zod-based tool definitions similar to Vercel AI SDK
 * Enables AI to automatically call tools for trip planning
 */

import { z, ZodType } from 'zod';

/**
 * Tool definition with Zod schema for type-safe parameters
 */
export interface AITool<TParams extends ZodType = ZodType, TResult = unknown> {
  name: string;
  description: string;
  parameters: TParams;
  execute: (params: z.infer<TParams>) => Promise<TResult>;
}

/**
 * Tool call result from AI
 */
export interface ToolCallResult {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
  error?: string;
}

/**
 * Tool execution context
 */
export interface ToolContext {
  userId?: string;
  tripId?: string;
  sessionId?: string;
}

/**
 * Create a type-safe tool definition
 */
export function tool<TParams extends ZodType, TResult>(config: {
  description: string;
  parameters: TParams;
  execute: (params: z.infer<TParams>, context?: ToolContext) => Promise<TResult>;
}): AITool<TParams, TResult> {
  return {
    name: '', // Will be set when registered
    description: config.description,
    parameters: config.parameters,
    execute: config.execute as (params: z.infer<TParams>) => Promise<TResult>,
  };
}

/**
 * Tool registry for managing available tools
 */
export class ToolRegistry {
  private tools: Map<string, AITool> = new Map();
  private context: ToolContext = {};

  /**
   * Register a tool with a name
   */
  register<T extends AITool>(name: string, tool: T): void {
    this.tools.set(name, { ...tool, name });
  }

  /**
   * Register multiple tools
   */
  registerAll(tools: Record<string, AITool>): void {
    for (const [name, tool] of Object.entries(tools)) {
      this.register(name, tool);
    }
  }

  /**
   * Set execution context
   */
  setContext(context: ToolContext): void {
    this.context = context;
  }

  /**
   * Get tool by name
   */
  get(name: string): AITool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools
   */
  getAll(): AITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool by name with given arguments
   */
  async execute(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        toolName: name,
        args,
        result: null,
        error: `Tool "${name}" not found`,
      };
    }

    try {
      // Validate parameters with Zod
      const validatedArgs = tool.parameters.parse(args);
      const result = await tool.execute(validatedArgs);
      return {
        toolName: name,
        args: validatedArgs,
        result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        toolName: name,
        args,
        result: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Convert tools to OpenAI function format
   */
  toOpenAIFunctions(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return this.getAll().map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.parameters),
      },
    }));
  }

  /**
   * Convert tools to Gemini function format
   */
  toGeminiFunctions(): Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> {
    return this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.parameters),
    }));
  }
}

/**
 * Convert Zod schema to JSON Schema (simplified)
 */
function zodToJsonSchema(schema: ZodType): Record<string, unknown> {
  const description = schema.description;

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as ZodType);
      if (!(value as ZodType).isOptional()) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      ...(description && { description }),
    };
  }

  if (schema instanceof z.ZodString) {
    return { type: 'string', ...(description && { description }) };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: 'number', ...(description && { description }) };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean', ...(description && { description }) };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema.element),
      ...(description && { description }),
    };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema.options,
      ...(description && { description }),
    };
  }

  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap());
  }

  if (schema instanceof z.ZodDefault) {
    return zodToJsonSchema(schema.removeDefault());
  }

  if (schema instanceof z.ZodNullable) {
    const inner = zodToJsonSchema(schema.unwrap());
    return { ...inner, nullable: true };
  }

  // Default fallback
  return { type: 'string', ...(description && { description }) };
}

/**
 * Create a default tool registry
 */
export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}
