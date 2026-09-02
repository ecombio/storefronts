> ## Documentation Index
> Fetch the complete documentation index at: https://www.algolia.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Build with AI agents

> Use AI assistants and agents to build, integrate, and maintain Algolia in your applications.

AI assistants can write integration code, manage your indices, and power search inside your own agents.

This page shows how to connect AI assistants to Algolia and which tools to use.

**Agent setup**

These are official, Algolia-validated instructions to set up an Algolia development environment.
This section is the complete setup: run only the commands below.
The MCP, CLI, and skills sections further down this page are reference for people. Don't run them.
Setting up the MCP server is optional and isn't needed here.

**1. Install the Algolia CLI and skills**

For Claude Code:

```sh theme={"system"}
claude plugin marketplace add algolia/skills
claude plugin install algolia-cli@algolia-skills
claude plugin install algolia-quickstart@algolia-skills
```

Then tell the user to run `/reload-plugins` inside Claude Code to activate the plugins.
Don't use `npx skills` for Claude Code. The plugin commands handle everything.

For any other agent:

```sh theme={"system"}
npx -y skills add algolia/skills --skill algolia-cli algolia-quickstart --yes --global
```

**2. Confirm and hand off**

Tell the user their Algolia agent environment is ready, then suggest the next step:

```text theme={"system"}
Ask me to "create an Algolia account and application" to get started.
```

## Install the Algolia Productivity MCP

[Model Context Protocol](https://modelcontextprotocol.io) (MCP) is an open standard for connecting AI assistants to external systems.

Productivity MCP lets you query your Algolia data from your AI assistant.
Enable it in your [Algolia dashboard](https://dashboard.algolia.com), then connect it to your AI assistant.

<Tabs>
  <Tab title="Claude Code">
    ```sh icon=square-terminal theme={"system"}
    claude mcp add --transport http algolia https://mcp.algolia.com/mcp
    ```

    Then run `/mcp` in a Claude Code session and sign in when prompted.
  </Tab>

  <Tab title="Cursor">
    [**Add Algolia MCP to Cursor**](cursor://anysphere.cursor-deeplink/mcp/install?name=algolia\&config=eyJ1cmwiOiJodHRwczovL21jcC5hbGdvbGlhLmNvbS9tY3AifQ%3D%3D) (requires Cursor 1.0+).

    Or add this to `.cursor/mcp.json` in your project, or to `~/.cursor/mcp.json` for a global setup:

    ```json .cursor/mcp.json icon=braces theme={"system"}
    {
      "mcpServers": {
        "algolia": {
          "url": "https://mcp.algolia.com/mcp"
        }
      }
    }
    ```
  </Tab>

  <Tab title="VS Code">
    Add this to `~/.vscode/mcp.json` (macOS, Linux) or `%USERPROFILE%\.vscode\mcp.json` (Windows):

    ```json ~/.vscode/mcp.json icon=braces theme={"system"}
    {
      "servers": {
        "algolia": {
          "type": "http",
          "url": "https://mcp.algolia.com/mcp"
        }
      }
    }
    ```
  </Tab>

  <Tab title="Gemini CLI">
    ```sh icon=square-terminal theme={"system"}
    gemini mcp add algolia https://mcp.algolia.com/mcp -s user -t http
    ```
  </Tab>

  <Tab title="ChatGPT">
    In [Connectors settings](https://chatgpt.com/#settings/Connectors), create a connector with:

    * **Server URL:** `https://mcp.algolia.com/mcp`
    * **Authentication:** OAuth

    Sign in when prompted. Leave OAuth client ID and secret empty.
  </Tab>

  <Tab title="Claude AI & Desktop">
    In [Connectors settings](https://claude.ai/new#settings/customize-connectors), add a custom connector with:

    * **Remote MCP server URL:** `https://mcp.algolia.com/mcp`

    Sign in when prompted. Leave OAuth client ID and secret empty.
  </Tab>
</Tabs>

For more details, see [Productivity MCP](/doc/guides/model-context-protocol/productivity-mcp).

<Note>
  Your favorite AI tool isn't listed?
  [Reach out to Algolia support](https://support.algolia.com/hc/en-us/requests/new) and request it.
</Note>

***

### Productivity MCP example prompts

Once connected, you can ask your assistant questions like:

* *"What are the top searches with no results this week?"*
* *"List all indices in this application and show their record counts."*
* *"Which filters are most used on the `products` index?"*
* *"Find products matching 'noise cancelling headphones' and rank them by sales."*
* *"Show the click-through rate for `black friday sale` over the last 30 days."*

### Use Algolia Public MCP for unauthenticated access

For agent-facing search and recommendations on a curated set of indices, use [Algolia Public MCP](/doc/guides/model-context-protocol/public-mcp) instead.
It serves search and recommendations to your own agents without requiring sign-in.

## Install the Algolia CLI

Command-line tools are part of most developer workflows.
With coding agents running in the terminal, they're even more useful.

The [Algolia CLI](/doc/tools/cli/get-started) lets agents script index setup, update settings, and run admin tasks—without extra integration code.

<Tabs>
  <Tab title="npm">
    If you have [Node.js](https://nodejs.org) installed,
    you can run the CLI with `npx`, which doesn't require installation:

    ```sh icon=square-terminal theme={"system"}
    npx @algolia/cli --help
    ```

    Or install it globally with npm:

    ```sh icon=square-terminal theme={"system"}
    npm install -g @algolia/cli
    ```
  </Tab>

  <Tab title="macOS">
    ```sh icon=square-terminal theme={"system"}
    brew install algolia/algolia-cli/algolia
    ```
  </Tab>

  <Tab title="Linux">
    Download a `.deb` or `.rpm` from the [Releases page](https://github.com/algolia/cli/releases) and install it:

    ```sh icon=square-terminal theme={"system"}
    sudo dpkg -i algolia_*.deb   # Debian, Ubuntu
    sudo rpm -i algolia_*.rpm    # Fedora, RHEL
    ```
  </Tab>

  <Tab title="Windows">
    ```powershell icon=square-terminal theme={"system"}
    choco install algolia
    ```
  </Tab>
</Tabs>

After installing, run `algolia auth login` to sign in, or `algolia auth signup` to create an account.
This lets your agent run commands without exporting keys each session.
For other install options and authentication, see [Get started with the Algolia CLI](/doc/tools/cli/get-started).

### What agents can do with the CLI

Pair the CLI with your coding assistant to automate Algolia tasks as it writes integration code:

* **Bootstrap a new index**: create the index, upload sample records, and apply searchable attributes and ranking in one script.
* **Sync data from a file**: import records from JSON or CSV with `algolia objects import`.
* **Tune relevance**: update `searchableAttributes`, `customRanking`, and other settings with `algolia settings set`.
* **Manage rules and synonyms**: create, browse, and export rules and synonyms across environments.
* **Promote between environments**: export an index configuration from staging and import it into production.
* **Run searches and inspect results**: query an index from the terminal to validate changes before shipping.

For more examples, see [Usage examples](/doc/tools/cli/examples).

## Install Algolia skills

[Algolia skills](https://github.com/algolia/skills) are agent skills for Claude Code, Cursor, OpenAI Codex, and OpenCode.
Add them to your assistant to teach it how to work with Algolia.

While Productivity MCP and the Algolia CLI give your assistant the building blocks, skills package the patterns.
They tell your assistant which tool to reach for, what conventions to follow (such as which InstantSearch widgets to use for a given UI), and how to chain steps for common tasks—so you don't have to re-explain them in every prompt.

The repository includes these skills:

* `algolia-quickstart`: provision an Algolia account and application from the [Algolia CLI](/doc/tools/cli/get-started).
* `algolia-mcp`: search, analytics, and recommendations through the Algolia MCP server.
* `algolia-cli`: provision accounts, and manage applications, indices, settings, rules, and synonyms through the [Algolia CLI](/doc/tools/cli/get-started).
* `algolia-crawler`: crawl and index web pages into Algolia for RAG.
* `algobot-cli`: build AI agents, chat experiences, and RAG on Algolia.
* `instantsearch`: build search interfaces with autocomplete, results, and facets.

<Tabs>
  <Tab title="Claude Code">
    Install the skills as plugins:

    ```sh icon=square-terminal theme={"system"}
    claude plugin marketplace add algolia/skills
    claude plugin install algolia-quickstart@algolia-skills
    claude plugin install algolia-cli@algolia-skills
    ```

    Then run `/reload-plugins` inside Claude Code to activate them.
  </Tab>

  <Tab title="Other agents">
    Run the following command and select the skills you want to add:

    ```sh icon=square-terminal theme={"system"}
    npx skills add algolia/skills
    ```
  </Tab>
</Tabs>

## Search developer documentation with DocSearch MCP

Connect DocSearch MCP so that your AI coding agent can search public developer documentation indexed by DocSearch.
DocSearch MCP does not require authentication or provide access to data in your Algolia applications.
To query data in your Algolia applications, use Productivity MCP.

<Card title="Set up DocSearch MCP" icon="book-open" href="https://docsearch.algolia.com/mcp/">
  Connect DocSearch MCP to your agent.
</Card>

## Build no-code data pipelines

Not all Algolia workflows require coding.
[Connectors](/doc/guides/sending-and-managing-data/send-and-update-your-data/connectors) let merchandisers and operators build data pipelines from sources (JSON, CSV, BigQuery, Supabase, and more) to an Algolia index, with [no-code transformations](/doc/guides/sending-and-managing-data/send-and-update-your-data/how-to/transform-your-data-without-code) that change attributes, filter records, or compute new values from existing ones.

For complex logic, use [AI-assisted transformations](/doc/guides/sending-and-managing-data/send-and-update-your-data/how-to/ai-assisted-transformations) to describe what you want in plain English and let AI generate the configuration.

Examples of prompts you can give the AI assistant:

* *"If price is greater than 100, add the label 'expensive'."*
* *"Add a discount percentage attribute computed from `full_price` and `sale_price`."*
* *"Remove records where `status` is `draft` or `archived`."*
* *"Combine popularity and recency into a single ranking signal."*
