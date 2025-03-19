// this is enabled by jest-puppeteer in CI, but we're using it locally so both
// environments behave the same way
module.exports = {
  launch: {
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  },
};
