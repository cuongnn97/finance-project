import type { Context } from "telegraf";

export async function handleHelp(ctx: Context) {
  const helpText = `
📊 *Trợ giúp FinanceOS Bot*

*Thêm giao dịch*
Gửi tin nhắn mô tả thu nhập hoặc chi tiêu:

_Chi tiêu:_
• \`cà phê 35k\`
• \`ăn trưa 50k\`
• \`chi 85k tiền chợ\`
• \`-120k taxi\`
• \`mua quần áo 200k\`
• \`tiền nhà 5tr\`
• \`grab 25k hôm qua\`
• \`xăng 100k 2026-04-15\`

_Thu nhập:_
• \`lương 15tr\`
• \`+5000k freelance\`
• \`nhận 3tr tiền dự án\`
• \`thu nhập 500k thưởng\`

*Định dạng số tiền*
• \`35k\` = 35.000
• \`1.5tr\` = 1.500.000
• \`50000\` = 50.000

*Định dạng ngày*
• \`hôm nay\` / \`hôm qua\` / \`hôm kia\`
• \`2026-04-15\` (ISO)
• \`15/04\` (ngày/tháng)

*Lệnh*
/start — Liên kết tài khoản
/balance — Xem số dư tháng này
/report — Báo cáo chi tiêu tháng
/recent — 5 giao dịch gần nhất
/help — Hiện trợ giúp này

*Mẹo*
• Bắt đầu bằng \`+\` cho thu nhập, \`-\` cho chi tiêu
• Từ khóa như _lương_, _freelance_ tự nhận diện thu nhập
• Từ khóa như _cà phê_, _ăn trưa_ tự nhận diện chi tiêu
`.trim();

  await ctx.reply(helpText, { parse_mode: "Markdown" });
}
