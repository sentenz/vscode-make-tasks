# VS Code Make Tasks

A native VS Code task explorer for documented Makefile targets.

- [1. Details](#1-details)
  - [1.1. Prerequisites](#11-prerequisites)
  - [1.2. Usage](#12-usage)
- [2. Contribution](#2-contribution)

## 1. Details

### 1.1. Prerequisites

- [Visual Studio Code](https://code.visualstudio.com/download)
  > Visual Studio Code (>=1.125) is required to run the extension.

### 1.2. Usage

1. Insights and Details

    - [Make Tasks Specification](docs/make-tasks-specification.md)
      > The Make Tasks Specification is the normative reference for annotation syntax and externally observable behavior.

    - Activity Bar
      > Dedicated Makefile icon in the Activity Bar.

    - Execution
      > Click or use the inline play button to execute a target as a VS Code task.

    - Quick-pick
      > Quick-pick command for keyboard-driven execution.

    - Navigation
      > Go directly to a target definition.

    - Workspace
      > Multi-root workspace and multiple-Makefile support.

    - Auto-refresh
      > Automatic refresh after matching Makefile changes when `makefileTasks.autoRefresh` is enabled.

    - Configuration
      > Configurable Make command, discovery globs, exclusions, sorting, click behavior, and automatic refresh.

2. Usage and Instructions

    - [Tasks](docs/make-tasks-specification.md#151-tasks)
      > The extension discovers documented Makefile targets and presents them as VS Code tasks. Targets are documented with a `##` description comment as preceding or inline annotations. The extension ignores undocumented targets, helper rules, pattern rules, variable assignments, and unsupported target names.

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

    - [Categorization](docs/make-tasks-specification.md#152-category)
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

    - [Input Metadata](docs/make-tasks-specification.md#153-inputs)
      > Add optional usage metadata for positional arguments or Make variable assignments accepted by a target.

      ```make
      # Usage: make deploy ENV=<name> [VERSION=<version>]
      #
      deploy: ## Deploy the application
      	./scripts/deploy --env "$(ENV)" --version "$(VERSION)"
      .PHONY: deploy
      ```

    - Explorer
      > Documented targets are grouped by workspace and Makefile when necessary.

      ```make
      ## Run the test suite
      test:
      	go test ./...
      .PHONY: test

      ## Build the application
      build: test
      	go build ./...
      .PHONY: build
      ```

    - Invocation
      > Run targets with positional arguments or Make variable assignments.

      ```make
      # Usage: make build [MODE=<mode>]
      #
      build: ## Build the application
      	go build -tags "$(MODE)" ./...
      .PHONY: build
      ```

## 2. Contribution

1. Insights and Details

    - [Node.js](https://nodejs.org/en/download/)
      > Node.js (>=22) is required to build, test, and package the extension.

    - VS Code [Extension Anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy)
      > Anatomy of a VS Code extension, including the structure of the extension folder and the purpose of each file.

    - VS Code [Publisher Marketplace](https://marketplace.visualstudio.com/manage/publishers/sentenz)
      > The publisher page for the extension, including version history, download statistics, and links to the source repository.

2. Usage and Instructions

    - Tasks
      > The repository Makefile provides documented targets for installing dependencies, validating changes, building, packaging, and installing the extension.

      ```make
      ## Install the VS Code extension development dependencies
      vscode-extension-dependencies:
      	cd "$(VSCODE_EXTENSION_DIR_ABS)" && $(NPM) ci
      .PHONY: vscode-extension-dependencies

      ## Validate, test, and build the VS Code extension
      vscode-extension-build: vscode-extension-dependencies
      	cd "$(VSCODE_EXTENSION_DIR_ABS)" && $(NPM) run check
      	cd "$(VSCODE_EXTENSION_DIR_ABS)" && $(NPM) run build
      .PHONY: vscode-extension-build

      ## Build and package the VS Code extension as a VSIX archive
      vscode-extension-package: vscode-extension-dependencies
      	cd "$(VSCODE_EXTENSION_DIR_ABS)" && $(VSCE) package --no-dependencies
      .PHONY: vscode-extension-package
      ```
