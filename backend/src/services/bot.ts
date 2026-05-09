import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';
import { generateExemptionDoc } from './docGenerator';

let bot: TelegramBot | null = null;
const prisma = new PrismaClient();

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
    if (!username) return;
    const coordinator = await prisma.coordinator.findUnique({ where: { telegramUsername: username } });
    if (coordinator) {
      await prisma.coordinator.update({ where: { id: coordinator.id }, data: { chatId: String(msg.chat.id) } });
      bot!.sendMessage(msg.chat.id,
        `👋 Добро пожаловать, *${coordinator.fullName}*!\n\nОткройте Mini App через кнопку меню.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot!.sendMessage(msg.chat.id, '❌ Доступ запрещён.');
    }
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

export async function sendEventReminders() {
  // new function from updated repo - keep stub
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
    `📋 *Новое ходатайство*\n━━━━━━━━━━━━━━━━━━━━\n👤 Студент: *${petition.student.fullName}*\n📌 Тип: *${typeLabel[petition.type] || petition.type}*\n🎭 Мероприятий: *${petition.events.length}*\n\n⏳ Откройте приложение для подтверждения или отклонения`;

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
  const message =
    `🎉 *Новое мероприятие!*\n━━━━━━━━━━━━━━━━━━━━\n📌 *${event.name}*\n📅 Дата: *${dateStr}*\n${event.description ? `📝 ${event.description}\n` : ''}\n✍️ Записаться можно через приложение студсовета: @fcadbot_bot`;
  
  // Notify all students who have chatId
  try {
    const students = await prisma.student.findMany({ where: { chatId: { not: null } } });
    const sent = new Set<string>();
    for (const s of students) {
      if (s.chatId && !sent.has(s.chatId)) {
        sent.add(s.chatId);
        try { await bot.sendMessage(s.chatId, message, { parse_mode: 'Markdown' }); } catch (_) {}
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
  const message = '✅ *Вам выставлено освобождение*\n━━━━━━━━━━━━━━━━━━━━\n📅 Дата: *' + dateStr + '*\n📌 Причина: ' + exemption.reason + '\n👤 Выставил(а): *' + exemption.coordinator.fullName + '*\n\nОткройте приложение студсовета для просмотра: @fcadbot_bot';
  try { await bot.sendMessage(student.chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
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
  const message = '✅ *Ходатайство ' + typeName + ' одобрено!*\n━━━━━━━━━━━━━━━━━━━━\nРаспечатайте и подпишите в каб. 306-2.\n\nСкачать .docx можно в приложении: @fcadbot_bot';
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

  const attendedCount = await prisma.eventParticipant.count({
    where: {
      fullName: student.fullName,
      groupNumber: student.groupNumber,
      attended: true,
      event: { attendanceFinalized: true },
    },
  });

  if (attendedCount > 0 && attendedCount % 5 === 0) {
    const existingPetitions = await prisma.petition.count({
      where: { studentId, status: { not: 'REJECTED' } },
    });
    const maxSlots = Math.floor(attendedCount / 5);
    const availableSlots = maxSlots - existingPetitions;
    if (availableSlots > 0) {
      const message = '🎉 *Поздравляем! Вы посетили ' + attendedCount + ' мероприятий!*\n━━━━━━━━━━━━━━━━━━━━\nВы можете подать ходатайство (доступно: ' + availableSlots + ' шт.).\n\nОткройте приложение студсовета: @fcadbot_bot';
      try { await bot.sendMessage(student.chatId, message, { parse_mode: 'Markdown' }); } catch (e) { console.error(e); }
    }
  }
}
