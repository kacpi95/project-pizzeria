import { settings, select } from '../settings.js';

class AmountWidget {
  constructor(element) {
    const thisWidget = this;
    thisWidget.getElements(element);
    const inputValue = thisWidget.input.value;
    if (inputValue) {
      thisWidget.setValue(inputValue);
    } else {
      thisWidget.setValue(settings.amountWidget.defaultValue);
    }
    thisWidget.initActions();
  }
  getElements(element) {
    const thisWidget = this;

    thisWidget.element = element;
    thisWidget.input = thisWidget.element.querySelector(
      select.widgets.amount.input
    );
    thisWidget.linkDecrease = thisWidget.element.querySelector(
      select.widgets.amount.linkDecrease
    );
    thisWidget.linkIncrease = thisWidget.element.querySelector(
      select.widgets.amount.linkIncrease
    );
  }
  setValue(value) {
    const thisWidget = this;
    const firstValue = thisWidget.value;
    let newValue = parseInt(value);

    if (thisWidget.value !== newValue && !isNaN(newValue)) {
      thisWidget.value = newValue;
      this.announce();
    } else {
      newValue = firstValue;
    }
    if (newValue < settings.amountWidget.defaultMin) {
      newValue = settings.amountWidget.defaultMin;
    } else if (newValue > settings.amountWidget.defaultMax) {
      newValue = settings.amountWidget.defaultMax;
    }
    thisWidget.value = newValue;
    thisWidget.input.value = thisWidget.value;
  }
  initActions() {
    const thisWidget = this;
    thisWidget.input.addEventListener('change', (event) => {
      thisWidget.setValue(event.target.value);
    });
    thisWidget.linkDecrease.addEventListener('click', (event) => {
      event.preventDefault();
      thisWidget.setValue(thisWidget.value - 1);
    });
    thisWidget.linkIncrease.addEventListener('click', (event) => {
      event.preventDefault();
      thisWidget.setValue(thisWidget.value + 1);
    });
  }
  announce() {
    const thisWidget = this;
    const event = new CustomEvent('updated', {
      bubbles: true,
    });
    thisWidget.element.dispatchEvent(event);
  }
}

export default AmountWidget;
