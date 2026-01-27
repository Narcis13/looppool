import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as baseModule from "./base.ts";
import { CopilotEngine } from "./copilot.ts";

describe("CopilotEngine", () => {
	let engine: CopilotEngine;
	const testWorkDir = join(tmpdir(), "copilot-test");
	const tempDir = join(tmpdir(), "ralphy-copilot");

	beforeEach(() => {
		engine = new CopilotEngine();
		mkdirSync(testWorkDir, { recursive: true });
	});

	afterEach(() => {
		if (existsSync(testWorkDir)) {
			rmSync(testWorkDir, { recursive: true, force: true });
		}
	});

	describe("Temporary File Handling", () => {
		it("should create temporary directory if it doesn't exist", async () => {
			if (existsSync(tempDir)) {
				rmSync(tempDir, { recursive: true, force: true });
			}

			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: "model-name 10 in, 5 out, 0 cached\nTask completed successfully",
				stderr: "",
				exitCode: 0,
			});

			await engine.execute("test prompt", testWorkDir);

			expect(existsSync(tempDir)).toBe(true);

			spy.mockRestore();
		});

		it("should create unique filenames for parallel execution", async () => {
			const capturedPaths: string[] = [];
			const spy = spyOn(baseModule, "execCommand").mockImplementation(
				async (_cmd: string, args: string[]) => {
					const pIndex = args.indexOf("-p");
					if (pIndex !== -1 && pIndex + 1 < args.length) {
						capturedPaths.push(args[pIndex + 1]);
					}
					return {
						stdout: "model-name 10 in, 5 out, 0 cached\nTask completed",
						stderr: "",
						exitCode: 0,
					};
				},
			);

			await Promise.all([
				engine.execute("prompt 1", testWorkDir),
				engine.execute("prompt 2", testWorkDir),
				engine.execute("prompt 3", testWorkDir),
			]);

			expect(capturedPaths.length).toBe(3);
			expect(new Set(capturedPaths).size).toBe(3);

			for (const path of capturedPaths) {
				expect(path).toMatch(
					/prompt-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.md/,
				);
			}

			spy.mockRestore();
		});

		it("should write prompt content correctly with UTF-8 encoding", async () => {
			const promptWithSpecialChars = "Test prompt with émojis 🎉 and spëcial chàracters 中文";
			let capturedFilePath = "";
			let fileContentDuringExec = "";

			const spy = spyOn(baseModule, "execCommand").mockImplementation(
				async (_cmd: string, args: string[]) => {
					const pIndex = args.indexOf("-p");
					if (pIndex !== -1 && pIndex + 1 < args.length) {
						capturedFilePath = args[pIndex + 1];
						// Read file content while it exists (before cleanup)
						if (existsSync(capturedFilePath)) {
							fileContentDuringExec = readFileSync(capturedFilePath, "utf-8");
						}
					}
					return {
						stdout: "model-name 10 in, 5 out, 0 cached\nCompleted",
						stderr: "",
						exitCode: 0,
					};
				},
			);

			await engine.execute(promptWithSpecialChars, testWorkDir);

			// File should be cleaned up after execution
			expect(existsSync(capturedFilePath)).toBe(false);
			// But we captured the content during execution
			expect(fileContentDuringExec).toBe(promptWithSpecialChars);

			spy.mockRestore();
		});

		it("should preserve markdown formatting including newlines and code blocks", async () => {
			const markdownPrompt = `# Test Prompt

## Section 1

Some **bold** and *italic* text.

\`\`\`typescript
function test() {
	return "code block";
}
\`\`\`

- List item 1
- List item 2

> Blockquote`;

			let capturedFilePath = "";
			let fileContentDuringExec = "";

			const spy = spyOn(baseModule, "execCommand").mockImplementation(
				async (_cmd: string, args: string[]) => {
					const pIndex = args.indexOf("-p");
					if (pIndex !== -1 && pIndex + 1 < args.length) {
						capturedFilePath = args[pIndex + 1];
						// Read file content while it exists (before cleanup)
						if (existsSync(capturedFilePath)) {
							fileContentDuringExec = readFileSync(capturedFilePath, "utf-8");
						}
					}
					return {
						stdout: "model-name 10 in, 5 out, 0 cached\nCompleted",
						stderr: "",
						exitCode: 0,
					};
				},
			);

			await engine.execute(markdownPrompt, testWorkDir);

			// File should be cleaned up after execution
			expect(existsSync(capturedFilePath)).toBe(false);
			// But we captured the formatting during execution
			expect(fileContentDuringExec).toBe(markdownPrompt);

			spy.mockRestore();
		});

		it("should clean up temporary file after execution", async () => {
			let capturedFilePath = "";

			const spy = spyOn(baseModule, "execCommand").mockImplementation(
				async (_cmd: string, args: string[]) => {
					const pIndex = args.indexOf("-p");
					if (pIndex !== -1 && pIndex + 1 < args.length) {
						capturedFilePath = args[pIndex + 1];
					}
					expect(existsSync(capturedFilePath)).toBe(true);
					return {
						stdout: "model-name 10 in, 5 out, 0 cached\nCompleted",
						stderr: "",
						exitCode: 0,
					};
				},
			);

			await engine.execute("test prompt", testWorkDir);

			expect(existsSync(capturedFilePath)).toBe(false);

			spy.mockRestore();
		});

		it("should clean up temporary file even when execution fails", async () => {
			let capturedFilePath = "";

			const spy = spyOn(baseModule, "execCommand").mockImplementation(
				async (_cmd: string, args: string[]) => {
					const pIndex = args.indexOf("-p");
					if (pIndex !== -1 && pIndex + 1 < args.length) {
						capturedFilePath = args[pIndex + 1];
					}
					return {
						stdout: "",
						stderr: "Error: Something went wrong",
						exitCode: 1,
					};
				},
			);

			const result = await engine.execute("test prompt", testWorkDir);

			expect(result.success).toBe(false);
			expect(existsSync(capturedFilePath)).toBe(false);

			spy.mockRestore();
		});

		it("should handle cleanup errors gracefully", async () => {
			let capturedFilePath = "";

			const spy = spyOn(baseModule, "execCommand").mockImplementation(
				async (_cmd: string, args: string[]) => {
					const pIndex = args.indexOf("-p");
					if (pIndex !== -1 && pIndex + 1 < args.length) {
						capturedFilePath = args[pIndex + 1];
						if (existsSync(capturedFilePath)) {
							rmSync(capturedFilePath);
						}
					}
					return {
						stdout: "model-name 10 in, 5 out, 0 cached\nCompleted",
						stderr: "",
						exitCode: 0,
					};
				},
			);

			const result = await engine.execute("test prompt", testWorkDir);
			expect(result.success).toBe(true);

			spy.mockRestore();
		});

		it("should handle race condition when temp directory already exists", async () => {
			// Ensure temp directory exists to simulate race condition
			mkdirSync(tempDir, { recursive: true });

			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: "model-name 10 in, 5 out, 0 cached\nTask completed",
				stderr: "",
				exitCode: 0,
			});

			// This should not throw even if directory creation races
			const result = await engine.execute("test prompt", testWorkDir);
			expect(result.success).toBe(true);

			spy.mockRestore();
		});
	});

	describe("Command Building", () => {
		it("should build command with --yolo flag", async () => {
			let capturedArgs: string[] = [];

			const spy = spyOn(baseModule, "execCommand").mockImplementation(
				async (_cmd: string, args: string[]) => {
					capturedArgs = args;
					return {
						stdout: "model-name 10 in, 5 out, 0 cached\nCompleted",
						stderr: "",
						exitCode: 0,
					};
				},
			);

			await engine.execute("test", testWorkDir);

			expect(capturedArgs).toContain("--yolo");

			spy.mockRestore();
		});

		it("should pass prompt file path with -p flag", async () => {
			let capturedArgs: string[] = [];

			const spy = spyOn(baseModule, "execCommand").mockImplementation(
				async (_cmd: string, args: string[]) => {
					capturedArgs = args;
					return {
						stdout: "model-name 10 in, 5 out, 0 cached\nCompleted",
						stderr: "",
						exitCode: 0,
					};
				},
			);

			await engine.execute("test", testWorkDir);

			const pIndex = capturedArgs.indexOf("-p");
			expect(pIndex).not.toBe(-1);
			expect(pIndex + 1).toBeLessThan(capturedArgs.length);
			expect(capturedArgs[pIndex + 1]).toMatch(/prompt-[0-9a-f-]+\.md$/);

			spy.mockRestore();
		});

		it("should include model override when specified", async () => {
			let capturedArgs: string[] = [];

			const spy = spyOn(baseModule, "execCommand").mockImplementation(
				async (_cmd: string, args: string[]) => {
					capturedArgs = args;
					return {
						stdout: "model-name 10 in, 5 out, 0 cached\nCompleted",
						stderr: "",
						exitCode: 0,
					};
				},
			);

			await engine.execute("test", testWorkDir, { modelOverride: "gpt-4" });

			expect(capturedArgs).toContain("--model");
			const modelIndex = capturedArgs.indexOf("--model");
			expect(capturedArgs[modelIndex + 1]).toBe("gpt-4");

			spy.mockRestore();
		});

		it("should include additional engine args when specified", async () => {
			let capturedArgs: string[] = [];

			const spy = spyOn(baseModule, "execCommand").mockImplementation(
				async (_cmd: string, args: string[]) => {
					capturedArgs = args;
					return {
						stdout: "model-name 10 in, 5 out, 0 cached\nCompleted",
						stderr: "",
						exitCode: 0,
					};
				},
			);

			await engine.execute("test", testWorkDir, { engineArgs: ["--verbose", "--debug"] });

			expect(capturedArgs).toContain("--verbose");
			expect(capturedArgs).toContain("--debug");

			spy.mockRestore();
		});
	});

	describe("Output Parsing", () => {
		it("should parse token counts correctly", async () => {
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: "model-name 1000 in, 500 out, 200 cached\nTask completed",
				stderr: "",
				exitCode: 0,
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.inputTokens).toBe(1000);
			expect(result.outputTokens).toBe(500);

			spy.mockRestore();
		});

		it("should parse token counts with k suffix", async () => {
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: "model-name 17.5k in, 2.3k out, 1k cached\nTask completed",
				stderr: "",
				exitCode: 0,
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.inputTokens).toBe(17500);
			expect(result.outputTokens).toBe(2300);

			spy.mockRestore();
		});

		it("should parse token counts with m suffix", async () => {
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: "model-name 1.5m in, 0.5m out, 0.1m cached\nTask completed",
				stderr: "",
				exitCode: 0,
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.inputTokens).toBe(1500000);
			expect(result.outputTokens).toBe(500000);

			spy.mockRestore();
		});

		it("should filter out CLI artifacts from response", async () => {
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: `? Select option
❯ Option 1
Thinking...
Working on it...
Actual response text here
Total usage: 1000 tokens
model-name 500 in, 300 out, 100 cached`,
				stderr: "",
				exitCode: 0,
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.response).toBe("Actual response text here");

			spy.mockRestore();
		});

		it("should return 'Task completed' when no meaningful response", async () => {
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: "model-name 100 in, 50 out, 0 cached\n",
				stderr: "",
				exitCode: 0,
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.response).toBe("Task completed");

			spy.mockRestore();
		});

		it("should not filter user content that mentions token formats", async () => {
			// This tests that the token count line filter is specific enough
			// to not accidentally filter valid response content about tokens
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: `Here's how token counting works:
The model uses 17.5k in tokens for context
You can see "500 in, 300 out" format in logs
gpt-4 1000 in, 500 out, 200 cached
Actual stats line filtered below:
model-name 100 in, 50 out, 25 cached`,
				stderr: "",
				exitCode: 0,
			});

			const result = await engine.execute("test", testWorkDir);

			// Lines mentioning tokens without the full stats format should be preserved
			expect(result.response).toContain("token counting works");
			expect(result.response).toContain("17.5k in tokens for context");
			expect(result.response).toContain('"500 in, 300 out" format');
			// The actual stats line should be filtered
			expect(result.response).not.toContain("100 in, 50 out, 25 cached");

			spy.mockRestore();
		});

		it("should filter token count stats lines with various model names", async () => {
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: `Response content here
gpt-4-turbo 17.5k in, 2.3k out, 1k cached
claude-3-opus 500 in, 300 out, 100 cached
o1-preview 1.5m in, 0.5m out, 0.1m cached`,
				stderr: "",
				exitCode: 0,
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.response).toBe("Response content here");
			expect(result.response).not.toContain("gpt-4-turbo");
			expect(result.response).not.toContain("claude-3-opus");
			expect(result.response).not.toContain("o1-preview");

			spy.mockRestore();
		});
	});

	describe("Error Handling", () => {
		it("should detect authentication errors", async () => {
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: "",
				stderr: "Error: No authentication found",
				exitCode: 1,
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.success).toBe(false);
			expect(result.error).toContain("not authenticated");
			expect(result.error).toContain("/login");

			spy.mockRestore();
		});

		it("should detect rate limit errors", async () => {
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: "Error: Rate limit exceeded",
				stderr: "",
				exitCode: 0,
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.success).toBe(false);
			expect(result.error).toContain("rate limit");

			spy.mockRestore();
		});

		it("should detect network errors", async () => {
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: "Network error: Connection refused",
				stderr: "",
				exitCode: 1,
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Network error");

			spy.mockRestore();
		});

		it("should handle generic errors", async () => {
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: "Error: Something went wrong",
				stderr: "",
				exitCode: 1,
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Something went wrong");

			spy.mockRestore();
		});

		it("should capture multi-line error messages", async () => {
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: `Error: Failed to process request
Details: The model encountered an issue
Stack trace: at line 42

Some other output after double newline`,
				stderr: "",
				exitCode: 1,
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.success).toBe(false);
			// Should capture all lines until double-newline
			expect(result.error).toContain("Failed to process request");
			expect(result.error).toContain("Details: The model encountered an issue");
			expect(result.error).toContain("Stack trace: at line 42");
			// Should not include content after double-newline
			expect(result.error).not.toContain("Some other output");

			spy.mockRestore();
		});

		it("should handle non-zero exit codes", async () => {
			const spy = spyOn(baseModule, "execCommand").mockResolvedValue({
				stdout: "Some output before failure",
				stderr: "",
				exitCode: 127,
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.success).toBe(false);
			expect(result.error).toContain("exit code 127");

			spy.mockRestore();
		});
	});

	describe("Success Cases", () => {
		it("should return success result with correct data", async () => {
			const spy = spyOn(baseModule, "execCommand").mockImplementation(async () => {
				// Add small delay to ensure durationMs > 0
				await new Promise((resolve) => setTimeout(resolve, 10));
				return {
					stdout: "Response text\nmodel-name 1000 in, 500 out, 0 cached",
					stderr: "",
					exitCode: 0,
				};
			});

			const result = await engine.execute("test", testWorkDir);

			expect(result.success).toBe(true);
			expect(result.response).toBe("Response text");
			expect(result.inputTokens).toBe(1000);
			expect(result.outputTokens).toBe(500);
			expect(result.cost).toBeDefined();
			expect(result.cost).toMatch(/duration:\d+/);

			spy.mockRestore();
		});

		it("should execute with correct working directory", async () => {
			let capturedWorkDir = "";

			const spy = spyOn(baseModule, "execCommand").mockImplementation(
				async (_cmd: string, _args: string[], workDir: string) => {
					capturedWorkDir = workDir;
					return {
						stdout: "model-name 100 in, 50 out, 0 cached\nCompleted",
						stderr: "",
						exitCode: 0,
					};
				},
			);

			await engine.execute("test", testWorkDir);

			expect(capturedWorkDir).toBe(testWorkDir);

			spy.mockRestore();
		});
	});
});
