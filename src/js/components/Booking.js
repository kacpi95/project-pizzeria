import { classNames, select, settings, templates } from '../settings.js';
import utils from '../utils.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(element) {
    const thisBooking = this;
    thisBooking.element = element;
    thisBooking.render(thisBooking.element);
    thisBooking.initWidgets();
    thisBooking.getData();
    thisBooking.selectedTable = null;
  }
  getData() {
    const thisBooking = this;

    const startDateParam =
      settings.db.dateStartParamKey +
      '=' +
      utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParam =
      settings.db.dateEndParamKey +
      '=' +
      utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [startDateParam, endDateParam],
      eventsCurrent: [startDateParam, endDateParam, settings.db.notRepeatParam],
      eventsRepeat: [endDateParam, settings.db.repeatParam],
    };
    const urls = {
      booking: `${settings.db.url}/${
        settings.db.bookings
      }?${params.booking.join('&')}`,
      eventsCurrent: `${settings.db.url}/${
        settings.db.events
      }?${params.eventsCurrent.join('&')}`,
      eventsRepeat: `${settings.db.url}/${
        settings.db.events
      }?${params.eventsRepeat.join('&')}`,
    };
    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])

      .then(function (allResponse) {
        const bookingResponse = allResponse[0];
        const eventsCurrentResponse = allResponse[1];
        const evenetsRepeatResponse = allResponse[2];

        return Promise.all([
          bookingResponse.json(),
          eventsCurrentResponse.json(),
          evenetsRepeatResponse.json(),
        ]);
      })
      .then(function ([bookings, eventsCurrent, eventsRepeat]) {
        // console.log(bookings);
        // console.log(eventsCurrent);
        // console.log(eventsRepeat);
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }
  parseData(bookings, eventsCurrent, eventsRepeat) {
    const thisBooking = this;

    thisBooking.booked = {};

    for (let item of bookings) {
      thisBooking.makedBooked(item.date, item.hour, item.duration, item.table);
    }
    for (let item of eventsCurrent) {
      thisBooking.makedBooked(item.date, item.hour, item.duration, item.table);
    }
    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;
    for (let item of eventsRepeat) {
      if (item.repeat == 'daily') {
        for (
          let loopDate = minDate;
          loopDate <= maxDate;
          loopDate = utils.addDays(loopDate, 1)
        )
          thisBooking.makedBooked(
            utils.dateToStr(loopDate),
            item.hour,
            item.duration,
            item.table
          );
      }
    }

    // console.log('thisBooking.booked', thisBooking.booked);

    thisBooking.updateDOM();
  }
  makedBooked(date, hour, duration, table) {
    const thisBooking = this;

    if (typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }
    const startHour = utils.hourToNumber(hour);

    for (
      let hourBlock = startHour;
      hourBlock < startHour + duration;
      hourBlock += 0.5
    ) {
      if (typeof thisBooking.booked[date][hourBlock] == 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
      }
      thisBooking.booked[date][hourBlock].push(table);
    }
  }
  updateDOM() {
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    let allAvailable = false;

    if (
      typeof thisBooking.booked[thisBooking.date] == 'undefined' ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] ==
        'undefined'
    ) {
      allAvailable = true;
    }

    for (let table of thisBooking.dom.tables) {
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
      }

      if (
        !allAvailable &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(
          tableId
        ) > -1
      ) {
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
      table.classList.remove('selected');
    }
    thisBooking.selectedTable = null;
  }

  render(element) {
    const thisBooking = this;
    const generateHTML = templates.bookingWidget;
    thisBooking.dom = {};
    thisBooking.dom.wrapper = element;
    thisBooking.dom.wrapper.innerHTML = generateHTML();

    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(
      select.booking.peopleAmount
    );
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(
      select.booking.hoursAmount
    );
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(
      select.widgets.datePicker.wrapper
    );
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(
      select.widgets.hourPicker.wrapper
    );
    thisBooking.dom.tables =
      thisBooking.dom.wrapper.querySelectorAll('.object.table');

    thisBooking.dom.submitButton =
      thisBooking.dom.wrapper.querySelector('.btn-secondary');

    thisBooking.dom.phone =
      thisBooking.dom.wrapper.querySelector('[name="phone"]');

    thisBooking.dom.address =
      thisBooking.dom.wrapper.querySelector('[name="address"]');

    thisBooking.dom.starters = thisBooking.dom.wrapper.querySelectorAll(
      select.booking.starters
    );
  }
  initWidgets() {
    const thisBooking = this;
    thisBooking.peopleAmountWidget = new AmountWidget(
      thisBooking.dom.peopleAmount
    );
    thisBooking.hoursAmountWidget = new AmountWidget(
      thisBooking.dom.hoursAmount
    );
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.wrapper.addEventListener('updated', function () {
      thisBooking.updateDOM();
    });
    for (let table of thisBooking.dom.tables) {
      table.addEventListener('click', function (event) {
        thisBooking.initTables(event);
      });
    }
    thisBooking.dom.submitButton.addEventListener('click', function (event) {
      event.preventDefault();
      thisBooking.sendBooking();
    });

    thisBooking.dom.peopleAmount.addEventListener('updated', function () {});
    thisBooking.dom.hoursAmount.addEventListener('updated', function () {});
    thisBooking.dom.datePicker.addEventListener('updated', function () {});
    thisBooking.dom.hourPicker.addEventListener('updated', function () {});
  }
  initTables(event) {
    const thisBooking = this;
    const clickedElement = event.currentTarget;

    if (clickedElement.classList.contains(classNames.booking.tableBooked)) {
      alert('Ten stolik jest już zajęty!');
      return;
    }

    if (clickedElement.classList.contains('selected')) {
      clickedElement.classList.remove('selected');
      thisBooking.selectedTable = null;
      return;
    }

    for (let table of thisBooking.dom.tables) {
      table.classList.remove('selected');
    }

    clickedElement.classList.add('selected');
    thisBooking.selectedTable = clickedElement.getAttribute(
      settings.booking.tableIdAttribute
    );
  }
  sendBooking() {
    const thisBooking = this;

    const url = `${settings.db.url}/${settings.db.bookings}`;

    const payload = {
      date: thisBooking.datePicker.value,
      hour: thisBooking.hourPicker.value,
      table:
        thisBooking.selectedTable !== null
          ? parseInt(thisBooking.selectedTable)
          : null,
      duration: thisBooking.hoursAmountWidget.value,
      ppl: thisBooking.peopleAmountWidget.value,
      starters: [],
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
    };

    for (let starter of thisBooking.dom.starters) {
      if (starter.checked) {
        payload.starters.push(starter.value);
      }
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then((response) => response.json())
      .then((parsedResponse) => {
        console.log('Booking response:', parsedResponse);

        thisBooking.makedBooked(
          payload.date,
          payload.hour,
          payload.duration,
          payload.table
        );

        thisBooking.updateDOM();
      });
  }
}

export default Booking;
