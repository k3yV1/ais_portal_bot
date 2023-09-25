const { Scenes } = require('telegraf');
const { Builder, By, Key, until, Select} = require('selenium-webdriver')
const {MONTHS} = require("../../config/month");
const {getDateIntervals} = require('../../config/helpers');
// islamberdiev18@gmail.com
// Welcome123!

class WizardEnglishScene {
  constructor() {
    this.botCTX = null;
    this.driver = null;
    this.scene = this.init();
  }

  init() {
    return new Scenes.WizardScene('englishTypeScene', ...this.sceneMethods());
  }

  sceneMethods() {
    const enterLogin = async (ctx) => {
      this.botCTX = ctx;

      await ctx.reply('Введите логин');
      ctx.wizard.state.loginStep = true; // Устанавливаем флаг, что мы ждем логин
      return ctx.wizard.next();
    }

    const enterPassword = async (ctx) => {
      if (ctx.wizard.state.loginStep) {
        ctx.session.login = ctx.message.text;
        ctx.wizard.state.loginStep = false; // Снимаем флаг после получения логина
        await ctx.reply('Введите пароль');
        return ctx.wizard.next();
      }
    }

    const enterDatePeriod = async (ctx) => {
      ctx.session.password = ctx.message.text;
      await ctx.reply('Введите период собеседования в формате dd.mm.yyyy-dd.mm.yyyy');
      return ctx.wizard.next();
    }

    const connectToSelenium = async (ctx) => {
      ctx.session.period = ctx.message.text;

      const login = ctx.session.login;
      const password = ctx.session.password;
      const period = ctx.session.period;

      this.driver = new Builder().forBrowser('chrome').build()

      await this.openWebSite({login, password, period});

      return ctx.wizard.next();
    }

    const setTime = async (ctx) => {
      // if(ctx.wizard.state.dateTime) {
        const dateTime = ctx.message.text;
        const [date,time] = dateTime.split('|');

        console.log(time);
        const drpCountry = new Select(this.driver.findElement(By.id("appointments_consulate_appointment_time")));
        drpCountry.selectByVisibleText(time);
      // }

      // return ctx.scene.leave();
    }

    return [enterLogin, enterPassword, enterDatePeriod, connectToSelenium, setTime];
  }

  async openWebSite({login, password, period}) {
    try {
      await this.driver.get('https://ais.usvisa-info.com/en-us/countries_list/niv')
      await this.driver.findElement(By.xpath("//a[@href='/en-tr/niv']")).click();
      await this.driver.findElement(By.linkText('Sign In')).click();
      await this.driver.findElement(By.id('user_email')).sendKeys(`${login}`);
      await this.driver.findElement(By.id('user_password')).sendKeys(`${password}`);
      await this.driver.sleep(2000);
      await this.driver.findElement(By.className('icheckbox')).click();
      await this.driver.findElement(By.className('button primary')).click();

      await this.driver.sleep(2000)
      const cardElementsFromSite = await this.driver.findElements(By.className('alert application card ready_to_schedule'))

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
          await this.driver.get(link);
          const h5Element = await this.driver.findElement(By.tagName('h5'));
          await h5Element.click();

          const accordionContent = await this.driver.findElement(By.className('accordion-content'));
          const medium10Columns = await accordionContent.findElement(By.className('medium-10 columns'));
          await this.driver.executeScript("arguments[0].style.backgroundColor = 'red';", medium10Columns);
          const aElement = await medium10Columns.findElement(By.xpath("//p/a"));
          const aElementValue = await aElement.getAttribute('href');
          await this.driver.get(aElementValue);

          const sectionLocation = await this.driver.findElement(By.id('appointments_consulate_appointment_facility_id_input'));
          await this.driver.executeScript("arguments[0].style.backgroundColor = 'red';", sectionLocation);

          await this.driver.sleep(1000);
          const select = new Select(this.driver.findElement(By.id("appointments_consulate_appointment_facility_id")));
          select.selectByVisibleText('Ankara');

          await this.driver.sleep(3000);

          const sectionDate = await this.driver.findElement(By.id('appointments_consulate_appointment_date_input'));
          await sectionDate.click();
          await this.driver.sleep(500);


          const {status = 'fail', date} = await this.datepickerSearch(period);
          await this.driver.sleep(3000);

          if(status === 'success') {
            const select = await this.driver.findElement(By.id('appointments_consulate_appointment_time'));
            const options = await select.findElements(By.xpath(".//option"));

            const optionValues = [];

            for (const option of options) {
              const time = await option.getText();

              if(!time) continue;

              optionValues.push(`${date}|${time}`);
            }

            const botAdaptedData = optionValues?.map((value) => `\n<code>${value}</code>`).join('');
            await this.botCTX.replyWithHTML(`<b>Доступные даты для записи:</b>\n\n${botAdaptedData}`);
          } else if(status === 'fail') {
            await this.botCTX.replyWithHTML(`<b>Свободного времени по данному диапазону не найдено :(</b>`);
          }

          // await this.driver.sleep(30000); // 30 sec
        } catch (e) {
          console.log('Ошибка при клике на ссылке или записи данных: ', e);
        }
      }

    } catch (e) {
      console.error('Ошибка:', e);
    }
  }

  async datepickerSearch(period) {
    console.log(period);
    const [startDate,endDate] = period?.split('-');
    console.log(startDate, endDate);

    const intervalDates = getDateIntervals(startDate,endDate);

    console.log(intervalDates);

    const TEST_DATE = '13.11.2023';
    const [day, month, year] = TEST_DATE.split('.');

    const datepicker = await this.driver.findElement(By.className('ui-datepicker'));
    const datepickerParts = await datepicker.findElements(By.className('ui-datepicker-group'));

    for (const [index, part] of datepickerParts.entries()) {
      try {
        const partMonth =  await part.findElement(By.className('ui-datepicker-month')).getText();
        const numericPartMonth = MONTHS[partMonth.toLowerCase()];
        const partYear =  await part.findElement(By.className('ui-datepicker-year')).getText();
        const numericPartYear = Number(partYear);

        const conditionIfMonthBiggerAndYearEqualOrBigger = Number(month) > numericPartMonth && Number(year) >= numericPartYear;
        const conditionIfMonthSmallerAndYearBigger = Number(month) < numericPartMonth && Number(year) > numericPartYear;

        if(Number(month) === numericPartMonth && numericPartYear === Number(year)) {
          const dates = await part.findElements(By.xpath(".//td[@data-handler='selectDay']")) || [];
          const arr = [];

          for (const date of dates) {
            const text = await date.getText();

            arr.push(text);
          }

          const activeDayIndex = arr.findIndex((item => item === day));

          if (activeDayIndex !== -1) {
            await dates[activeDayIndex].click();
            return {status: 'success', date: `${day}.${month}.${year}`};
          }

          //search for date
          return {status: 'fail'};
        }

        if(index === 0) continue;

        if(index === 1 && (conditionIfMonthBiggerAndYearEqualOrBigger || conditionIfMonthSmallerAndYearBigger)) {
          await this.driver.findElement(By.className('ui-datepicker-next')).click();

          return this.datepickerSearch(period);
        }

      } catch (e) {
        console.log('Ошибка при обработке datepicker: ', e)
      }
    }
  }
}



// async function openWebSite(driver, {login, password, botCTX}) {
// 	const cardElements = [];
// 	try {
// 			await driver.get('https://ais.usvisa-info.com/en-us/countries_list/niv')
// 		  await driver.findElement(By.xpath("//a[@href='/en-tr/niv']")).click();
// 			await driver.findElement(By.linkText('Sign In')).click();
// 			await driver.findElement(By.id('user_email')).sendKeys(`${login}`);
// 			await driver.findElement(By.id('user_password')).sendKeys(`${password}`);
// 			await driver.sleep(2000);
// 			await driver.findElement(By.className('icheckbox')).click();
// 			await driver.findElement(By.className('button primary')).click();
//
// 			await driver.sleep(2000)
// 			const cardElementsFromSite = await driver.findElements(By.className('alert application card ready_to_schedule'))
//
// 			const links = [];
//
// 			for (const cardElement of cardElementsFromSite) {
// 				try {
// 					const rowElement = await cardElement.findElement(By.xpath(".//div[@class='row']"));
// 					const textRightElement = await rowElement.findElement(By.xpath(".//div[@class='medium-6 columns text-right']"));
// 					const linkElement = await textRightElement.findElement(By.xpath(".//ul/li/a"));
// 					const hrefValue = await linkElement.getAttribute('href')
//
// 					console.log('hrefValue: ', hrefValue)
//
// 					links.push(hrefValue);
//
// 				} catch (e) {
// 					console.log('Ошибка при поиске card: ', e)
// 				}
// 			}
//
// 			for (const link of links) {
// 				try {
// 					await driver.get(link);
// 					const h5Element = await driver.findElement(By.tagName('h5'));
// 					await h5Element.click();
//
// 					const accordionContent = await driver.findElement(By.className('accordion-content'));
// 					const medium10Columns = await accordionContent.findElement(By.className('medium-10 columns'));
// 					await driver.executeScript("arguments[0].style.backgroundColor = 'red';", medium10Columns);
// 					const aElement = await medium10Columns.findElement(By.xpath("//p/a"));
// 					const aElementValue = await aElement.getAttribute('href');
// 					await driver.get(aElementValue);
//
// 					const sectionLocation = await driver.findElement(By.id('appointments_consulate_appointment_facility_id_input'));
//           await driver.executeScript("arguments[0].style.backgroundColor = 'red';", sectionLocation);
// 					// const select = await new Select(sectionLocation);
//
//           // console.log("====== select =====", select);
//
//
// 					// Определите, как выбирать одну из двух стран на основе значения selectedLocation
// 					// if (selectedLocation === 'Location 1') {
// 					// 	await select.selectByVisibleText('Country 1');
// 					// } else if (selectedLocation === 'Location 2') {
// 					// 	await select.selectByVisibleText('Country 2');
// 					// }
//
//
// 					const select = await sectionLocation.findElement(By.id('appointments_consulate_appointment_facility_id'));
//           const option = await select.findElement(By.xpath(".//option[@value='124']"));
// 					await option.click();
//           await driver.sleep(3000);
//
//           const sectionDate = await driver.findElement(By.id('appointments_consulate_appointment_date_input'));
//           await sectionDate.click();
//           await driver.sleep(500);
//
//           const {status, date} = await datepickerSearch(driver);
//           console.log(status, date);
//           await driver.sleep(3000);
//
//           if(status === 'success') {
//             const select = await driver.findElement(By.id('appointments_consulate_appointment_time'));
//             const options = await select.findElements(By.xpath(".//option"));
//
//             const optionValues = [];
//
//             for (const option of options) {
//               const time = await option.getText();
//
//               if(!time) continue;
//
//               optionValues.push(`${date}|${time}`);
//             }
//
//             const botAdaptedData = optionValues?.map((value) => `\n<code>${value}</code>`).join('');
//
//             await botCTX.replyWithHTML(`<b>Доступные даты для записи:</b>\n\n${botAdaptedData}`);
//             // await option.click();
//             // await driver.sleep(3000);
//           }
//
// 					// await driver.sleep(30000); // 30 sec
// 				} catch (e) {
// 					console.log('Ошибка при клике на ссылке или записи данных: ', e);
// 				}
// 			}
//
// 	} catch (e) {
// 		console.error('Ошибка:', e);
// 	}
// }

// const datepickerSearch = async (driver, {} = {}) => {
//   const TEST_DATE = '13.11.2023';
//   const [day, month, year] = TEST_DATE.split('.');
//
//   const datepicker = await driver.findElement(By.className('ui-datepicker'));
//   const datepickerParts = await datepicker.findElements(By.className('ui-datepicker-group'));
//
//   for (const [index, part] of datepickerParts.entries()) {
//     try {
//      const partMonth =  await part.findElement(By.className('ui-datepicker-month')).getText();
//      const numericPartMonth = MONTHS[partMonth.toLowerCase()];
//      const partYear =  await part.findElement(By.className('ui-datepicker-year')).getText();
//      const numericPartYear = Number(partYear);
//
//      const conditionIfMonthBiggerAndYearEqualOrBigger = Number(month) > numericPartMonth && Number(year) >= numericPartYear;
//      const conditionIfMonthSmallerAndYearBigger = Number(month) < numericPartMonth && Number(year) > numericPartYear;
//
//       if(Number(month) === numericPartMonth && numericPartYear === Number(year)) {
//        const dates = await part.findElements(By.xpath(".//td[@data-handler='selectDay']"));
//        const arr = [];
//
//        for (const date of dates) {
//          const text = await date.getText();
//
//          arr.push(text);
//         }
//
//        const activeDayIndex = arr.findIndex((item => item === day));
//
//         if (activeDayIndex !== -1) {
//           await dates[activeDayIndex].click();
//           return {status: 'success', date: `${day}.${month}.${year}`};
//         }
//
//         //search for date
//        return ;
//      }
//
//      if(index === 0) continue;
//
//      if(index === 1 && (conditionIfMonthBiggerAndYearEqualOrBigger || conditionIfMonthSmallerAndYearBigger)) {
//        await driver.findElement(By.className('ui-datepicker-next')).click();
//
//        const data = await datepickerSearch(driver);
//        return data;
//      }
//
//     } catch (e) {
//       console.log('Ошибка при обработке datepicker: ', e)
//     }
//   }
// }

// const englishTypeScene = new Scenes.WizardScene('englishTypeScene',
// 	async (ctx) => {
// 		await ctx.reply('Введите логин');
// 		ctx.wizard.state.loginStep = true; // Устанавливаем флаг, что мы ждем логин
// 		return ctx.wizard.next();
//   },
// 	async (ctx) => {
// 		if (ctx.wizard.state.loginStep) {
// 			ctx.session.login = ctx.message.text;
// 			ctx.wizard.state.loginStep = false; // Снимаем флаг после получения логина
// 			await ctx.reply('Введите пароль');
//       ctx.wizard.state.dateTime = true; // Устанавливаем флаг, что мы ждем дату
//       return ctx.wizard.next();
// 		}
// 	},
// 	async (ctx) => {
// 		ctx.session.password = ctx.message.text;
//
// 		const login = ctx.session.login;
// 		const password = ctx.session.password;
//
// 		const driver = new Builder().forBrowser('chrome').build()
//     globalDriver = driver;
//
// 		await openWebSite(driver, {login, password, botCTX: ctx});
//
//     return ctx.wizard.next();
// 		// return ctx.scene.leave();
// 	},
//   async (ctx) => {
//     if(ctx.wizard.state.dateTime) {
//       const dateTime = ctx.message.text;
//       const [date,time] = dateTime.split('|');
//       console.log(time);
//       const drpCountry = new Select(globalDriver.findElement(By.id("appointments_consulate_appointment_time")));
//       drpCountry.selectByVisibleText(time);
//     }
//
//     return ctx.scene.leave();
//   });




module.exports = WizardEnglishScene;
