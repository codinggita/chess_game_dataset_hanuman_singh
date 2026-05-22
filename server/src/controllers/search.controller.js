const searchService = require('../services/search.service');
const apiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const searchController = {
  searchMatches: asyncHandler(async (req, res) => {
    const { q } = req.query;
    const matches = await searchService.searchMatches(q, req.query);
    return apiResponse.success(res, 'Match search results', { matches });
  }),

  searchPlayers: asyncHandler(async (req, res) => {
    const { q } = req.query;
    const players = await searchService.searchPlayers(q, req.query);
    return apiResponse.success(res, 'Player search results', { players });
  }),

  searchOpenings: asyncHandler(async (req, res) => {
    const { q } = req.query;
    const openings = await searchService.searchOpenings(q, req.query);
    return apiResponse.success(res, 'Opening search results', { openings });
  }),

  searchEco: asyncHandler(async (req, res) => {
    const { q } = req.query;
    const openings = await searchService.searchEco(q, req.query);
    return apiResponse.success(res, 'ECO search results', { openings });
  }),

  searchMoves: asyncHandler(async (req, res) => {
    const { q } = req.query;
    const matches = await searchService.searchMoves(q, req.query);
    return apiResponse.success(res, 'Move search results', { matches });
  }),

  searchFuzzy: asyncHandler(async (req, res) => {
    const { q } = req.query;
    const results = await searchService.searchFuzzy(q);
    return apiResponse.success(res, 'Fuzzy search results', results);
  }),

  searchAutocomplete: asyncHandler(async (req, res) => {
    const { q } = req.query;
    const suggestions = await searchService.searchAutocomplete(q);
    return apiResponse.success(res, 'Autocomplete suggestions', { suggestions });
  }),

  getRecent: asyncHandler(async (req, res) => {
    const searches = await searchService.getRecentSearches(req.query);
    return apiResponse.success(res, 'Recent searches fetched', { searches });
  }),

  getPopular: asyncHandler(async (req, res) => {
    const searches = await searchService.getPopularSearches(req.query);
    return apiResponse.success(res, 'Popular searches fetched', { searches });
  }),

  searchAdvanced: asyncHandler(async (req, res) => {
    const results = await searchService.searchAdvanced(req.query);
    return apiResponse.success(res, 'Advanced search results', results);
  }),

  searchByPlayerRating: asyncHandler(async (req, res) => {
    const { rating } = req.query;
    const matches = await searchService.searchByPlayerRating(rating, req.query);
    return apiResponse.success(res, 'Player rating search results', { matches });
  }),

  searchByDateRange: asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const matches = await searchService.searchByDateRange(from, to, req.query);
    return apiResponse.success(res, 'Date range search results', { matches });
  }),

  searchByOpeningFamily: asyncHandler(async (req, res) => {
    const { q } = req.query;
    const openings = await searchService.searchByOpeningFamily(q, req.query);
    return apiResponse.success(res, 'Opening family search results', { openings });
  }),

  searchCheckmatePatterns: asyncHandler(async (req, res) => {
    const { q } = req.query;
    const matches = await searchService.searchCheckmatePatterns(q, req.query);
    return apiResponse.success(res, 'Checkmate pattern search results', { matches });
  }),

  searchEndgames: asyncHandler(async (req, res) => {
    const { q } = req.query;
    const matches = await searchService.searchEndgames(q, req.query);
    return apiResponse.success(res, 'Endgame search results', { matches });
  })
};

module.exports = searchController;
