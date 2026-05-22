const statsService = require('../services/stats.service');
const apiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const statsController = {
  getTotalMatches: asyncHandler(async (req, res) => {
    const data = await statsService.getTotalMatches();
    return apiResponse.success(res, 'Total matches count fetched', { data });
  }),

  getTotalPlayers: asyncHandler(async (req, res) => {
    const data = await statsService.getTotalPlayers();
    return apiResponse.success(res, 'Total players count fetched', { data });
  }),

  getAverageRating: asyncHandler(async (req, res) => {
    const data = await statsService.getAverageRating();
    return apiResponse.success(res, 'Average rating fetched', { data });
  }),

  getTopOpenings: asyncHandler(async (req, res) => {
    const data = await statsService.getTopOpenings();
    return apiResponse.success(res, 'Top openings fetched', { data });
  }),

  getCheckmateRate: asyncHandler(async (req, res) => {
    const data = await statsService.getCheckmateRate();
    return apiResponse.success(res, 'Checkmate rate fetched', { data });
  }),

  getResignationRate: asyncHandler(async (req, res) => {
    const data = await statsService.getResignationRate();
    return apiResponse.success(res, 'Resignation rate fetched', { data });
  }),

  getTimeoutRate: asyncHandler(async (req, res) => {
    const data = await statsService.getTimeoutRate();
    return apiResponse.success(res, 'Timeout rate fetched', { data });
  }),

  getWhiteWinRate: asyncHandler(async (req, res) => {
    const data = await statsService.getWhiteWinRate();
    return apiResponse.success(res, 'White win rate fetched', { data });
  }),

  getBlackWinRate: asyncHandler(async (req, res) => {
    const data = await statsService.getBlackWinRate();
    return apiResponse.success(res, 'Black win rate fetched', { data });
  }),

  getDrawRate: asyncHandler(async (req, res) => {
    const data = await statsService.getDrawRate();
    return apiResponse.success(res, 'Draw rate fetched', { data });
  }),

  getRatedGames: asyncHandler(async (req, res) => {
    const data = await statsService.getRatedGames();
    return apiResponse.success(res, 'Rated games count fetched', { data });
  }),

  getUnratedGames: asyncHandler(async (req, res) => {
    const data = await statsService.getUnratedGames();
    return apiResponse.success(res, 'Unrated games count fetched', { data });
  }),

  getDailyGames: asyncHandler(async (req, res) => {
    const data = await statsService.getDailyGames();
    return apiResponse.success(res, 'Daily games fetched', { data });
  }),

  getMonthlyGames: asyncHandler(async (req, res) => {
    const data = await statsService.getMonthlyGames();
    return apiResponse.success(res, 'Monthly games fetched', { data });
  }),

  getYearlyGames: asyncHandler(async (req, res) => {
    const data = await statsService.getYearlyGames();
    return apiResponse.success(res, 'Yearly games fetched', { data });
  })
};

module.exports = statsController;
