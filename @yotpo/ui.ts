// Path: @yotpo/ui.ts
//
// Client-safe entry for the shared presentational pieces (stars). Import from here, as
// "@/@yotpo/ui", in code that can end up in a client bundle (e.g. product cards).
//
// Do NOT import "@yotpo" from client code: its index re-exports client.ts, which is server-only.

export { Star, StarRow, ratingLabel } from "./components/star";
