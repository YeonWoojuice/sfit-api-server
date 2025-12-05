const { Router } = require("express");
const healthRouter = require("./health.route");
const clubRouter = require("./clubs");
const metaRouter = require("./meta.route");
const authRouter = require("./auth");
const flashesRouter = require("./flashes");

const router = Router();

router.use("/health", healthRouter);
router.use("/clubs", clubRouter);
router.use("/meta", metaRouter);
router.use("/auth", authRouter);
router.use("/flashes", flashesRouter);
router.use("/users", require("./users"));
router.use("/admin", require("./admin"));
router.use("/attachments", require("./attachments"));
router.use("/coach", require("./coach"));
router.use("/chat", require("./chat")); // [NEW] Chat

module.exports = router;
