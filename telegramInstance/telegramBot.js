const { Telegraf, session, Markup, Scenes } = require("telegraf");
const WizardEnglishScene = require('../scenes/english/englishTypeScene');
const WizardTurkishScene = require('../scenes/english/turkishTypeScene');
const englishTypeScene = new WizardEnglishScene();
const turkishTypeScene = new WizardTurkishScene();

const stage = new Scenes.Stage([englishTypeScene.scene, turkishTypeScene.scene])
class TelegramBot {
	constructor(apiToken) {
		this.bot = new Telegraf(apiToken);
		this.bot.use(session())
		this.bot.use(stage.middleware())
	}

	start() {
		this.bot.command('start', async (ctx) => {
			await ctx.reply('Hi! For start searching appointment you need to pass some steps below.');
      // console.log("start");
      // setTimeout(async () => {

			// 	await ctx.reply('Choose appointment language', Markup.keyboard([['Turkish', 'English']]).resize()).catch(error => console.log(error))
			// }, 1000)
      englishTypeScene.setBotCtx(ctx);

      await ctx.scene.enter('englishTypeScene').catch(err => console.log(err))
		})
    //
		// this.bot.hears('English', async (ctx) => {
    //   englishTypeScene.setBotCtx(ctx);
    //
		// 	await ctx.scene.enter('englishTypeScene').catch(err => console.log(err))
		// })
    //
		// this.bot.hears('Turkish', async (ctx) => {
    //   turkishTypeScene.setBotCtx(ctx);
    //
    //   await ctx.scene.enter('turkishTypeScene').catch(err => console.log(err))
		// })

		this.bot.launch().then(() => {
			console.log('bot is start')
		}).catch(error => console.error(`Something went wrong: ${error}`))
	}
}

module.exports = TelegramBot
