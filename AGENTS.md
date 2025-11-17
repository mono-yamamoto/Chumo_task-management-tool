# AGENTS.md

This file contains guidelines for AI coding agents working on this project.

## ⚠️ IMPORTANT: Rule Check Before Execution

**Before executing any user prompt, AI agents MUST check the following rule files:**

1. **`.cursor/rules/` directory** - Check all rule files in this directory, especially:
   - `.cursor/rules/mcp-tools-rule.mdc` - MCP tools usage rules
   - `.cursor/rules/implementation-testing-rule.mdc` - Implementation testing rules
   - Any other rule files with `alwaysApply: true`

2. **This file (AGENTS.md)** - Contains project-wide guidelines, setup instructions, and development rules

**Priority order:**
- `.cursor/rules/` files take precedence (they are integrated into Cursor's rule system with `alwaysApply: true`)
- `AGENTS.md` provides additional context and setup instructions

**Why this matters:**
- `.cursor/rules/` contains detailed, project-specific rules that must be followed
- These rules may be updated more frequently than `AGENTS.md`
- Following these rules ensures consistent code quality and development practices

**Action required:**
Before starting any task, read the relevant rule files to understand:
- Which tools to use (Serena MCP, Chrome DevTools MCP, standard tools)
- How to structure code modifications
- Testing and verification requirements
- Project-specific conventions

**⚠️ MANDATORY: Report Rule Check and Change Type**

**After checking the rules, AI agents MUST report the following at the very beginning of their response:**

1. **Rule check confirmation**: Explicitly state that you have checked the relevant rule files
   - Example: "✅ ルールを確認しました: `.cursor/rules/mcp-tools-rule.mdc`、`.cursor/rules/implementation-testing-rule.mdc`、`AGENTS.md`を確認済み"

2. **Change type declaration**: Declare what type of change you will be implementing
   - **⚠️ IMPORTANT**: You MUST check `.cursor/rules/main.mdc` クイックリファレンス section to see the available change types
   - Do NOT list change types here - you must read them from `.cursor/rules/main.mdc`
   - Report the change type exactly as defined in the クイックリファレンス table
   - Include the Phase numbers and estimated time from the table
   - Example: "実装タイプ: **新機能追加** (Phase 1-11) - 区分ラベルの共通化機能を追加"

**Why this is required:**
- Allows the user to verify that rules were actually checked before implementation
- Provides clear context about the type of work being performed
- Helps track the nature of changes for commit messages and documentation
- Ensures consistent communication and transparency

**Example response format:**
```
✅ ルールを確認しました: `.cursor/rules/main.mdc`、`.cursor/rules/mcp-tools-rule.mdc`、`.cursor/rules/implementation-testing-rule.mdc`、`AGENTS.md`を確認済み

実装タイプ: **新機能追加** (Phase 1-11) - 区分ラベルの共通化機能を追加

[実装内容の説明...]
```

## ExecPlan Usage

When implementing complex features or performing significant refactoring, create an ExecPlan (execution plan).

**When to use ExecPlan**:
- Feature additions spanning multiple files
- Architecture changes or major refactoring
- Multi-step feature implementations
- External library integrations or API integrations
- Database schema changes or migrations

Refer to `.agent/PLANS.md` for ExecPlan creation methods and format. ExecPlans provide consistent guidance from design to implementation, enabling accurate implementation even for multi-hour tasks.

## Setup commands

### Development Environment Setup

**Prerequisites**: Infrastructure such as Firebase, GCP, and Cloud Functions are already configured by administrators. Developers only need to set up their local development environment to start development.

#### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install Functions dependencies
cd functions && npm install && cd ..
```

#### 2. Environment Variables Configuration

**⚠️ IMPORTANT: This step requires manual user action. Inform the user in Japanese.**

If the `.env.local` file does not exist, create it in the project root.

**Tell the user in Japanese**: 既存の開発者から環境変数の値を取得するか、管理者に依頼してください。

Required environment variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=chumo-3506a.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=chumo-3506a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=chumo-3506a.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FUNCTIONS_URL=https://asia-northeast1-chumo-3506a.cloudfunctions.net
```

#### 3. Firebase CLI Configuration (First Time Only)

```bash
# If Firebase CLI is not installed
npm install -g firebase-tools

# Login to Firebase (first time only)
firebase login

# Select project (first time only)
firebase use --add
# Select project ID "chumo-3506a" in the prompt
```

#### 4. Git Hooks Setup (Security Check)

**⚠️ IMPORTANT: This step prevents accidental commit of secrets. Inform the user in Japanese.**

Set up Git hooks to automatically check for secrets before committing.

**Tell the user in Japanese**: 機密情報の誤コミットを防ぐため、Git Hookを設定してください。

**Install gitleaks**:

```bash
# macOS
brew install gitleaks

# Windows
# Download from https://github.com/gitleaks/gitleaks/releases
# Add to PATH and verify with: gitleaks version
```

**Set up pre-commit hook**:

```bash
# Copy the hook to .git/hooks
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Tell the user in Japanese**: これで、コミット前に自動的に機密情報がチェックされます。機密情報が含まれている場合はコミットがブロックされます。

#### 5. Start Development Server

```bash
npm run dev
```

**Tell the user in Japanese**: ブラウザで `http://localhost:3000` にアクセスしてください。

#### 6. Cursor Users: Commit Command

**For Cursor users**: After setup is complete, the `/commit` command is available for committing changes.

This command automatically groups changes by relevance and splits each group into separate commits. See the "Commit Rules" section for details.

**Tell the user in Japanese**: セットアップ完了後、変更をコミットする際は `/commit` コマンドが利用可能です。このコマンドは、変更を関連ごとに自動的にグルーピングし、各グループを1コミットに分割して即時コミットします。詳細は「コミットルール」セクションを参照してください。

## Recommended Tools

### MCP Tools Setup (Recommended)

To improve development efficiency, we recommend setting up the following MCP tools:

#### Serena MCP

An MCP tool for efficient code reading and editing.

**Setup**:
- If using Cursor: Already configured in the project
- For other agents: Refer to [Serena MCP](https://github.com/oraios/serena) documentation for setup

**Main features**:
- Symbol-based code search and editing
- Accurate function, class, and method modifications
- Code refactoring support

#### Chrome DevTools MCP

An MCP tool for efficient browser-based verification.

**Setup**:
- If using Cursor: Already configured in the project
- For other agents: Refer to [Chrome DevTools MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/chrome-devtools) documentation for setup

**Main features**:
- Page snapshot capture
- Console error checking
- Network request verification
- UI behavior verification

## Code style

- **TypeScript**: strict mode enabled
- **Formatter**: Use `oxfmt`
- **Linter**: Use `next lint`
- **Naming conventions**:
  - Components: PascalCase
  - Functions and variables: camelCase
  - Constants: UPPER_SNAKE_CASE

### Code Formatting

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

### Lint

```bash
npm run lint
```

## Development Rules

### MCP Tools Usage Rules

#### Serena MCP Usage

**Principle for code modifications**: If Serena MCP is available, always use Serena MCP tools for code modifications.

- **Code reading**: Use `mcp_serena_read_file`, `mcp_serena_find_symbol`, `mcp_serena_get_symbols_overview`, etc.
- **Code editing**: Use `mcp_serena_replace_symbol_body`, `mcp_serena_replace_regex`, `mcp_serena_insert_after_symbol`, `mcp_serena_insert_before_symbol`, etc.
- **Symbol search**: Use `mcp_serena_find_symbol`, `mcp_serena_find_referencing_symbols`
- **Pattern search**: Use `mcp_serena_search_for_pattern`

**When to use**:
- File reading and editing
- Function, class, and method modifications
- Symbol search and reference verification
- Code refactoring
- Bug fixes

**When to use standard tools instead**:
Use standard tools only when Serena MCP is unavailable or for the following cases:
- File creation and deletion (`write`, `delete_file`)
- Directory listing (`list_dir`)
- Terminal command execution (`run_terminal_cmd`)
- Linter error checking (`read_lints`)

#### Chrome DevTools MCP Usage

**Local server verification**: When a local server is running or a local server URL (e.g., `http://localhost:3000`) is shared, use Chrome DevTools MCP to verify the page.

**When to use**:
- Page display verification
- UI behavior verification
- Console error checking
- Network request verification
- Performance verification
- Element state verification

**Basic workflow**:
1. **Navigate to page**: Use `mcp_chrome-devtools_navigate_page` to navigate to the URL
2. **Take snapshot**: Use `mcp_chrome-devtools_take_snapshot` to verify page state
3. **Interact**: Perform clicks, input, etc. as needed
4. **Verify**: Check console messages and network requests
5. **Screenshot**: Use `mcp_chrome-devtools_take_screenshot` to capture screenshots as needed

**Verification checklist**:
- Is the page displayed correctly?
- Are there any error messages?
- Are there console errors? (Use `mcp_chrome-devtools_list_console_messages`)
- Are network requests completing successfully? (Use `mcp_chrome-devtools_list_network_requests`)
- Is UI behavior as expected?

**URL detection**:
Use Chrome DevTools MCP when the following information is provided:
- URLs in the format `http://localhost:*`
- Local server URLs like `localhost:3000`
- When the user explicitly states "local server is running"
- When the user requests "check the page"

**Priority**:
1. **Serena MCP**: Always prioritize for code modifications and reading
2. **Chrome DevTools MCP**: When local server verification is needed
3. **Standard tools**: Only when the above MCP tools are unavailable

**Notes**:
- Serena MCP and Chrome DevTools MCP can be used together
- After code modifications, verify behavior with Chrome DevTools MCP
- If MCP tools are unavailable, use standard tools

### Implementation Testing Rules

**After implementing or modifying code, always perform implementation testing following the steps below and confirm there are no issues before marking the modification as complete.**

#### Required Verification Items

1. **Browser Behavior Verification**
   - When a local server is running or a local server URL (e.g., `http://localhost:3000`) is shared, use Chrome DevTools MCP to verify the page
   - Verify that implemented features work correctly
   - Verify that UI is displayed as expected
   - Verify that user interactions (clicks, input, etc.) work normally

2. **Console Error Verification**
   - Use Chrome DevTools MCP's `mcp_chrome-devtools_list_console_messages` to check for console errors
   - If error messages are displayed, identify the cause and fix
   - Address warning messages as needed

3. **Network Request Verification**
   - As needed, use `mcp_chrome-devtools_list_network_requests` to verify API requests complete successfully
   - Check for error responses

4. **Page Snapshot Verification**
   - Use `mcp_chrome-devtools_take_snapshot` to verify page state is as expected
   - Verify elements are displayed correctly

#### Implementation Testing Workflow

1. **After Code Modification**
   - After code modification is complete, first check for linter errors (`read_lints`)

2. **Browser Verification**
   - When a local server is running or a URL is shared:
     - Use `mcp_chrome-devtools_navigate_page` to navigate to the page (or reload)
     - Use `mcp_chrome-devtools_wait_for` to wait for required elements to load
     - Use `mcp_chrome-devtools_take_snapshot` to verify page state
     - Actually interact with implemented features to verify behavior
     - Use `mcp_chrome-devtools_list_console_messages` to check for errors

3. **Issue Fixing**
   - If errors or issues are found, identify the cause and fix
   - After fixing, repeat browser verification

4. **Completion Determination**
   - Mark as complete only when all required verification items pass
   - Do not mark as complete if errors remain

#### Notes

- If a local server is not running or a URL is not shared, implementation testing may be skipped
- However, we recommend performing implementation testing whenever possible
- If issues are found during implementation testing, always fix them before completion

## Testing instructions

Currently, no test suite is implemented. When adding features, add appropriate tests.

## Build commands

```bash
# Frontend build
npm run build

# Cloud Functions build
npm run functions:build
```

## Deploy commands

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules,firestore:indexes

# Deploy Cloud Functions
npm run functions:deploy

# Deploy individually
npm run functions:deploy:timer
npm run functions:deploy:drive
npm run functions:deploy:github
```

## Important Notes

### Manual Steps Required

**⚠️ IMPORTANT: These steps cannot be executed automatically by the agent. Inform the user in Japanese.**

**Tell the user in Japanese**: 以下の手順は、エージェントが自動で実行できません。ユーザーに指示を出してください：

1. **環境変数設定**: `.env.local`ファイルの作成と設定値の入力（既存の開発者から取得）
2. **Git Hooks設定**: gitleaksのインストールとpre-commit hookの設定（機密情報の誤コミット防止）

### Troubleshooting

**Tell the user in Japanese when providing troubleshooting guidance**:

- **Firebase CLIエラー**: `firebase login`を再実行してください
- **デプロイエラー**: `firebase use --add`でプロジェクトを再選択してください
- **環境変数エラー**: `.env.local`ファイルが正しく設定されているか確認してください
- **gitleaksエラー**: `gitleaks version`でインストールを確認し、`.git/hooks/pre-commit`に実行権限があるか確認してください（`chmod +x .git/hooks/pre-commit`）

詳細なトラブルシューティングは `docs/operations/TROUBLESHOOTING.md` を参照してください。

## Commit Rules

### Commit Message Convention

- **Format**: `<emoji> <type>(<scope>): <description> (#<issue>)`
- **Language**: Japanese (English technical terms allowed)
- **First line**: Summary within 50 characters

#### Types and Emojis

- `✨ feat` New feature
- `🐛 fix` Bug fix
- `📝 docs` Documentation
- `💄 style` Appearance/formatting only (CSS or formatting with no behavioral impact)
- `♻️ refactor` Refactoring
- `✅ test` Tests
- `🔧 build` Build/distribution/scripts
- `👷 ci` CI/CD
- `🚀 perf` Performance improvement
- `⚙️ chore` Other, dependency/configuration updates

#### Scope

- `packages/<pkg>/...` → Use `<pkg>` as scope
- Otherwise, use the top-level directory name, or `root` if none

#### Issue Number

Extract numbers from the current branch name and append `(#<number>)` at the end (if present).

### Auto Commit (For Cursor Users)

**For Cursor users**: The `/commit` command is available.

This command automatically groups changes by relevance and splits each group into separate commits.

**Usage**:
1. After making changes, type `/commit` in Cursor's chat
2. The agent automatically analyzes changes and generates appropriate commit messages
3. Splits into multiple commits following the one-commit-per-matter principle

**Auto commit rules**:
- Strictly follow the one-commit-per-matter principle
- Group change files by relevance
- Split each group into one commit
- Generate commit messages following the commit message convention
- Commit immediately without confirmation dialog

**Examples**:
- `✨ feat(root): 新機能を追加 (#123)`
- `🐛 fix(auth): ログイン処理のバグを修正 (#123)`
- `📝 docs(root): ドキュメントを更新 (#123)`

### Manual Commits

For agents other than Cursor or when committing manually, follow the commit message convention above.

**Principles**:
- One commit per matter
- Split unrelated changes into separate commits
- Commit messages should be clear and concise

## Reference Documentation

- `docs/setup/INITIAL_SETUP.md`: Initial setup instructions (detailed)
- `docs/setup/FIREBASE.md`: Firebase setup instructions
- `docs/setup/ENV.md`: Environment variable setup instructions
- `docs/setup/CHECKLIST.md`: Firebase initial setup checklist
- `docs/operations/TROUBLESHOOTING.md`: Troubleshooting
