import { Bot, GrammyError, InlineKeyboard } from "grammy";
import { createServer } from "http";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { autoRetry } from "@grammyjs/auto-retry";
import "./job";
import axios from "axios";
import { Message } from "grammy/types";
import { CronJob } from "cron";

interface IOverrides {
  [key: string]: { nickname: string; converter: (price: number) => number };
}

process.env.TZ = "Asia/Tehran";

let lastMsg: Message.TextMessage | undefined;
const bot = new Bot(process.env.BOT_TOKEN!);

const INTERVAL_TIMER = +(process.env.INTERVAL_TIMER || 5);
bot.api.config.use(apiThrottler());
bot.api.config.use(autoRetry());

const overrides: IOverrides = {
  rls: { nickname: "IRT", converter: (price: number) => price / 10 },
};

const srcCurrency = new URL(process.env.GET_PRICE_LINK!).searchParams
  .get("srcCurrency")!
  .split(",");
const dstCurrency = new URL(process.env.GET_PRICE_LINK!).searchParams
  .get("dstCurrency")!
  .split(",");

new CronJob(`*/${INTERVAL_TIMER} * * * *`, () => {
  if (lastMsg === undefined) return;
  try {
    editMessage(+process.env.CHAT_ID!, lastMsg.message_id);
  } catch {}
});

const getPrices = async () => {
  const res = await axios.get(process.env.GET_PRICE_LINK!);
  const currentTime = new Date().toLocaleTimeString("fa-IR-u-nu-latn", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
  prices.push(
    `\n<i>Auto-updates every ${INTERVAL_TIMER} minute${
      INTERVAL_TIMER > 1 ? "s" : ""
    } 🔄 - <b>${currentTime}</b></i>`
  );
  prices.push();
  return prices.join("\n");
};

const editMessage = async (chatId: number, msgId: number) => {
  const prices = await getPrices();
  const inlineKeyboard = new InlineKeyboard().text("Update 🔄", "update");
  await bot.api.editMessageText(chatId, msgId, prices, {
    reply_markup: inlineKeyboard,
    parse_mode: "HTML",
  });
};

const sendMessage = async (chatId: number) => {
  const prices = await getPrices();
  const inlineKeyboard = new InlineKeyboard().text("Update 🔄", "update");
  if (lastMsg !== undefined)
    await bot.api.deleteMessage(lastMsg.chat.id, lastMsg.message_id);
  lastMsg = await bot.api.sendMessage(chatId, prices, {
    reply_markup: inlineKeyboard,
    parse_mode: "HTML",
  });
  await bot.api.pinChatMessage(chatId, lastMsg.message_id, {
    disable_notification: true,
  });
};

bot.callbackQuery("update", async (ctx) => {
  if (ctx.chat === undefined || ctx.msg?.message_id === undefined) return;
  try {
    editMessage(ctx.chat.id, ctx.msg.message_id);
  } catch (err) {
    if (err instanceof GrammyError && err.error_code === 400) return;
    console.log(err);
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
