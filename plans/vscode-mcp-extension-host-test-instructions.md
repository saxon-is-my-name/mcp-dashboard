# VS Code MCP Extension: Host-Based Test Instructions

## Why
Automated integration/UI tests cannot reliably run in the dev container due to Electron/VS Code and X11 limitations. To ensure quality, run integration tests on your host OS (Linux, macOS, or Windows) or a full-featured VM.

## How to Run Integration/UI Tests Outside the Container

1. **Clone the repository to your host machine** (outside Docker/WSL2).
2. **Install Node.js (v18+) and npm** if not already installed.
3. **Install dependencies:**
   npm install
4. **Run the tests:**
   npm test
   - This will use your host's graphical environment, allowing Electron/VS Code to run integration and UI tests.
5. **Share the test results** (output or logs) with the AI assistant for analysis and next steps.

## Notes
- You can still run unit tests for pure logic inside the dev container.
- For full automation, consider setting up GitHub Actions or another CI/CD service with a supported environment.

## Next Steps
- Use this workflow for all integration/UI test runs until a robust in-container solution is available.
- Document any manual test steps or issues encountered for future automation improvements.
