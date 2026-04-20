import type { Context } from 'telegraf';

export async function handleHelp(ctx: Context) {
  const helpText = `
📊 *FinanceOS Bot Help*

*Adding Transactions*
Just send a plain message describing your income or expense:

_Expenses:_
• \`coffee 4.50\`
• \`spent 85 groceries\`
• \`-120 taxi\`
• \`bought clothes 200\`
• \`rent 1200 yesterday\`
• \`food 35 2026-04-15\`

_Income:_
• \`salary 5000\`
• \`+1200 freelance\`
• \`received 800 client payment\`
• \`income 500 bonus\`

*Supported Date Formats*
• \`today\` / \`yesterday\`
• \`last monday\`
• \`2026-04-15\` (ISO)
• \`15/04\` (day/month)

*Commands*
/start — Link your account
/balance — View this month's balance
/report — Monthly spending report
/recent — Last 5 transactions
/help — Show this message

*Tips*
• Start with \`+\` for income, \`-\` for expense
• Keywords like _salary_, _freelance_ auto-detect income
• Keywords like _coffee_, _groceries_ auto-detect expense
`.trim();

  await ctx.reply(helpText, { parse_mode: 'Markdown' });
}
