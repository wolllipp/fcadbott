import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';
import { generateExemptionDoc } from './docGenerator';

let bot: TelegramBot | null = null;
const prisma = new PrismaClient();

const MONTH_NAMES = [
  '', 'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре',
];

export function initBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) { console.warn('⚠️  BOT_TOKEN not set'); return; }

  bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, async (msg) => {
    const username = msg.from?.username;
    if (!username) return;
    const coordinator = await prisma.coordinator.findUnique({ where: { telegramUsername: username } });
    if (coordinator) {
      await prisma.coordinator.update({ where: { id: coordinator.id }, data: { chatId: String(msg.chat.id) } });
      bot!.sendMessage(msg.chat.id,
        `👋 Добро пожаловать, *${coordinator.fullName}*!\n\nВаша роль: *${coordinator.role}*\nСектор: *${coordinator.sector || 'Руководство СС'}*\n\nОткройте Mini App через кнопку меню.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot!.sendMessage(msg.chat.id, '❌ Вы не являетесь членом Студенческого совета ФКП.');
    }
  });

  console.log('🤖 Telegram bot started');
}

export function getBot() { return bot; }

async function getChairmanChatIds(): Promise<string[]> {
  const targets = await prisma.coordinator.findMany({
    where: { role: { in: ['CHAIRMAN', 'DEPUTY'] }, chatId: { not: null } },
  });
  return targets.map((t) => t.chatId!).filter(Boolean);
}

async function getSecretaryChatIds(): Promise<string[]> {
  const targets = await prisma.coordinator.findMany({
    where: { role: 'SECRETARY', chatId: { not: null } },
  });
  return targets.map((t) => t.chatId!).filter(Boolean);
}

function formatDate(exemption: any): string {
  const date = new Date(exemption.exemptionDate);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function studentLines(exemption: any): string {
  return exemption.students
    .map((es: any, i: number) =>
      `${i + 1}. ${es.student?.fullName || es.externalName} | ${es.student?.groupNumber || es.externalGroup}`
    )
    .join('\n');
}

// Coordinator submits exemption → send simple notification to chairman (no docx)
export async function sendExemptionPending(exemption: any) {
  if (!bot) return;
  const dateStr = formatDate(exemption);
  const lines = studentLines(exemption);
  const count = exemption.students.length;

  const message =
    `📋 *Новая докладная на рассмотрении*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 Дата: *${dateStr}*\n` +
    `👤 Подал(а): *${exemption.coordinator.fullName}*\n` +
    `📌 Причина: ${exemption.reason}\n` +
    `👥 Студентов: *${count}*\n\n` +
    `${lines}\n\n` +
    `⏳ Откройте приложение для подтверждения или отклонения`;

  const chatIds = await getChairmanChatIds();
  for (const chatId of chatIds) {
    try { await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
  }
}

// Chairman approves (or chairman's own exemption) → send full report + docx
export async function sendExemptionReport(exemption: any) {
  if (!bot) return;
  const dateStr = formatDate(exemption);
  const lines = studentLines(exemption);

  const message =
    `✅ *ДОКЛАДНАЯ ЗАПИСКА ПОДТВЕРЖДЕНА*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 Дата: *${dateStr}*\n` +
    `👤 Выставил(а): *${exemption.coordinator.fullName}*\n` +
    `📌 Причина: ${exemption.reason}\n\n` +
    `*Освобождённые студенты:*\n${lines}\n\n` +
    `✅ Пропуски ${dateStr} считать по уважительной причине`;

  let docBuffer: Buffer | null = null;
  try { docBuffer = await generateExemptionDoc(exemption); } catch (e) { console.error('docx error:', e); }

  // Send to both chairman and secretary
  const chatIds = [...await getChairmanChatIds(), ...await getSecretaryChatIds()];
  const unique = [...new Set(chatIds)];

  for (const chatId of unique) {
    try {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      if (docBuffer) {
        await bot.sendDocument(
          chatId, docBuffer,
          { caption: `📎 Докладная от ${dateStr}` },
          { filename: `Освобождение_${dateStr.replace(/\./g, '-')}.docx`, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        );
      }
    } catch (e) { console.error(`Failed to send to ${chatId}:`, e); }
  }
}

// Chairman rejects → notify the coordinator who submitted
export async function sendExemptionRejected(exemption: any, rejectReason?: string) {
  if (!bot) return;
  const dateStr = formatDate(exemption);

  const coordinator = await prisma.coordinator.findUnique({
    where: { id: exemption.createdBy },
  });
  if (!coordinator?.chatId) return;

  const message =
    `❌ *Докладная отклонена*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 Дата: *${dateStr}*\n` +
    `📌 Причина подачи: ${exemption.reason}\n` +
    (rejectReason ? `\n💬 Причина отклонения: ${rejectReason}` : '') +
    `\n\nОбратитесь к председателю для уточнений.`;

  try {
    await bot.sendMessage(coordinator.chatId, message, { parse_mode: 'Markdown' });
  } catch (e) { console.error(e); }
}

export async function sendBonusNotification(submission: any) {
  if (!bot) return;
  const monthName = MONTH_NAMES[submission.month];
  const total = submission.entries.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const message = `🏆 *Заявка на премирование*\n━━━━━━━━━━━━━━━━━━━━\n👤 ${submission.coordinator.fullName}\n📅 Месяц: *${monthName} ${submission.year}*\n👥 Студентов: *${submission.entries.length}*\n💰 Сумма: *${total} BYN*\n\n⏳ Ожидает подтверждения председателя`;
  const chatIds = await getChairmanChatIds();
  for (const chatId of chatIds) { try { await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); } }
}

export async function sendBonusReport(submission: any) {
  if (!bot) return;
  const monthName = MONTH_NAMES[submission.month];
  const lines = submission.entries.map((e: any, i: number) => `${i + 1}. ${e.student?.fullName || e.externalName} | ${e.student?.groupNumber || e.externalGroup} | *${e.amount} BYN*`).join('\n');
  const total = submission.entries.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const message = `✅ *Премии подтверждены*\n━━━━━━━━━━━━━━━━━━━━\n📅 ${monthName} ${submission.year}\n👤 Координатор: ${submission.coordinator.fullName}\n\n${lines}\n\n💰 *Итого: ${total} BYN*`;
  const chatIds = [...await getChairmanChatIds(), ...await getSecretaryChatIds()];
  for (const chatId of [...new Set(chatIds)]) { try { await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); } }
}
