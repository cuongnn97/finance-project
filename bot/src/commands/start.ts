import type { Context } from "telegraf";
import {
  getProfileById,
  getProfileByChatId,
  linkTelegramAccount,
} from "../services/transactionService.js";

/**
 * /start [userId]
 * - Nếu có userId: liên kết Telegram với tài khoản tài chính
 * - Nếu đã liên kết: hiện chào mừng
 * - Nếu chưa liên kết: hướng dẫn liên kết
 */
export async function handleStart(ctx: Context) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const text = (ctx.message as { text?: string } | undefined)?.text ?? "";
  const parts = text.trim().split(/\s+/);
  const userId = parts[1]; // userId tùy chọn qua deep link

  // Nếu có userId, thử liên kết
  if (userId && userId.length > 10) {
    const profile = await getProfileById(userId);
    if (!profile) {
      await ctx.reply(
        "❌ Không tìm thấy tài khoản. Vui lòng đăng ký trên ứng dụng web FinanceOS trước, sau đó dùng link từ trang Hồ sơ.",
      );
      return;
    }

    const ok = await linkTelegramAccount(profile.id, chatId);
    if (!ok) {
      await ctx.reply("❌ Liên kết tài khoản thất bại. Vui lòng thử lại.");
      return;
    }

    await ctx.reply(
      `✅ *Liên kết tài khoản thành công!*\n\n` +
        `Xin chào, ${profile.full_name ?? profile.email}!\n\n` +
        `Bạn có thể thêm giao dịch bằng cách gửi tin nhắn như:\n` +
        `• \`cà phê 35k\`\n` +
        `• \`lương 15tr\`\n` +
        `• \`-85k tiền chợ\`\n` +
        `• \`+3tr freelance\`\n\n` +
        `Gửi /help để xem tất cả lệnh.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Kiểm tra đã liên kết chưa
  const existingProfile = await getProfileByChatId(chatId);
  if (existingProfile) {
    await ctx.reply(
      `👋 Chào mừng trở lại, *${existingProfile.full_name ?? existingProfile.email}*!\n\n` +
        `Gửi giao dịch như:\n` +
        `• \`cà phê 35k\`\n` +
        `• \`+15tr lương\`\n\n` +
        `Hoặc gửi /help để xem tất cả lệnh.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Chưa liên kết
  await ctx.reply(
    `👋 Chào mừng đến với *FinanceOS Bot*!\n\n` +
      `Để bắt đầu, hãy liên kết tài khoản:\n\n` +
      `1. Truy cập ứng dụng web FinanceOS\n` +
      `2. Mở trang *Hồ sơ*\n` +
      `3. Nhấn *Mở Telegram Bot* — sẽ gửi mã liên kết của bạn\n\n` +
      `Hoặc gửi thủ công: \`/start MÃ_USER_CỦA_BẠN\``,
    { parse_mode: "Markdown" },
  );
}
