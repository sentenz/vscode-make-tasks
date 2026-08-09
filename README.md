# VS Code Make Tasks

A native VS Code task explorer for documented Makefile targets.

- [1. Details](#1-details)
  - [1.1. Prerequisites](#11-prerequisites)
  - [1.2. Usage](#12-usage)
- [2. Features](#2-features)

## 1. Details

### 1.1. Prerequisites

- [Node.js](https://nodejs.org/en/download/)
  > Node.js (>=22) is required to build, test, and package the extension.

- [Visual Studio Code](https://code.visualstudio.com/download)
  > Visual Studio Code (>=1.125) is required to run the extension.

- VS Code [Extension Anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy)
  > Anatomy of a VS Code extension, including the structure of the extension folder and the purpose of each file.

- VS Code [Publisher Marketplace](https://marketplace.visualstudio.com/manage/publishers/sentenz)
  > The publisher page for the extension, including version history, download statistics, and links to the source repository.

### 1.2. Usage

1. Insights and Details

    - [Make Tasks Specification](docs/make-tasks-specification.md)
      > The Make Tasks Specification is the normative reference for annotation syntax and externally observable behavior.

2. Usage and Instructions

    - [Tasks](docs/make-tasks-specification.md#151-tasks)
      > The extension discovers documented Makefile tasks and presents them as VS Code tasks. Tasks are documented with a `##` description comment as single-line or inline annotations. The extension ignores undocumented targets, helper rules, pattern rules, variable assignments, and unsupported tasks names.

      ```make
      ## Single-line description for the build task
      build:
        go build ./...
      .PHONY: build
      ```

      ```make
      test: ## Inline description for the test task
        go test ./...
      .PHONY: test
      ```

    - [Categories](docs/make-tasks-specification.md#152-category)
      > Organize tasks with canonical section comments. The extension groups tasks by category in the Activity Bar explorer and places uncategorized tasks under **Uncategorized**.

      ```make
      # ─── Skills Manager ────────────────────────────────────────────────────

      skills-agent-add: ## Provision Agent Skills
        skills add ./skills

      skills-agent-update: ## Update Agent Skills
        skills update ./skills

      # --- Dependencies ------------------------------------------------------

      dependency-update: ## Update project dependencies
        renovate --platform=local

      # === Test ==============================================================

      test: ## Run the test suite
        go test ./...
      ```

## 2. Features

- Activity Bar
  > Dedicated Makefile icon in the Activity Bar.

- Explorer
  > Tree view grouped by workspace and Makefile when necessary.

  ```make
  ## Build the application
  build:
  	go build ./...
  .PHONY: build

  test: ## Run the test suite
  	go test ./...
  .PHONY: test
  ```

- Categorization
  > Optional target categories from canonical section comments.

  ```make
  # === Build ================================================================

  build: ## Build the application
  	go build ./...

  # === Test =================================================================

  test: ## Run the test suite
  	go test ./...
  ```

- Input metadata
  > Optional usage metadata for target input parameters.

  ```make
  # Usage: make deploy ENV=<name> [VERSION=<version>]
  #
  deploy: ## Deploy the application
  	./scripts/deploy --env "$(ENV)" --version "$(VERSION)"
  .PHONY: deploy
  ```

- Execution
  > Click or use the inline play button to execute a target as a VS Code task.

  ```make
  clean: ## Remove generated files
  	rm -rf dist
  .PHONY: clean
  ```

- Invocation
  > Run targets with positional arguments or Make variable assignments.

  ```make
  # Example: make build test MODE=release
  build: ## Build the application
  	go build -tags "$(MODE)" ./...

  test: ## Run the test suite
  	go test ./...
  ```

- Quick-pick
  > Quick-pick command for keyboard-driven execution.

- Navigation
  > Go directly to a target definition.

- Workspace
  > Multi-root workspace and multiple-Makefile support.

  ```make
  # Makefile
  build: ## Build the application
  	go build ./...

  # services/api/Makefile
  build: ## Build the API
  	go build ./cmd/api
  ```

- Auto-refresh
  > Automatic refresh after matching Makefile changes when `makefileTasks.autoRefresh` is enabled.

- Configuration
  > Configurable Make command, discovery globs, exclusions, sorting, click behavior, and automatic refresh.
