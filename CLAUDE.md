# Claude Code Rules

This file contains rules for Claude Code when working on this project. These rules are automatically applied when Claude Code is used.

## MCP Tools Usage Rules

### Serena MCP Usage

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

### Chrome DevTools MCP Usage

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

## Implementation Testing Rules

**After implementing or modifying code, always perform implementation testing following the steps below and confirm there are no issues before marking the modification as complete.**

### Required Verification Items

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

### Implementation Testing Workflow

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

### Notes

- If a local server is not running or a URL is not shared, implementation testing may be skipped
- However, we recommend performing implementation testing whenever possible
- If issues are found during implementation testing, always fix them before completion

