const { Router } = require("express");
const healthRouter = require("./health.route");
const clubRouter = require("./clubs");
const metaRouter = require("./meta.route");

const router = Router();

router.use("/health", healthRouter);
router.use("/clubs", clubRouter);
router.use("/meta", metaRouter);

module.exports = router;
