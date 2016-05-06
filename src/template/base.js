
export default class {
  /**
   * constructor
   * @return {[type]} []
   */
  constructor(){

  }
  /**
   * has output
   * @return {Boolean} []
   */
  hasOutput(){
    return false;
  }
  /**
   * hasTpl
   * @param  {[type]} ld   []
   * @param  {[type]} rd   []
   * @param  {[type]} text []
   * @return {[type]}      []
   */
  hasTpl(ld, rd, text){
    return text.indexOf(ld) > -1 && text.indexOf(rd) > -1;
  }
}