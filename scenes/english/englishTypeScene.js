const { Scenes, Markup } = require('telegraf');
const { Builder, By, Key, until, Select} = require('selenium-webdriver')
const {MONTHS} = require("../../config/month");
const {getDateIntervals, chunkArray} = require('../../config/helpers');
const cities = require("../../config/cities");
const countries = require("../../config/countries");
const Cron = require("../../cron");
// islamberdiev18@gmail.com
// Welcome123!

class WizardEnglishScene {
  constructor() {
    this.storage = {};
    // this.botCTX = null;
    // this.driver = null;
    this.scene = this.init();
    // this.cron = new Cron({time: '*/10 * * * *'});
  }

  init() {
    return new Scenes.WizardScene('englishTypeScene', ...this.sceneMethods());
  }

  setBotCtx(ctx) {
    const userID = ctx.from.id;

    if(!this.storage[userID]) {
      this.storage[userID] = {};
    }

    this.storage[userID].botCTX = ctx;
    this.storage[userID].cron = new Cron({time: '*/2 * * * *'});
  }

  async commandMiddleware(botCTX, text) {
    if(!text?.includes('/')) return {status: true};
    console.log("commandMiddleware");

    return this.quitScene(botCTX);
  }

  async quitScene(botCTX) {
    console.log("quitScene start");
    console.log(botCTX);
    const userID = botCTX.from.id;
    console.log("quitScene", userID);

    if(this.storage[userID].driver) await this.storage[userID].driver.quit();

    await this.storage[userID].botCTX.scene.leave();

    return {status: false};
  }

  sceneMethods() {
    const chooseCountry = async (ctx) => {
      const countriesMarkup = Object.entries(countries)?.map(([key,value]) => {
        return {
          text: key,
          callback_data: value,
        };
      });

      await ctx.reply('1. Choose country', Markup.inlineKeyboard(chunkArray(countriesMarkup, 3))).catch(error => console.log(error))

      return ctx.wizard.next();
    }
    const enterLogin = async (ctx) => {
      const {status} = await this.commandMiddleware(ctx, ctx?.message?.text);

      if(!status) return;

      ctx.session.country = ctx.update.callback_query.data;

      await ctx.reply('2. Enter login');

      return ctx.wizard.next();
    }

    const enterPassword = async (ctx) => {
      const {status} = await this.commandMiddleware(ctx, ctx.message.text);

      if(!status) return;

      ctx.session.login = ctx.message.text;

      await ctx.reply('3. Enter password');

      return ctx.wizard.next();
    }

    const enterDatePeriod = async (ctx) => {
      const {status} = await this.commandMiddleware(ctx, ctx.message.text);

      if(!status) return;

      ctx.session.password = ctx.message.text;

      await ctx.reply('4. Enter appointment period in format dd.mm.yyyy-dd.mm.yyyy');

      return ctx.wizard.next();
    }

    const enterStopSearch = async (ctx) => {
      const {status} = await this.commandMiddleware(ctx, ctx.message.text);

      if(!status) return;

      ctx.session.period = ctx.message.text;

      await ctx.reply('5. Enter for how many days bot need to stop searching appointment');

      return ctx.wizard.next();
    }

    const connectToSelenium = async (ctx) => {
      const userID = ctx.from.id;

      const {status} = await this.commandMiddleware(ctx, ctx.message.text);

      if(!status) return;

      ctx.session.stopDays = ctx.message.text;

      const country = ctx.session.country;
      const login = ctx.session.login;
      const password = ctx.session.password;

      this.storage[userID].driver = new Builder().forBrowser('chrome').build()

      this.openWebSite(ctx, {login, password, country});

      return ctx.wizard.next();
    }

    const setCity = async (ctx) => {
      const {status} = await this.commandMiddleware(ctx, ctx?.message?.text);

      if(!status) return;

      if(ctx.session.city) return ctx.wizard.next();

      ctx.session.city = ctx.update.callback_query.data;

      await this.getAppointmentDatesWithCitySelect(ctx);

      return ctx.wizard.next();
    }


    const setTime = async (ctx) => {
      const userID = ctx.from.id;
      const {status} = await this.commandMiddleware(ctx, ctx?.message?.text);

      if(!status) return;

      const dateTime = ctx.update.callback_query.data;;
        const [date,time] = dateTime.split('|');

        const sectionDate = await this.storage[userID].driver.findElement(By.id('appointments_consulate_appointment_date_input'));
        await sectionDate.click();
        await this.storage[userID].driver.sleep(750);

        await this.datepickerSearch(ctx, date);

       await this.storage[userID].driver.sleep(2500);

        const drpCountry = new Select(this.storage[userID].driver.findElement(By.id("appointments_consulate_appointment_time")));
        drpCountry.selectByVisibleText(time);

        await this.storage[userID].driver.sleep(2000);

        const submitButton = await this.storage[userID].driver.findElement(By.id('appointments_submit'));
        await submitButton.click();

        await this.storage[userID].driver.sleep(3000);

        const applicantBlock = await this.storage[userID].driver.findElement(By.className("instructions_body_applicant"));
        const applicantCard = await applicantBlock.findElement(By.className('card'));

        const applicantCardLabels = await applicantCard.findElements(By.xpath(".//label"));
        const applicantCardStrong = await applicantCard.findElements(By.xpath(".//strong"));
        const applicantCardTextBlock = await applicantCard.findElement(By.className("medium-12 columns"));
        const applicantCardText = await applicantCardTextBlock.findElement(By.xpath(".//p")).getText();

      const labels = [];

      for (const label of applicantCardLabels) {
        const text = await label.getText();

        labels.push(text);
      }

      const strongs = [];
      for (const strong of applicantCardStrong) {
        const text = await strong.getText();

        strongs.push(text);
      }

      const botData = `<b>${labels[0]}</b>\n${strongs[0]}\n\n<b>${labels[1]}</b>\n${strongs[1]}\n\n${applicantCardText}`;

      await this.storage[userID].botCTX.replyWithHTML(`${botData}`);

      console.log("finish bot");
      await this.quitScene(ctx);
    }

    return [chooseCountry, enterLogin, enterPassword, enterDatePeriod, enterStopSearch, connectToSelenium, setCity, setTime];
  }

  async getAppointmentDatesWithCitySelect(ctx) {
    const userID = ctx.from.id;

    const city = ctx.session.city;
    const country = ctx.session.country;
    const login = ctx.session.login;
    const password = ctx.session.password;
    const period = ctx.session.period;
    const stopDays = ctx.session.stopDays;

    const select = new Select(this.storage[userID].driver.findElement(By.id("appointments_consulate_appointment_facility_id")));
    select.selectByVisibleText(city);

    await this.storage[userID].driver.sleep(2500);

    const sectionDate = await this.storage[userID].driver.findElement(By.id('appointments_consulate_appointment_date_input'));
    await sectionDate.click();
    await this.storage[userID].driver.sleep(750);

    const [startDate,endDate] = period?.split('-');
    const intervalDates = getDateIntervals(startDate,endDate);

    const datesArr = [];

    for (const date of intervalDates) {
      const {status = 'fail'} = await this.datepickerSearch(ctx, date);
      await this.storage[userID].driver.sleep(3000);

      if(status === 'success') {
        const select =  new Select(this.storage[userID].driver.findElement(By.id("appointments_consulate_appointment_time")));
        const options = await select.getOptions();

        // const optionValues = [];

        for (const option of options) {
          const time = await option.getText();

          if(!time) continue;

          // optionValues.push(`${date}|${time}`);
          datesArr.push(`${date}|${time}`);
        }

        // datesArr.push(optionValues);

        const sectionDate = await this.storage[userID].driver.findElement(By.id('appointments_consulate_appointment_date_input'));
        await sectionDate.click();
        await this.storage[userID].driver.sleep(750);
      }
    }

    if(datesArr.length) {
      // const botAdaptedData = datesArr?.map((optionValues) => optionValues?.map((value) => `\n<code>${value}</code>`).join('')).join('\n');
      const availableDatesMarkup = datesArr?.map((value) => ({text: value, callback_data: value}));
      console.log(availableDatesMarkup);
      await this.storage[userID].botCTX.reply(`7. Choose one of the available dates`,  Markup.inlineKeyboard(chunkArray(availableDatesMarkup, 2)).resize()).catch(error => console.log(error));

      this.storage[userID].cron.stop();
    } else {
      this.storage[userID].cron.start(() => this.openWebSite(ctx,{login, password, country, city, needAuth: false}), {period, stopDays})

      await this.storage[userID].botCTX.replyWithHTML(`<b>Available dates for appointment not found :(</b>`);
    }
  }

  async openWebSite(botCTX, {login, password, country, needAuth = true, city}) {
    const userID = botCTX.from.id;

    try {
      await this.storage[userID].driver.get('https://ais.usvisa-info.com/en-us/countries_list/niv')
      await this.storage[userID].driver.findElement(By.xpath(`//a[@href='/en-${country}/niv']`)).click();

      if(needAuth) {
        await this.storage[userID].driver.findElement(By.linkText('Sign In')).click();
        await this.storage[userID].driver.findElement(By.id('user_email')).sendKeys(`${login}`);
        await this.storage[userID].driver.findElement(By.id('user_password')).sendKeys(`${password}`);
        await this.storage[userID].driver.sleep(2000);
        await this.storage[userID].driver.findElement(By.className('icheckbox')).click();
        await this.storage[userID].driver.findElement(By.className('button primary')).click();

        await this.storage[userID].driver.sleep(2000)
      }

      const cardElementsFromSite = await this.storage[userID].driver.findElements(By.className('alert application card ready_to_schedule'))

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
          await this.storage[userID].driver.get(link);
          const h5Element = await this.storage[userID].driver.findElement(By.tagName('h5'));
          await h5Element.click();

          const accordionContent = await this.storage[userID].driver.findElement(By.className('accordion-content'));
          const medium10Columns = await accordionContent.findElement(By.className('medium-10 columns'));
          await this.storage[userID].driver.executeScript("arguments[0].style.backgroundColor = 'red';", medium10Columns);
          const aElement = await medium10Columns.findElement(By.xpath("//p/a"));
          const aElementValue = await aElement.getAttribute('href');
          await this.storage[userID].driver.get(aElementValue);

          const sectionLocation = await this.storage[userID].driver.findElement(By.id('appointments_consulate_appointment_facility_id_input'));
          await this.storage[userID].driver.executeScript("arguments[0].style.backgroundColor = 'red';", sectionLocation);

          await this.storage[userID].driver.sleep(2500);

          const select = new Select(this.storage[userID].driver.findElement(By.id("appointments_consulate_appointment_facility_id")));
          const selectOptions = await select.getOptions();

          const optionValuesMarkup = [];

          for (const option of selectOptions) {
            const value = await option.getText();

            if(!value) continue;

            optionValuesMarkup.push({text: value, callback_data: value});
          }

          if(!city) {
            await this.storage[userID].botCTX.reply('6. Choose city', Markup.inlineKeyboard(chunkArray(optionValuesMarkup, 3))).catch(error => console.log(error))
          } else {
            await this.getAppointmentDatesWithCitySelect(botCTX);
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

  async datepickerSearch(botCTX, date) {
    const userID = botCTX.from.id;
    const [day, month, year] = date.split('.');

    const datepicker = await this.storage[userID].driver.findElement(By.className('ui-datepicker'));
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
          // console.log("found");
          const dates = await part.findElements(By.xpath(".//td[@data-handler='selectDay']")) || [];
          const arr = [];

          for (const date of dates) {
            const text = await date.getText();

            arr.push(text);
          }

          const activeDayIndex = arr.findIndex((item => item === day));

          if (activeDayIndex !== -1) {
            await dates[activeDayIndex].click();
            // console.log(`success = ${day}.${month}.${year}`);
            return {status: 'success', date: `${day}.${month}.${year}`};
          }

          console.log(`fail = ${day}.${month}.${year}`);
          //search for date
          return {status: 'fail'};
        }

        if(index === 0) continue;

        if(index === 1 && (conditionIfMonthBiggerAndYearEqualOrBigger || conditionIfMonthSmallerAndYearBigger)) {
          await this.storage[userID].driver.findElement(By.className('ui-datepicker-next')).click();
          // console.log('not found');
          return this.datepickerSearch(botCTX, date);
        }

      } catch (e) {
        console.log('Ошибка при обработке datepicker: ', e)
      }
    }
  }
}




module.exports = WizardEnglishScene;
