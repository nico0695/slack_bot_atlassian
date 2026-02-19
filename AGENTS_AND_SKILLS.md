# AI Agents and Skills for Advanced Models (Claude, Gemini 3 Pro)

This document outlines a framework for creating and using AI agents and skills within the project. It's designed to be used as a reference when interacting with advanced AI models like Claude or the next generation of models such as a hypothetical "Gemini 3 Pro".

## 1. Core Concepts

### What is a Skill?

A **Skill** is a single, atomic, and reusable function that the AI can execute to perform a specific action. Skills are the building blocks of more complex operations. Each skill should have a clear purpose, a defined set of inputs, and a predictable output.

**Characteristics of a Skill:**

-   **Atomic:** Performs one specific task (e.g., `read_file`, `run_test`).
-   **Reusable:** Can be used by multiple agents in different contexts.
-   **Well-defined:** Has a clear name, description, parameters, and return value.

### What is an Agent?

An **Agent** is a higher-level component that orchestrates the use of one or more skills to accomplish a complex task. An agent is responsible for planning the steps, executing the necessary skills, and responding to the user.

**Characteristics of an Agent:**

-   **Task-oriented:** Designed to solve a specific problem (e.g., create a pull request, fix a bug).
-   **Orchestrator:** Chains together multiple skills to achieve its goal.
-   **Stateful:** Can maintain a state across multiple steps if necessary.

## 2. Skill Catalog

Here is a proposed catalog of skills, categorized by domain.

### Git & Version Control

-   **`git_create_branch(branch_name: string)`**: Creates a new Git branch.
-   **`git_commit(message: string)`**: Commits the staged changes with a given message.
-   **`git_push(branch_name: string)`**: Pushes the current branch to the remote repository.
-   **`git_create_pull_request(title: string, body: string, base_branch: string)`**: Creates a new pull request.
-   **`git_get_diff()`**: Gets the diff of the current changes.

### File System

-   **`fs_read_file(file_path: string)`**: Reads the content of a file.
-   **`fs_write_file(file_path: string, content: string)`**: Writes content to a file.
-   **`fs_list_files(directory_path: string)`**: Lists all files in a directory.

### Code & Analysis

-   **`code_lint()`**: Runs the linter on the codebase.
-   **`code_run_tests(file_path?: string)`**: Runs the test suite. Can be limited to a specific file.
-   **`code_refactor(file_path: string, refactor_instruction: string)`**: Applies a refactoring to a specific file.

### Documentation

-   **`docs_update_readme(content: string)`**: Appends content to the `README.md` file.
-   **`docs_generate_api_docs()`**: Triggers the API documentation generation process.

## 3. Agent Definitions

Here are some example agents that can be created using the skills defined above.

### 1. PR Agent

-   **Responsibility:** Automates the process of creating a pull request.
-   **Skills Used:**
    -   `git_create_branch`
    -   `git_commit`
    -   `git_push`
    -   `git_create_pull_request`
    -   `git_get_diff`

### 2. Documentation Agent

-   **Responsibility:** Updates the documentation based on code changes.
-   **Skills Used:**
    -   `git_get_diff`
    -   `fs_read_file`
    -   `docs_update_readme`
    -   `code_lint`

### 3. Bug Squasher Agent

-   **Responsibility:** Identifies and fixes bugs in the code.
-   **Skills Used:**
    -   `fs_read_file`
    -   `code_run_tests`
    -   `fs_write_file`
    -   `code_refactor`

## 4. Implementation Guide

### How to Implement a New Skill

1.  **Create the skill file:**
    Create a new file in the `src/modules/ai/skills/{category}/` directory. For example, `src/modules/ai/skills/git/get_commit_history.ts`.

2.  **Write the skill function:**

    ```typescript
    // src/modules/ai/skills/git/get_commit_history.ts
    import { exec } from 'child_process';
    import { promisify } from 'util';

    const execAsync = promisify(exec);

    export async function get_commit_history(limit: number = 10): Promise<string> {
      try {
        const { stdout } = await execAsync(`git log --oneline -n ${limit}`);
        return stdout;
      } catch (error) {
        console.error('Error getting commit history:', error);
        return `Error: ${error.message}`;
      }
    }
    ```

3.  **Register the skill:**
    You'll need a central place to register and expose your skills to the agents. This could be a `SkillRegistry` class.

### How to Implement a New Agent

1.  **Create the agent file:**
    Create a new file in `src/modules/ai/agents/`. For example, `src/modules/ai/agents/CodeReviewAgent.ts`.

2.  **Define the agent's logic:**
    The agent will receive a prompt and use the `SkillRegistry` to execute the necessary skills.

    ```typescript
    // src/modules/ai/agents/CodeReviewAgent.ts
    import { SkillRegistry } from '../skills/SkillRegistry';

    export class CodeReviewAgent {
      private skillRegistry: SkillRegistry;

      constructor() {
        this.skillRegistry = new SkillRegistry();
      }

      async reviewCode(prompt: string): Promise<string> {
        // 1. Understand the user's request from the prompt.
        // 2. Plan the steps and select the skills to use.
        
        const diff = await this.skillRegistry.execute('git_get_diff');
        
        // 3. Prepare a prompt for the AI model with the diff and the review request.
        const reviewPrompt = `
          Please review the following code changes and provide feedback.
          ${diff}
        `;

        // 4. Call the AI model (e.g., Claude, Gemini 3 Pro) to get the review.
        const review = await callAIModel(reviewPrompt); // Fictional function

        return review;
      }
    }
    ```

## 5. Using Agents with Different AI Models

To use these agents and skills with an AI model like Claude, you need to provide them as part of the context in your prompt. The AI will then use this information to decide which skills to call.

### Prompt Structure for Claude

When interacting with Claude, you can provide the available tools (skills) in the system prompt or as part of the user prompt. Here is a suggested structure:

```xml
<system_prompt>
You are an expert software developer assistant. You have access to a set of tools (skills) to help you with your tasks. When you need to use a tool, enclose the tool call in <tool_code></tool_code> XML tags.

Here are the available tools:

<tools>
  <tool>
    <name>git_get_diff</name>
    <description>Gets the diff of the current changes.</description>
    <parameters></parameters>
  </tool>
  <tool>
    <name>fs_read_file</name>
    <description>Reads the content of a file.</description>
    <parameters>
      <parameter>
        <name>file_path</name>
        <type>string</type>
        <description>The path to the file to read.</description>
      </parameter>
    </parameters>
  </tool>
  ... more tools
</tools>
</system_prompt>

<user_prompt>
Please review the changes in the `src/app.ts` file and suggest improvements.
</user_prompt>
```

### Adapting for "Gemini 3 Pro" or Other Models

For a hypothetical "Gemini 3 Pro" or other advanced models, the prompt structure might be different (e.g., using JSON for tool definitions). The key is to provide a clear and structured definition of the available skills.

**Example (JSON format):**

```json
{
  "system_prompt": "You are a helpful assistant with access to the following tools.",
  "tools": [
    {
      "name": "git_get_diff",
      "description": "Gets the diff of the current changes.",
      "parameters": {}
    },
    {
      "name": "fs_read_file",
      "description": "Reads the content of a file.",
      "parameters": {
        "type": "object",
        "properties": {
          "file_path": {
            "type": "string",
            "description": "The path to the file to read."
          }
        },
        "required": ["file_path"]
      }
    }
  ],
  "user_prompt": "Please review the changes in the `src/app.ts` file and suggest improvements."
}
```

By defining a clear framework for agents and skills, you can significantly enhance the capabilities of your AI-powered Slack bot and seamlessly integrate with powerful models like Claude.
