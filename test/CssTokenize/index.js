import test from 'ava';
import {CssTokenize} from '../../lib/index.js';

test('test', t => {
    let instance = new CssTokenize('a{color: red}');
    let data = instance.run();
    console.log(JSON.stringify(data, undefined, 4))
    t.pass();
})