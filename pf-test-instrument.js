// This is a temporary solution:
// In MSFS the BaseInstrument class exists, so we can use that as the parent (required by the SDK),
// but in the browser, it doesn't exist, so we are using an empty parent class.
// Obviously this useless indirection should be removed from the shipped solution,
// it is only for easier browser testing.
let isMsfs = typeof BaseInstrument === "function";

let GlassCockpitParent = isMsfs
  ? BaseInstrument
  : class {
      // empty functions just for the super() calls
      constructor() {}
      Init() {}
      connectedCallback() {}
      Update() {}
    };

class PfTestInstrument extends GlassCockpitParent {
  constructor() {
    super();
    // Not safe to call getElementById here in MSFS, only in connectedCallback()
  }

  get templateID() {
    return "PF-TEST-INSTRUMENT";
  }

  get isInteractive() {
    return true;
  }

  onInteractionEvent(args) {
    console.log("click");
  }

  Init() {
    super.Init();
  }

  connectedCallback() {
    super.connectedCallback();
    //get the static elements from html here
    this.currentPage = 0;
    this.elemPanel = document.getElementById("panel-container");
    this.pages = document.querySelectorAll(".page");
    this._setupButtons();

    this.pageClasses = [];
    this.pageClasses.push(new AttitudePage(this.pages[0]));
    this.pageClasses.push(new FlapsPage(this.pages[1]));
  }

  Update() {
    super.Update();
    let electricity;
    if (isMsfs) {
      // TODO CHANGE CIRCUIT VARIABLE TO THE RIGHT ONE FOR THE CURRENT USECASE
      electricity = SimVar.GetSimVarValue(CIRCUIT, "Bool");
      if (!electricity) return this._turnOff();
    } else {
      electricity = VarGet(CIRCUIT, "Bool");
      if (electricity == false) return this._turnOff();
    }
    if (electricity && this.elemPanel.getAttribute("state") == "off") {
      this._turnOn();
    }

    // do the updates here

    this.pageClasses[this.currentPage].update();
  }
  _setupButtons() {
    //Buttons
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    // Event listener for 'Previous' button
    prevBtn.addEventListener("click", () => {
      // Decrease the current page index if not on the first page
      if (this.currentPage > 0) {
        this.currentPage--;
        this._updatePage();
      }
    });

    // Event listener for 'Next' button
    nextBtn.addEventListener("click", () => {
      // Increase the current page index if not on the last page
      if (this.currentPage < this.pages.length - 1) {
        this.currentPage++;
        this._updatePage();
      }
    });
  }

  _updatePage() {
    // Hide all pages
    this.pages.forEach((page) => page.classList.remove("active"));
    // Show the current page
    this.pages[this.currentPage].classList.add("active");
  }

  _turnOff() {
    this.elemPanel.setAttribute("state", "off");
  }

  _turnOn() {
    this.elemPanel.setAttribute("state", "on");
  }
}

class AttitudePage {
  constructor(page) {
    this.svg = page.querySelector("#attitudeSvg");
    this.pitch_container = this.svg.getElementById("pitch_container");
    this.background = this.svg.getElementById("background");
    this.pitch_indicator = this.svg.getElementById("pitch_indicator");
    this.arrow = this.svg.getElementById("arrow");
    this.slip_indicator = this.svg.getElementById("slip_indicator");
  }
  update() {
    let pitch;
    let bank;
    if (isMsfs) {
      pitch = SimVar.GetSimVarValue(PITCH, "Radians");
      pitch = SimVar.GetSimVarValue(BANK, "Radians");
    } else {
      pitch = VarGet(PITCH, "Radians");
      bank = VarGet(BANK, "Radians");
    }

    this.pitch_container.style.transform = `rotate(${bank}deg)`;
    this.background.style.transform = `translateY(${pitch}px) scale(5, 5)`;
    this.pitch_indicator.style.transform = `translateY(${pitch}px)`;
    this.arrow.style.transform = `rotate(${bank}deg)`;
    this.slip_indicator.style.transform = `rotate(${bank}deg)`;
  }
}

class FlapsPage {
  constructor(page) {
    //get the static elements from html

    //Flaps
    this.flapsSvg = page.querySelector("#flaps-svg");
    this.leftFlap = this.flapsSvg.getElementById("left-flap");
    this.rightFlap = this.flapsSvg.getElementById("right-flap");
    this.line1 = this.flapsSvg.getElementById("line1");
    this.line2 = this.flapsSvg.getElementById("line2");

    //EGT
    this.tempSvg = page.querySelector("#temperature-svg");
    this.eng1Rect = this.tempSvg.getElementById("engine1");
    this.eng2Rect = this.tempSvg.getElementById("engine2");
    this.treshold1Rect = this.tempSvg.getElementById("treshold1");
    this.treshold2Rect = this.tempSvg.getElementById("treshold2");
    this.eng1Text = this.tempSvg.getElementById("eng1-text");
    this.eng2Text = this.tempSvg.getElementById("eng2-text");
  }

  update() {
    this._updateEGT();
    this._updateFlaps();
  }
  _updateFlaps() {
    //get the values of variabvles
    let leftFlap;
    let rightFlap;
    let line1pos;
    let line2pos;
    if (isMsfs) {
      leftFlap = SimVar.GetSimVarValue(LEFTFLAP, "Radians");
      rightFlap = SimVar.GetSimVarValue(RIGHTFLAP, "Radians");
      line1pos = SimVar.GetSimVarValue(LINE1POS, "Number");
      line2pos = SimVar.GetSimVarValue(LINE2POS, "Number");
    } else {
      leftFlap = VarGet(LEFTFLAP, "Radians");
      rightFlap = VarGet(RIGHTFLAP, "Radians");
      line1pos = VarGet(LINE1POS, "Number");
      line2pos = VarGet(LINE2POS, "Number");
    }
    //set the rotation of the flaps change flap rect's height
    this.leftFlap.setAttribute("height", this._calculateFillHeight(leftFlap, 0, 42));
    this.rightFlap.setAttribute("height", this._calculateFillHeight(rightFlap, 0, 42));

    //map the line position inputs[0, 1, 2] to convent to values [0, 20, 42]
    const posMap = {
      0: 0,
      1: 20,
      2: 42,
    };
    line1pos = posMap[line1pos] !== undefined ? posMap[line1pos] : line1pos;
    line2pos = posMap[line2pos] !== undefined ? posMap[line2pos] : line2pos;
    console.log(line1pos, line2pos);
    //set the line positions
    this.line1.style.transform = `translateY(${this._calculateFillHeight(line1pos, 0, 42)}px)`;
    this.line2.style.transform = `translateY(${this._calculateFillHeight(line2pos, 0, 42)}px)`;

    // Hide the line if the flap is in position (with a small threshold)
    const threshold = 0.1; // Adjust the threshold as needed
    if (Math.abs(leftFlap - line1pos) < threshold) {
      this.line1.style.display = "none";
    } else {
      this.line1.style.display = "block";
    }

    if (Math.abs(rightFlap - line2pos) < threshold) {
      this.line2.style.display = "none";
    } else {
      this.line2.style.display = "block";
    }

    console.log(leftFlap, rightFlap);
    // Apply the hide-children CSS class if both flaps are at 0
    if (leftFlap == 0 && rightFlap == 0) {
      this.flapsSvg.classList.add("hide-children");
    } else {
      this.flapsSvg.classList.remove("hide-children");
    }
  }

  _updateEGT() {
    //get the values of the variabvles
    let eng1Temp;
    let eng2Temp;
    let treshold1;
    let treshold2;
    let maxTemp;
    let minTemp;
    if (isMsfs) {
      eng1Temp = SimVar.GetSimVarValue(ENGINE1TEMP, "Rankine");
      eng2Temp = SimVar.GetSimVarValue(ENGINE2TEMP, "Rankine");
      treshold1 = SimVar.GetSimVarValue(TEMPTRESHOLD1, "celsius");
      treshold2 = SimVar.GetSimVarValue(TEMPTRESHOLD2, "celsius");
      maxTemp = SimVar.GetSimVarValue(TEMPMAX, "celsius");
      minTemp = SimVar.GetSimVarValue(TEMPMIN, "celsius");
    } else {
      eng1Temp = VarGet(ENGINE1TEMP, "Rankine");
      eng2Temp = VarGet(ENGINE2TEMP, "Rankine");
      treshold1 = VarGet(TEMPTRESHOLD1, "celsius");
      treshold2 = VarGet(TEMPTRESHOLD2, "celsius");
      maxTemp = VarGet(TEMPMAX, "celsius");
      minTemp = VarGet(TEMPMIN, "celsius");
    }
    //convert rankine to celsius
    eng1Temp = this._rankineToCelsius(eng1Temp);
    eng2Temp = this._rankineToCelsius(eng2Temp);

    //set the slider values
    this.eng1Rect.setAttribute("height", this._calculateFillHeight(eng1Temp, minTemp, maxTemp));
    this.eng2Rect.setAttribute("height", this._calculateFillHeight(eng2Temp, minTemp, maxTemp));

    //set text
    this.eng1Text.innerHTML = `${eng1Temp.toFixed(0)}°C`;
    this.eng2Text.innerHTML = `${eng2Temp.toFixed(0)}°C`;

    //set treshold height
    this.treshold1Rect.style.transform = `translateY(${this._calculateTresholdHeight(treshold1, minTemp, maxTemp)}px)`;
    this.treshold2Rect.style.transform = `translateY(${this._calculateTresholdHeight(treshold2, minTemp, maxTemp)}px)`;

    //color switching
    if (eng1Temp > treshold2) {
      this.eng1Rect.setAttribute("fill", "red");
      this.eng1Text.setAttribute("fill", "red");
    } else if (eng1Temp > treshold1) {
      this.eng1Rect.setAttribute("fill", "#FFBF00");
      this.eng1Text.setAttribute("fill", "#FFBF00");
    } else {
      this.eng1Rect.setAttribute("fill", "green");
      this.eng1Text.setAttribute("fill", "green");
    }

    if (eng2Temp > treshold2) {
      this.eng2Rect.setAttribute("fill", "red");
      this.eng2Text.setAttribute("fill", "red");
    } else if (eng2Temp > treshold1) {
      this.eng2Rect.setAttribute("fill", "#FFBF00");
      this.eng2Text.setAttribute("fill", "#FFBF00");
    } else {
      this.eng2Rect.setAttribute("fill", "green");
      this.eng2Text.setAttribute("fill", "green");
    }
  }
  _rankineToCelsius(rankine) {
    return (rankine - 491.67) * (5 / 9);
  }

  _calculateFillHeight(currentTemp, minTemp, maxTemp) {
    const maxHeight = 300;
    const minHeight = 0;

    if (currentTemp >= maxTemp) {
      return maxHeight;
    } else if (currentTemp <= minTemp) {
      return minHeight;
    } else {
      return ((currentTemp - minTemp) / (maxTemp - minTemp)) * (maxHeight - minHeight) + minHeight;
    }
  }
  _calculateTresholdHeight(treshold, minTemp, maxTemp) {
    const maxHeight = 295;

    if (maxHeight === 0) {
      return 0;
    }
    return Math.min(((treshold - minTemp) / (maxTemp - minTemp)) * maxHeight, maxHeight);
  }
}

if (isMsfs) {
  registerInstrument("pf-test-instrument", PfTestInstrument);
} else {
  const glasscockpit = new PfTestInstrument();
  glasscockpit.Init();
  glasscockpit.connectedCallback();

  function loop(timestamp) {
    glasscockpit.Update();
    window.requestAnimationFrame(loop);
  }

  window.requestAnimationFrame(loop);
}
