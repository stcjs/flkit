import TokenType from '../../util/token_type.js';

/**
 * @ type
 * @type {Array}
 */
export const atType = [
  ['@import', TokenType.CSS_IMPORT],
  ['@charset', TokenType.CSS_CHARSET],
  ['@media', TokenType.CSS_MEDIA],
  ['@namespace', TokenType.CSS_NAMESPACE],
  ['@font-face', TokenType.CSS_FONT_FACE],
  ['@page', TokenType.CSS_PAGE],
  ['@keyframes', TokenType.CSS_KEYFRAMES],
  ['@-webkit-keyframes', TokenType.CSS_KEYFRAMES],
  ['@-moz-keyframes', TokenType.CSS_KEYFRAMES],
  ['@-ms-keyframes', TokenType.CSS_KEYFRAMES],
  ['@-o-keyframes', TokenType.CSS_KEYFRAMES],
  ['@-moz-document', TokenType.CSS_MOZILLA],
  ['@viewport', TokenType.CSS_VIEWPORT]
];

/**
 * property hack prefix
 * @type {Object}
 */
export const propertyHackPrefix = '*!$&*()=%+,./`[]#~?:<>|_-£¬¦';

/**
 * browser prefix
 * from http://www.w3.org/TR/CSS21/syndata.html#vendor-keyword-history
 * @type {Array}
 */
export const venderPrefix = [
  '-webkit-', '-moz-', '-o-', '-ms-', 'mso-', '-xv-', '-atsc-', '-wap-',
  '-khtml-', 'prince-', '-ah-', '-hp-', '-ro-', '-rim-', '-tc-'
];

/**
 * namespace in selector
 * @type {RegExp}
 */
export const namespaceReg = /^[\w\*]+\|/;

/**
 * selector char until break
 * @type {String}
 */
export const selectorCharUntil = '#.:[>+~*,/';

/**
 * Psudos elements in css2.1
 * http://www.w3.org/TR/CSS21/selector.html#pseudo-element-selectors
 * @type {Object}
 */
export const pseudosElements21 = [':first-line', ':first-letter', ':before', ':after'];