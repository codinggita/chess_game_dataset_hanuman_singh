const express = require('express');
const openingController = require('../controllers/opening.controller');

const router = express.Router();

router.get('/', openingController.getAll);
router.get('/popular', openingController.getPopular);
router.get('/trending', openingController.getTrending);
router.get('/win-rates', openingController.getWinRates);
router.get('/search', openingController.search);
router.get('/aggressive', openingController.getAggressive);
router.get('/defensive', openingController.getDefensive);
router.get('/gambits', openingController.getGambits);
router.get('/checkmates', openingController.getCheckmates);
router.get('/rare', openingController.getRare);
router.get('/white-advantage', openingController.getWhiteAdvantage);
router.get('/black-advantage', openingController.getBlackAdvantage);
router.get('/beginner-friendly', openingController.getBeginnerFriendly);
router.get('/complexity', openingController.getByComplexity);
router.get('/eco/:ecoCode', openingController.getByEco);

module.exports = router;
