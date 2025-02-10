// ==UserScript==
// @name        TPL Item position progress bar
// @namespace   Violentmonkey Scripts
// @match       https://account.torontopubliclibrary.ca/holds*
// @grant       none
// @version     1.0
// @author      -
// @description 2025-01-08, 6:19:32 p.m.
// ==/UserScript==

const $$ = {
  ITEM_POS_CONTAINER: '.item-position',
  ITEM_POSITION: '.position',
  COPIES: '.copies',
}

const _wr = function(type) {
    var orig = history[type];
    return function() {
        var rv = orig.apply(this, arguments);
        var e = new Event(type);
        e.arguments = arguments;
        window.dispatchEvent(e);
        return rv;
    };
};
history.pushState = _wr('pushState'), history.replaceState = _wr('replaceState');

const waitFor = (functionRunner, condition, timeout = 200) => {
  const timeoutIncrements = 100;
  return new Promise((resolve, reject) => {
    const result = functionRunner();
    if (result && (!condition || condition(result))) {
      return resolve(result);
    }
    if (timeout <= 0) {
      return reject();
    }
    return setTimeout(() => resolve(waitFor(functionRunner, condition, timeout - timeoutIncrements)), timeoutIncrements);
  });
};

const addStyle = (styleString, id) => {
  if (document.getElementById(id)) {
    return;
  }
  const style = document.createElement('style');
  style.setAttribute('id', id);
  style.textContent = styleString;
  document.head.append(style);
}


const parseItemPosition = (itemPositionString, copiesString) => {
  if (!itemPositionString.includes('#') || !itemPositionString.includes('of')) {
    return;
  }

  const positionParts = /#(\d+) of (\d+)/.exec(itemPositionString);
  if (!positionParts) {
    return;
  }
  const positionInfo = {};
  positionInfo.current = parseInt(positionParts[1]);
  positionInfo.total = parseInt(positionParts[2]);

  const copiesParts = /\((\d+) copies\)/.exec(copiesString);
  if (copiesParts) {
    positionInfo.copies = parseInt(copiesParts[1]);
  }
  return positionInfo;
};

const getItemPositions = () => {
  const $itemPositions = document.querySelectorAll($$.ITEM_POS_CONTAINER);
  const itemPositions = Array.from($itemPositions).map(($itemPosition) => {
    const positionStr = $itemPosition.querySelector($$.ITEM_POSITION)?.textContent;
    const copiesStr = $itemPosition.querySelector($$.COPIES)?.textContent;
    const itemPosition = parseItemPosition(positionStr, copiesStr);
    if (itemPosition) {
      itemPosition.parent = $itemPosition;
    }
    return itemPosition;
  }).filter(Boolean);
  return itemPositions;
}

const createProgressBar = (itemPosition) => {
  const progressBar = document.createElement('div');
  const { current, total, copies, parent } = itemPosition;
  const lines = 100/(total/copies);
  const progress = (copies / current) * 100;
  progressBar.classList.add('progressbar');
  progressBar.style.setProperty('--lines', `${lines}%`);
  progressBar.innerHTML = `<div class="remaining" style="width: ${progress}%;"></div>`;

  parent.append(progressBar);
  return progressBar;
}

const isLoaded = () => {
  return document.querySelector($$.ITEM_POS_CONTAINER);
}

const addProgressbarStyle = () => {
  addStyle(`
    .progressbar {
      width: 100%;
      height: 16px;
      background: #ddd;
      border-radius: 100px;
      overflow: hidden;
      position: relative;
      background-color: #ddd;
    }
    .progressbar:after {
      content: " ";
      display: inline-block;
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      background: repeating-linear-gradient(90deg, transparent, transparent var(--lines), #9198e5 var(--lines), #9198e5 calc(var(--lines) + 2px));
    }
    .remaining {
      background-color: green;
      height: 100%;
    }
  `, 'progressbarStyle');
}
const init = () => {
  waitFor(isLoaded, null, 10000).then(() => {
    addProgressbarStyle();
    getItemPositions().forEach((itemPosition) => {
      createProgressBar(itemPosition);
    });
  });
}

window.addEventListener('pushState', function(e) {
    init();
});
init();
