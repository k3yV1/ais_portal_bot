const { Scenes } = require('telegraf');
const { Builder, By, Key, until, Select} = require('selenium-webdriver')

// islamberdiev18@gmail.com
// Welcome123!

async function openWebSite(driver, login, password) {
	const cardElements = [];
	try {
			await driver.get('https://ais.usvisa-info.com/en-us/countries_list/niv')
		  await driver.findElement(By.xpath("//a[@href='/en-tr/niv']")).click();
			await driver.findElement(By.linkText('Sign In')).click();
			await driver.findElement(By.id('user_email')).sendKeys(`${login}`);
			await driver.findElement(By.id('user_password')).sendKeys(`${password}`);
			await driver.sleep(2000);
			await driver.findElement(By.className('icheckbox')).click();
			await driver.findElement(By.className('button primary')).click();

			await driver.sleep(2000)
			const cardElementsFromSite = await driver.findElements(By.className('alert application card ready_to_schedule'))

			const links = [];

			for (const cardElement of cardElementsFromSite) {
				try {
					const rowElement = await cardElement.findElement(By.xpath(".//div[@class='row']"));
					const textRightElement = await rowElement.findElement(By.xpath(".//div[@class='medium-6 columns text-right']"));
					const linkElement = await textRightElement.findElement(By.xpath(".//ul/li/a"));
					const hrefValue = await linkElement.getAttribute('href')

					console.log('hrefValue: ', hrefValue)

					links.push(hrefValue);

				} catch (e) {
					console.log('Ошибка при поиске card: ', e)
				}
			}

			for (const link of links) {
				try {
					await driver.get(link);
					const h5Element = await driver.findElement(By.tagName('h5'));
					await h5Element.click();

					const accordionContent = await driver.findElement(By.className('accordion-content'));
					const medium10Columns = await accordionContent.findElement(By.className('medium-10 columns'));
					await driver.executeScript("arguments[0].style.backgroundColor = 'red';", medium10Columns);
					const aElement = await medium10Columns.findElement(By.xpath("//p/a"));
					const aElementValue = await aElement.getAttribute('href');
					await driver.get(aElementValue);

					const sectionLocation = await driver.findElement(By.id('appointments_consulate_appointment_facility_id_input'))
					await driver.executeScript("arguments[0].style.backgroundColor = 'red';", sectionLocation);
					const select = await new Select(sectionLocation);

					// Определите, как выбирать одну из двух стран на основе значения selectedLocation
					if (selectedLocation === 'Location 1') {
						await select.selectByVisibleText('Country 1');
					} else if (selectedLocation === 'Location 2') {
						await select.selectByVisibleText('Country 2');
					}


					// const select = await sectionLocation.findElement(By.tagName('select'));

					// await select.click();

					await driver.sleep(30000); // 30 sec
				} catch (e) {
					console.log('Ошибка при клике на ссылке или записи данных: ', e);
				}
			}

	} catch (e) {
		console.error('Ошибка:', e);
	}
}

const englishTypeScene = new Scenes.WizardScene('englishTypeScene',
	async (ctx) => {
		await ctx.reply('Введите логин');
		ctx.wizard.state.loginStep = true; // Устанавливаем флаг, что мы ждем логин
		return ctx.wizard.next();
},
	(async (ctx) => {
		if (ctx.wizard.state.loginStep) {
			ctx.session.login = ctx.message.text;
			ctx.wizard.state.loginStep = false; // Снимаем флаг после получения логина
			await ctx.reply('Введите пароль');
			return ctx.wizard.next();
		}
	}),
	async (ctx) => {
		ctx.session.password = ctx.message.text;

		const login = ctx.session.login
		const pass = ctx.session.password

		const driver = new Builder().forBrowser('chrome').build()

		await openWebSite(driver, login, pass);

		return ctx.scene.leave();
	})


module.exports = englishTypeScene;