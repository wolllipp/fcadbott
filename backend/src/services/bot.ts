import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';
import { generateExemptionDoc } from './docGenerator';
import { generatePetitionDoc } from './petitionDocGenerator';

let bot: TelegramBot | null = null;
const prisma = new PrismaClient();

const MONTH_NAMES_GENITIVE = ['', 'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
const MONTH_LOWER = ['', 'январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

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
        `👋 Добро пожаловать, *${coordinator.fullName}*!\n\nОткройте Mini App через кнопку меню.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Try to match as a student by telegramUsername
    const student = await prisma.student.findFirst({
      where: { telegramUsername: username },
    });
    if (student) {
      await prisma.student.update({ where: { id: student.id }, data: { chatId: String(msg.chat.id) } });
      bot!.sendMessage(msg.chat.id,
        `👋 Привет, *${student.fullName}*!\n\nТеперь вы будете получать уведомления о новых мероприятиях.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot!.sendMessage(msg.chat.id, '❌ Доступ запрещён.');
    }
  });

  console.log('🤖 Telegram bot started');
}

export function getBot() { return bot; }

async function getChairmanChatIds(): Promise<string[]> {
  const targets = await prisma.coordinator.findMany({
    where: { role: { in: ['CHAIRMAN', 'DEAN'] }, chatId: { not: null } },
  });
  return [...new Set(targets.map((t) => t.chatId!).filter(Boolean))];
}

async function getSecretaryChatIds(): Promise<string[]> {
  const targets = await prisma.coordinator.findMany({
    where: { role: 'SECRETARY', chatId: { not: null } },
  });
  return targets.map((t) => t.chatId!).filter(Boolean);
}

function fmtDate(exemption: any): string {
  return new Date(exemption.exemptionDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function studentLines(exemption: any): string {
  return exemption.students
    .map((es: any, i: number) => `${i + 1}. ${es.student?.fullName || es.externalName} | ${es.student?.groupNumber || es.externalGroup}`)
    .join('\n');
}

export async function sendExemptionPending(exemption: any) {
  if (!bot) return;
  const dateStr = fmtDate(exemption);
  const message =
    `📋 *Новая докладная на рассмотрении*\n━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 Дата: *${dateStr}*\n👤 Подал(а): *${exemption.coordinator.fullName}*\n` +
    `📌 Причина: ${exemption.reason}\n👥 Студентов: *${exemption.students.length}*\n\n` +
    `${studentLines(exemption)}\n\n⏳ Откройте приложение для подтверждения или отклонения`;

  const chatIds = await getChairmanChatIds();
  for (const chatId of chatIds) {
    try { await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
  }
}

export async function sendExemptionReport(exemption: any) {
  if (!bot) return;
  const dateStr = fmtDate(exemption);
  const message =
    `✅ *ДОКЛАДНАЯ ЗАПИСКА ПОДТВЕРЖДЕНА*\n━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 Дата: *${dateStr}*\n👤 Выставил(а): *${exemption.coordinator.fullName}*\n` +
    `📌 Причина: ${exemption.reason}\n\n*Освобождённые студенты:*\n${studentLines(exemption)}\n\n` +
    `✅ Пропуски ${dateStr} считать по уважительной причине`;

  let docBuffer: Buffer | null = null;
  try { docBuffer = await generateExemptionDoc(exemption); } catch (e) { console.error('docx error:', e); }

  const chatIds = [...await getChairmanChatIds(), ...await getSecretaryChatIds()];
  const unique = [...new Set(chatIds)];
  for (const chatId of unique) {
    try {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      if (docBuffer) {
        await bot.sendDocument(chatId, docBuffer,
          { caption: `📎 Докладная от ${dateStr}` },
          { filename: `Освобождение_${dateStr.replace(/\./g, '-')}.docx`, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        );
      }
    } catch (e) { console.error(`Failed to send to ${chatId}:`, e); }
  }
}

export async function sendExemptionRejected(exemption: any, rejectReason?: string) {
  if (!bot) return;
  const dateStr = fmtDate(exemption);
  const coordinator = await prisma.coordinator.findUnique({ where: { id: exemption.createdBy } });
  if (!coordinator?.chatId) return;
  const message =
    `❌ *Докладная отклонена*\n━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 Дата: *${dateStr}*\n📌 Причина подачи: ${exemption.reason}` +
    (rejectReason ? `\n\n💬 Причина отклонения: ${rejectReason}` : '') +
    `\n\nОбратитесь к председателю для уточнений.`;
  try { await bot.sendMessage(coordinator.chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
}

export async function sendBonusNotification(submission: any) {
  if (!bot) return;
  const monthName = MONTH_NAMES_GENITIVE[submission.month];
  const total = submission.entries.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const message =
    `🏆 *Заявка на премирование*\n━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 ${submission.coordinator.fullName}\n📅 Месяц: *${monthName} ${submission.year}*\n` +
    `👥 Студентов: *${submission.entries.length}*\n💰 Сумма: *${total} BYN*\n\n⏳ Ожидает подтверждения`;
  const chatIds = await getChairmanChatIds();
  for (const chatId of chatIds) { try { await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); } }
}

export async function sendBonusReport(submission: any) {
  if (!bot) return;
  const monthName = MONTH_NAMES_GENITIVE[submission.month];
  const lines = submission.entries.map((e: any, i: number) =>
    `${i + 1}. ${e.student?.fullName || e.externalName} | ${e.student?.groupNumber || e.externalGroup} | *${e.amount} BYN*`
  ).join('\n');
  const total = submission.entries.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const message =
    `✅ *Премии подтверждены*\n━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 ${monthName} ${submission.year}\n👤 ${submission.coordinator.fullName}\n\n${lines}\n\n💰 *Итого: ${total} BYN*`;
  const chatIds = [...await getChairmanChatIds(), ...await getSecretaryChatIds()];
  for (const chatId of [...new Set(chatIds)]) { try { await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); } }
}

export async function sendBonusDoc(buffer: Buffer, filename: string, month: number, year: number) {
  if (!bot) return;
  const monthName = MONTH_NAMES_GENITIVE[month];
  const chatIds = [...await getChairmanChatIds(), ...await getSecretaryChatIds()];
  for (const chatId of [...new Set(chatIds)]) {
    try {
      await bot.sendDocument(chatId, buffer,
        { caption: `📎 Докладная по премиям за ${monthName} ${year}` },
        { filename, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );
    } catch (e) { console.error(`Failed to send doc to ${chatId}:`, e); }
  }
}

async function getStudentChatIds(): Promise<string[]> {
  const students = await prisma.student.findMany({
    where: { chatId: { not: null } },
  });
  return students.map((s) => s.chatId!).filter(Boolean);
}

export async function sendNewEvent(event: any) {
  if (!bot) return;
  const dateStr = new Date(event.eventDate).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const message =
    `🎉 *Новое мероприятие!*\n━━━━━━━━━━━━━━━━━━━━\n` +
    `📌 *${event.name}*\n📅 Дата: *${dateStr}*\n` +
    (event.description ? `📝 ${event.description}\n\n` : '\n') +
    `Откройте приложение, чтобы записаться!`;

  const chatIds = await getStudentChatIds();
  for (const chatId of chatIds) {
    try { await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
  }
}

const PETITION_TYPE_LABELS: Record<string, string> = {
  DISCOUNT: 'на скидку',
  DORMITORY: 'на общежитие',
  SPECIALIZATION: 'на профилизацию',
};

export async function sendPetitionApproved(petition: any) {
  if (!bot) return;
  const student = petition.student;
  if (!student?.chatId) return;

  const typeLabel = PETITION_TYPE_LABELS[petition.type] || petition.type;
  const eventsList = petition.events.map((e: any) =>
    `• ${e.eventName} (${new Date(e.eventDate).toLocaleDateString('ru-RU')})`
  ).join('\n');

  const message =
    `✅ *Ходатайство одобрено!*\n━━━━━━━━━━━━━━━━━━━━\n` +
    `Тип: *${typeLabel}*\n\n` +
    `Мероприятия:\n${eventsList}\n\n` +
    `📄 *Распечатай его и подпиши в 306-2*`;

  try {
    await bot.sendMessage(student.chatId, message, { parse_mode: 'Markdown' });

    const docBuffer = await generatePetitionDoc(petition);
    const typeName = petition.type.toLowerCase();
    await bot.sendDocument(student.chatId, docBuffer,
      { caption: `📎 Ходатайство ${typeLabel}` },
      { filename: `Ходатайство_${typeName}_${petition.id}.docx`, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    );
  } catch (e) { console.error('sendPetitionApproved error:', e); }
}

export async function sendAttendedMarked(participantFullName: string, eventName: string, eventDate: Date) {
  if (!bot) return;
  const student = await prisma.student.findFirst({
    where: { fullName: participantFullName, chatId: { not: null } },
  });
  if (!student?.chatId) return;

  const dateStr = eventDate.toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const message =
    `✅ *Вас отметили на мероприятии!*\n━━━━━━━━━━━━━━━━━━━━\n` +
    `📌 *${eventName}*\n📅 Дата: *${dateStr}*\n\n` +
    `Мероприятие пошло вам в копилку! 🎯`;

  try {
    await bot.sendMessage(student.chatId, message, { parse_mode: 'Markdown' });
  } catch (e) { console.error('sendAttendedMarked error:', e); }
}

export async function sendEventReminders() {
  if (!bot) return;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const endOfTomorrow = new Date(tomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  const events = await prisma.event.findMany({
    where: { eventDate: { gte: tomorrow, lte: endOfTomorrow } },
    include: { participants: true },
  });

  for (const event of events) {
    const dateStr = event.eventDate.toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const message =
      `⏰ *Напоминание!* Завтра мероприятие!\n━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *${event.name}*\n📅 Дата: *${dateStr}*\n` +
      (event.description ? `📝 ${event.description}\n` : '') +
      `\nНе забудьте прийти!`;

    for (const p of event.participants) {
      const student = await prisma.student.findFirst({
        where: { fullName: p.fullName, chatId: { not: null } },
      });
      if (!student?.chatId) continue;
      try {
        await bot.sendMessage(student.chatId, message, { parse_mode: 'Markdown' });
      } catch (e) { console.error(e); }
    }
  }
}
