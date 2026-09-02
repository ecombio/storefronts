> ## Documentation Index
> Fetch the complete documentation index at: https://www.algolia.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Connect LLM providers

> Connect large language model providers to power your Agent Studio agents.

Agent Studio lets you connect your preferred large language model (LLM) provider, giving you control over model selection, data governance, and costs.

## Advantages of using your own LLM

* **Cost control.**

  Pay your LLM provider for tokens consumed by your agents.
  Search requests made by agents count toward your Algolia usage.

* **Vendor flexibility.**

  Switch providers or models at any time.
  Choose the best model for each workload.

* **Data governance.**

  Keep ownership of your data and business logic while choosing which provider processes your data.

## Supported providers

To compare different providers and models for Agent Studio,
see the [Agent Studio benchmark](https://www.algolia.com/llm-leaderboard).
To request a provider that isn't listed here,
contact [Algolia's support team](https://www.algolia.com/support).

<Info>
  Algolia provides free access to OpenAI's GPT-4.1 for testing.
  Production requires your own LLM provider.
  Use the same model in development and production for consistent behavior.
</Info>

<Tabs>
  <Tab title="Anthropic">
    Agent Studio supports these models:

    * `claude-fable-5`
    * `claude-opus-4-8`
    * `claude-opus-4-7`
    * `claude-opus-4-6`
    * `claude-sonnet-5`
    * `claude-sonnet-4-6`
    * `claude-opus-4-5-20251101`
    * `claude-haiku-4-5-20251001`
    * `claude-sonnet-4-5-20250929`
    * `claude-opus-4-1-20250805`

    #### Configuration requirements

    * Anthropic API key (required)
    * Custom endpoint URL (optional)

    For more information about authenticating with Anthropic's Claude API,
    see [Authentication](https://platform.claude.com/docs/en/api/overview#authentication).
  </Tab>

  <Tab title="OpenAI">
    Agent Studio supports these models:

    * `gpt-4`
    * `gpt-3.5-turbo`
    * `gpt-4.1`
    * `gpt-4.1-mini`
    * `gpt-4.1-nano`
    * `gpt-5`
    * `gpt-5-mini`
    * `gpt-5-nano`
    * `gpt-5-pro`
    * `gpt-5.1`
    * `gpt-5.2`
    * `gpt-5.2-pro`
    * `gpt-5.4`
    * `gpt-5.4-mini`
    * `gpt-5.4-nano`
    * `gpt-5.4-pro`
    * `gpt-5.5`
    * `gpt-5.5-pro`
    * `gpt-5.6`
    * `gpt-5.6-sol`
    * `gpt-5.6-terra`
    * `gpt-5.6-luna`
    * `gpt-5.1-codex-max`
    * `gpt-5.3-codex`
    * `gpt-5-chat-latest`
    * `gpt-5.1-chat-latest`
    * `gpt-5.2-chat-latest`
    * `gpt-5.3-chat-latest`

    #### Configuration requirements

    * OpenAI API key (required)

    For more information about authenticating with OpenAI's API,
    see [OpenAI's developer quickstart](https://developers.openai.com/api/docs/quickstart).

    #### Regional support

    In the dashboard, Agent Studio can automatically detect OpenAI API keys for the global, US, and Europe endpoints.
    When you add a key, Agent Studio uses the first endpoint that accepts it—`https://api.openai.com/v1` (global), `https://us.api.openai.com/v1`, or `https://eu.api.openai.com/v1`.
    The region comes from the key, not from your Algolia application's region.

    To force a region, [create the provider with the Agent Studio API](/doc/rest-api/agent-studio/create-provider) and set `baseUrl` explicitly (the host must be an `openai.com` domain).
    Agent Studio then uses only that endpoint, so the key must match it—a mismatch fails with `401 incorrect_hostname`.

    European data residency requires an OpenAI project created with Europe as its region, which OpenAI limits to eligible customers.
    See [OpenAI's data residency guide](https://developers.openai.com/api/docs/guides/your-data).
  </Tab>

  <Tab title="Azure OpenAI">
    Agent Studio supports the Azure OpenAI service,
    which lets you deploy OpenAI models in your Azure environment with custom compliance, security, and access controls.

    #### Supported models

    Any model deployed in your Azure OpenAI resource can be used.

    The model selection isn't limited to a fixed list.
    You specify your Azure deployment name,
    which can include custom configurations like rate limits and content filters.

    #### Configuration requirements

    * Azure endpoint URL (required)
    * Azure deployment name (required)
    * API version (optional)
    * API key (required)

    #### Regional support

    Requests use the region of your configured Azure OpenAI resource.

    For more information, see Azure's [OpenAI documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/latest).
  </Tab>

  <Tab title="Google Gemini">
    Agent Studio supports Google Gemini models using the Generative AI API.

    * `gemini-2.5-flash`
    * `gemini-2.5-flash-lite`
    * `gemini-2.5-pro`
    * `gemini-3-flash-preview`
    * `gemini-3.1-pro-preview`
    * `gemini-3.1-flash-lite`
    * `gemini-3.5-flash`

    <Info>
      If Google deprecates a Gemini preview model,
      agents using that model are automatically migrated to the equivalent generally available model and continue working without changes.
    </Info>

    #### Configuration requirements

    * Google Gemini API key (required)

    For more information, see [Gemini's API documentation](https://ai.google.dev/gemini-api/docs/api-key).
  </Tab>

  <Tab title="DeepSeek">
    Agent Studio supports these models:

    * `deepseek-chat`

    #### Configuration requirements

    * API key (required)

    For more information, see [DeepSeek's API documentation](https://api-docs.deepseek.com/).
  </Tab>

  <Tab title="OpenAI-compatible">
    Agent Studio supports any provider that implements the [OpenAI API specification](https://developers.openai.com/api/reference/overview).

    #### Configuration requirements

    * API key (required)
    * Base URL endpoint (required)
    * Default model ID (required)

    #### Regional support

    Regional availability and data residency depend on the provider or deployment behind your base URL.
    Check your provider's documentation for supported regions.

    #### Example providers

    | Provider                                                                                                                                    | Base URL                           |
    | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
    | [**Groq**](https://console.groq.com/docs/openai)                                                                                            | `https://api.groq.com/openai/v1`   |
    | [**Hugging Face**](https://huggingface.co/docs/inference-providers/index#alternative-openai-compatible-chat-completions-endpoint-chat-only) | `https://router.huggingface.co/v1` |
    | [**LiteLLM**](https://docs.litellm.ai/docs/providers/openai_compatible)                                                                     | Depends on deployment              |
    | [**Mistral AI**](https://docs.mistral.ai/api)                                                                                               | `https://api.mistral.ai/v1`        |
    | [**OpenRouter**](https://openrouter.ai/docs/quickstart#using-the-openai-sdk)                                                                | `https://openrouter.ai/api/v1`     |
    | [**Together AI**](https://docs.together.ai/docs/openai-api-compatibility)                                                                   | `https://api.together.xyz/v1`      |
  </Tab>
</Tabs>

## Add a provider

1. Go to the [**Settings**](https://dashboard.algolia.com/generativeAi/agent-studio/settings/providers) page in the Agent Studio dashboard.
2. Click **Create provider profile**, and select your provider type.
3. Enter a name for this provider configuration (for example, "OpenAI-Production" or "Azure-EU-Prod") and fill in the required configuration fields.
4. Click **Save**.

Your provider is now available for use when configuring agents.

## Use your provider

Go to [**Agents**](https://dashboard.algolia.com/generativeAi/agent-studio/agents) in the Agent Studio dashboard.
Create a new agent or select an existing one.
For an existing agent, change the provider and model under **Provider and model** in the agent's details view.
Changes take effect immediately.

## Manage providers

To update or delete providers,
open Agent Studio's [**Settings**](https://dashboard.algolia.com/generativeAi/agent-studio/settings/providers) page and select the provider's <Icon icon="ellipsis-vertical" /> **View actions** menu.
Provider updates affect all agents using that provider.
If you delete a provider that's in use, its agents stop working until you assign a different provider.

## Advanced model capabilities

Different models support different configuration parameters.
Agent Studio automatically detects and applies appropriate settings based on the model you select.
To configure these parameters, use the [update agent API method](/doc/rest-api/agent-studio/update-agent).

<Tabs>
  <Tab title="Temperature support">
    Most models support [temperature](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create) configuration (0.0 to 2.0) to control randomness in responses.
    Use:

    * **Lower values (0.0 to 0.5)** for more deterministic, focused responses.
    * **Higher values (1.0 to 2.0)** for more creative and varied responses.

    By default, Agent Studio doesn't apply a temperature value.
    Models use their provider's default (typically 1.0).

    You can set the temperature in your agent configuration:

    ```json icon=braces theme={"system"}
    {
      "config": {
        "temperature": 0.7
      }
    }
    ```

    **Models that support temperature:**

    * All Anthropic Claude models
    * All Google Gemini models
    * Most OpenAI GPT models (except GPT-5 and o-series)
    * Most OpenAI-compatible models

    **Models that don't support temperature:**

    * GPT-5 series models
    * o-series models (`o1`, `o3`, `o4`)

    When temperature isn't supported, it's automatically excluded from requests.
  </Tab>

  <Tab title="Reasoning models">
    Some models support advanced reasoning capabilities with different configuration options depending on the provider and model series.

    #### Turn reasoning on or off

    The parameter that controls reasoning differs by provider and model. To turn reasoning off:

    | Provider and model                             | Turn reasoning off                                                                                                     | Default                                                 |
    | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
    | Google Gemini 2.5 (`gemini-2.5-*`)             | `thinking_budget: 0`                                                                                                   | `thinking_budget: -1` (automatic)                       |
    | Google Gemini 3.x (`gemini-3-*`, `gemini-3.*`) | Not supported. The lowest setting is `thinking_level: "low"`. Agent Studio ignores `thinking_budget` for these models. | `thinking_level: "high"`                                |
    | Anthropic Claude                               | `thinking: {"type": "disabled"}`                                                                                       | Adaptive (on). Off if you set `temperature` or `top_k`. |
    | OpenAI o-series and GPT-5                      | Not supported. These models always reason.                                                                             | Reasoning on                                            |

    `sendReasoning` controls whether reasoning *output* is returned to the caller, not whether the model reasons.

    #### Configure OpenAI GPT-5 models

    Agent Studio supports these GPT-5 configuration parameters:

    * `text.verbosity` (`"low"`, `"medium"`, `"high"`): Controls output verbosity
    * `reasoning.effort` (`"minimal"`, `"low"`, `"medium"`, `"high"`): Controls reasoning depth (defaults to `"minimal"`)
    * `reasoning.summary` (`"auto"`, `"concise"`, `"detailed"`): Controls summary format

    For example:

    ```json icon=braces theme={"system"}
    {
      "config": {
        "text": {
          "verbosity": "medium"
        },
        "reasoning": {
          "effort": "high",
          "summary": "detailed"
        }
      }
    }
    ```

    Invalid values are logged as errors and ignored.

    For complete parameter specifications, see [OpenAI's documentation](https://developers.openai.com/api/docs).

    #### Configure Anthropic Claude models

    Claude uses **adaptive thinking at `medium` effort** by default: it reasons without maximizing cost. Two parameters tune this:

    * `thinking`: turns reasoning on or off. Default `{"type": "adaptive"}`. Set `{"type": "disabled"}`, or set `temperature`/`top_k` (incompatible with thinking), to turn it off.
    * `reasoning.effort`: how hard the model works. Default `"medium"`. Accepted values: `"low"`, `"medium"`, `"high"`, `"max"` (no `"xhigh"`). Applies to Claude Sonnet 4.6, Opus 4.5, and newer (including Sonnet 5 and Fable 5). Older Claude models ignore it. Claude Fable 5 always reasons, so it uses `effort` alone.

    Raise `effort` to `"high"` or `"max"` for answer depth. Lower it, or turn off thinking, for speed. Higher effort increases latency and token usage.

    ```json theme={"system"}
    {
      "config": {
        "reasoning": { "effort": "high" }
      }
    }
    ```

    #### Configure Google Gemini models

    Agent Studio supports these Gemini configuration parameters:

    * For Gemini 3.x, `thinking_level` accepts `"low"`, `"medium"`, or `"high"` (default). Reasoning can't be turned off, and Agent Studio ignores `thinking_budget`.
    * For Gemini 2.5, `thinking_budget` accepts `-1` for automatic reasoning (default), `0` to turn off reasoning, or `512` to `24576` for a fixed token budget.

    For example, configure Gemini 3.x:

    ```json icon=braces theme={"system"}
    {
      "config": {
        "thinking_level": "high"
      }
    }
    ```

    Configure Gemini 2.5:

    ```json icon=braces theme={"system"}
    {
      "config": {
        "thinking_budget": 2048
      }
    }
    ```

    Invalid values return errors.
    Higher reasoning effort increases latency and token usage.
    For complete parameter specifications, see the [Gemini API documentation](https://ai.google.dev/gemini-api/docs).
  </Tab>
</Tabs>

## See also

* [Get started with the Agent Studio dashboard](/doc/guides/algolia-ai/agent-studio/how-to/dashboard)
* [Tips for writing efficient prompts](/doc/guides/algolia-ai/agent-studio/how-to/prompting)
* [Integrate Agent Studio](/doc/guides/algolia-ai/agent-studio/how-to/integration)
