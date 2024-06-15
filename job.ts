import { CronJob } from "cron";
import * as https from "https";

const backendUrl = "https://live-crypto-price-bot.onrender.com";
new CronJob("*/10 * * * *", () => {
  https
    .get(backendUrl, (res) => {
      if (res.statusCode === 200) console.log("server restarted.");
      else
        console.error(
          `failed to restart server with status code: ${res.statusCode}`
        );
    })
    .on("error", (err) => console.error("error during restart:", err.message));
}).start();
