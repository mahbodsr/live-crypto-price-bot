import { Bot, GrammyError, InlineKeyboard } from "grammy";
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

const overrides: IOverrides = {
  rls: { nickname: "TOMAN", converter: (price: number) => price / 10 },
};

const srcCurrency = new URL(process.env.GET_PRICE_LINK!).searchParams
  .get("srcCurrency")!
  .split(",");
const dstCurrency = new URL(process.env.GET_PRICE_LINK!).searchParams
  .get("dstCurrency")!
  .split(",");

const getPrices = async () => {
  const res = await axios.get(process.env.GET_PRICE_LINK!);
  const prices: string[] = [];
  srcCurrency.forEach((src) => {
    dstCurrency.forEach((dst) => {
      if (dst === src) return;
      let price = src.toUpperCase() + "/";
      const stat = res.data.stats[`${src}-${dst}`];
      const isGoingUp = +stat.dayChange >= 0;
      const formatedDayChange = ` <code>(${isGoingUp ? "+" : ""}${
        stat.dayChange
      }% ${isGoingUp ? "⤴️" : "⤵️"})</code>`;
      if (dst in overrides) {
        price += `${overrides[dst].nickname}: <b>${overrides[dst]
          .converter(+stat.latest)
          .toLocaleString()}</b>`;
      } else {
        price += `${dst.toUpperCase()}: <b>${(
          stat.latest as string
        ).toLocaleString()}</b>`;
      }
      prices.push(price + formatedDayChange);
    });
  });
  return prices;
};

const sendMessage = async (id: number) => {
  const prices = await getPrices();
  const inlineKeyboard = new InlineKeyboard().text("Update 🔄", "update");
  const sentMsg = await bot.api.sendMessage(id, prices.join("\n"), {
    reply_markup: inlineKeyboard,
    parse_mode: "HTML",
  });
  await bot.api.pinChatMessage(sentMsg.message_id, id, {
    disable_notification: true,
  });
};

bot.callbackQuery("update", async (ctx) => {
  if (ctx.chat === undefined) return;
  try {
    const prices = await getPrices();
    const inlineKeyboard = new InlineKeyboard().text("Update 🔄", "update");
    await ctx.editMessageText(prices.join("\n"), {
      reply_markup: inlineKeyboard,
      parse_mode: "HTML",
    });
  } catch (err) {
    if (err instanceof GrammyError && err.error_code === 400) return;
    console.log(err)
    sendMessage(ctx.chat.id);
  }
});

bot.command("current", async (ctx) => {
  if (ctx.chat.id !== +process.env.CHAT_ID!) return;
  try {
    sendMessage(ctx.chat.id);
  } catch {
    await ctx.reply("Internal Error.\nCall @MahBodSr");
  }
});

const server = createServer((_, res) => {
  res.statusCode = 200;
  res.end();
});

server.listen(10000, () => {
  console.log("HTTP server is running");
});

bot.start({ onStart: () => console.log("Bot Started Successfuly") });
