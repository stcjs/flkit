import test from 'ava';
import {CssTokenize} from '../../lib/index.js';

let str = `a {
        color: red;
    }
`;
test('test', t => {
    let instance = new CssTokenize(str);
    let data = instance.run();
    console.log(JSON.stringify(data, undefined, 4))
    t.pass();
})