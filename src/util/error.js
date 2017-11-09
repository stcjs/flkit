'use strict';

/**
 * error class
 */
export default class BaseError {
  /**
   * init
   * @param  {String} message [error message]
   * @param  {Number} line    [error line]
   * @param  {Number} col     [error col]
   * @return {Object}         []
   */
  constructor(message = '', line, col) {
    this.message = message;
    if (line !== undefined) {
      this.line = line + 1;
      this.col = col + 1;
    }
    this.stack = new Error(this.toString()).stack;
  }
  /**
   * toString
   * @return {String} get error string
   */
  toString() {
    if (this.line !== undefined) {
      return this.message + ` (line: ${this.line}, col: ${this.col})\n`;
    }
    return this.message + '\n';
  }
}
