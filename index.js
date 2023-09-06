require('dotenv').config()
const TelegramBot = require('./telegramInstance/telegramBot')


const bot = new TelegramBot(process.env.TELEGRAM_API)
bot.start()

// bot.command("start", async (ctx) => {
// 	await ctx.reply('Привет! Для начала выберите страну и язык прохождения интервью.');
// 	const keyboard = {
// 		reply_markup: {
// 			keyboard: [['Turkiye'], ['English']]
// 		}
// 	}
// 	await ctx.reply('Выберите страну и язык:', keyboard);
// })

// bot.hears('English', async (ctx) => {
// 	const driver = new Builder()
// 		.forBrowser('chrome')
// 		.build();
//
// 	await openWebSite(driver)
// 	await ctx.reply('Вы выбрали страну и язык. Обработка данных начата.');
// })

// async function openWebSite(driver) {
// 	try {
// 		await driver.get('https://ais.usvisa-info.com/en-us/countries_list/niv')
// 		const element = await driver.findElement(By.xpath("//a[@href='/en-tr/niv']")).click();
// 	} catch (e) {
// 		console.error('Ошибка:', e);
// 	}
// }

// bot.launch().then(() => {
// 	console.log('Бот запустился')
// }).catch(error => {
// 	console.log(`Something went wrong: ${error}`)
// })