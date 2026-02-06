# VS Code MCP Extension Testing Strategy

## Summary
Due to limitations of Electron/VS Code integration testing in Docker/WSL2, we will use a hybrid approach:

- **Unit tests**: For pure logic, run in the dev container (no VS Code API or webview).
- **Manual/integration tests**: For VS Code API, webview, and UI features, use manual testing in the dev container.

## Rationale
- Electron/VS Code integration tests are unreliable in Docker/WSL2 due to X11, GPU, and native module issues.
- Unit tests remain valuable for core logic and can be run in any environment.
- Manual testing is required for UI/webview until a robust CI solution is in place.

## Next Steps
- Focus on unit tests for logic.
- Document manual test steps for UI features.
- Consider adding a GitHub Actions workflow for integration tests in the future.
