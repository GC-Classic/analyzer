import {A,E,O,Q} from 'https://aeoq.github.io/AEOQ.mjs'
import {Data, Stat} from '/calculation.js'
import {Helper} from './help.js'
class Form extends HTMLElement {
    constructor(saved) {
        super();
        this.attachShadow({mode: 'open'}).append(
            E('link', {rel: 'stylesheet', href: '/common.css'}),
            E('link', {rel: 'stylesheet', href: 'analyzer.css'})
        );
        this.saved = saved;
    }
    connectedCallback () {
        this.fill();
        Data.observe(this.shadowRoot);
        this.sQ('input[type=number]:not([min])', input => input.min = 0);
        this.sQ('.formula')?.forEach(input => E(input).set({
            onblur: () => this.formula.evaluate(input),
            onfocus: () => this.formula.edit(input)
        }));
        Helper.cursor(this.shadowRoot);
        Helper.event(this.shadowRoot, true);
    }
    dispatch = (type, el, action) => this.dispatchEvent(new CustomEvent(type, {detail: {el, action}, composed: true}));
    numeric (el) {
        el = typeof el == 'string' ? this.sQ(el) : el;
        return parseFloat(el.value || el.placeholder) || 0;
    }
    formula = {
        evaluate (input) {
            input.setCustomValidity('');
            input.dataset.stored = input.value;
            let result;
            try {
                result = eval(input.value);
                if (input.value && typeof result != 'number') throw('');
            } catch (e) {
                return input.setCustomValidity('Syntax wrong');
            }
            input.value = result ?? '';
            input.classList.remove('posi', 'nega');
            input.classList.add(result > 0 ? 'posi' : result < 0 ? 'nega' : '_');
        },
        edit: input => input.value = input.dataset.stored ?? ''
    }
    get = {
        values: inputs => new O(inputs.map(input => 
            [input.name.includes('Δ') ? input.name.substring(1) : input.name || input.placeholder, this.numeric(input)]
        )),
        stats: inputs => new Stat().add(...inputs.map(input => input.checked ? JSON.parse(input.value) : {}))
    }
    save (excludes = '') {
        return {
            [this.constructor.name]: new O(this.sQ(`input${excludes},select`).map(input =>
                input.dataset.stored ? [input.name, input.dataset.stored] :
                input.type == 'select-one' ? [this.inputs.key(input), this.options.sort(input.options, input.value)] :
                ['number', 'text'].includes(input.type) && input.value !== '' ? [this.inputs.key(input), input.value] : 
                ['radio', 'checkbox'].includes(input.type) && input.checked ? [this.inputs.key(input), true] : null
            ).filter(a => a))
        };
    }
    fill () {
        new O(this.saved ?? {}).each(([key, value]) => {
            let input = this.inputs.find(key);
            if (!input || input.length > 1) return;
            value === true ? input.checked = true : 
            Array.isArray(value) ? this.options.create(value, key) : 
            typeof value == 'string' ? 
                /^\[/.test(value) ? this.inputs.store(input, value) : input.value = value : null;

            input.matches('.formula') && setTimeout(() => input.dispatchEvent(new InputEvent('blur')));
            /^(?:from|to)-\d$/.test(input.id) && this.changeRune(input);
        });
        this.saved = null;
    }
    inputs = {
        find: key => this.sQ(`input[id='${key}']`) ?? this.sQ(`input[name='${key}']`) ?? this.sQ(`input[placeholder='${key}']`),
        key: input => input.id || input.name || input.placeholder,
        store: (input, json) => E(input).set({
            dataset: {stored: json},
            value: JSON.parse(json)[0]
        })
    }
    options = {
        sort: (options, selected) => [...options].map(o => o.value).sort((a, b) => a == selected ? -1 : b == selected ? 1 : 0),
        create: (options, key) => {
            this.sQ(`select[name='${key}']`).replaceChildren(...options.map(value => E('option', {value}, value)));
            this.inputs.find(key).value = options[0] ?? '';
        }
    }
    output = (stats) => Form.output(this.el.output, stats);
    static output (where, {before, after}) {
        [where].flat().forEach((output, i) => {
            output.value = Math.round(after[i] ?? after);
            output.nextElementSibling.value = (after[i] ?? after) - (before[i] ?? before);
        });
    }
    presentDiff = (stats, diff) => Form.presentDiff(this.el.present, stats, diff);
    static presentDiff (where, {before, after}, diff) {
        [where].flat().forEach(data => {
            data.value = after[data.title] ?? after;
            diff && data.nextElementSibling && 
                (data.nextElementSibling.value = (after[data.title] ?? after) - (before[data.title] ?? before));
        });
    }
    static showDiff = (prop, TD) => E('b', [
        TD ? E('img', {src: 'buffs/TD.webp'}) : '',
        ...prop == 'damage' ? [E('prop-icon', {prop: 'A'}), E('prop-icon', {prop: 'SA'})] : [E('prop-icon', {prop})],
        E(`data.ante${prop == 'CAC' ? '' : '.percent'}`, {title: prop}),
        E(`data.post${prop == 'CAC' ? '' : '.percent'}`, {title: prop})
    ]);
}
export default Form