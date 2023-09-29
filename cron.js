const CronJob = require('cron').CronJob;
const { DateTime } = require("luxon");

class Cron {
// */5 * * * *
  constructor({time}) {
    this.time = time;
    this.job = null;
    this.isRunningJob = false;
  }

  start(callback, {stopDays = 0, period} = {}) {
    const [startPeriodDate] = period.split('-');
    const startDate = DateTime.fromFormat(startPeriodDate, "dd.MM.yyyy");
    const nowDate = DateTime.now();
    const diff = startDate.diff(nowDate, ['days']).toObject();

    if (diff.days <= Number(stopDays)) {
      this.stop();
      return;
    }

    if(this.isRunningJob) return;

    this.job = new CronJob(
      this.time,
      function() {
        callback?.();
        console.log('You will see this message every second');
      },
    );

    console.log("cron start");
    this.job.start();
    this.isRunningJob = true;
  }

  stop() {
    console.log("cron stop");
    if(!this.isRunningJob) return;

    this.job.stop();
    this.isRunningJob = false;
  }
}

module.exports = Cron;
