const { Telegraf, session, Markup, Scenes } = require("telegraf");
const WizardEnglishScene = require('../scenes/english/englishTypeScene');
const englishTypeScene = new WizardEnglishScene();

const stage = new Scenes.Stage([englishTypeScene.scene])
class TelegramBot {
	constructor(apiToken) {
		this.bot = new Telegraf(apiToken);
		this.bot.use(session())
		this.bot.use(stage.middleware())
	}

	start() {
		this.bot.command('start', async (ctx) => {
			await ctx.reply('Привет! Для начала выберите страну и язык прохождения интервью');
			setTimeout(async () => {
				await ctx.reply('Выберете язык прохождения интервью', Markup.keyboard([['Turkey', 'English']]).resize()).catch(error => console.log(error))
			}, 1000)
		})

		this.bot.hears('English', async (ctx) => {
      englishTypeScene.setBotCtx(ctx);

			await ctx.scene.enter('englishTypeScene').catch(err => console.log(err))
		})

		this.bot.hears('Turkey', async (ctx) => {
      await ctx.scene.enter('turkishTypeScene').catch(err => console.log(err))
		})

		this.bot.launch().then(() => {
			console.log('bot is start')
		}).catch(error => console.error(`Something went wrong: ${error}`))
	}
}

module.exports = TelegramBot
