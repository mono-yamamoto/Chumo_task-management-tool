# Serena MCP セットアップガイド

## 概要

Serena MCPは、LLMを高度なコーディングエージェントに変えるオープンソースのツールキットです。Language Server Protocol（LSP）を活用し、コードの意味的な検索や編集機能を提供します。

## 前提条件

- `uv`または`uvx`がインストールされていること
  - macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
  - またはHomebrew: `brew install uv`

## セットアップ手順

### 1. プロジェクト設定ファイルの確認

プロジェクトの`.cursor/mcp.json`にserenaMCPの設定が追加されています。

### 2. Cursorでの設定（重要：自動起動の設定）

**Cursorの設定ファイルに正しく設定されていれば、手動でコマンドを実行する必要はありません。**

CursorでMCPサーバーを使用するには、Cursorの設定ファイルに以下の設定を追加してください。

**macOSの場合:**
`~/Library/Application Support/Cursor/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`

**設定例:**

```json
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server"],
      "env": {}
    }
  }
}
```

### 3. 自動起動の仕組み

**設定が正しく完了していれば：**

- ✅ **Cursorが自動的にMCPサーバーを起動します**
- ✅ **AI（Composer）がserenaMCPのツールを使おうとしたときに、自動的にサーバーが起動します**
- ✅ **手動でコマンドを実行する必要はありません**

設定ファイルに追加後、Cursorを再起動すると設定が反映されます。その後、AIがserenaMCPの機能を使用しようとしたときに、Cursorが自動的にサーバーを起動します。

### 4. 手動でMCPサーバーを起動する場合（通常は不要）

**注意**: 設定が正しく完了していれば、この手順は通常不要です。

デバッグやテスト目的でMCPサーバーを手動で起動する場合は、以下のコマンドを実行します：

```bash
npm run mcp:serena
```

または

```bash
uvx --from git+https://github.com/oraios/serena serena start-mcp-server
```

起動後、`http://localhost:24282/dashboard/index.html`でダッシュボードにアクセスできます。

### 5. 自動アップデートの使用

最新バージョンを常に使用する場合は、`uvx --from git+...`を使用することで、実行時に自動的に更新確認が行われます。

## 機能

- **セマンティック検索**: 関数やクラスなどのシンボルを意味的に検索
- **コード編集**: 特定のシンボルの前後への挿入や、シンボルの内容の置換
- **多言語対応**: Python、TypeScript、Javaなど、多くのプログラミング言語をサポート

## 注意事項

- **リソース消費**: SerenaはLSPを利用するため、大規模なリポジトリではCPUやメモリの使用量が増加する可能性があります
- **セキュリティ**: `execute_shell_command`のようなツールは任意のコマンドを実行するため、使用時にはセキュリティと権限管理に注意が必要です

## トラブルシューティング

### ブラウザの自動起動を無効化する

起動時にWebダッシュボードが自動的にブラウザで開くのを無効化するには、`~/.serena/serena_config.yml`を編集し、以下の設定を追加します：

```yaml
web_dashboard_open_on_launch: false
```

### MCPサーバーが起動しない場合

1. `uvx`が正しくインストールされているか確認: `which uvx`
2. インターネット接続を確認（GitHubから最新版を取得するため）
3. Cursorを再起動して設定を反映

## 参考リンク

- [Serena GitHub リポジトリ](https://github.com/oraios/serena)
- [MCP公式ドキュメント](https://modelcontextprotocol.io/)
