import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import algolia, { SearchIndex } from "algoliasearch/lite";
import { useEffect, useState } from "react";

export default function ArticleList() {
  const [state, setState] = useState<{ loading: boolean; articles: { [key: string]: Document[] } }>({
    loading: false,
    articles: {},
  });
  const [searchText, setSearchText] = useState<string>();

  const client = algolia("BH4D9OD16A", "7dc4fe97e150304d1bf34f5043f178c4");
  client.addAlgoliaAgent("Raycast Extension");
  const index = client.initIndex("laravel");

  useEffect(() => {
    async function fetch() {
      setState((oldState) => ({ ...oldState, loading: true }));
      const articles = await fetchDocs(index, searchText);

      setState((oldState) => ({
        ...oldState,
        loading: false,
        articles: articles,
      }));
    }

    fetch();
  }, [searchText]);

  return (
    <List
      isLoading={state.loading}
      throttle
      navigationTitle="Search Laravel Documentation"
      searchBarPlaceholder="Filter docs by name..."
      onSearchTextChange={setSearchText}
    >
      {Object.keys(state.articles).map((section) => (
        <List.Section title={section}>
          {(state.articles[section] ?? []).map((doc) => (
            <DocListItem key={doc.id} doc={doc} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function DocListItem(props: { doc: Document }) {
  const doc = props.doc;
  return (
    <List.Item
      id={doc.id}
      key={doc.id}
      title={doc.title}
      subtitle={doc.subtitle}
      icon="icon.png"
      // accessoryTitle={new Date(doc.date_modified).toLocaleDateString()}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={doc.url} />
          <CopyToClipboardAction title="Copy URL" content={doc.url} />
        </ActionPanel>
      }
    />
  );
}

async function fetchDocs(index: SearchIndex, query?: string): Promise<{ [key: string]: Document[] }> {
  try {
    const response = await index.search<AlgoliaDocument>(query ?? "", { facetFilters: ["version:master"] });

    const filtered = response.hits.reduce((c, hit) => {
      const url = hit.url;
      if (c[url] === undefined) {
        c[url] = {
          id: hit.objectID,
          title: hit.hierarchy["lvl1"] as string,
          section: hit.hierarchy["lvl0"] as string,
          subtitle: hit.hierarchy["lvl2"] as string,
          url: hit.url,
        };
      }

      return c;
    }, {} as { [key: string]: Document });

    return Object.values(filtered).reduce((c, d) => {
      const section = d.section;
      if (c[section] === undefined) {
        c[section] = [];
      }

      c[section].push(d);
      return c;
    }, {} as { [key: string]: Document[] });
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load docs");
    return Promise.resolve({});
  }
}

type AlgoliaDocument = {
  anchor: string;
  content: null;
  hierarchy: { [key: string]: string | null | undefined };
  url: string;
  objectID: string;
};

type Document = {
  id: string;
  section: string;
  title: string;
  subtitle: string;
  url: string;
};
