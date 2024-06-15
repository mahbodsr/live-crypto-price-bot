import { Bot } from "grammy";
import { createServer } from "http";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { autoRetry } from "@grammyjs/auto-retry";
import "./job";
import axios from "axios";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.api.config.use(apiThrottler());
bot.api.config.use(autoRetry());

bot.hears(["/current", "/current@currentcrypto_bot"], async (ctx) => {
  if (ctx.chat.id !== +process.env.CHAT_ID!) return;
  try {
    const res = await axios.get(process.env.GET_PRICE_LINK!);
    ctx.reply(
      `NOT/RIAL: \t${+res.data.stats["not-rls"].latest}\nNOT/USDT: \t${+res.data
        .stats["not-usdt"].latest}`,
      { reply_parameters: { message_id: ctx.msg.message_id } }
    );
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
