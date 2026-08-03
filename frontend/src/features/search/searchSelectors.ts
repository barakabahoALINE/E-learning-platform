import type { RootState } from '../../app/store';

export const selectSearchQuery = (state: RootState) => state.search.query;
export const selectSearchSuggestions = (state: RootState) => state.search.suggestions;
export const selectSearchResults = (state: RootState) => state.search.results;
export const selectSearchStatus = (state: RootState) => state.search.status;
export const selectSearchError = (state: RootState) => state.search.error;
export const selectRecentSearchQueries = (state: RootState) => state.search.recentQueries;
