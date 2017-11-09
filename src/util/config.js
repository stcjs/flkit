'use strict';
/**
 * whitespace
 * @type {[type]}
 */
export const whitespace = ' \u00a0\n\r\t\f\u000b\u200b\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000';

/**
 * comment type list
 * @type {Object}
 */
export const comments = [
  ['//', '\n'],
  ['/*', '*/'],
  ['<!--', '-->']
];
/**
 * cdo string
 * @type {String}
 */
export const cdo = '<!--';
/**
 * cdc string
 * @type {String}
 */
export const cdc = '-->';
