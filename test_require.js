try {
    require('./src/routes/auth');
    console.log("Require successful");
} catch (e) {
    console.error(e);
}
