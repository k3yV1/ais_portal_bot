const { Interval, DateTime} = require("luxon");

const getDateIntervals = (start, end) =>  {
  const startDate = DateTime.fromFormat(start, "dd.MM.yyyy");
  const endDate = DateTime.fromFormat(end, "dd.MM.yyyy");

  return Interval.fromDateTimes(
    startDate.startOf("day"),
    endDate.endOf("day"))
    .splitBy({ day: 1 }).map(d => d.start.toFormat('dd.MM.yyyy'));
}


module.exports = {getDateIntervals};
