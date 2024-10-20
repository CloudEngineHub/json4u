export interface SearchResult {
  matchType: "key" | "value";
  id: string;
  label: string;
  result: Fuzzysort.Result;
}
