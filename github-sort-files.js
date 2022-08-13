// ==UserScript==
// @name        GitHub Sort Files
// @version     1.0
// @description A userscript that makes repository files & markdown tables sortable
// @license     MIT
// @author      Francisco Boni Neto
// @include     *://github.com/*
// @run-at      document-idle
// @grant       GM.addStyle
// @grant       GM_addStyle
// @grant       GM.setValue
// @grant       GM_setValue
// @grant       GM.getValue
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// @grant       GM.registerMenuCommand
// @grant       GM_unregisterMenuCommand
// @grant       GM.unregisterMenuCommand
// @require     https://cdnjs.cloudflare.com/ajax/libs/tinysort/2.3.6/tinysort.js
// @require     https://colorjs.io/dist/color.global.min.js
// @icon        https://github.githubassets.com/favicons/favicon-dark.png
// ==/UserScript==

(async () => {
    'use strict';

    // OPTIONS:
    const locale = 'pt-br';
    const dateWidth = '234px';
    var showExtendedTime;
    var showExtendedTimeGlobalDefault;
    const dark = new Color('sRGB', [0.5451, 0.58039, 0.61961]);
    const gold_hours = new Color('sRGB', [1, 0.8431372549019608, 0]);
    const gold2dark_hours = gold_hours.range(dark, { space: 'srgb', progression: (p) => Math.abs(p ** 0.16) });
    const gold_days = new Color('sRGB', [0.9019607843137255, 0.792156862745098, 0.1803921568627451]);
    const gold2dark_days = gold_days.range(dark, { space: 'srgb', progression: (p) => Math.abs(p ** 0.14) });
    const gold_months = new Color('sRGB', [0.8, 0.7294117647058823, 0.3215686274509804]);
    const gold2dark_months = gold_months.range(dark, { space: 'srgb', progression: (p) => Math.abs(p ** 0.3) });

    //
    async function showExtendedTimeClicked(event) {
        if (showExtendedTime) {
            showExtendedTime = false;
            await GM.setValue(`showextendedtime_key${document.location.pathname}`, showExtendedTime);
        } else {
            showExtendedTime = true;
            await GM.setValue(`showextendedtime_key${document.location.pathname}`, showExtendedTime);
        }
        // console.log('showExtendedTimeClicked() showExtendedTime: ', showExtendedTime);
        window.location.reload();
    }

    async function showExtendedTimeGlobalDefaultClicked(event) {
        if (showExtendedTimeGlobalDefault) {
            showExtendedTimeGlobalDefault = false;
            await GM.setValue(`showextendedtimeglobaldefault_key`, showExtendedTimeGlobalDefault);
        } else {
            showExtendedTimeGlobalDefault = true;
            await GM.setValue(`showextendedtimeglobaldefault_key`, showExtendedTimeGlobalDefault);
        }
        // console.log('showExtendedTimeGlobalDefaultClicked() showExtendedTime: ', showExtendedTimeGlobalDefault);
        window.location.reload();
    }

    async function readShowExtendedTimeGlobalDefaultOption() {
        let _showExtendedTimeGlobalDefault = await GM.getValue(`showextendedtimeglobaldefault_key`, false);
        if (_showExtendedTimeGlobalDefault) {
            // console.log('readShowExtendedTimeGlobalDefaultOption() 1 _showExtendedTimeGlobalDefault: ', _showExtendedTimeGlobalDefault);
            GM.registerMenuCommand('Set Show Extended Time Default to false', showExtendedTimeGlobalDefaultClicked);
            GM.unregisterMenuCommand('Set Show Extended Time Default to true');
            return _showExtendedTimeGlobalDefault;
        } else {
            // console.log('readShowExtendedTimeGlobalDefaultOption() 2 _showExtendedTimeGlobalDefault: ', _showExtendedTimeGlobalDefault);
            GM.registerMenuCommand('Set Show Extended Time Default to true', showExtendedTimeGlobalDefaultClicked);
            GM.unregisterMenuCommand('Set Show Extended Time Default to false');
            return _showExtendedTimeGlobalDefault;
        }
    }

    async function readShowExtendedTimeOption() {
        let _showExtendedTime = await GM.getValue(`showextendedtime_key${document.location.pathname}`, null);
        if (_showExtendedTime !== null) {
            // console.log('readShowExtendedTimeOption() 1 _showExtendedTime: ', _showExtendedTime);
            if (_showExtendedTime) {
                GM.registerMenuCommand('Set Show Extended Time to false', showExtendedTimeClicked);
                GM.unregisterMenuCommand('Set Show Extended Time to true');
            } else {
                GM.registerMenuCommand('Set Show Extended Time to true', showExtendedTimeClicked);
                GM.unregisterMenuCommand('Set Show Extended Time to false');
            }
            return _showExtendedTime;
        } else {
            _showExtendedTime = showExtendedTimeGlobalDefault;
            await GM.setValue(`showextendedtime_key${document.location.pathname}`, _showExtendedTime);
            if (_showExtendedTime) {
                GM.registerMenuCommand('Set Show Extended Time to false', showExtendedTimeClicked);
                GM.unregisterMenuCommand('Set Show Extended Time to true');
            } else {
                GM.registerMenuCommand('Set Show Extended Time to true', showExtendedTimeClicked);
                GM.unregisterMenuCommand('Set Show Extended Time to false');
            }
            // console.log('readShowExtendedTimeOption() 2 _showExtendedTime: ', _showExtendedTime);
            return _showExtendedTime;
        }
    }

    showExtendedTimeGlobalDefault = await readShowExtendedTimeGlobalDefaultOption();
    showExtendedTime = await readShowExtendedTimeOption();
    // console.log('showExtendedTimeGlobalDefault 1: ', showExtendedTimeGlobalDefault);
    // console.log('showExtendedTime 1: ', showExtendedTime);
    const ghsfEvent = new Event('ghsf');

    function datetime2string(datetime) {
        const parts = new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hourCycle: 'h24',
        }).formatToParts(datetime);
        return (
            parts[6].value +
            parts[7].value +
            parts[8].value +
            parts[9].value +
            parts[10].value +
            ' ' +
            parts[0].value +
            parts[1].value +
            parts[2].value +
            parts[3].value +
            parts[4].value
        );
    }

    function needDarkTheme() {
        // color will be "rgb(#, #, #)" or "rgba(#, #, #, #)"
        let color = window.getComputedStyle(document.body).backgroundColor;
        const rgb = (color || '').replace(/\s/g, '').match(/^rgba?\((\d+),(\d+),(\d+)/i);
        if (rgb) {
            // remove "rgb.." part from match & parse
            const colors = rgb.slice(1).map(Number);
            // http://stackoverflow.com/a/15794784/145346
            const brightest = Math.max(...colors);
            // return true if we have a dark background
            return brightest < 128;
        }
        // fallback to bright background
        return false;
    }

    const color = needDarkTheme() ? '#ddd' : '#222';
    const targets = ['[data-pjax-container]', '.repository-content', '.Box.mb-3', '.file-navigation', '#repo-content-turbo-frame', '.flex-items-baseline', '.news'];

    function fireEvents() {
        // console.log('fireEvents() event: ghsf');
        document.dispatchEvent(ghsfEvent);
    }

    // performance http://stackoverflow.com/a/39332340/145346
    const observer = new MutationObserver((mutations, obs) => {
        let fireEventsTimer, reconnectTimer;
        clearTimeout(fireEventsTimer);
        clearTimeout(reconnectTimer);

        let target;
        let llen = targets.length;
        let mlen = mutations.length;
        let found = false;

        // avoiding use of forEach loops for performance reasons
        for (let mindx = 0; mindx < mlen; mindx++) {
            target = mutations[mindx].target;
            if (target) {
                // console.log("initMut() mutations[mindx].target: ", target);
                for (let lindx = 0; lindx < llen; lindx++) {
                    if (target.matches(targets[lindx])) {
                        obs.disconnect();
                        console.clear();
                        console.log('observer() 1: obs disconnected');
                        console.log('observer() 2: mutations[mindx].target: ', target);
                        fireEventsTimer = setTimeout(() => {
                            fireEvents();
                        }, 300);
                        found = true;
                        break;
                    }
                }
            }
            if (found) {
                console.log('observer() 4: found is true, reconnect observe again');
                reconnectTimer = setTimeout(() => {
                    restartObserver();
                }, 500);
                break;
            }
        }
    });

    function restartObserver() {
        observer.observe(document, {
            childList: true,
            subtree: true,
        });
    }

    function initMut() {
        // console.log('initMut()');
        observer.observe(document, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        // console.log('loading');
        document.addEventListener('DOMContentLoaded', () => initMut());
    } else {
        // console.log('not loading');
        initMut();
    }

    const sortables = {
        // markdown tables
        tables: {
            check: (el) => el.nodeName === 'TH' && el.matches('.markdown-body table thead th'),
            sort: (el) => initSortTable(el),
            css: {
                unsorted: ['.markdown-body table thead th', '.markdown-body table.csv-data thead th'],
                tweaks: [
                    `body .markdown-body table thead th {
          text-align: left;
          background-position: 3px center !important;
        }`,
                ],
            },
        },
        // repo files
        'repo-files': {
            check: (el) => el.classList.contains('ghsc-header-cell'),
            // init after a short delay to allow rendering of file list
            setup: () => setTimeout(async () => await addRepoFileHeader(), 150),
            sort: async (el) => await initSortFiles(el),
            css: {
                unsorted: ['.ghsc-header-cell'],
                tweaks: [
                    `body .ghsc-header-cell {
          text-align: left;
          background-position: 3px center !important;
        }`,
                ],
            },
        },
    };

    const sorts = ['desc', 'asc'];

    const icons = {
        unsorted: (color) => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${color}">
    <path d="M15 8H1l7-8zm0 1H1l7 7z" opacity=".2"/>
  </svg>`,
        ascending: (color) => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${color}">
    <path d="M15 8H1l7-8z"/>
    <path d="M15 9H1l7 7z" opacity=".2"/>
  </svg>`,
        descending: (color) => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${color}">
    <path d="M15 8H1l7-8z" opacity=".2"/>
    <path d="M15 9H1l7 7z"/>
  </svg>`,
    };

    function getIcon(type, color) {
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(icons[type](color));
    }

    function getDirection(el) {
        return (el.getAttribute('aria-sort') || '').includes(sorts[0]) ? sorts[1] : sorts[0];
    }

    function setDirection(els, currentElm, dir) {
        els.forEach((elm) => {
            // aria-sort uses "ascending", "descending" or "none"
            const cellDir = currentElm === elm ? `${dir}ending` : 'none';
            elm.setAttribute('aria-sort', cellDir);
        });
    }

    function initSortTable(el) {
        removeSelection();
        const dir = getDirection(el);
        const table = el.closest('table');
        const options = {
            order: dir,
            natural: true,
            selector: `td:nth-child(${el.cellIndex + 1})`,
        };
        tinysort($$('tbody tr', table), options);
        setDirection($$('th', table), el, dir);
    }

    async function addRepoFileHeader() {
        console.log('addRepoFileHeader()');
        showExtendedTimeGlobalDefault = await readShowExtendedTimeGlobalDefaultOption();
        showExtendedTime = await readShowExtendedTimeOption();
        // console.log('showExtendedTimeGlobalDefault 2: ', showExtendedTimeGlobalDefault);
        // console.log('showExtendedTime 2: ', showExtendedTime);
        const $header = $('#files');
        // h2#files is a sibling of the grid wrapper
        const $target = $header && $("div[role='grid'] .sr-only", $header.parentElement);
        if ($header && $target) {
            $target.className = 'Box-row Box-row--focus-gray py-2 d-flex position-relative js-navigation-item ghsc-header';
            $target.innerHTML = `
      <div role="columnheader" aria-sort="none" data-index="2" class="flex-auto min-width-0 col-md-2 mr-3 ghsc-header-cell">
        Content
      </div>
      <div role="columnheader" aria-sort="none" data-index="3" class="flex-auto min-width-0 d-none d-md-block col-5 mr-3 ghsc-header-cell">
        Message
      </div>
      <div role="columnheader" aria-sort="none" data-index="4" class="text-gray-light ghsc-age ghsc-header-cell" style="width:${showExtendedTime ? dateWidth : '100px'};">
        Age
      </div>
    `;
            var storedSelector = await GM.getValue(`selector_key${document.location.pathname}`, '');
            console.log('addRepoFileHeader() storedSelector: ', storedSelector);
            if (!storedSelector) {
                storedSelector = 'div.text-gray-light.ghsc-age.ghsc-header-cell';
            }
            if (storedSelector) {
                const dataSelector = document.querySelector(storedSelector);
                console.log('addRepoFileHeader() dataSelector.innerText: ', dataSelector.innerText);
                await sortFiles(dataSelector);
                return;
            }
        }
    }

    async function sortFiles(el) {
        let days = [];
        let daysElements = [];
        let dateNow = Date.now();
        removeSelection();
        var dir = await GM.getValue(`direction_key${document.location.pathname}`, '');
        if (!dir) {
            dir = 'desc';
        }
        const grid = el.closest("[role='grid']");
        const options = {
            order: dir,
            natural: true,
            selector: `div:nth-child(${el.dataset.index})`,
        };
        if (el.classList.contains('ghsc-age')) {
            // sort repo age column using ISO 8601 datetime format
            options.selector += ' [datetime]';
            options.attr = 'datetime';
        }
        // check for parent directory link; don't sort it
        const parentDir = $("a[title='Go to parent directory']", grid);
        if (parentDir) {
            parentDir.closest("div[role='row']").classList.add('ghsc-header');
        }
        tinysort($$('.Box-row:not(.ghsc-header)', grid), options);
        setDirection($$('.ghsc-header-cell', grid), el, dir);

        const timeDivs = document.querySelectorAll('time-ago');
        for (let tx = 0; tx < timeDivs.length; tx++) {
            let dateTime = new Date(timeDivs[tx].getAttribute('datetime'));
            if (dateTime) {
                days.push(Math.round((dateNow - dateTime) * 0.000000011574));
                daysElements.push(timeDivs[tx]);
                if (showExtendedTime) {
                    timeDivs[tx].parentElement.style.setProperty('width', dateWidth);
                    timeDivs[tx].setAttribute('relativeTime', timeDivs[tx].innerHTML.trimEnd());
                    timeDivs[tx].innerText = timeDivs[tx].innerText + ' - ' + datetime2string(dateTime);
                }
                console.log('dateNow - datetime = ', days[days.length - 1], ' days');
                console.log(' ');
            }
        }
        let maxDays = Math.max(...days);
        console.log('Max: ', maxDays);
        for (let tx = 0; tx < daysElements.length; tx++) {
            const val = Math.abs(days[tx] / maxDays);
            if (days[tx] < 2) {
                console.log('gold2dark_hours(', days[tx], '/ ', maxDays, '): gold2dark_hours(', val, ')', gold2dark_hours(val).coords);
                daysElements[tx].style.color = gold2dark_hours(val);
            } else if (days[tx] < 30) {
                console.log('gold2dark_days(', days[tx], '/ ', maxDays, '): gold2dark_days(', val, ')', gold2dark_days(val).coords);
                daysElements[tx].style.color = gold2dark_days(val);
            } else {
                console.log('gold2dark_months(', days[tx], '/ ', maxDays, '): gold2dark_months(', val, ')', gold2dark_months(val).coords);
                daysElements[tx].style.color = gold2dark_months(val);
            }
            daysElements[tx].parentElement.innerHTML = daysElements[tx].parentElement.innerHTML.replace('ago', 'ago2');
        }
    }

    async function initSortFiles(el) {
        // let days = [];
        // let daysElements = [];
        // let dateNow = Date.now();
        console.log('initSortFiles()');
        removeSelection();
        var dir = getDirection(el);
        const grid = el.closest("[role='grid']");
        const options = {
            order: dir,
            natural: true,
            selector: `div:nth-child(${el.dataset.index})`,
        };
        if (el.classList.contains('ghsc-age')) {
            // sort repo age column using ISO 8601 datetime format
            options.selector += ' [datetime]';
            options.attr = 'datetime';
        }
        // check for parent directory link; don't sort it
        const parentDir = $("a[title='Go to parent directory']", grid);
        if (parentDir) {
            parentDir.closest("div[role='row']").classList.add('ghsc-header');
        }
        tinysort($$('.Box-row:not(.ghsc-header)', grid), options);
        setDirection($$('.ghsc-header-cell', grid), el, dir);

        // const timeDivs = document.querySelectorAll('time-ago2');
        // for (let tx = 0; tx < timeDivs.length; tx++) {
        //     let dateTime = new Date(timeDivs[tx].getAttribute('datetime'));
        //     if (dateTime) {
        //         days.push(Math.round((dateNow - dateTime) * 0.000000011574));
        //         daysElements.push(timeDivs[tx]);
        //         if (showExtendedTime) {
        //             timeDivs[tx].parentElement.style.setProperty('width', dateWidth);
        //             timeDivs[tx].innerText = timeDivs[tx].getAttribute('relativeTime') + ' - ' + datetime2string(dateTime);
        //         }
        //         console.log('dateNow - datetime = ', days[days.length - 1], ' days');
        //         console.log(' ');
        //     }
        // }
        // let maxDays = Math.max(...days);
        // console.log('Max: ', maxDays);
        // for (let tx = 0; tx < daysElements.length; tx++) {
        //     const val = Math.abs(days[tx] / maxDays);
        //     if (days[tx] < 2) {
        //         console.log('gold2dark_hours(', days[tx], '/ ', maxDays, '): gold2dark_hours(', val, ')', gold2dark_hours(val).coords);
        //         daysElements[tx].style.color = gold2dark_hours(val);
        //     } else if (days[tx] < 30) {
        //         console.log('gold2dark_days(', days[tx], '/ ', maxDays, '): gold2dark_days(', val, ')', gold2dark_days(val).coords);
        //         daysElements[tx].style.color = gold2dark_days(val);
        //     } else {
        //         console.log('gold2dark_months(', days[tx], '/ ', maxDays, '): gold2dark_months(', val, ')', gold2dark_months(val).coords);
        //         daysElements[tx].style.color = gold2dark_months(val);
        //     }
        // }

        await GM.setValue(`direction_key${document.location.pathname}`, dir);
        await GM.setValue(`selector_key${document.location.pathname}`, getSelector(el));
    }

    function getCss(type) {
        return Object.keys(sortables)
            .reduce((acc, block) => {
                const css = sortables[block].css || {};
                const selectors = css[type];
                if (selectors) {
                    acc.push(...selectors);
                } else if (type !== 'unsorted' && type !== 'tweaks') {
                    const useUnsorted = css.unsorted || [];
                    if (useUnsorted.length) {
                        // if "ascending" or "descending" isn't defined, then append
                        // that class to the unsorted value
                        acc.push(`${useUnsorted.join(`[aria-sort='${type}'],`)}[aria-sort='${type}']`);
                    }
                }
                return acc;
            }, [])
            .join(type === 'tweaks' ? '' : ',');
    }

    function $(str, el) {
        return (el || document).querySelector(str);
    }

    function $$(str, el) {
        return [...(el || document).querySelectorAll(str)];
    }

    function removeSelection() {
        // remove text selection http://stackoverflow.com/a/3171348/145346
        const sel = window.getSelection ? window.getSelection() : document.selection;
        if (sel) {
            if (sel.removeAllRanges) {
                sel.removeAllRanges();
            } else if (sel.empty) {
                sel.empty();
            }
        }
    }

    function update() {
        console.log('update()');
        Object.keys(sortables).forEach((item) => {
            if (sortables[item].setup) {
                sortables[item].setup(window.location);
            }
        });
    }

    function getSelector(el) {
        if (el.tagName.toLowerCase() == 'html') return 'html';
        var str = el.tagName.toLowerCase();
        str += el.id != '' ? '#' + el.id : '';
        if (el.className) {
            var classes = el.className.trim().split(/\s+/);
            for (var i = 0; i < classes.length; i++) {
                str += '.' + classes[i];
            }
        }

        if (document.querySelectorAll(str).length == 1) return str;

        return getSelector(el.parentNode) + ' > ' + str;
    }

    function init() {
        console.log('init()');
        GM.addStyle(`
    /* Added time colors */
    .ghsc-latest {
      color: #ffd700 !important;
    }
    /* Added table header */
    tr.ghsc-header th, tr.ghsc-header td {
      border-bottom: #eee 1px solid;
      padding: 2px 2px 2px 10px;
    }
    /* sort icons */
    ${getCss('unsorted')} {
      cursor: pointer;
      padding-left: 22px !important;
      background-image: url(${getIcon('unsorted', color)}) !important;
      background-repeat: no-repeat !important;
      background-position: left center !important;
    }
    ${getCss('ascending')} {
      background-image: url(${getIcon('ascending', color)}) !important;
      background-repeat: no-repeat !important;
    }
    ${getCss('descending')} {
      background-image: url(${getIcon('descending', color)}) !important;
      background-repeat: no-repeat !important;
    }
    /* specific tweaks */
    ${getCss('tweaks')}`);

        document.addEventListener('click', (event) => {
            const target = event.target;
            console.clear();
            console.log('target clicked: ', target);
            // console.log('target clicked selector: ', getSelector(target));
            if (target && target.nodeType === 1) {
                Object.keys(sortables).some((item) => {
                    const el = sortables[item].check(target, window.location);
                    if (el) {
                        sortables[item].sort(el instanceof HTMLElement ? el : target);
                        event.preventDefault();
                        return true;
                    }
                    return false;
                });
            }
        });
    }
    document.addEventListener('ghsf', () => update());
    init();
})();
