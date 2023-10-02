const { Interval, DateTime} = require("luxon");

const getDateIntervals = (start, end) =>  {
  const startDate = DateTime.fromFormat(start, "dd.MM.yyyy");
  const endDate = DateTime.fromFormat(end, "dd.MM.yyyy");

  return Interval.fromDateTimes(
    startDate.startOf("day"),
    endDate.endOf("day"))
    .splitBy({ day: 1 }).map(d => d.start.toFormat('dd.MM.yyyy'));
}

const chunkArray = (arr, size) =>
  arr.length > size
    ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
    : [arr];


module.exports = {getDateIntervals, chunkArray};
