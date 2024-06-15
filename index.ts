import { Bot } from "grammy";
import { createServer } from "http";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { autoRetry } from "@grammyjs/auto-retry";
import "./job";
import axios from "axios";

interface IOverrides {
  [key: string]: { nickname: string; converter: (price: number) => number };
}

const bot = new Bot(process.env.BOT_TOKEN!);

bot.api.config.use(apiThrottler());
bot.api.config.use(autoRetry());

const srcCurrency = new URL(process.env.GET_PRICE_LINK!).searchParams
  .get("srcCurrency")!
  .split(",");
const dstCurrency = new URL(process.env.GET_PRICE_LINK!).searchParams
  .get("dstCurrency")!
  .split(",");

const overrides: IOverrides = {
  rls: { nickname: "TOMAN", converter: (price: number) => price / 10 },
};

bot.command("current", async (ctx) => {
  if (ctx.chat.id !== +process.env.CHAT_ID!) return;
  try {
    const res = await axios.get(process.env.GET_PRICE_LINK!);
    const prices: string[] = [];
    srcCurrency.forEach((src) => {
      dstCurrency.forEach((dst) => {
        let price = src.toUpperCase() + "/";
        if (dst in overrides) {
          price = `${overrides[dst].nickname}:  ${overrides[dst]
            .converter(+res.data.stats[`${src}-${dst}`].latest)
            .toLocaleString()}`;
        } else {
          price = `${dst.toUpperCase()}:  ${(
            res.data.stats[`${src}-${dst}`].latest as string
          ).toLocaleString()}`;
        }
        prices.push(price);
      });
      prices.push();
    });
    // prices +=
    //   "NOT/TOMAN: \t" +
    //   (+res.data.stats["not-rls"].latest / 10).toLocaleString();
    // prices += "\nNOT/USDT: \t" + res.data.stats["not-usdt"].latest;
    // prices +=
    //   "\nTON/TOMAN: \t" +
    //   (+res.data.stats["ton-rls"].latest / 10).toLocaleString();
    // prices += "\nTON/USDT: \t" + res.data.stats["ton-usdt"].latest;

    ctx.reply(prices.join("\n"), {
      reply_parameters: { message_id: ctx.msg.message_id },
    });
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
