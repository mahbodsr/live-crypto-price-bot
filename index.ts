import { Bot } from "grammy";
import { createServer } from "http";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { autoRetry } from "@grammyjs/auto-retry";
import "./job";
import axios from "axios";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.api.config.use(apiThrottler());
bot.api.config.use(autoRetry());

bot.command("current", async (ctx) => {
  if (ctx.chat.id !== +process.env.CHAT_ID!) return;
  try {
    const res = await axios.get(process.env.GET_PRICE_LINK!);
    let prices = "";
    prices +=
      "NOT/TOMAN: \t" +
      (+res.data.stats["not-rls"].latest / 10).toLocaleString();
    prices += "\nNOT/USDT: \t" + res.data.stats["not-usdt"].latest;
    prices +=
      "\nTON/TOMAN: \t" +
      (+res.data.stats["ton-rls"].latest / 10).toLocaleString();
    prices += "\nTON/USDT: \t" + res.data.stats["ton-usdt"].latest;

    ctx.reply(prices, { reply_parameters: { message_id: ctx.msg.message_id } });
  } catch {
    ctx.reply("Internal Error.\nCall @MahBodSr");
  }
});

const server = createServer((req, res) => {
  res.statusCode = 200;
  res.end();
});

server.listen(10000, () => {
  console.log("HTTP server is running");
});

bot.start({ onStart: () => console.log("Bot Started Successfuly") });
