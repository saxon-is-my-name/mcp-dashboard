FROM mcr.microsoft.com/devcontainers/typescript-node:4.0-22-bookworm
RUN apt-get update && apt-get install -y xvfb