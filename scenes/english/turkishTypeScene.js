const { Scenes } = require('telegraf');
const { Builder, By, Key, until, Select} = require('selenium-webdriver')
const {MONTHS} = require("../../config/month");
const {getDateIntervals} = require('../../config/helpers');
const cities = require("../../config/cities");
const Cron = require("../../cron");
// islamberdiev18@gmail.com
// Welcome123!

class WizardTurkishScene {
  constructor() {
    this.botCTX = null;
    this.driver = null;
    this.scene = this.init();
    this.cron = new Cron({time: '*/10 * * * *'});
  }

  init() {
    return new Scenes.WizardScene('turkishTypeScene', ...this.sceneMethods());
  }

  setBotCtx(ctx) {
    this.botCTX = ctx;
  }

  sceneMethods() {
    const enterLogin = async (ctx) => {
      await ctx.reply('Enter login');
      // ctx.wizard.state.isLogin = true; // Устанавливаем флаг, что мы ждем логин

      return ctx.wizard.next();
    }

    const enterPassword = async (ctx) => {
      // if (ctx.wizard.state.loginStep) {
      ctx.session.login = ctx.message.text;
      // ctx.wizard.state.isLogin = false; // Снимаем флаг после получения логина
      await ctx.reply('Enter password');
      // ctx.wizard.state.isPassword = true

      return ctx.wizard.next();
      // }
    }

    const enterCity = async (ctx) => {
      ctx.session.password = ctx.message.text;

      const citiesData = cities.map((city, index) => {
        const breakChar = index % 2 === 0 ? '               ' : '\n\n';

        return `<code>${city}</code>${breakChar}`;
      }).join('');
      await ctx.replyWithHTML(`Choose city:\n\n${citiesData}`);
      return ctx.wizard.next();
    }

    const enterDatePeriod = async (ctx) => {
      ctx.session.city = ctx.message.text;
      await ctx.reply('Enter appointment period in format dd.mm.yyyy-dd.mm.yyyy');
      return ctx.wizard.next();
    }

    const enterStopSearch = async (ctx) => {
      ctx.session.period = ctx.message.text;

      await ctx.reply('Enter for how many days stop searching appointment');
      return ctx.wizard.next();
    }

    const connectToSelenium = async (ctx) => {
      ctx.session.stopDays = ctx.message.text;

      const login = ctx.session.login;
      const password = ctx.session.password;
      const period = ctx.session.period;
      const city = ctx.session.city;
      const stopDays = ctx.session.stopDays;

      this.driver = new Builder().forBrowser('chrome').build()

      await this.openWebSite({login, password, period, city, stopDays});

      return ctx.wizard.next();
    }

    const setTime = async (ctx) => {
      // if(ctx.wizard.state.dateTime) {
      const dateTime = ctx.message.text;
      const [date,time] = dateTime.split('|');

      const sectionDate = await this.driver.findElement(By.id('appointments_consulate_appointment_date_input'));
      await sectionDate.click();
      await this.driver.sleep(750);

      await this.datepickerSearch(date);

      await this.driver.sleep(2500);

      const drpCountry = new Select(this.driver.findElement(By.id("appointments_consulate_appointment_time")));
      drpCountry.selectByVisibleText(time);

      await this.driver.sleep(2000);

      const submitButton = await this.driver.findElement(By.id('appointments_submit'));
      await submitButton.click();

      await this.driver.sleep(3000);

      const applicantBlock = await this.driver.findElement(By.className("instructions_body_applicant"));
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

      await this.botCTX.replyWithHTML(`${botData}`);
      await this.driver.quit();
      // return ctx.scene.leave();
    }

    return [enterLogin, enterPassword, enterCity, enterDatePeriod, enterStopSearch, connectToSelenium, setTime];
  }

  async openWebSite({login, password, period, city, needAuth = true, stopDays}) {
    try {
      await this.driver.get('https://ais.usvisa-info.com/en-us/countries_list/niv')
      await this.driver.findElement(By.xpath("//a[@href='/tr-tr/niv']")).click();

      if(needAuth) {
        await this.driver.findElement(By.linkText('Oturum Aç')).click();
        await this.driver.findElement(By.id('user_email')).sendKeys(`${login}`);
        await this.driver.findElement(By.id('user_password')).sendKeys(`${password}`);
        await this.driver.sleep(2000);
        await this.driver.findElement(By.className('icheckbox')).click();
        await this.driver.findElement(By.className('button primary')).click();

        await this.driver.sleep(2000)
      }
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

          await this.driver.sleep(2500);
          const select = new Select(this.driver.findElement(By.id("appointments_consulate_appointment_facility_id")));
          select.selectByVisibleText(city);

          await this.driver.sleep(2500);

          const sectionDate = await this.driver.findElement(By.id('appointments_consulate_appointment_date_input'));
          await sectionDate.click();
          await this.driver.sleep(750);

          const [startDate,endDate] = period?.split('-');
          const intervalDates = getDateIntervals(startDate,endDate);

          const datesArr = [];

          for (const date of intervalDates) {
            const {status = 'fail'} = await this.datepickerSearch(date);
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

              datesArr.push(optionValues);

              const sectionDate = await this.driver.findElement(By.id('appointments_consulate_appointment_date_input'));
              await sectionDate.click();
              await this.driver.sleep(750);
            }
          }

          if(datesArr.length) {
            const botAdaptedData = datesArr?.map((optionValues) => optionValues?.map((value) => `\n<code>${value}</code>`).join('')).join('\n');
            await this.botCTX.replyWithHTML(`<b>Доступные даты для записи:</b>\n${botAdaptedData}`);
            this.cron.stop();
          } else {
            this.cron.start(() => this.openWebSite({login, password, period, city, needAuth: false, stopDays}), {period, stopDays})
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

  async datepickerSearch(date) {
    const [day, month, year] = date.split('.');

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
          console.log("found");
          const dates = await part.findElements(By.xpath(".//td[@data-handler='selectDay']")) || [];
          const arr = [];

          for (const date of dates) {
            const text = await date.getText();

            arr.push(text);
          }

          const activeDayIndex = arr.findIndex((item => item === day));

          if (activeDayIndex !== -1) {
            await dates[activeDayIndex].click();
            console.log(`success = ${day}.${month}.${year}`);
            return {status: 'success', date: `${day}.${month}.${year}`};
          }

          console.log(`fail = ${day}.${month}.${year}`);
          //search for date
          return {status: 'fail'};
        }

        if(index === 0) continue;

        if(index === 1 && (conditionIfMonthBiggerAndYearEqualOrBigger || conditionIfMonthSmallerAndYearBigger)) {
          await this.driver.findElement(By.className('ui-datepicker-next')).click();
          console.log('not found');
          return this.datepickerSearch(date);
        }

      } catch (e) {
        console.log('Ошибка при обработке datepicker: ', e)
      }
    }
  }
}




module.exports = WizardTurkishScene;
