import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../lib/prisma';
import { generateExemptionDoc } from './docGenerator';

let bot: TelegramBot | null = null;


export async function initBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) { console.warn('⚠️  BOT_TOKEN not set'); return; }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl) {
    bot = new TelegramBot(token, { polling: false });
    await bot.setWebHook(webhookUrl);
    console.log('🤖 Telegram bot started (webhook mode)');
  } else {
    bot = new TelegramBot(token, { polling: true });
    console.log('🤖 Telegram bot started (polling mode)');
  }

  bot.onText(/\/start/, async (msg) => {
    const username = msg.from?.username;
    const appUrl = process.env.WEBAPP_URL || 'https://fcadbot.site';
    const openAppKeyboard = {
      inline_keyboard: [[{ text: '🚀 Открыть приложение', web_app: { url: appUrl } }]],
    };

    if (!username) {
      bot!.sendMessage(msg.chat.id,
        '👋 *Добро пожаловать в ФКадБот!*\n\nЧтобы пользоваться приложением, установите username в настройках Telegram и нажмите /start ещё раз.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const coordinator = await prisma.coordinator.findUnique({ where: { telegramUsername: username } });
    if (coordinator) {
      await prisma.coordinator.update({ where: { id: coordinator.id }, data: { chatId: String(msg.chat.id) } });
      bot!.sendMessage(msg.chat.id,
        `👋 Добро пожаловать, *${coordinator.fullName}*!\n\nНажмите кнопку ниже, чтобы открыть приложение студсовета.`,
        { parse_mode: 'Markdown', reply_markup: openAppKeyboard }
      );
      return;
    }

    const student = await prisma.student.findFirst({ where: { telegramUsername: username } });
    if (student) {
      await prisma.student.update({ where: { id: student.id }, data: { chatId: String(msg.chat.id) } });
      bot!.sendMessage(msg.chat.id,
        `👋 Добро пожаловать, *${student.fullName}*!\n\nНажмите кнопку ниже, чтобы открыть приложение: мероприятия, освобождения, баллы и ходатайства.`,
        { parse_mode: 'Markdown', reply_markup: openAppKeyboard }
      );
      return;
    }

    bot!.sendMessage(msg.chat.id,
      '👋 *Добро пожаловать в ФКадБот — приложение студсовета ФКП!*\n\nЗдесь можно записываться на мероприятия, получать баллы, освобождения и подавать ходатайства.\n\n▫️ Нажмите *«Открыть приложение»*, чтобы войти\n▫️ Если вы ещё не зарегистрированы — пройдите быструю регистрацию прямо в приложении',
      { parse_mode: 'Markdown', reply_markup: openAppKeyboard }
    );
  });
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

const remindedEvents = new Set<string>();

export async function sendEventReminders() {
  if (!bot) return;
  try {
    const now = new Date();
    const tomorrowStart = new Date(now); tomorrowStart.setDate(now.getDate() + 1); tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart); tomorrowEnd.setHours(23, 59, 59, 999);

    const events = await prisma.event.findMany({
      where: { status: 'PUBLISHED', eventDate: { gte: tomorrowStart, lte: tomorrowEnd } },
    });

    for (const event of events) {
      const key = `${event.id}:${tomorrowStart.toISOString().slice(0, 10)}`;
      if (remindedEvents.has(key)) continue;
      remindedEvents.add(key);

      const dateStr = new Date(event.eventDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const message =
        `⏰ *Напоминание о мероприятии*\n━━━━━━━━━━━━━━━━━━━━\n📌 *${event.name}*\n📅 Завтра, *${dateStr}*\n${event.location ? `📍 ${event.location}\n` : ''}\nНе забудьте прийти и отметиться по QR-коду!`;

      const applications = await prisma.eventApplication.findMany({
        where: { eventId: event.id, status: { in: ['APPROVED', 'AWAITING_MARK'] } },
        include: { student: true },
      });
      const sent = new Set<string>();
      for (const app of applications) {
        const chatId = app.student?.chatId;
        if (chatId && !sent.has(chatId)) {
          sent.add(chatId);
          try { await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }); } catch (_) {}
        }
      }
    }
  } catch (e) { console.error('sendEventReminders error:', e); }
}

export async function sendExemptionPending(exemption: any) {
  if (!bot) return;
  const dateStr = new Date(exemption.exemptionDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const students = exemption.students.map((es: any, i: number) =>
    `${i + 1}. ${es.student?.fullName || es.externalName} | ${es.student?.groupNumber || es.externalGroup}`
  ).join('\n');
  const message =
    `📋 *Новая докладная на рассмотрении*\n━━━━━━━━━━━━━━━━━━━━\n📅 Дата: *${dateStr}*\n👤 Подал(а): *${exemption.coordinator.fullName}*\n📌 Причина: ${exemption.reason}\n👥 Студентов: *${exemption.students.length}*\n\n${students}\n\n⏳ Откройте приложение для подтверждения или отклонения`;
  const chatIds = await getChairmanChatIds();
  for (const chatId of chatIds) {
    try { await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
  }
}

export async function sendExemptionReport(exemption: any) {
  if (!bot) return;
  const dateStr = new Date(exemption.exemptionDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const students = exemption.students.map((es: any, i: number) =>
    `${i + 1}. ${es.student?.fullName || es.externalName} | ${es.student?.groupNumber || es.externalGroup}`
  ).join('\n');
  const message =
    `✅ *ДОКЛАДНАЯ ЗАПИСКА ПОДТВЕРЖДЕНА*\n━━━━━━━━━━━━━━━━━━━━\n📅 Дата: *${dateStr}*\n👤 Выставил(а): *${exemption.coordinator.fullName}*\n📌 Причина: ${exemption.reason}\n\n*Освобождённые студенты:*\n${students}\n\n✅ Пропуски ${dateStr} считать по уважительной причине`;
  let docBuffer: Buffer | null = null;
  try { docBuffer = await generateExemptionDoc(exemption); } catch (e) { console.error('docx error:', e); }
  const chatIds = [...await getChairmanChatIds(), ...await getSecretaryChatIds()];
  for (const chatId of [...new Set(chatIds)]) {
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
  const dateStr = new Date(exemption.exemptionDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const coordinator = await prisma.coordinator.findUnique({ where: { id: exemption.createdBy } });
  if (!coordinator?.chatId) return;
  const message =
    `❌ *Докладная отклонена*\n━━━━━━━━━━━━━━━━━━━━\n📅 Дата: *${dateStr}*\n📌 Причина подачи: ${exemption.reason}` +
    (rejectReason ? `\n\n💬 Причина отклонения: ${rejectReason}` : '') +
    `\n\nОбратитесь к председателю для уточнений.`;
  try { await bot.sendMessage(coordinator.chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
}

export async function sendBonusNotification(submission: any) {
  if (!bot) return;
  const monthNames = ['', 'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
  const monthName = monthNames[submission.month];
  const total = submission.entries.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const message =
    `🏆 *Заявка на премирование*\n━━━━━━━━━━━━━━━━━━━━\n👤 ${submission.coordinator.fullName}\n📅 Месяц: *${monthName} ${submission.year}*\n👥 Студентов: *${submission.entries.length}*\n💰 Сумма: *${total} BYN*\n\n⏳ Ожидает подтверждения`;
  const chatIds = await getChairmanChatIds();
  for (const chatId of chatIds) { try { await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); } }
}

export async function sendBonusReport(submission: any) {
  if (!bot) return;
  const monthNames = ['', 'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
  const monthName = monthNames[submission.month];
  const lines = submission.entries.map((e: any, i: number) =>
    `${i + 1}. ${e.student?.fullName || e.externalName} | ${e.student?.groupNumber || e.externalGroup} | *${e.amount} BYN*`
  ).join('\n');
  const total = submission.entries.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const message =
    `✅ *Премии подтверждены*\n━━━━━━━━━━━━━━━━━━━━\n📅 ${monthName} ${submission.year}\n👤 ${submission.coordinator.fullName}\n\n${lines}\n\n💰 *Итого: ${total} BYN*`;
  const chatIds = [...await getChairmanChatIds(), ...await getSecretaryChatIds()];
  for (const chatId of [...new Set(chatIds)]) { try { await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); } }
}

export async function sendBonusDoc(buffer: Buffer, filename: string, month: number, year: number) {
  if (!bot) return;
  const monthNames = ['', 'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
  const monthName = monthNames[month];
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



export async function sendPetitionPending(petition: any) {
  if (!bot) return;
  const typeLabel: Record<string, string> = {
    DISCOUNT: 'на скидку',
    DORMITORY: 'на общежитие',
    SPECIALIZATION: 'на профилизацию',
  };
  const message =
    `📋 *Новое ходатайство*\n━━━━━━━━━━━━━━━━━━━━\n👤 Студент: *${petition.student.fullName}*\n📌 Тип: *${typeLabel[petition.type] || petition.type}*\n💰 Баллов: *${petition.balanceAtSubmit}*\n\n⏳ Откройте приложение для подтверждения или отклонения`;

  try {
    const targets = await prisma.coordinator.findMany({
      where: { role: { in: ['CHAIRMAN', 'DEAN'] }, chatId: { not: null } },
    });
    const sent = new Set<string>();
    
    for (const t of targets) {
      if (t.chatId && !sent.has(t.chatId)) {
        sent.add(t.chatId);
        try { await bot.sendMessage(t.chatId, message, { parse_mode: 'Markdown' }); } catch (_) {}
      }
    }
  } catch (e) { console.error(e); }
}

export async function sendNewEvent(event: any) {
  if (!bot) return;
  const dateStr = new Date(event.eventDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const audienceLabel: Record<string, string> = { SS: 'студсовета', FKP: 'ФКП', ALL: 'всех студентов' };
  const message =
    `🎉 *Новое мероприятие!*\n━━━━━━━━━━━━━━━━━━━━\n📌 *${event.name}*\n📅 Дата: *${dateStr}*\n${event.location ? `📍 ${event.location}\n` : ''}${event.description ? `📝 ${event.description}\n` : ''}👥 Для: *${audienceLabel[event.audience] || 'всех'}*\n\n✍️ Записаться через приложение студсовета: @fcadbot\\_bot`;
  const options = {
    parse_mode: 'Markdown' as const,
    reply_markup: { inline_keyboard: [[{ text: '🚀 Открыть приложение и записаться', web_app: { url: process.env.WEBAPP_URL || 'https://fcadbot.site' } }]] },
  };

  try {
    let students;
    if (event.audience === 'SS') {
      students = await prisma.student.findMany({
        where: { chatId: { not: null }, sectors: { isEmpty: false } },
      });
    } else if (event.audience === 'FKP') {
      students = await prisma.student.findMany({
        where: { chatId: { not: null }, sectors: { hasSome: ['ФКП', 'фкп'] } },
      });
    } else {
      students = await prisma.student.findMany({ where: { chatId: { not: null } } });
    }

    const sent = new Set<string>();
    for (const s of students) {
      if (s.chatId && !sent.has(s.chatId)) {
        sent.add(s.chatId);
        try { await bot.sendMessage(s.chatId, message, options); } catch (e) { console.error(`Event notification failed for ${s.chatId}:`, e); }
      }
    }
  } catch (e) { console.error(e); }
}



async function getStudentChatIds(): Promise<string[]> {
  try {
    const students = await prisma.student.findMany({ where: { chatId: { not: null } } });
    return [...new Set(students.map((s) => s.chatId!).filter(Boolean))];
  } catch { return []; }
}

export async function sendExemptionToStudent(exemption: any, student: any) {
  if (!bot) return;
  if (!student.chatId) return;
  const dateStr = new Date(exemption.exemptionDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const message = '✅ *Вам выставлено освобождение*\n━━━━━━━━━━━━━━━━━━━━\n📅 Дата: *' + dateStr + '*\n📌 Причина: ' + exemption.reason + '\n👤 Выставил(а): *' + exemption.coordinator.fullName + '*\n\nОткройте приложение студсовета для просмотра: @fcadbot\\_bot';
  try { await bot.sendMessage(student.chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
}

export async function sendPointsAwarded(student: any, points: number, reason: string, balance: number) {
  if (!bot || !student?.chatId) return;
  const message = `⭐ *Вам начислены баллы*\n━━━━━━━━━━━━━━━━━━━━\n➕ Начислено: *${points}*\n📌 Причина: ${reason}\n💰 Текущий баланс: *${balance}*`;
  try {
    await bot.sendMessage(student.chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🚀 Открыть приложение', web_app: { url: process.env.WEBAPP_URL || 'https://fcadbot.site' } }]] },
    });
  } catch (e) { console.error(`Points notification failed for ${student.chatId}:`, e); }
}

export async function sendPetitionApproved(petition: any) {
  if (!bot) return;
  if (!petition.student.chatId) return;
  const typeLabel: Record<string, string> = {
    DISCOUNT: 'на скидку',
    DORMITORY: 'на общежитие',
    SPECIALIZATION: 'на профилизацию',
  };
  const typeName = typeLabel[petition.type] || petition.type;
  const message = '✅ *Ходатайство ' + typeName + ' одобрено!*\n━━━━━━━━━━━━━━━━━━━━\nРаспечатайте и подпишите в каб. 306-2.\n\nСкачать .docx можно в приложении: @fcadbot\\_bot';
  try { await bot.sendMessage(petition.student.chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
}

export async function sendPetitionDownloaded(petition: any) {
  if (!bot || !petition.student?.chatId) return;
  const message = `📥 *Ходатайство скачано*\n━━━━━━━━━━━━━━━━━━━━\nСтудент: *${petition.student.fullName}*\nТип: *${petition.type}*\n\nДокумент был скачан из приложения.`;
  try { await bot.sendMessage(petition.student.chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
}

export async function sendAttendanceMarked(student: any, eventName: string, eventDate: Date) {
  if (!bot) return;
  if (!student.chatId) return;
  const dateStr = eventDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const message = '✅ *Отмечено посещение*\n━━━━━━━━━━━━━━━━━━━━\n🎭 Мероприятие: *' + eventName + '*\n📅 Дата: *' + dateStr + '*\n\nВаше присутствие подтверждено.';
  try { await bot.sendMessage(student.chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
}

export async function checkMilestone(studentId: number) {
  if (!bot) return;
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || !student.chatId) return;

  const activeTransactions = await prisma.pointTransaction.findMany({
    where: { studentId, status: 'ACTIVE' },
  });
  const balance = activeTransactions.reduce((sum, t) => sum + t.points, 0);

  if (balance >= 100) {
    const hasActive = await prisma.petition.findFirst({
      where: { studentId, status: { in: ['PENDING', 'DRAFT'] } },
    });
    if (!hasActive) {
      const message = '🎉 *Поздравляем! Вы набрали ' + balance + ' баллов!*\n━━━━━━━━━━━━━━━━━━━━\nВы можете подать ходатайство.\n\nОткройте приложение студсовета: @fcadbot\\_bot';
      try { await bot.sendMessage(student.chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
    }
  }
}
