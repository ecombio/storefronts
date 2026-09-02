> ## Documentation Index
> Fetch the complete documentation index at: https://www.algolia.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Supported LLMs

> Ask AI works with a selection of large language models from a range of providers.

export const Providers = () => {
  const PROVIDERS_URL = "https://askai.algolia.com/api/providers";
  const [providers, setProviders] = useState({});
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [hasError, setHasError] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");
  const DEBOUNCE_DELAY = 250;
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timeoutId);
  }, [query]);
  useEffect(() => {
    async function getProviders() {
      let url = PROVIDERS_URL;
      if (debouncedQuery !== "") {
        const params = new URLSearchParams();
        params.set("search", debouncedQuery);
        url = `${PROVIDERS_URL}?${params.toString()}`;
      }
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch providers: ${res.status}`);
        }
        const data = await res.json();
        setProviders(data);
        setHasError(false);
      } catch (error) {
        setHasError(true);
        setProviders({});
      }
    }
    getProviders();
  }, [debouncedQuery]);
  const providerOptions = useMemo(() => {
    return Object.values(providers).map(provider => ({
      value: provider.name,
      label: provider.displayName ?? provider.name
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [providers]);
  const filteredProviders = useMemo(() => {
    const allProviders = Object.values(providers);
    if (!selectedProvider) {
      return allProviders;
    }
    return allProviders.filter(provider => provider.name === selectedProvider);
  }, [providers, selectedProvider]);
  const rows = useMemo(() => filteredProviders.flatMap(provider => (provider.availableModels ?? []).map(model => <tr key={model.id}>
            <td>{provider.displayName}</td>
            <td>{model.displayName}</td>
            <td>{provider.name}</td>
            <td>{model.name}</td>
          </tr>)), [filteredProviders]);
  return <div className="mt-8">
    <div className="flex flex-col gap-2 sm:flex-row">
      <input type="search" name="search-providers" value={query} placeholder="Search for providers or models" onChange={e => setQuery(e.target.value)} className="border rounded-[3px] w-full px-3 py-1.5 bg-transparent sm:flex-1" />
      <select name="filter-providers" value={selectedProvider} onChange={event => setSelectedProvider(event.target.value)} className="border rounded-[3px] w-full px-3 py-1.5 bg-transparent sm:w-64">
        <option value="">All providers</option>
        {providerOptions.map(option => <option key={option.value} value={option.value}>
            {option.label}
          </option>)}
      </select>
    </div>
    {hasError ? <section className="mt-4">
        <p>Ask AI supports a range of large language models from multiple providers, including:</p>
        <ul>
          <li>
            <strong>Anthropic</strong> (Claude models)
          </li>
          <li>
            <strong>OpenAI</strong> (GPT models)
          </li>
          <li>
            <strong>Google Generative AI</strong> (Gemini models)
          </li>
          <li>
            <strong>Mistral AI</strong>
          </li>
          <li>
            <strong>Groq</strong>
          </li>
          <li>
            <strong>xAI Grok</strong>
          </li>
          <li>
            <strong>Cerebras</strong>
          </li>
          <li>
            <strong>DeepSeek</strong>
          </li>
        </ul>
        <p className="mt-2">
          See the{" "}
          <a href="https://docsearch.algolia.com/docs/v4/askai-models">
            DocSearch LLM reference
          </a>{" "}
          for the latest list or query the API: <a href="https://askai.algolia.com/api/providers">https://askai.algolia.com/api/providers</a>.
        </p>
      </section> : <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Model</th>
            <th>Provider ID</th>
            <th>Model ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows : <tr>
              <td colSpan={4}>No providers match your search terms.</td>
            </tr>}
        </tbody>
      </table>}
   </div>;
};

<Note>
  Ask AI is part of [Agent Studio](/doc/guides/algolia-ai/agent-studio)
  and isn't available as a standalone feature for new applications.
  Use these docs for existing Ask AI implementations.
  To move an existing assistant, see
  [Migrate Ask AI to Agent Studio](/doc/guides/algolia-ai/askai/guides/migrate-to-agent-studio).
</Note>

<div>
  You provide your own API key.
  This gives you full control over usage,
  [costs](/doc/guides/algolia-ai/askai/guides/cost-optimization), and LLM behavior.

  <Providers />
</div>
