const { Router } = require('express');
const healthRouter = require('./health.route');

const router = Router();

router.use('/health', healthRouter);

module.exports = router;
