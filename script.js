var heatmap_selected = 3;

function textColorFromBackground(bg_color) {
  return d3.lab(bg_color).l >= 50 ? "black": "white";
}

var results = [];
var current_result = 0;

let currentFilter = "",
  prevFilter = "",
  orderAsc = true;

const toggleOrder = () => {
  if (currentFilter === prevFilter) {
    orderAsc = !orderAsc;
  } else {
    orderAsc = true;
  }
};

const sortTable = (array, sortKey) => {
  return array.sort((a, b) => {
    let x = a[sortKey],
      y = b[sortKey];

    return orderAsc ? x - y : y - x;
  });
};

function encode(r) {
  return r.replace(/[\x26\x0A\x3c\x3e\x22\x27]/g, function(r) {
  return "&#" + r.charCodeAt(0) + ";";
  });
}

function getDistinctArray(arr) {
    var dups = {};
    return arr.filter(function(el) {
        var hash = el.valueOf();
        var isDup = dups[hash];
        dups[hash] = true;
        return !isDup;
    });
}

var finger_names = [
  "L Pinky",
  "L Ring",
  "L Middle",
  "L Index",
  "L Thumb",
  "R Thumb",
  "R Index",
  "R Middle",
  "R Ring",
  "R Pinky",
];

const renderTable = tableData => {

  updateNeedsKeyboard(tableData.length > 0);

  var max_total_effort = 0;
  Array.prototype.forEach.call(tableData, result => {
    if (max_total_effort < result.total_effort) {
      max_total_effort = result.total_effort;
    }
  });

  var sr = getSelectedResult();

  return `${tableData
    .map(item => {
      var relative_scale = 100 / max_total_effort;
      var distinct_chars = getDistinctArray(item.unknown_chars);
      var max_finger_usage = 0;
      var total_finger_usage = 0;
      var total_hand_usage = [0, 0];
      Array.prototype.forEach.call(item.usage_fingers, (finger, index) => {
        if (max_finger_usage < finger)
          max_finger_usage = finger;
        total_finger_usage += finger;
        if (index < 5)
          total_hand_usage[0] += finger;
        else
          total_hand_usage[1] += finger;
      });
      var finger_usage_string = "";
      Array.prototype.forEach.call(item.usage_fingers, (finger, index) => {
        finger_usage_string += `<div class="finger-wrapper" title="${finger}"><div class="finger-name">${finger_names[index]}<br />${precise(finger/total_finger_usage*100)}%</div><div class="finger-usage" style="height:${finger/max_finger_usage*100}%"></div></div>`;
      });
      finger_usage_string += `<div class="hand-usage" title="${precise(total_hand_usage[0]/total_finger_usage*100)}%" style="height:${total_hand_usage[0]/total_finger_usage*50}%"></div><div class="hand-usage" title="${precise(total_hand_usage[1]/total_finger_usage*100)}%" style="height:${total_hand_usage[1]/total_finger_usage*50}%"></div>`;
      return `
        <tr data-item-id="${item.id}" class="${(item.id == current_result) ? "selected ":""}result">
          <td><strong>${item.keyboard.keyboard_name}</strong><br />${item.keyboard.filename}</td>
          <td>${encode(item.corpus.slice(0, 12))}...</td>
          <td>${precise(item.total_effort)}${item.id!=current_result?`<sup>${precise(item.total_effort/sr.total_effort*100)}%</sup>`:""}</td>
          <td>${precise(item.finger_effort)}${item.id!=current_result?`<sup>${precise(item.finger_effort/sr.finger_effort*100)}%</sup>`:""}</td>
          <td>${precise(item.thumb_effort)}${item.id!=current_result?`<sup>${precise(item.thumb_effort/sr.thumb_effort*100)}%</sup>`:""}</td>
          <td>${precise(item.finger_base)}${item.id!=current_result?`<sup>${precise(item.finger_base/sr.finger_base*100)}%</sup>`:""}</td>
          <td>${precise(item.thumb_base)}${item.id!=current_result?`<sup>${precise(item.thumb_base/sr.thumb_base*100)}%</sup>`:""}</td>
          <td>${precise(item.finger_penalties)}${item.id!=current_result?`<sup>${precise(item.finger_penalties/sr.finger_penalties*100)}%</sup>`:""}</td>
          <td>${precise(item.path)}${item.id!=current_result?`<sup>${precise(item.path/sr.path*100)}%</sup>`:""}</td>
          <td title="${encode(distinct_chars.join(" "))}">${distinct_chars.length}</td>
        </tr>
        <tr><td colspan="10" class="graphs">
          <div class="graph base" title="Finger Base: ${precise(item.finger_base)}" style="width:${relative_scale * item.finger_base * K_B}%"></div><div class="graph base thumb" title="Thumb Base: ${precise(item.thumb_base)}" style="width:${relative_scale * item.thumb_base * K_B}%"></div><div class="graph penalties" title="Finger Penalties: ${precise(item.finger_penalties)}" style="width:${relative_scale * item.finger_penalties * K_P}%"></div><div class="graph penalties thumb" title="Thumb Penalties: ${precise(item.thumb_penalties)}" style="width:${relative_scale * item.thumb_penalties * K_P}%"></div><div class="graph path" title="Stroke Path: ${precise(item.path)}" style="width:${relative_scale * item.path * K_S}%"></div>
              </td></tr>
              <tr class="finger-row"><td colspan="10">
                <div class="buttons">
                  <span class="radio">
                  <button data-item-id="${item.id}" data-function="changeLayout" data-layout="0" class="item-button small${item.keyboard.layout==0?" selected":""}">Qwerty</button>
                  <button data-item-id="${item.id}" data-function="changeLayout" data-layout="1" class="item-button small${item.keyboard.layout==1?" selected":""}">Colemak</button>
                  <button data-item-id="${item.id}" data-function="changeLayout" data-layout="2" class="item-button small${item.keyboard.layout==2?" selected":""}">Dvorak</button>
                  <button data-item-id="${item.id}" data-function="changeLayout" data-layout="3" class="item-button small${item.keyboard.layout==3?" selected":""}">Colemak-DH</button>
                  </span>
                  <button data-item-id="${item.id}" data-function="removeResult" class="item-button small red">X</button>
                </div>
                <details data-item-id="${item.id}"${item.details?" open":""}>
                <summary><strong>Usage stats</strong></summary>
                <div class="finger-usages">
                  ${finger_usage_string}
                </div>
                </details>
              </td></tr>`;
    })
    .join("")}`;
};

const appendTable = (table, destination) => {
  document.querySelector(destination).innerHTML = table;
};

const handleSortClick = () => {
  const filters = document.querySelectorAll("#results th");

  Array.prototype.forEach.call(filters, filter => {
    filter.addEventListener("click", () => {
      if (!filter.dataset.filterValue) return false;

      Array.prototype.forEach.call(filters, filter => {
        filter.classList.remove("active");
      });
      filter.classList.add("active");
      currentFilter = filter.dataset.filterValue;
      toggleOrder();
      drawTable(false);
    });
  });
};

const getSelectedResult = () => {
  for (var i = 0; i < results.length; i++) {
    if (results[i].id == current_result)
      return results[i];
  }
}

const getResult = (id) => {
  for (var i = 0; i < results.length; i++) {
    if (results[i].id == id)
      return results[i];
  }
}
const getResultCurrentIndex = (id) => {
  for (var i = 0; i < results.length; i++) {
    if (results[i].id == id)
      return i;
  }
}

const drawTable = (selectLast) => {
  if (selectLast) {
    current_result = results.length - 1;
  }
  let newTableData = sortTable(results, currentFilter);
  let tableOutput = renderTable(newTableData);

  appendTable(tableOutput, "#results tbody");

  prevFilter = currentFilter;

  const rows = document.querySelectorAll("#results tr");
  Array.prototype.forEach.call(rows, row => {
    row.addEventListener("click", () => {
      if (!row.dataset.itemId) return false;
      current_result = row.dataset.itemId;
      var selected_result = getSelectedResult();
      drawTable(false);
      renderKeyboard(selected_result.keyboard);
      renderLayout(selected_result.keyboard);
    });
  });

  const details = document.querySelectorAll("#results tr details");
  Array.prototype.forEach.call(details, detail => {
    detail.addEventListener("click", () => {
      if (!detail.dataset.itemId) return false;
      var result = getResult(detail.dataset.itemId);
      result.details = !detail.open;
    });
  });

  const buttons = document.querySelectorAll("#results tr .item-button");
  Array.prototype.forEach.call(buttons, button => {
    button.addEventListener("click", () => {
      if (!button.dataset.function) return false;
      window[button.dataset.function](button);
    });
  });

};

function changeLayout(element) {
  var result = getResult(element.dataset.itemId);
  result.keyboard.layout = element.dataset.layout;
  computeResult(result);
  drawTable(false);
  if (current_result == result.id) {
    renderLayout(result.keyboard);
  }
}

function removeResult(element) {
  var result = getResult(element.dataset.itemId);
  var id = result.id;

  results.splice(getResultCurrentIndex(id), 1);

  if (current_result == id) {
    current_result = 0;
    renderKeyboard(getSelectedResult().keyboard);
    renderLayout(getSelectedResult().keyboard);
  }
  drawTable(false);
}

handleSortClick();

// layout lookup - qwerty, colemak, dvorak, colemak-dh
var keyboard_layout = {
  "q": ["q",   "q",  "'",  "q"],
  "w": ["w",   "w",  ",",  "w"],
  "e": ["e",   "f",  ".",  "f"],
  "r": ["r",   "p",  "p",  "p"],
  "t": ["t",   "g",  "y",  "b"],
  "y": ["y",   "j",  "f",  "j"],
  "u": ["u",   "l",  "g",  "l"],
  "i": ["i",   "u",  "c",  "u"],
  "o": ["o",   "y",  "r",  "y"],
  "p": ["p",   ";",  "m",  ";"],
  "a": ["a",   "a",  "a",  "a"],
  "s": ["s",   "r",  "o",  "r"],
  "d": ["d",   "s",  "e",  "s"],
  "f": ["f",   "t",  "i",  "t"],
  "g": ["g",   "d",  "u",  "g"],
  "h": ["h",   "h",  "d",  "m"],
  "j": ["j",   "n",  "h",  "n"],
  "k": ["k",   "e",  "t",  "e"],
  "l": ["l",   "i",  "n",  "i"],
  ";": [";",   "o",  "s",  "o"],
  "'": ["'",   "'",  "-",  "'"],
  "z": ["z",   "z",  ";",  "x"],
  "x": ["x",   "x",  "q",  "c"],
  "c": ["c",   "c",  "j",  "d"],
  "v": ["v",   "v",  "k",  "v"],
  "b": ["b",   "b",  "x",  "z"],
  "n": ["n",   "k",  "b",  "k"],
  "m": ["m",   "m",  "l",  "h"],
  ",": [",",   ",",  "w",  ","],
  ".": [".",   ".",  "v",  "."],
  "/": ["/",   "/",  "z",  "/"],
  "[": ["[",   "[",  "/",  "["],
  "]": ["]",   "]",  "=",  "]"],
  "-": ["-",   "-",  "[",  "-"],
  "=": ["=",   "=",  "]",  "="],

  "Q": ["Q",   "Q",  "\"", "Q"],
  "W": ["W",   "W",  "<",  "W"],
  "E": ["E",   "F",  ">",  "F"],
  "R": ["R",   "P",  "P",  "P"],
  "T": ["T",   "G",  "Y",  "B"],
  "Y": ["Y",   "J",  "F",  "J"],
  "U": ["U",   "L",  "G",  "L"],
  "I": ["I",   "U",  "C",  "U"],
  "O": ["O",   "Y",  "R",  "Y"],
  "P": ["P",   ":",  "M",  ":"],
  "A": ["A",   "A",  "A",  "A"],
  "S": ["S",   "R",  "O",  "R"],
  "D": ["D",   "S",  "E",  "S"],
  "F": ["F",   "T",  "I",  "T"],
  "G": ["G",   "D",  "U",  "G"],
  "H": ["H",   "H",  "D",  "M"],
  "J": ["J",   "N",  "H",  "N"],
  "K": ["K",   "E",  "T",  "E"],
  "L": ["L",   "I",  "N",  "I"],
  ":": [":",   "O",  "S",  "O"],
  "\"": ["\"", "\"", "_",  "\""],
  "Z": ["Z",   "Z",  ";",  "X"],
  "X": ["X",   "X",  "Q",  "C"],
  "C": ["C",   "C",  "J",  "D"],
  "V": ["V",   "V",  "K",  "V"],
  "B": ["B",   "B",  "X",  "Z"],
  "N": ["N",   "K",  "B",  "K"],
  "M": ["M",   "M",  "L",  "H"],
  "<": ["<",   "<",  "W",  "<"],
  ">": [">",   ">",  "V",  ">"],
  "|": ["|",   "|",  "Z",  "|"],
  "{": ["{",   "{",  "|",  "{"],
  "}": ["}",   "}",  "+",  "}"],
  "_": ["_",   "_",  "{",  "_"],
  "+": ["+",   "+",  "}",  "+"],
};

var legend_lookup = {
  "KC_LEFT": "<i class='fas fa-arrow-left'></i>",
  "KC_DOWN": "<i class='fas fa-arrow-down'></i>",
  "KC_UP":   "<i class='fas fa-arrow-up'></i>",
  "KC_RGHT": "<i class='fas fa-arrow-right'></i>",
  "KC_BSPC": "<i class='fas fa-backspace'></i>",
  "KC_DEL":  "<small>Del</small>",
  "KC_LALT": "<small>Alt</small>",
  "KC_LCTL": "<small>Ctrl</small>",
  "KC_LGUI": "<small>Os</small>",
  "KC_LSFT": "<small>Shft</small>",
  "KC_ESC":  "<small>Esc</small>",
  "KC_F1":   "<small>F1</small>",
  "KC_F2":   "<small>F2</small>",
  "KC_F3":   "<small>F3</small>",
  "KC_F4":   "<small>F4</small>",
  "KC_F5":   "<small>F5</small>",
  "KC_F6":   "<small>F6</small>",
  "KC_F7":   "<small>F7</small>",
  "KC_F8":   "<small>F8</small>",
  "KC_F9":   "<small>F9</small>",
  "KC_F10":  "<small>F10</small>",
  "KC_F11":  "<small>F11</small>",
  "KC_F12":  "<small>F12</small>",
};

var unicode_lookup = {
  "KC_NO":        "",
  "KC_TRNS":      "",
  "KC_SPC":       " ",
  "KC_TAB":       "⭾",
  "KC_A":         "a",
  "KC_B":         "b",
  "KC_C":         "c",
  "KC_D":         "d",
  "KC_E":         "e",
  "KC_F":         "f",
  "KC_G":         "g",
  "KC_H":         "h",
  "KC_I":         "i",
  "KC_J":         "j",
  "KC_K":         "k",
  "KC_L":         "l",
  "KC_M":         "m",
  "KC_N":         "n",
  "KC_O":         "o",
  "KC_P":         "p",
  "KC_Q":         "q",
  "KC_R":         "r",
  "KC_S":         "s",
  "KC_T":         "t",
  "KC_U":         "u",
  "KC_V":         "v",
  "KC_W":         "w",
  "KC_X":         "x",
  "KC_Y":         "y",
  "KC_Z":         "z",
  "KC_SCLN":      ";",
  "KC_COMM":      ",",
  "KC_DOT":       ".",
  "KC_SLSH":      "/",
  "KC_GRV":       "`",
  "KC_TILD":      "~",
  "KC_BSLS":      "\\",
  "KC_PIPE":      "|",
  "KC_QUOT":      "'",
  "KC_LSFT":      "⇧",
  "KC_RSFT":      "⇧",
  "KC_ENT":       "↵",
  "KC_BSPC":      "⌫",
  "KC_DEL":       "⌦",
  "KC_ESC":       "⎋",
  "KC_F1":        "F1",
  "KC_F2":        "F2",
  "KC_F3":        "F3",
  "KC_F4":        "F4",
  "KC_F5":        "F5",
  "KC_F6":        "F6",
  "KC_F7":        "F7",
  "KC_F8":        "F8",
  "KC_F9":        "F9",
  "KC_F10":       "F10",
  "KC_F11":       "F11",
  "KC_F12":       "F12",
  "KC_1":         "1",
  "KC_2":         "2",
  "KC_3":         "3",
  "KC_4":         "4",
  "KC_5":         "5",
  "KC_6":         "6",
  "KC_7":         "7",
  "KC_8":         "8",
  "KC_9":         "9",
  "KC_0":         "0",
  "KC_EXLM":      "!",
  "KC_AT":        "@",
  "KC_HASH":      "#",
  "KC_DLR":       "$",
  "KC_PERC":      "%",
  "KC_CIRC":      "^",
  "KC_AMPR":      "&",
  "KC_ASTR":      "*",
  "KC_LPRN":      "(",
  "KC_RPRN":      ")",
  "KC_MINS":      "-",
  "KC_UNDS":      "_",
  "KC_EQL":       "=",
  "KC_PLUS":      "+",
  "KC_DQUO":      "\"",
  "KC_LT":        "<",
  "KC_GT":        ">",
  "KC_QUES":      "?",
  "KC_COLN":      ":",
  "KC_LBRC":      "[",
  "KC_RBRC":      "]",
  "KC_LCBR":      "{",
  "KC_RCBR":      "}",
  "KC_LEFT":      "←",
  "KC_DOWN":      "↓",
  "KC_UP":        "↑",
  "KC_RGHT":      "→",
  "KC_HOME":      "⤒",
  "KC_END":       "⤓",
  "KC_PGUP":      "⇞",
  "KC_PGDN":      "⇟",
  "KC_LCTL":      "Ⓒ",
  "KC_RCTL":      "Ⓒ",
  "KC_LALT":      "Ⓐ",
  "KC_RALT":      "Ⓐ",
  "KC_LGUI":      "Ⓖ",
  "KC_RGUI":      "Ⓖ",
  "KC_MPLY":      "⏯",
  "KC_MNXT":      "⏭",
  "KC_VOLU":      "🕪",
  "KC_VOLD":      "🕩",
  "MO(1)":        "▲1",
  "MO(2)":        "▲2",
  "MO(3)":        "▲3",
  "MO(4)":        "▲4",
  "MO(5)":        "▲5",
  "MO(6)":        "▲6",
  "LT(1,KC_GRV)": "▲1",
};

var shift_keys = {
  "'": "\"",
  ";": ":",
  "/": "?",
  ",": "<",
  ".": ">",
  "a": "A",
  "b": "B",
  "c": "C",
  "d": "D",
  "e": "E",
  "f": "F",
  "g": "G",
  "h": "H",
  "i": "I",
  "j": "J",
  "k": "K",
  "l": "L",
  "m": "M",
  "n": "N",
  "o": "O",
  "p": "P",
  "q": "Q",
  "r": "R",
  "s": "S",
  "t": "T",
  "u": "U",
  "v": "V",
  "w": "W",
  "x": "X",
  "y": "Y",
  "z": "Z",
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
  "0": ")",
  "[": "{",
  "]": "}",
  "-": "_",
  "=": "+",
  "`": "~",
  "\\": "|",
};

var shifted_keys = {
  "\"": "'",
  ":": ";",
  "?": "/",
  "<": ",",
  ">": ".",
  "A": "a",
  "B": "b",
  "C": "c",
  "D": "d",
  "E": "e",
  "F": "f",
  "G": "g",
  "H": "h",
  "I": "i",
  "J": "j",
  "K": "k",
  "L": "l",
  "M": "m",
  "N": "n",
  "O": "o",
  "P": "p",
  "Q": "q",
  "R": "r",
  "S": "s",
  "T": "t",
  "U": "u",
  "V": "v",
  "W": "w",
  "X": "x",
  "Y": "y",
  "Z": "z",
  "!": "1",
  "@": "2",
  "#": "3",
  "$": "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  "{": "[",
  "}": "]",
  "_": "-",
  "+": "=",
  "~": "`",
  "|": "\\",
};

var keyboard = {};
var HOMEROW_OFFSET = 3;

function findKey(keyboard, character) {
  for (var layer = 0; layer < keyboard.layers; layer++) {
    for (var key = 0; key < keyboard.keymap.length; key++) {
      var c = keyLookup(keyboard.keymap[key].layers[layer].unicode, keyboard.layout);
      if (c == character) {
        return {index: key, layer: layer};
      }
    }
  }
  return -1;
}

function findKeys(keyboard, character) {
  var keys = [];
  for (var layer = 0; layer < keyboard.layers; layer++) {
    for (var key = 0; key < keyboard.keymap.length; key++) {
      var c = keyLookup(keyboard.keymap[key].layers[layer].unicode, keyboard.layout);
      if (c == character) {
        keys.push({index: key, layer: layer});
      }
    }
  }
  return keys;
}

function findKeyAtCoords(keyboard, x, y) {
  var closest_dist = 1000, dist, closest_index;
  for (var key = 0; key < keyboard.keymap.length; key++) {
    dist = Math.sqrt(Math.pow(keyboard.keymap[key].x - x, 2) + Math.pow(keyboard.keymap[key].y - y, 2));
    if (dist < closest_dist) {
      closest_dist = dist;
      closest_index = key;
    }
  }
  return {index: closest_index, dist: closest_dist};
}

function findKeyInMatrix(keyboard, row, col) {
  for (var key = 0; key < keyboard.keymap.length; key++) {
    if (keyboard.keymap[key].matrix_row == row && keyboard.keymap[key].matrix_col == col) {
      return {index: key};
    }
  }
  return -1;
}

function guessHomerow(keyboard) {
  // assumes that home row keys are all neighbors in the layout
  var lm, lp, rp, rm;
  // test for qwerty
  lm = findKey(keyboard, "d");
  lp = findKey(keyboard, "f");
  rp = findKey(keyboard, "j");
  rm = findKey(keyboard, "k");
  if ((lm.index + 1 == lp.index) && (rp.index + 1 == rm.index))
    return {leftPointer: lp, rightPointer: rp};
  // test for colemak
  lm = findKey(keyboard, "s");
  lp = findKey(keyboard, "t");
  rp = findKey(keyboard, "n");
  rm = findKey(keyboard, "e");
  if ((lm.index + 1 == lp.index) && (rp.index + 1 == rm.index))
    return {leftPointer: lp, rightPointer: rp};
  // test for dvorak
  lm = findKey(keyboard, "e");
  lp = findKey(keyboard, "i");
  rp = findKey(keyboard, "h");
  rm = findKey(keyboard, "t");
  if ((lm.index + 1 == lp.index) && (rp.index + 1 == rm.index))
    return {leftPointer: lp, rightPointer: rp};
  // test for beakl
  lm = findKey(keyboard, "e");
  lp = findKey(keyboard, "a");
  rp = findKey(keyboard, "s");
  rm = findKey(keyboard, "t");
  if ((lm.index + 1 == lp.index) && (rp.index + 1 == rm.index))
    return {leftPointer: lp, rightPointer: rp};
  return {leftPointer: { index: 3 }, rightPointer: { index: 4}};
}

function guessThumbs(keyboard, homerow) {
  var key_lp = keyboard.keymap[homerow.leftPointer.index];
  var key_rp = keyboard.keymap[homerow.rightPointer.index];
  var left = findKeyAtCoords(keyboard, key_lp.x + 0, key_lp.y + 2);
  var right = findKeyAtCoords(keyboard, key_rp.x - 0, key_lp.y + 2);
  return {left: left, right: right};
}

function guessFingerLocations(keyboard) {
  keyboard.fingers = [];
  var homerow = guessHomerow(keyboard);
  var thumbs = guessThumbs(keyboard, homerow);
  keyboard.fingers[0] = homerow.leftPointer.index - 3;
  keyboard.fingers[1] = homerow.leftPointer.index - 2;
  keyboard.fingers[2] = homerow.leftPointer.index - 1;
  keyboard.fingers[3] = homerow.leftPointer.index;
  keyboard.fingers[4] = thumbs.left.index;
  keyboard.fingers[5] = thumbs.right.index;
  keyboard.fingers[6] = homerow.rightPointer.index;
  keyboard.fingers[7] = homerow.rightPointer.index + 1;
  keyboard.fingers[8] = homerow.rightPointer.index + 2;
  keyboard.fingers[9] = homerow.rightPointer.index + 3;
}

function calcPenalty(key) {
  if (key.thumb)
    return (parseFloat(W_0) + W_HAND * Math.max((key.hand?2:-2) * (P_HAND - 0.5), 0) + W_THUMB);
  else
    return (parseFloat(W_0) + W_HAND * Math.max((key.hand?2:-2) * (P_HAND - 0.5), 0) + W_FINGER * P_FINGER[key.finger] + W_ROW * P_ROW[Math.max(Math.min(Math.round(key.row), 6), 0)]);
}

function guessBaseEffort(keyboard) {
  if (!keyboard.fingers)
    guessFingerLocations(keyboard);
  var keymap = keyboard.keymap;
  for (var key = 0; key < keymap.length; key++) {
    keymap[key].effort = 1000;
    for (var i = 0; i < 10; i++) {
      var hrk = keymap[keyboard.fingers[i]];
      var temp_key = {};
      temp_key.dist = Math.sqrt(Math.pow(keymap[key].x + (keymap[key].w / 2) - hrk.x - (hrk.w / 2), 2) + Math.pow(keymap[key].y + (keymap[key].h / 2) - hrk.y - (hrk.h / 2), 2));
      temp_key.thumb = (i == 4 || i == 5);
      // temp_key.base = Math.pow(temp_key.dist, (temp_key.thumb ? 3 : 2));
      temp_key.base = temp_key.dist * (temp_key.thumb ? 4 : 2);
      temp_key.finger = (i > 4 ? i - 2 : i);
      temp_key.raw_finger = i;
      temp_key.hand = (i > 4);
      temp_key.row = keymap[key].y - hrk.y + HOMEROW_OFFSET;
      temp_key.penalty = calcPenalty(temp_key);
      temp_key.effort = temp_key.base + temp_key.penalty;
      if (temp_key.effort < keymap[key].effort) {
        keymap[key] = {...keymap[key], ...temp_key};
      }
    }
  }
}

function loadLayout(info) {
  var keymap = [];

  for (var i = 0; i < info.layout.length; i++) {
    var w = 1, h = 1;
    if (info.layout[i].w)
      w = info.layout[i].w;
    if (info.layout[i].h)
      h = info.layout[i].h;
    keymap[i] = {};
    keymap[i] = info.layout[i];
    keymap[i].x = parseFloat(keymap[i].x);
    keymap[i].y = parseFloat(keymap[i].y);
    keymap[i].matrix_row = parseInt(keymap[i].y);
    keymap[i].matrix_col = parseInt(keymap[i].x);
    keymap[i].w = parseFloat(w);
    keymap[i].h = parseFloat(h);
    keymap[i].i = i;
    keymap[i].layers = [];
  }
  return keymap;
}

function precise(x) {
  return Number.parseFloat(x).toPrecision(4);
}

function keyLookup(character, layout) {
  if (keyboard_layout[character])
    return keyboard_layout[character][layout];
  return character;
}

function renderLayout(keyboard) {
  var layout_element = document.getElementById("keymap");
  var inner = "";
  var keymap = keyboard.keymap;

  var max_effort = 1;
  var max_base = 1;
  var max_penalties = 1;
  var max_count = 0;
  var max_ghost = 0;
  for (var i = 0; i < keymap.length; i++) {
    var effort = keymap[i].penalty + keymap[i].base;
    if (max_effort < effort)
      max_effort = effort;
    if (max_base < keymap[i].base)
      max_base = keymap[i].base;
    if (max_penalties < keymap[i].penalty)
      max_penalties = keymap[i].penalty;
    if (max_count < keymap[i].count)
      max_count = keymap[i].count;
    if (max_ghost < keymap[i].ghost)
      max_ghost = keymap[i].ghost;
  }
  for (var i = 0; i < keymap.length; i++) {
    var key_html = "";
    for (var layer = 0; layer < keymap[i].layers.length; layer++) {
      var k = keymap[i].layers[layer].keycode;
      var l = keyLookup(keymap[i].layers[layer].legend, keyboard.layout);
      var u = keyLookup(keymap[i].layers[layer].unicode, keyboard.layout);
      key_html += `<div class="legend legend-${layer}${l && l.includes("▲")?` layer-${l.substring(1, 2)}`:""}" title="${u}, ${k}">${l && l.includes("▲")?"▲":l}</div>`;
    }
    var effort = precise(keymap[i].penalty + keymap[i].base);
    var effort_bg = d3.interpolatePuBuGn(1 - effort/max_effort);
    var effort_fg = textColorFromBackground(effort_bg);

    var base = precise(keymap[i].base);
    var base_bg = d3.interpolatePuBuGn(1 - keymap[i].base/max_base);
    var base_fg = textColorFromBackground(base_bg);

    var penalties = precise(keymap[i].penalty);
    var penalties_bg = d3.interpolatePuBuGn(1 - keymap[i].penalty/max_penalties);
    var penalties_fg = textColorFromBackground(penalties_bg);

    var usage = precise(keymap[i].usage * 100);
    var usage_bg = d3.interpolatePuBuGn(keymap[i].count / max_count);
    var usage_fg = textColorFromBackground(usage_bg);

    var finger = (keyboard.fingers.includes(i)?`<strong>( ${keymap[i].raw_finger} )</strong>`:keymap[i].raw_finger);
    var finger_bg = d3.schemeCategory10[keymap[i].raw_finger];
    var finger_fg = textColorFromBackground(finger_bg);

    var ghosts =  keymap[i].ghost;
    var ghosts_bg = d3.interpolatePuBuGn(keymap[i].ghost / max_ghost);
    var ghosts_fg = textColorFromBackground(ghosts_bg);

    inner += `<div id="key-${i}" class="key${selecting_keys?" selectable":""}" data-key="${i}" style="left: calc(${keymap[i].x} * (var(--key-spacing) + var(--key-unit))); top: calc(${keymap[i].y} * (var(--key-spacing) + var(--key-unit))); width: calc(${keymap[i].w} * (var(--key-unit) + var(--key-spacing)) - var(--key-spacing));">${key_html}
    <div class="heatmap heatmap-0" style="background:${effort_bg}; color: ${effort_fg}; display: ${heatmap_selected == 0 ? "block": "none"}">${effort}</div>
    <div class="heatmap heatmap-1" style="background:${base_bg}; color: ${base_fg}; display: ${heatmap_selected == 1 ? "block": "none"}">${base}</div>
    <div class="heatmap heatmap-2" style="background:${penalties_bg}; color: ${penalties_fg}; display: ${heatmap_selected == 2 ? "block": "none"}">${penalties}</div>
    <div class="heatmap heatmap-3" style="background:${usage_bg}; color: ${usage_fg}; display: ${heatmap_selected == 3 ? "block": "none"}">${usage}</div>
    <div class="heatmap heatmap-4" style="background:${finger_bg}; color: ${finger_fg}; display: ${heatmap_selected == 4 ? "block": "none"}">${finger}</div>
    <div class="heatmap heatmap-5 color-legends" style="display: ${heatmap_selected == 5 ? "block": "none"}">${key_html}</div>
    <div class="heatmap heatmap-6" style="background:${ghosts_bg}; color: ${ghosts_fg}; display: ${heatmap_selected == 6 ? "block": "none"}">${ghosts}</div>
    </div>`;
  }

  layout_element.innerHTML = inner;

  const keys = document.querySelectorAll("#keymap .key");
  Array.prototype.forEach.call(keys, key => {
    key.addEventListener("click", () => {
      if (!selecting_keys) return false;
      var keyboard = getSelectedResult().keyboard;
      keyboard.fingers[selecting_home_position] = parseInt(key.dataset.key);
      selecting_home_position++;
      document.getElementById("home-positions").innerHTML = `Selecting ${finger_names[selecting_home_position]}`;
      if (selecting_home_position == 10) {
        selecting_keys = false;
        document.getElementById("home-positions").innerHTML = `Select Home Positions`;
      }
      guessBaseEffort(keyboard);
      computeResult(getSelectedResult());
      renderLayout(keyboard);
      drawTable(false);
    });
  });
}

var selecting_home_position = 0;

const lsft = /LSFT\((.+)\)/;

function loadLayers(keyboard, layers) {
  keyboard.layers = layers.length;
  for (var layer = 0; layer < layers.length; layer++) {
    for (var key = 0; key < layers[layer].length; key++) {
      var m, unicode, legend, keycode = layers[layer][key];
      if (unicode_lookup[keycode] != null) {
        unicode = unicode_lookup[keycode];
      } else if ((m = lsft.exec(keycode)) != null) {
        if (shift_keys[unicode_lookup[m[1]]]) {
          unicode = shift_keys[unicode_lookup[m[1]]];
        } else {
          unicode = unicode_lookup[m[1]];
        }
      }
      if (legend_lookup[keycode] != null) {
        legend = legend_lookup[keycode];
      } else if ((m = lsft.exec(keycode)) != null && shift_keys[legend_lookup[m[1]]]) {
        legend = shift_keys[legend_lookup[m[1]]];
      } else {
        legend = unicode;
      }

      keyboard.keymap[key].layers[layer] = {};
      keyboard.keymap[key].layers[layer].keycode = layers[layer][key];
      keyboard.keymap[key].layers[layer].unicode = unicode;
      keyboard.keymap[key].layers[layer].legend = legend;
    }
  }
}

function loadKeymap(file, filename) {
  if (!file.keyboard) {
    console.log("No keyboard defined");
    return;
  }
  const fetchPromise = fetch('https://api.qmk.fm/v1/keyboards/' + file.keyboard);
  fetchPromise.then(promise => {
    return promise.json();
  }).then(response => {
    if (!Object.keys(response.keyboards).length || !response.keyboards[file.keyboard]) {
      console.log("Keyboard not found");
      return;
    }
    if (!response.keyboards[file.keyboard].layouts[file.layout]) {
      console.log("Layout not found");
      return;
    }
    keyboard = response.keyboards[file.keyboard];
    keyboard.layout = 0;
    renderKeyboard(keyboard);
    keyboard.keymap = loadLayout(keyboard.layouts[file.layout]);
    loadLayers(keyboard, file.layers)
    guessBaseEffort(keyboard);
    keyboard.filename = filename;

    var result_id = results.length;
    results[result_id] = {};
    results[result_id].id = result_id;
    results[result_id].keyboard = keyboard;
    results[result_id].corpus = document.getElementById("corpus").value;
    computeResult(results[result_id]);
    renderLayout(keyboard);
    drawTable(true);
  });
}

function renderKeyboard(keyboard) {
    var width = parseInt(getComputedStyle(document.getElementById("main-container")).getPropertyValue("width"));
    var padding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--key-padding'));
    var spacing = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--key-spacing'));
    var scale = width / keyboard.width;
    document.documentElement.style.setProperty('--key-unit', (scale-padding+(padding/keyboard.width))+'px');
    document.documentElement.style.setProperty('--keyboard-height', keyboard.height);
    document.documentElement.style.setProperty('--keyboard-width', keyboard.width);
}

if (window.File && window.FileReader && window.FileList && window.Blob) {

  function handleFiles(files) {
    for (var i = 0, f; f = files[i]; i++) {
        if (!f.type.match('application/json'))
          continue;
      var reader = new FileReader();
      reader.onload = (function(file) {
        return function(e) {
          var obj = JSON.parse(e.target.result);
          loadKeymap(obj, file.name);
        }
      })(f);
      reader.readAsText(f);
    }
  }

  function handleChooseFile(event) {
    handleFiles(event.target.files);
  }

  function handleJSONDrop(event) {
    event.stopPropagation();
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  }

  function handleDragOver(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  // Setup the dnd listeners.
  var dropZone = document.getElementsByTagName('body')[0];
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleJSONDrop, false);
  document.getElementById('file').addEventListener('change', handleChooseFile);

}

function recalculateResults() {
  for (var i = 0; i < results.length; i++) {
    computeResult(results[i]);
    drawTable(false);
  }
  renderLayout(getSelectedResult().keyboard);
}

function register_param(name, initial) {
  var elements = [];
  var initial_values = [];
  window[name] = initial;
  if (initial.constructor === Array) {
    for (var i = 0; i < initial.length; i++) {
      elements[i] = document.getElementById(name+"."+i);
      initial_values[i] = initial[i];
    }
  } else {
    elements[0] = document.getElementById(name);
    initial_values[0] = initial;
  }

  for (var i = 0; i < elements.length; i++) {
    if (!elements[i]) {
      console.log("Loose parameter");
      continue;
    }
    elements[i].min = 0.000;
    elements[i].max = 1.000;
    elements[i].step = 0.001;
    elements[i].value = initial_values[i];
    elements[i].title = initial_values[i];
    elements[i].onchange = e => {
      var id = e.target.id.split(".");
      if (id.length > 1)
        window[id[0]][id[1]] = e.target.value;
      else
        window[id[0]] = e.target.value;
      e.target.title = e.target.value;
      recalculateResults();
    }
  }

}

register_param("K_B", 0.2218);
register_param("K_P", 1.0000);
register_param("K_S", 0.2663);

register_param("K_1", 1.000);
register_param("K_2", 0.367);
register_param("K_3", 0.235);

register_param("P_HAND", 0.5);
register_param("P_ROW", [ 1.0, 0.666, 0.333, 0.0, 0.666, 0.8, 1.0]);
register_param("P_FINGER", [ 1.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 1.0 ]);

register_param("W_0",      0.0000);
register_param("W_HAND",   0.1142);
register_param("W_ROW",    0.7869);
register_param("W_FINGER", 1.0000);
register_param("W_THUMB",  0.0000);

register_param("F_HAND", 1.0);
register_param("F_ROW", 0.3);
register_param("F_FINGER", 0.3);

register_param("STROKE_PATH_HAND_WEIGHT", [
  0.0,
  0.5,
  1.0,
]);

register_param("STROKE_PATH_ROW_WEIGHT", [
  0.0000,
  0.1428,
  0.2857,
  0.4285,
  0.5714,
  0.7142,
  0.8571,
  1.0000
]);

register_param("STROKE_PATH_FINGER_WEIGHT", [
  0.0000, // 0 double inner roll
  0.2857, // 1 repeat one
  0.1428, // 2 single inner roll
  0.4285, // 3 single outer roll
  0.2857, // 4 double outer roll
  0.2857, // 5 same finger
  0.4285, // 6 alt hands
  0.2857  // 7 bounce
]);

register_param("STROKE_PATH_SAME_KEY_WEIGHT", 0.5000);


// 0b000 format where each bit is a hand, left=0 right=1
// write out elements manually, then sort by index
var STROKE_PATH_HAND_INDEX = [2, 0, 1, 0, 0, 1, 0, 2];

// 3 bits per row, 0b011 is homerow, higher numbers are higher rows
// write out elements manually, then sort by index
// neat pattern forms based around 3,3
var STROKE_PATH_ROW_INDEX = [
  1, 5, 5, 3, 7, 7, 7, 7,
  4, 1, 5, 3, 7, 7, 7, 7,
  4, 4, 1, 3, 7, 7, 7, 7,
  1, 1, 1, 0, 2, 2, 2, 2,
  5, 5, 5, 3, 2, 6, 6, 6,
  5, 5, 5, 3, 7, 2, 6, 6,
  5, 5, 5, 3, 7, 7, 2, 6,
  5, 5, 5, 3, 7, 7, 7, 2
];

// 3 bits per finger, 0 is left pinky, 7 right pinky
// https://docs.google.com/spreadsheets/d/14FXg6m0PgpJf6eSjiu0r1wzG-G45J_H6WQEIGcLrODM/edit?usp=sharing
// 0 double inner roll
// 1 repeat one
// 2 single inner roll
// 3 single outer roll
// 4 double outer roll
// 5 same key
// 6 alt hands
// 7 bounce
var STROKE_PATH_FINGER_INDEX = [ 5, 1, 1, 1, 1, 1, 1, 1, 7, 1, 0, 0, 2, 2, 2, 2, 7, 3, 1, 0, 2, 2, 2, 2, 7, 3, 3, 1, 2, 2, 2, 2, 6, 6, 6, 6, 1, 3, 3, 3, 6, 6, 6, 6, 2, 1, 3, 3, 6, 6, 6, 6, 2, 2, 1, 3, 6, 6, 6, 6, 2, 2, 2, 1, 1, 7, 3, 3, 3, 3, 3, 3, 1, 5, 1, 1, 1, 1, 1, 1, 2, 7, 1, 0, 2, 2, 2, 2, 2, 7, 3, 1, 2, 2, 2, 2, 6, 6, 6, 6, 1, 3, 3, 3, 6, 6, 6, 6, 2, 1, 3, 3, 6, 6, 6, 6, 2, 2, 1, 3, 6, 6, 6, 6, 2, 2, 2, 1, 1, 3, 7, 3, 3, 3, 3, 3, 4, 1, 7, 3, 3, 3, 3, 3, 1, 1, 5, 1, 1, 1, 1, 1, 2, 2, 7, 1, 2, 2, 2, 2, 6, 6, 6, 6, 1, 3, 3, 3, 6, 6, 6, 6, 2, 1, 3, 3, 6, 6, 6, 6, 2, 2, 1, 3, 6, 6, 6, 6, 2, 2, 2, 1, 1, 3, 3, 7, 3, 3, 3, 3, 4, 1, 3, 7, 3, 3, 3, 3, 4, 4, 1, 7, 3, 3, 3, 3, 1, 1, 1, 5, 1, 1, 1, 1, 6, 6, 6, 6, 1, 3, 3, 3, 6, 6, 6, 6, 2, 1, 3, 3, 6, 6, 6, 6, 2, 2, 1, 3, 6, 6, 6, 6, 2, 2, 2, 1, 1, 2, 2, 2, 6, 6, 6, 6, 3, 1, 2, 2, 6, 6, 6, 6, 3, 3, 1, 2, 6, 6, 6, 6, 3, 3, 3, 1, 6, 6, 6, 6, 1, 1, 1, 1, 5, 1, 1, 1, 3, 3, 3, 3, 7, 1, 4, 4, 3, 3, 3, 3, 7, 3, 1, 4, 3, 3, 3, 3, 7, 3, 3, 1, 1, 2, 2, 2, 6, 6, 6, 6, 3, 1, 2, 2, 6, 6, 6, 6, 3, 3, 1, 2, 6, 6, 6, 6, 3, 3, 3, 1, 6, 6, 6, 6, 2, 2, 2, 2, 1, 7, 2, 2, 1, 1, 1, 1, 1, 5, 1, 1, 3, 3, 3, 3, 3, 7, 1, 4, 3, 3, 3, 3, 3, 7, 3, 1, 1, 2, 2, 2, 6, 6, 6, 6, 3, 1, 2, 2, 6, 6, 6, 6, 3, 3, 1, 2, 6, 6, 6, 6, 3, 3, 3, 1, 6, 6, 6, 6, 2, 2, 2, 2, 1, 3, 7, 2, 2, 2, 2, 2, 0, 1, 7, 2, 1, 1, 1, 1, 1, 1, 5, 1, 3, 3, 3, 3, 3, 3, 7, 1, 1, 2, 2, 2, 6, 6, 6, 6, 3, 1, 2, 2, 6, 6, 6, 6, 3, 3, 1, 2, 6, 6, 6, 6, 3, 3, 3, 1, 6, 6, 6, 6, 2, 2, 2, 2, 1, 3, 3, 7, 2, 2, 2, 2, 0, 1, 3, 7, 2, 2, 2, 2, 0, 0, 1, 7, 1, 1, 1, 1, 1, 1, 1, 5 ];

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

function updateNeedsKeyboard(exists) {
  var buttons = document.querySelectorAll(".needs-keyboard");
  Array.prototype.forEach.call(buttons, button => {
    button.disabled = !exists;
  });
}

updateNeedsKeyboard(false);

var selecting_keys = false;

document.getElementById("home-positions").onclick = event => {
  if (selecting_keys) {
    selecting_keys = false;
    document.getElementById("home-positions").innerHTML = `Select Home Positions`;
  } else {
    selecting_keys = true;
    selecting_home_position = 0;
    document.getElementById("home-positions").innerHTML = `Selecting ${finger_names[selecting_home_position]}`;
    renderLayout(getSelectedResult().keyboard);
  }
};

document.getElementById("recompute-all").onclick = event => {
  for (var i = 0; i < results.length; i++) {
    results[i].corpus = document.getElementById("corpus").value;
    computeResult(results[i]);
  }
  renderLayout(getSelectedResult().keyboard);
  drawTable(false);
};

document.getElementById("compute").onclick = event => {
  if (results.length == 0)
    return;
  var result_id = results.length;
  results[result_id] = {};
  results[result_id].id = result_id;
  results[result_id].keyboard = getSelectedResult().keyboard;
  results[result_id].corpus = document.getElementById("corpus").value;
  computeResult(results[result_id]);
  renderLayout(results[result_id].keyboard);
  drawTable(false);
};

function loadConfiguratorKeyboards() {
  fetch("https://api.qmk.fm/v1/keyboards").then(promise => {
    return promise.json();
  }).then(response => {
    var select = document.getElementById("configurator-keyboard");
    Array.prototype.forEach.call(response, keyboard => {
      var opt = document.createElement('option');
      opt.value = keyboard;
      opt.innerHTML = keyboard;
      select.appendChild(opt);
    });
  });
}

loadConfiguratorKeyboards();

document.getElementById("load-default").onclick = event => {
  const keyboard = document.getElementById("configurator-keyboard").value;
  const filename = keyboard.replace(/\//gi, "_") + "_default.json";
  fetch("https://raw.githubusercontent.com/qmk/qmk_configurator/master/public/keymaps/" + filename[0] + '/' + filename).then(promise => {
    return promise.json();
  }).then(keyboard => {
    loadKeymap(keyboard, filename);
  }).catch(error => {
    alert("No default keymap found for "+keyboard+" in the QMK Configurator repo.");
  });
}

const heatmaps = document.querySelectorAll(".heatmap-button");

Array.prototype.forEach.call(heatmaps, heatmap => {
  heatmap.addEventListener("click", () => {
    if (!heatmap.dataset.heatmapId) return false;
    heatmap_selected = heatmap.dataset.heatmapId;

    Array.prototype.forEach.call(heatmaps, hm => {
      if (hm.dataset.heatmapId == heatmap_selected) {
        hm.classList.add("selected");
        var divs = document.querySelectorAll(".key .heatmap-"+hm.dataset.heatmapId);
        Array.prototype.forEach.call(divs, div => {
          div.style.display = "block";
        });
      } else {
        hm.classList.remove("selected");
        var divs = document.querySelectorAll(".key .heatmap-"+hm.dataset.heatmapId);
        Array.prototype.forEach.call(divs, div => {
          div.style.display = "none";
        });
      }
    });

  });
});

function checkForPhantom(keyboard, key_1, key_2, key_3) {
  var phantom_key = -1;
  if (key_1.matrix_row == key_2.matrix_row && key_1.matrix_col == key_3.matrix_col) {
    phantom_key = findKeyInMatrix(keyboard, key_3.matrix_row, key_2.matrix_col);
  }
  if (key_1.matrix_row == key_2.matrix_row && key_2.matrix_col == key_3.matrix_col) {
    phantom_key = findKeyInMatrix(keyboard, key_3.matrix_row, key_1.matrix_col);
  }
  if (key_1.matrix_row == key_3.matrix_row && key_1.matrix_col == key_2.matrix_col) {
    phantom_key = findKeyInMatrix(keyboard, key_2.matrix_row, key_3.matrix_col);
  }
  if (key_1.matrix_row == key_3.matrix_row && key_2.matrix_col == key_3.matrix_col) {
    phantom_key = findKeyInMatrix(keyboard, key_2.matrix_row, key_1.matrix_col);
  }
  if (key_2.matrix_row == key_3.matrix_row && key_1.matrix_col == key_3.matrix_col) {
    phantom_key = findKeyInMatrix(keyboard, key_1.matrix_row, key_2.matrix_col);
  }
  if (phantom_key != -1) {
    keyboard.keymap[phantom_key.index].ghost++;
  }
}


function computeResult(result) {
  var finger_effort = 0;
  var thumb_effort = 0;
  var finger_base = 0;
  var finger_penalty = 0;
  var thumb_base = 0;
  var thumb_penalty = 0;
  var total_stroke_path = 0;
  var keys = [], thumbs = [], fingers = [];
  var unknown_chars = [];
  var keyboard = result.keyboard;
  var keymap = keyboard.keymap;
  var text = result.corpus;
  var usage_fingers = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  for (var i = 0; i < keymap.length; i++) {
    keymap[i].count = 0;
    keymap[i].ghost = 0;
    keymap[i].penalty = calcPenalty(keymap[i]);
  }

  // convert to lut/switch eventually
  text = text.replace(/(?:\r\n|\r|\n)/g, '↵');
  for (var i = 0; i < text.length; i++) {
    var key = findKey(keyboard, text[i]);
    // skip keys we can't find
    if (key != -1) {
      if (key.layer != 0) {
        var layer_key = findKey(keyboard, "▲"+key.layer);
        if (layer_key != -1)
          keys.push(keymap[layer_key.index])
      }
      keys.push(keymap[key.index]);
    } else {
      // check for shifted keys
      key = findKey(keyboard, shifted_keys[text[i]]);
      if (key != -1) {
        var shift_key = findKey(keyboard, "⇧");
        if (shift_key != -1) {
          keys.push(keymap[shift_key.index]);
          keys.push(keymap[key.index]);
        }
      } else {
        unknown_chars.push(text[i]);
      }
    }
  }
  for (var i = 0; i < keys.length; i++) {
    keys[i].count++;
    if (keys[i].thumb) {
      thumbs[fingers.length] = keys[i];
      usage_fingers[keys[i].hand + 4]++;
    } else {
      fingers.push(keys[i]);
      if (keys[i].hand)
        usage_fingers[keys[i].finger + 2]++;
      else
        usage_fingers[keys[i].finger]++;
    }
  }
  // save for later incase we need to remove some for calculations
  var num_triads = fingers.length - 2;
  for (var i = 0; i < fingers.length - 2; i++) {

    // very basic thumb model. should account for previous states
    if (thumbs[i] != null && thumbs[i+1] != null && thumbs[i+2] != null) {
      var t_base = thumbs[i].base * K_1 *
                 (1 + thumbs[i+1].base * K_2 *
                 (1 + thumbs[i+2].base * K_3));
      var t_penalty = thumbs[i].penalty * K_1 *
                    (1 + thumbs[i+1].penalty * K_2 *
                    (1 + thumbs[i+2].penalty * K_3));
      thumb_base += t_base;
      thumb_penalty += t_penalty;
      thumb_effort += K_B * t_base + K_P * t_penalty;
    } else if (thumbs[i] != null && thumbs[i+1] != null) {
      var t_base = thumbs[i].base * K_1 *
                 (1 + thumbs[i+1].base * K_2);
      var t_penalty = thumbs[i].penalty * K_1 *
                    (1 + thumbs[i+1].penalty * K_2);
      thumb_base += t_base;
      thumb_penalty += t_penalty;
      thumb_effort += K_B * t_base + K_P * t_penalty;
    } else if (thumbs[i] != null) {
      var t_base = thumbs[i].base * K_1;
      var t_penalty = thumbs[i].penalty * K_1;
      thumb_base += t_base;
      thumb_penalty += t_penalty;
      thumb_effort += K_B * t_base + K_P * t_penalty;
    }

    if (thumbs[i+1])
      checkForPhantom(keyboard, fingers[i], thumbs[i+1], fingers[i+1]);
    if (thumbs[i] && thumbs[i+1])
      checkForPhantom(keyboard, thumbs[i], fingers[i], thumbs[i+1]);


    var base = fingers[i].base * K_1 *
                      (1 + fingers[i+1].base * K_2 *
                      (1 + fingers[i+2].base * K_3));

    var penalty = fingers[i].penalty * K_1 *
                  (1 + fingers[i+1].penalty * K_2 *
                  (1 + fingers[i+2].penalty * K_3));

    var stroke_path_hand = STROKE_PATH_HAND_INDEX[(fingers[i].hand << 2) | (fingers[i+1].hand << 1) | (fingers[i+2].hand)];

    var row_diff_1 = Math.max(Math.min(parseInt(Math.round(fingers[i].row - fingers[i+1].row + HOMEROW_OFFSET)), 3), 0);
    var row_diff_2 = Math.max(Math.min(parseInt(Math.round(fingers[i].row - fingers[i+2].row + HOMEROW_OFFSET)), 3), 0);
    var stroke_path_row = STROKE_PATH_ROW_INDEX[(row_diff_1 << 3) | row_diff_2];

    var stroke_path_finger_index = STROKE_PATH_FINGER_INDEX[(fingers[i].finger << 6) | (fingers[i+1].finger << 3) | fingers[i+2].finger];
    var stroke_path_finger = STROKE_PATH_FINGER_WEIGHT[stroke_path_finger_index];
    if (stroke_path_finger_index == 1 || stroke_path_finger_index == 5) {
      if (fingers[i] != fingers[i+1] && fingers[i+1] != fingers[i+2]) {
        stroke_path_finger /= (STROKE_PATH_SAME_KEY_WEIGHT * STROKE_PATH_SAME_KEY_WEIGHT);
      } else if (fingers[i] != fingers[i+1] || fingers[i+1] != fingers[i+2]) {
        stroke_path_finger /= STROKE_PATH_SAME_KEY_WEIGHT;
      }
    }

    var stroke_path = stroke_path_hand * F_HAND +
                      stroke_path_row * F_ROW +
                      stroke_path_finger * F_FINGER;

    finger_base += base;
    finger_penalty += penalty;
    total_stroke_path += stroke_path;

    finger_effort += K_B * base +
                     K_P * penalty +
                     K_S * stroke_path;
  }

  var usage = [];
  for (var i = 0; i < keymap.length; i++) {
    keymap[i].usage = keymap[i].count / fingers.length;
  }

  var total_effort = thumb_effort + finger_effort;

  result.total_effort = total_effort / num_triads;
  result.thumb_effort = thumb_effort / num_triads;
  result.thumb_base = thumb_base / num_triads;
  result.thumb_penalties = thumb_penalty / num_triads;
  result.finger_effort = finger_effort / num_triads;
  result.finger_base = finger_base / num_triads;
  result.finger_penalties = finger_penalty / num_triads;
  result.path = total_stroke_path / num_triads;
  result.unknown_chars = unknown_chars.slice(0);
  result.usage_fingers = usage_fingers;
  if (result.details == null)
    result.details = false;
}
